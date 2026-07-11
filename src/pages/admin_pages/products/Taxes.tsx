import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Percent, Download, FileUp, RefreshCw } from 'lucide-react';
import { SearchInput, Button, ConfirmModal, StatCard, PageHeader, SortableTableHeader, ViewIconButton, EditIconButton, DeleteIconButton } from '../../../components/ui';

interface Tax {
  id: number;
  title: string;
  percentage: number;
  status: 'active' | 'inactive';
}

type SortField = 'id' | 'title' | null;
type SortDirection = 'asc' | 'desc' | null;

// Mock data for taxes
const mockTaxes: Tax[] = [
  { id: 1, title: 'GST', percentage: 18, status: 'active' },
  { id: 2, title: 'VAT', percentage: 12, status: 'active' },
  { id: 3, title: 'Service Tax', percentage: 15, status: 'active' },
  { id: 4, title: 'Sales Tax', percentage: 10, status: 'active' },
  { id: 5, title: 'Custom Duty', percentage: 20, status: 'inactive' },
  { id: 6, title: 'Import Tax', percentage: 25, status: 'active' },
];

const Taxes = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>(mockTaxes);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    title: '',
    percentage: '10.00',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await taxesAPI.getAll();
      // setTaxes(Array.isArray(data) ? data : data.taxes || []);
      setTaxes(mockTaxes);
      // Small delay so loading spinner is visible when using mock data
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error('Error fetching taxes:', error);
      setTaxes(mockTaxes);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.percentage || parseFloat(formData.percentage) < 0) {
      newErrors.percentage = 'Valid percentage is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        const taxData = {
          title: formData.title,
          percentage: parseFloat(formData.percentage),
        };

        // Using mock data for now - replace with API calls when ready
        if (editingId) {
          // await taxesAPI.update(editingId, taxData);
          setTaxes(taxes.map(t => 
            t.id === editingId 
              ? { ...t, title: taxData.title, percentage: taxData.percentage }
              : t
          ));
          alert('Tax updated successfully!');
        } else {
          // await taxesAPI.create(taxData);
          const newTax: Tax = {
            id: taxes.length > 0 ? Math.max(...taxes.map(t => t.id)) + 1 : 1,
            title: taxData.title,
            percentage: taxData.percentage,
            status: 'active',
          };
          setTaxes([...taxes, newTax]);
          alert('Tax added successfully!');
        }

        setShowForm(false);
        setEditingId(null);
        resetForm();
      } catch (error: any) {
        console.error('Error saving tax:', error);
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          alert('API connection error. Please ensure your backend API is running and configured.');
        } else {
          alert(error.message || 'Error saving tax. Please try again.');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      percentage: '10.00',
    });
    setErrors({});
    setEditingId(null);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    
    try {
      // Using mock data for now - replace with API call when ready
      // await taxesAPI.delete(deleteConfirm.id);
      setTaxes(taxes.filter(t => t.id !== deleteConfirm.id));
      alert('Tax deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting tax:', error);
      alert(error.message || 'Error deleting tax. Please try again.');
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = async (tax: Tax) => {
    try {
      // Using mock data for now - replace with API call when ready
      // const taxData = await taxesAPI.getById(tax.id);
      setFormData({
        title: tax.title || '',
        percentage: tax.percentage?.toString() || '10.00',
      });
      setEditingId(tax.id);
      setShowForm(true);
    } catch (error: any) {
      console.error('Error loading tax:', error);
      alert(error.message || 'Error loading tax data. Please try again.');
    }
  };

  const handleView = (tax: Tax) => {
    navigate(`/products/taxes/view/${tax.id}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedTaxes = () => {
    let filtered = taxes.filter((tax) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        tax.title.toLowerCase().includes(searchLower) ||
        tax.id.toString().includes(searchLower) ||
        tax.percentage.toString().includes(searchLower)
      );
    });

    if (!sortField) return filtered;

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Export taxes to CSV
  const handleExport = () => {
    const headers = ['ID', 'Title', 'Percentage', 'Status'];
    const rows = taxes.map(t => [
      t.id,
      t.title,
      t.percentage,
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `taxes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import taxes from CSV
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            
            const importedTaxes: Tax[] = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
              if (values.length >= 4) {
                importedTaxes.push({
                  id: parseInt(values[0]) || taxes.length + i,
                  title: values[1] || '',
                  percentage: parseFloat(values[2]) || 0,
                  status: (values[3] as 'active' | 'inactive') || 'active'
                });
              }
            }
            
            if (importedTaxes.length > 0) {
              setTaxes([...taxes, ...importedTaxes]);
              alert(`Successfully imported ${importedTaxes.length} taxes!`);
            } else {
              alert('No valid taxes found in the file.');
            }
          } catch (error) {
            console.error('Error importing taxes:', error);
            alert('Error importing taxes. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };


  // Calculate KPI metrics
  const totalTaxes = taxes.length;
  const activeTaxes = taxes.filter(t => t.status === 'active').length;
  const inactiveTaxes = taxes.filter(t => t.status === 'inactive').length;

  return (
    <div>
      <PageHeader
        title="Taxes"
        description="View and manage all taxes"
        action={
          !showForm
            ? {
                label: 'Add Taxes',
                onClick: () => setShowForm(true),
                icon: Plus,
                variant: 'primary',
              }
            : undefined
        }
        showBackButton={showForm}
        onBack={
          showForm
            ? () => {
                setShowForm(false);
                resetForm();
              }
            : undefined
        }
      />

      {/* KPI Cards */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatCard title="Total Taxes" value={totalTaxes} icon={Percent} variant="blue" />
          <StatCard title="Active Taxes" value={activeTaxes} icon={Percent} variant="green" />
          <StatCard title="Inactive Taxes" value={inactiveTaxes} icon={Percent} variant="gray" />
        </div>
      )}

      {/* Taxes Table */}
      {!showForm && (
        <div className="space-y-4">
          {/* Search, Import/Export */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <SearchInput
                    placeholder="Search taxes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={fetchTaxes}
                  disabled={loading}
                  variant="ghost"
                  className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    size={14}
                    className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  title="Export to CSV"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleImport}
                  title="Import from CSV"
                >
                  <FileUp size={14} />
                  Import
                </button>
              </div>
            </div>
          </div>

          {/* Taxes Table */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-500">Loading taxes...</p>
              </div>
            ) : getSortedTaxes().length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-500 mb-3">No taxes found</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  Add First Tax
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 dark:border-gray-600">
                      <SortableTableHeader
                        field="id"
                        label="ID"
                        currentField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="title"
                        label="Title"
                        currentField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">Percentage</span>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">Status</span>
                      </th>
                      <th className="px-3 py-2 text-left">
                        <span className="text-[10px] font-semibold text-gray-700 uppercase">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedTaxes().map((tax) => (
                      <tr key={tax.id} className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">{tax.id}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-800">{tax.title}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{tax.percentage}%</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              tax.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {tax.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <ViewIconButton
                              onClick={() => handleView(tax)}
                              size={12}
                              className="text-green-600 hover:bg-green-50"
                              tooltip="View"
                            />
                            <EditIconButton
                              onClick={() => handleEdit(tax)}
                              size={12}
                              tooltip="Edit"
                            />
                            <DeleteIconButton
                              onClick={() => handleDeleteClick(tax.id)}
                              size={12}
                              tooltip="Delete"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Tax Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Percent size={18} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-800">
                {editingId ? 'Edit Tax' : 'Add Taxes'}
              </h3>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter tax title."
                className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.title && <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Percentage <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="number"
                name="percentage"
                value={formData.percentage}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                placeholder="10.00"
                className="w-full px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.percentage && <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">{errors.percentage}</p>}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        message="Are you sure you want to delete this tax? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Taxes;

