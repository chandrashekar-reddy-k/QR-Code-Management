import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { DeliveryBoy } from "../../../types";

const AddFundTransfer = () => {
  const navigate = useNavigate();
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    deliveryBoyId: "",
    amount: "",
    message: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load mock delivery boys for now - replace with API when ready
  useEffect(() => {
    const mockDeliveryBoys: DeliveryBoy[] = [
      {
        id: 1,
        name: "Ravi Kumar",
        mobile: "9876543210",
        email: "ravi@example.com",
        bonus: 0,
        documents: "",
        dateOfBirth: "1995-01-01",
        city: "Hyderabad",
        address: "Madhapur, Hyderabad",
        balance: 1000,
        cashReceived: 500,
        otherPaymentInformation: "",
        status: "active",
        available: true,
        date: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Suresh Reddy",
        mobile: "9876501234",
        email: "suresh@example.com",
        bonus: 0,
        documents: "",
        dateOfBirth: "1993-05-10",
        city: "Hyderabad",
        address: "Kondapur, Hyderabad",
        balance: 800,
        cashReceived: 300,
        otherPaymentInformation: "",
        status: "active",
        available: true,
        date: new Date().toISOString(),
      },
    ];

    setDeliveryBoys(mockDeliveryBoys);
  }, []);

  const filteredDeliveryBoys = deliveryBoys.filter(
    (db) =>
      db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.id.toString().includes(searchTerm.toLowerCase())
  );

  const selectedDeliveryBoy = deliveryBoys.find(
    (db) => db.id.toString() === formData.deliveryBoyId
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.deliveryBoyId) {
      newErrors.deliveryBoyId = "Delivery Boy is required";
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

      try {
        setLoading(true);
        // Using mock for now - replace with API call when backend is ready
        await new Promise((resolve) => setTimeout(resolve, 800));
        alert("Fund transfer created successfully!");
        navigate("/delivery-boys/fund-transfers");
      } catch (error: any) {
        console.error("Error creating fund transfer:", error);
        alert(error.message || "Error creating fund transfer. Please try again.");
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title + Back */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Add Fund Transfer
        </h1>
        <BackButton to="/delivery-boys/fund-transfers" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <FormSectionWithDots title="Fund Transfer Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Boy search select */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Delivery Boy <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Select & Search Delivery Boy"
                    value={
                      selectedDeliveryBoy
                        ? `${selectedDeliveryBoy.name} - ${selectedDeliveryBoy.mobile}`
                        : searchTerm
                    }
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      setFormData((prev) => ({
                        ...prev,
                        deliveryBoyId: "",
                      }));
                      if (errors.deliveryBoyId) {
                        setErrors((prev) => ({ ...prev, deliveryBoyId: "" }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.deliveryBoyId
                        ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400"
                        : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                    }`}
                  />

                  {showDropdown && (
                    <>
                      {/* overlay to close */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredDeliveryBoys.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No delivery boys found
                          </div>
                        ) : (
                          filteredDeliveryBoys.map((db) => (
                            <button
                              key={db.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  deliveryBoyId: db.id.toString(),
                                }));
                                setSearchTerm("");
                                setShowDropdown(false);
                                if (errors.deliveryBoyId) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    deliveryBoyId: "",
                                  }));
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-800"
                            >
                              {db.name} - {db.mobile}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
                {errors.deliveryBoyId && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                    {errors.deliveryBoyId}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <TextInput
                  label="Transfer Amount"
                  required
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder="Enter Transfer Amount"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }));
                    if (errors.amount) {
                      setErrors((prev) => ({ ...prev, amount: "" }));
                    }
                  }}
                  error={errors.amount}
                />
              </div>

              {/* Message */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Message
                </label>
                <textarea
                  placeholder="Enter Message."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/delivery-boys/fund-transfers")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{loading ? "Saving..." : "Save Fund Transfer"}</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFundTransfer;
