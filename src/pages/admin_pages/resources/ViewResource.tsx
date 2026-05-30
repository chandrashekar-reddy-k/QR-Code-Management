import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";

import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { Modal, PrimaryButton, SelectInput, TextInput } from "../../../components/ui";

interface ResourceDetails {
  id: string;
  name: string;
  category: string;
  resourceType: string;
  resourceCode: string;
  purchaseDate: string;
  warrantyPeriod: string;
  purchaseCost: string;
  assignedTo: string;
  address: string;
  transferredFrom: string;
  transferDate: string;
  currentStatus: string;
  supplierName: string;
  supplierMobile: string;
  supplierAddress: string;
  lastServiceDate: string;
  maintenanceNotes: string;
}

// Mock single resource data – can be replaced with API later
const mockResource: ResourceDetails = {
  id: "123",
  name: "Partner 1",
  category: "Something",
  resourceType: "9876543210",
  resourceCode: "Something",
  purchaseDate: "24-01-2026",
  warrantyPeriod: "12 Months",
  purchaseCost: "₹ 10,000",
  assignedTo: "Warehouse 1",
  address: "Xyz colony, xyz village, xyz city...",
  transferredFrom: "Warehouse 2",
  transferDate: "24-01-25",
  currentStatus: "Working",
  supplierName: "John",
  supplierMobile: "Something",
  supplierAddress: "Xyz colony, xyz village, xyz city...",
  lastServiceDate: "20-01-2026",
  maintenanceNotes: "Something",
};

const tabs = [
  "Location and assignment Details",
  "Supplier Details",
  "Maintainance details",
  "Documents",
] as const;

type TabKey = (typeof tabs)[number];

const ViewResource: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>(
    "Location and assignment Details"
  );
  const [currentStatus, setCurrentStatus] = useState<string>(
    mockResource.currentStatus
  );
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("Head office");

  const resource: ResourceDetails = {
    ...mockResource,
    id: id || mockResource.id,
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Header */}
      <div className="mb-4 mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Resource ID #{resource.id}
          </h1>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate(`/resource-management/resources/${resource.id}/edit`)
            }
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to delete this resource?"
                )
              ) {
                navigate("/resource-management");
              }
            }}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Name</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.name}
              </span>
            </div>
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Category</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.category}
              </span>
            </div>
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Resource Type</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.resourceType}
              </span>
            </div>
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Resource Code</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.resourceCode}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Purchase date</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.purchaseDate}
              </span>
            </div>
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Warrenty Period</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.warrantyPeriod}
              </span>
            </div>
            <div className="flex text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium w-32 sm:w-40">Purchase cost</span>
              <span className="mx-2">:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {resource.purchaseCost}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Resource button */}
      <div className="mb-4 flex justify-end">
        <PrimaryButton
          type="button"
          onClick={() => setIsTransferModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 h-10 px-4 rounded-lg text-xs sm:text-sm"
        >
          Transfer Resource
        </PrimaryButton>
      </div>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transfer from
              </p>
              <TextInput value={resource.assignedTo} disabled className="text-xs sm:text-sm" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transfer To
              </p>
              <div className="relative">
                <SelectInput
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  options={[
                    { value: "Head office", label: "Head office" },
                    { value: "Warehouse 1", label: "Warehouse 1" },
                  ]}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="w-40 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Tabs */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap relative ${
                activeTab === tab
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Location and assignment Details */}
      {activeTab === "Location and assignment Details" && (
        <div className="space-y-4">
          {/* Location and assignment Details card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Location and assignment Details
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Assigned to</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.assignedTo}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Address</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.address}
                </span>
              </div>
            </div>
          </div>

          {/* Transfer Details card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Transfer Details
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Transfered from</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.transferredFrom}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Transfer Date</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.transferDate}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Current Status :{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentStatus}
                </span>
              </p>
              <div className="sm:ml-auto w-full sm:w-64 relative">
                <SelectInput
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  options={[
                    { value: "Working", label: "Working" },
                    { value: "Under Maintenance", label: "Under Maintenance" },
                    { value: "Not Working", label: "Not Working" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details tab */}
      {activeTab === "Supplier Details" && (
        <div className="space-y-4">
          {/* Supplier Details card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Supplier Details
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Supplier Name</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.supplierName}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Mobile Number</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.supplierMobile}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Supplier Address</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.supplierAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Current Status :{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentStatus}
                </span>
              </p>
              <div className="sm:ml-auto w-full sm:w-64 relative">
                <SelectInput
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  options={[
                    { value: "Working", label: "Working" },
                    { value: "Under Maintenance", label: "Under Maintenance" },
                    { value: "Not Working", label: "Not Working" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Maintainance details" && (
        <div className="space-y-4">
          {/* Maintenance details card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Supplier Details
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Last Service Date</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.lastServiceDate}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-32 sm:w-40">Maintenance Notes</span>
                <span className="mx-2">:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {resource.maintenanceNotes}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Current Status :{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentStatus}
                </span>
              </p>
              <div className="sm:ml-auto w-full sm:w-64 relative">
                <SelectInput
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  options={[
                    { value: "Working", label: "Working" },
                    { value: "Under Maintenance", label: "Under Maintenance" },
                    { value: "Not Working", label: "Not Working" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Documents" && (
        <div className="space-y-4">
          {/* Documents card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Documents
            </h3>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Resource Image" },
                { label: "Warrenty" },
                { label: "Bill Copy" },
              ].map((doc) => (
                <div key={doc.label} className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 dark:bg-gray-700" />
                  <span className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                    {doc.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Current Status :{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentStatus}
                </span>
              </p>
              <div className="sm:ml-auto w-full sm:w-64 relative">
                <SelectInput
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  options={[
                    { value: "Working", label: "Working" },
                    { value: "Under Maintenance", label: "Under Maintenance" },
                    { value: "Not Working", label: "Not Working" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewResource;

