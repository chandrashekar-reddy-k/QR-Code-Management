import { useState, useEffect } from "react";
import { Trash2, Loader2, Check } from "lucide-react";
import { AxiosInstance } from "axios";

interface SetupWizardProps {
  onClose: () => void;
  api: AxiosInstance;
  fetchLayout: () => void;
  racks: any[];
  editRackId?: string | null;
}

export default function SetupWizard({ onClose, api, fetchLayout, racks, editRackId }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 4000);
  };

  // Step 1 State
  const [rackName, setRackName] = useState("");
  const [rackCode, setRackCode] = useState("");
  const [maxShelves, setMaxShelves] = useState("");

  // Step 2 State
  const [selectedRackId, setSelectedRackId] = useState("");
  const [numShelvesToCreate, setNumShelvesToCreate] = useState("");
  const [shelfConfigs, setShelfConfigs] = useState<any[]>([]);

  // Step 3 State
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [numTrays, setNumTrays] = useState("");
  const [trayCapacity, setTrayCapacity] = useState("");
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (editRackId && !isInitialized) {
      const rack = racks.find(r => r.id === editRackId);
      if (rack) {
        setRackName(rack.name);
        setRackCode(rack.code || rack.name.substring(0, 3).toUpperCase());
        
        // Use maxShelves from DB if available, otherwise fallback to shelves length
        const max = rack.maxShelves ? rack.maxShelves.toString() : rack.shelves.length.toString();
        setMaxShelves(max);
        
        // Let numShelvesToCreate be the actual current number of shelves
        setNumShelvesToCreate(rack.shelves.length.toString());
        setShelfConfigs(rack.shelves.map((s: any, i: number) => {
          let parsedName = s.name;
          let parsedCode = s.name.substring(0, 3).toUpperCase();
          const match = s.name.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            parsedName = match[1];
            parsedCode = match[2];
          }
          return {
            id: i + 1,
            name: parsedName,
            code: parsedCode,
            originalId: s.id
          };
        }));
        // Remove hardcoded tray init because user must select shelf first in Step 3
        setIsInitialized(true);
      }
    }
  }, [editRackId, racks, isInitialized]);

  // When step 2 is entered, generate shelf rows
  useEffect(() => {
    if (step === 2 && shelfConfigs.length === 0 && !editRackId) {
      const num = parseInt(maxShelves) || 0;
      setNumShelvesToCreate(maxShelves);
      const initialConfigs = Array.from({ length: num }, (_, i) => ({
        id: i + 1,
        name: "",
        code: "",
      }));
      setShelfConfigs(initialConfigs);
    }
  }, [step, maxShelves, editRackId]);

  const handleNextStep1 = async () => {
    if (!rackName.trim() || !rackCode.trim() || !maxShelves.trim()) {
      showError("Please fill all required fields in Step 1.");
      return;
    }
    setSubmitting(true);
    try {
      if (editRackId) {
        await api.put(`/partner/settings/racks/${editRackId}`, { name: rackName.trim(), code: rackCode.trim(), maxShelves: parseInt(maxShelves) });
        showSuccess(`Rack "${rackName}" updated successfully!`);
      } else {
        await api.post("/partner/settings/racks", { name: rackName.trim(), code: rackCode.trim(), maxShelves: parseInt(maxShelves) });
        showSuccess(`Rack "${rackName}" created successfully!`);
      }
      await fetchLayout(); // Get updated racks to fetch the new rack's ID
      setStep(2);
    } catch (err: any) {
      showError(err.response?.data?.message || (editRackId ? "Failed to update rack" : "Failed to create rack"));
    } finally {
      setSubmitting(false);
    }
  };

  // After step 1 completes and racks update, pre-select the newly created rack
  useEffect(() => {
    if (step === 2 && !selectedRackId && racks.length > 0) {
      // Find the most recently created rack with matching name
      const newRack = racks.find(r => r.name === rackName.trim());
      if (newRack) setSelectedRackId(newRack.id);
    }
  }, [step, racks, rackName, selectedRackId]);

  const handleNextStep2 = async () => {
    if (!selectedRackId) {
      showError("Please select a rack.");
      return;
    }
    
    const validShelves = shelfConfigs.filter(s => s.name.trim() && s.code.trim());
    if (validShelves.length === 0) {
      showError("Please configure at least one shelf.");
      return;
    }

    setSubmitting(true);
    try {
      // Delete shelves that were removed
      const originalRack = racks.find(r => r.id === selectedRackId);
      if (originalRack) {
        const currentShelfIds = validShelves.map((s: any) => s.originalId).filter(Boolean);
        for (const originalShelf of originalRack.shelves) {
          if (!currentShelfIds.includes(originalShelf.id)) {
            await api.delete(`/partner/settings/shelves/${originalShelf.id}`);
          }
        }
      }

      // Create or Update shelves sequentially
      for (const shelf of validShelves) {
        const payload = {
          name: `${shelf.name.trim()} (${shelf.code.trim()})`
        };
        if ((shelf as any).originalId) {
          await api.put(`/partner/settings/shelves/${(shelf as any).originalId}`, payload);
        } else {
          await api.post("/partner/settings/shelves", { ...payload, rackId: selectedRackId });
        }
      }
      await fetchLayout();
      showSuccess("Shelves saved successfully!");
      setStep(3);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create shelves");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!selectedRackId || !selectedShelfId || !numTrays.trim() || !trayCapacity.trim()) {
      showError("Please fill all required fields in Step 3.");
      return;
    }
    const count = parseInt(numTrays) || 0;
    if (count <= 0) {
      showError("Number of trays must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const existingShelf = availableShelves.find((s: any) => s.id === selectedShelfId);
      
      // Delete any trays that exceed the new count
      if (existingShelf && existingShelf.trays) {
        for (const t of existingShelf.trays) {
          const trayNum = parseInt(t.name, 10);
          if (trayNum > count) {
            await api.delete(`/partner/settings/trays/${t.id}`);
          }
        }
      }

      // Create multiple trays sequentially based on count
      for (let i = 1; i <= count; i++) {
        const trayName = `00${i}`;
        // Skip creating if the tray already exists
        if (existingShelf && existingShelf.trays && existingShelf.trays.some((t: any) => t.name === trayName)) {
           continue;
        }
        await api.post("/partner/settings/trays", { 
          shelfId: selectedShelfId, 
          name: trayName, // Format: 001, 002...
          capacity: parseInt(trayCapacity) || null
        });
      }
      await fetchLayout();
      showSuccess("Setup completed successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create trays");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRackObj = racks.find(r => r.id === selectedRackId);
  const availableShelves = selectedRackObj ? selectedRackObj.shelves : [];

  return (
    <div className="w-full bg-[#F5F7FA] dark:bg-gray-900 min-h-screen p-6 relative">
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-sm flex items-center gap-2">
          <span className="block sm:inline">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-sm flex items-center gap-2">
          <span className="block sm:inline">{successMsg}</span>
        </div>
      )}

      <div className="max-w-[1000px] mx-auto bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-sm border border-gray-100 dark:border-gray-700">
        
        {/* Stepper */}
        <div className="flex items-center justify-between mb-12 relative max-w-[800px] mx-auto">
          {/* Connector Lines */}
          <div className="absolute top-6 left-[10%] right-[10%] flex justify-between z-0">
            <div className={`h-[2px] w-[45%] transition-colors duration-300 ${step >= 2 ? 'bg-[#00891D]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            <div className={`h-[2px] w-[45%] transition-colors duration-300 ${step >= 3 ? 'bg-[#00891D]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>

          {[
            { id: 1, title: "Create Rack", subtitle: "Add a new rack" },
            { id: 2, title: "Create Shelves", subtitle: "Add shelves to the rack" },
            { id: 3, title: "Configure Trays", subtitle: "Set tray capacity" }
          ].map((s) => {
            const isCompleted = step > s.id;
            const isActive = step === s.id;

            return (
              <div key={s.id} className="flex gap-4 items-start relative z-10 bg-white dark:bg-gray-800 px-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                  isCompleted ? "bg-[#00891D] text-white" :
                  isActive ? "bg-[#00891D] text-white ring-4 ring-green-50 dark:ring-green-900/30" :
                  "bg-gray-100 dark:bg-gray-700 text-gray-400"
                }`}>
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : s.id}
                </div>
                <div>
                  <h4 className={`font-bold text-[15px] mb-0.5 ${isActive || isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Create Rack */}
        {step === 1 && (
          <div className="max-w-[700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Create Rack</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Rack Name (Category Name) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={rackName}
                  onChange={(e) => setRackName(e.target.value)}
                  placeholder="Enter rack name"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Enter the product category name. This category will be used as the Rack Name.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Rack Code <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={rackCode}
                  onChange={(e) => setRackCode(e.target.value.toUpperCase().slice(0,4))}
                  placeholder="Enter rack code"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Maximum 4 characters. Use uppercase letters and numbers only.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Max Number of Shelves <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={maxShelves}
                  onChange={(e) => setMaxShelves(e.target.value)}
                  placeholder="Enter Max no of Shelves"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Enter the maximum number of shelves that can fit in this rack.</p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={onClose}
                className="px-8 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleNextStep1}
                disabled={submitting}
                className="px-8 py-3 bg-[#00891D] text-white font-bold rounded-xl hover:bg-[#006614] transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-300"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Create Shelves */}
        {step === 2 && (
          <div className="max-w-[700px] mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Create Shelves</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Select Rack <span className="text-red-500">*</span>
                </label>
                <select 
                  value={selectedRackId}
                  onChange={(e) => setSelectedRackId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm appearance-none"
                >
                  <option value="" disabled>-- Select Rack --</option>
                  {racks.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Number of Shelves <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  max={maxShelves}
                  value={numShelvesToCreate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseInt(val) > parseInt(maxShelves)) {
                      showError(`Cannot exceed Max Shelves (${maxShelves})`);
                      return;
                    }
                    setNumShelvesToCreate(val);
                    const num = parseInt(val) || 0;
                    if (num >= 0) {
                      setShelfConfigs(prev => {
                        const newConfigs = [...prev];
                        if (num > prev.length) {
                          for (let i = prev.length; i < num; i++) {
                            newConfigs.push({ id: i + 1, name: "", code: "" });
                          }
                        } else if (num < prev.length) {
                          return newConfigs.slice(0, num);
                        }
                        return newConfigs;
                      });
                    }
                  }}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Enter the total number of shelves you want to create in this rack (Max: {maxShelves}).</p>
              </div>

              <div className="mt-8">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Shelf Configuration</h3>
                <p className="text-[11px] text-gray-400 mb-4">Configure each shelf by providing its name, code, and the maximum number of trays it can accommodate.</p>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8FAFC] dark:bg-gray-900/50">
                      <tr className="text-[10px] uppercase font-extrabold text-gray-900 dark:text-white tracking-wider border-b border-gray-200 dark:border-gray-700">
                        <th className="py-4 px-6 w-16 text-center">#</th>
                        <th className="py-4 px-4">SHELF NAME <span className="text-red-500">*</span></th>
                        <th className="py-4 px-4">SHELF CODE <span className="text-red-500">*</span></th>
                        <th className="py-4 px-6 text-center w-24">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {shelfConfigs.map((shelf, index) => (
                        <tr key={shelf.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-6 text-center text-sm font-semibold text-gray-500">{index + 1}</td>
                          <td className="py-3 px-4">
                            <input 
                              type="text" 
                              value={shelf.name}
                              onChange={(e) => {
                                const newConfigs = [...shelfConfigs];
                                newConfigs[index].name = e.target.value;
                                setShelfConfigs(newConfigs);
                              }}
                              placeholder="e.g. Rice"
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00891D] bg-white dark:bg-gray-900"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input 
                              type="text" 
                              value={shelf.code}
                              onChange={(e) => {
                                const newConfigs = [...shelfConfigs];
                                newConfigs[index].code = e.target.value.toUpperCase();
                                setShelfConfigs(newConfigs);
                              }}
                              placeholder="e.g. RICE"
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00891D] bg-white dark:bg-gray-900 uppercase"
                            />
                          </td>
                          <td className="py-3 px-6 text-center">
                            <button 
                              onClick={() => {
                                const newConfigs = shelfConfigs.filter((_, i) => i !== index);
                                setShelfConfigs(newConfigs);
                                setNumShelvesToCreate(newConfigs.length.toString());
                              }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={onClose}
                className="px-8 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleNextStep2}
                disabled={submitting}
                className="px-8 py-3 bg-[#00891D] text-white font-bold rounded-xl hover:bg-[#006614] transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-300"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Trays */}
        {step === 3 && (
          <div className="max-w-[700px] mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Configure Trays</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Select Rack <span className="text-red-500">*</span>
                </label>
                <select 
                  value={selectedRackId}
                  onChange={(e) => setSelectedRackId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm appearance-none"
                >
                  <option value="" disabled>-- Select Rack --</option>
                  {racks.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Select Shelf <span className="text-red-500">*</span>
                </label>
                <select 
                  value={selectedShelfId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedShelfId(val);
                    const shelfObj = availableShelves.find((s: any) => s.id === val);
                    if (shelfObj && shelfObj.trays && shelfObj.trays.length > 0) {
                      setNumTrays(shelfObj.trays.length.toString());
                      setTrayCapacity(shelfObj.trays[0].capacity?.toString() || "");
                    } else {
                      setNumTrays("");
                      setTrayCapacity("");
                    }
                  }}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm appearance-none disabled:bg-gray-50"
                  disabled={!selectedRackId}
                >
                  <option value="" disabled>-- Select Shelf --</option>
                  {availableShelves.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Number of Trays <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={numTrays}
                  onChange={(e) => setNumTrays(e.target.value)}
                  placeholder="Enter number of trays"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Enter the total number of trays you want to create in this shelf.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  Tray Capacity <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={trayCapacity}
                  onChange={(e) => setTrayCapacity(e.target.value)}
                  placeholder="Enter capacity per tray"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] bg-white dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                />
                <p className="text-[11px] text-gray-400">Enter the number of items that can fit in each tray.</p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={onClose}
                className="px-8 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinish}
                disabled={submitting}
                className="px-8 py-3 bg-[#00891D] text-white font-bold rounded-xl hover:bg-[#006614] transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-300"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Finish Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
