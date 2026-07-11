import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Trash2, User } from 'lucide-react';
import { formatDate } from "../../../utils/formatters";
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { Badge, ConfirmModal } from '../../../components/ui';
import {
  useGetDeliveryBoyDetailsById,
  useDeleteDeliveryBoy,
  useToggleDeliveryBoyStatus,
} from '../../../hooks/deliveryBoy';

// Interface for API response
interface BankInfo {
  id?: string;
  userId?: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  accountHolderName: string;
  branchName?: string;
  upiId?: string;
  cancelledChequeUrl?: string;
  bankPassbookOrChequeUrl?: string;
}

interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  location: {
    lat: number;
    lng: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryAgentDocument {
  id?: string;
  documentType?: string;
  fileUrl?: string;
}

interface ApiDeliveryBoy {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  bonusType: string | null;
  bankInfo: BankInfo | null;
  agentBank?: BankInfo | null;
  isActive: boolean;
  addresses?: Address[];
  address?: Address | null;
  deliveryAgentDocuments?: DeliveryAgentDocument[];
  documents?: DeliveryAgentDocument[];
  createdAt: string;
  warehouseId?: string;
}

interface DeliveryBoyResponseData {
  data: ApiDeliveryBoy;
  [key: string]: any;
}

interface ToggleStatusResponse {
  status: boolean;
  message?: string;
  response?: string;
  isActive?: boolean;
}

interface ViewDeliveryBoyLocationState {
  fromManage?: string;
}

const ViewDeliveryBoy = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const manageListPath =
    (location.state as ViewDeliveryBoyLocationState | null)?.fromManage ??
    '/delivery-boys/manage';
  
  const { data, isLoading, refetch } = useGetDeliveryBoyDetailsById(id || '');
  const { mutate: deleteMutate } = useDeleteDeliveryBoy();
  const { mutate: toggleStatusMutate } = useToggleDeliveryBoyStatus();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [activeStatus, setActiveStatus] = useState<boolean>(false);

  const responseData = data as DeliveryBoyResponseData | undefined;
  const deliveryBoy = responseData?.data;

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  useEffect(() => {
    if (typeof deliveryBoy?.isActive === "boolean") {
      setActiveStatus(deliveryBoy.isActive);
    }
  }, [deliveryBoy?.isActive]);

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading delivery boy...</p>
        </div>
      </div>
    );
  }

  if (!deliveryBoy) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Delivery boy not found</p>
          <button
            onClick={() => navigate(manageListPath)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/delivery-boys/edit/${deliveryBoy.id}`);
  };

  const handleDelete = () => {
    setDeleteConfirm({ isOpen: true });
  };

  const handleDeleteConfirm = () => {
    if (id) {
      deleteMutate(id);
      navigate(manageListPath);
    }
    setDeleteConfirm({ isOpen: false });
  };

  const handleStatusToggle = () => {
    if (id) {
      toggleStatusMutate(id, {
        onSuccess: (res: ToggleStatusResponse) => {
          if (typeof res?.isActive === 'boolean') {
            setActiveStatus(res.isActive);
          } else {
            setActiveStatus((prev) => !prev);
          }
        },
      });
    }
  };

  // Map API data to display format
  const primaryAddress = deliveryBoy.addresses?.[0] || deliveryBoy.address || null;
  const addressText = primaryAddress
    ? `${primaryAddress.line1}${primaryAddress.line2 ? ', ' + primaryAddress.line2 : ''}, ${primaryAddress.city}, ${primaryAddress.state} - ${primaryAddress.pincode}`
    : 'N/A';

  const resolvedBank = deliveryBoy.agentBank || deliveryBoy.bankInfo;
  const paymentInfo = resolvedBank
    ? [resolvedBank.accountHolderName, resolvedBank.accountNumber].filter(Boolean).join(' / ')
    : 'N/A';
  const documentsList = (deliveryBoy.deliveryAgentDocuments || deliveryBoy.documents || [])
    .filter((d) => !!d?.fileUrl)
    .map((d) => `${d.documentType || 'Document'}: ${d.fileUrl}`)
    .join(', ');
  const documentsText = documentsList || 'N/A';
  const status = activeStatus ? 'active' : 'inactive';

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Delivery Boy ID #{deliveryBoy.id}
        </h1>
        <div className="flex items-center gap-2">
          <BackButton to={manageListPath} />
          <button
            onClick={handleEdit}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Delivery Boy Overview Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full">
          {/* Delivery Boy Icon/Avatar */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
              <User size={32} className="text-gray-400" />
            </div>
          </div>

          {/* Delivery Boy Details - Side by Side */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-800">{deliveryBoy.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Mobile</p>
              <p className="text-sm font-semibold text-gray-800">{deliveryBoy.phone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeStatus}
                  onChange={handleStatusToggle}
                  className="sr-only peer"
                />
                {/* Track: green when active — peer must only be on the input; peer-checked styles on this sibling */}
                <div
                  className="
                  relative w-11 h-6 shrink-0 rounded-full bg-gray-200
                  transition-colors duration-200
                  peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#00891D] peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800
                  after:pointer-events-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:shadow-sm after:transition-transform dark:after:border-gray-600
                  peer-checked:bg-[#00891D] dark:peer-checked:bg-green-600
                  peer-checked:after:translate-x-[1.25rem] peer-checked:after:border-white
                "
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Personal Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                <p className="text-sm text-gray-800">{deliveryBoy.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-800">{deliveryBoy.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Mobile</p>
                <p className="text-sm text-gray-800">{deliveryBoy.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date of Birth</p>
                <p className="text-sm text-gray-800">{deliveryBoy.dob ? formatDate(deliveryBoy.dob) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Registration Date</p>
                <p className="text-sm text-gray-800">{formatDate(deliveryBoy.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Location Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Location Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">City</p>
                <p className="text-sm text-gray-800">{primaryAddress?.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
                <p className="text-sm text-gray-800">{addressText}</p>
              </div>
            </div>
          </div>

          {/* Documents & Payment Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Documents & Payment</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Documents</p>
                <p className="text-sm text-gray-800">{documentsText}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Bonus Type</p>
                <p className="text-sm text-gray-800">{deliveryBoy.bonusType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Payment Information</p>
                <p className="text-sm text-gray-800">{paymentInfo}</p>
              </div>
              {resolvedBank && (
                <>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Bank Name</p>
                    <p className="text-sm text-gray-800">{resolvedBank.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Account Number</p>
                    <p className="text-sm text-gray-800">{resolvedBank.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">IFSC Code</p>
                    <p className="text-sm text-gray-800">{resolvedBank.ifscCode}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Status Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Status Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <Badge
                  status={status}
                  size="sm"
                  customColor={activeStatus ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
                  className="rounded"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Active Status</p>
                <p className={`text-sm font-semibold ${activeStatus ? 'text-green-600 dark:text-green-400' : 'text-gray-600'}`}>
                  {activeStatus ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Delivery Boy"
        message="Are you sure you want to delete this delivery boy? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ViewDeliveryBoy;
