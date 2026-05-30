import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Calendar } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { DeliveryBoy } from "../../../types";

// Mock delivery boys data
const mockDeliveryBoys: DeliveryBoy[] = [
  {
    id: 1,
    name: "Rajesh Kumar",
    mobile: "9876543210",
    email: "rajesh@example.com",
    bonus: 10,
    documents: "DL-123456",
    dateOfBirth: "1990-05-15",
    city: "Mumbai",
    address: "123 Main Street",
    balance: 3579.08,
    cashReceived: 2500.0,
    otherPaymentInformation: "UPI: rajesh@paytm",
    status: "active",
    available: true,
    date: "2025-01-15T10:30:00Z",
  },
  {
    id: 2,
    name: "Priya Sharma",
    mobile: "9876543211",
    email: "priya@example.com",
    bonus: 12,
    documents: "DL-234567",
    dateOfBirth: "1992-08-20",
    city: "Delhi",
    address: "456 Park Avenue",
    balance: 2450.5,
    cashReceived: 1800.0,
    otherPaymentInformation: "Bank: HDFC",
    status: "active",
    available: true,
    date: "2025-01-16T14:20:00Z",
  },
  {
    id: 3,
    name: "Amit Patel",
    mobile: "9876543212",
    email: "amit@example.com",
    bonus: 8,
    documents: "DL-345678",
    dateOfBirth: "1988-12-10",
    city: "Bangalore",
    address: "789 MG Road",
    balance: 1890.25,
    cashReceived: 1200.0,
    otherPaymentInformation: "UPI: amit@phonepe",
    status: "active",
    available: false,
    date: "2025-01-17T09:15:00Z",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    mobile: "9876543213",
    email: "sneha@example.com",
    bonus: 15,
    documents: "DL-456789",
    dateOfBirth: "1995-03-25",
    city: "Hyderabad",
    address: "321 Hitech City",
    balance: 4200.75,
    cashReceived: 3000.0,
    otherPaymentInformation: "Bank: ICICI",
    status: "active",
    available: true,
    date: "2025-01-18T16:45:00Z",
  },
  {
    id: 6,
    name: "Arun Kumar",
    mobile: "9949011050",
    email: "arun@example.com",
    bonus: 12,
    documents: "DL-567890",
    dateOfBirth: "1993-06-12",
    city: "Bangalore",
    address: "R T Nagar",
    balance: 1500.0,
    cashReceived: 1000.0,
    otherPaymentInformation: "UPI: arun@paytm",
    status: "active",
    available: true,
    date: "2025-01-20T08:00:00Z",
  },
];

const AddCashCollection = () => {
  const navigate = useNavigate();
  const [deliveryBoys, setDeliveryBoys] =
    useState<DeliveryBoy[]>(mockDeliveryBoys);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deliveryBoyId: "",
    transferAmount: "",
    dateTime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchDeliveryBoys();
    // set current datetime nicely
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setFormData((prev) => ({
      ...prev,
      dateTime: `${year}-${month}-${day}T${hours}:${minutes}`,
    }));
  }, []);

  const fetchDeliveryBoys = async () => {
    try {
      setDeliveryBoys(mockDeliveryBoys);
    } catch (error) {
      console.error("Error fetching delivery boys:", error);
      setDeliveryBoys(mockDeliveryBoys);
    }
  };

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

    if (!formData.transferAmount || parseFloat(formData.transferAmount) <= 0) {
      newErrors.transferAmount = "Valid transfer amount is required";
    }

    if (!formData.dateTime) {
      newErrors.dateTime = "Date & Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      // API call yaha aayega
      alert("Cash collection added successfully!");
      navigate("/delivery-boys/cash-collections");
    } catch (error: any) {
      console.error("Error creating cash collection:", error);
      alert(
        error.message || "Error creating cash collection. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeForDisplay = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title + Back */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Add Cash Collection
        </h1>
        <BackButton to="/delivery-boys/cash-collections" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <FormSectionWithDots title="Cash Collection Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Boy search select */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Delivery Boy <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Select or search Delivery Boy"
                    value={
                      selectedDeliveryBoy
                        ? `${selectedDeliveryBoy.name} - ${selectedDeliveryBoy.mobile}`
                        : searchTerm
                    }
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) {
                        setFormData((prev) => ({ ...prev, deliveryBoyId: "" }));
                      }
                      if (errors.deliveryBoyId) {
                        setErrors((prev) => ({ ...prev, deliveryBoyId: "" }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.deliveryBoyId
                        ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400"
                        : "border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500"
                    }`}
                  />
                  {showDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredDeliveryBoys.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
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
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
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

              {/* Transfer Amount */}
              <div>
                <TextInput
                  label="Transfer Amount"
                  required
                  type="number"
                  step="0.01"
                  name="transferAmount"
                  placeholder="Enter Transfer Amount"
                  value={formData.transferAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({ ...prev, transferAmount: value }));
                    if (errors.transferAmount) {
                      setErrors((prev) => ({ ...prev, transferAmount: "" }));
                    }
                  }}
                  error={errors.transferAmount}
                />
              </div>

              {/* Date & Time */}
              <div>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-[34px] -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10"
                    size={16}
                  />
                  <TextInput
                    label="Date & Time"
                    required
                    type="datetime-local"
                    name="dateTime"
                    value={formData.dateTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => ({ ...prev, dateTime: value }));
                      if (errors.dateTime) {
                        setErrors((prev) => ({ ...prev, dateTime: "" }));
                      }
                    }}
                    className="pl-9"
                    error={errors.dateTime}
                  />
                </div>
                {formData.dateTime && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Selected: {formatDateTimeForDisplay(formData.dateTime)}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/delivery-boys/cash-collections")}
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
              <span>{loading ? "Saving..." : "Save Cash Collection"}</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCashCollection;
