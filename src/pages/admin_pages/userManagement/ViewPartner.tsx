import { useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  Handshake,
  Mail,
  Phone,
  Calendar,
  Building2,
  Shield,
} from "lucide-react";
import BackButton from "../../../components/common/BackButton";
import { useGetPartnerDetailsById } from "../../../hooks/partner";

// Interface for API response
interface ApiPartnerResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  status: string;
  warehouseId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// Interface for the hook response data structure
interface PartnerResponseData {
  data: ApiPartnerResponse;
  [key: string]: unknown;
}

const ViewPartner = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetPartnerDetailsById(id || "");

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as PartnerResponseData | undefined;
  const partnerData = responseData?.data;

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            Partner Details
          </h1>
          <div className="flex items-center justify-end">
            <BackButton to="/user-management/partners" />
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading partner...
          </p>
        </div>
      </div>
    );
  }

  if (!partnerData) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            Partner Details
          </h1>
          <div className="flex items-center justify-end">
            <BackButton to="/user-management/partners" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
          <p className="text-gray-500 mb-4">
            Partner not found
          </p>
          <BackButton to="/user-management/partners" />
        </div>
      </div>
    );
  }

  // Normalize status to lowercase for comparison
  const normalizedStatus =
    partnerData.status?.toLowerCase() === "active" ? "active" : "inactive";

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Back Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Partner Details
        </h1>
        <div className="flex items-center justify-end">
          <BackButton to="/user-management/partners" />
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {partnerData.name}
            </p>
            <p className="text-xs text-gray-500">
              {partnerData.companyName || "N/A"}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              normalizedStatus === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {normalizedStatus === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Partner Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Handshake
                size={18}
                className="text-green-600 dark:text-green-400"
              />
              Partner Information
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Partner Name
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {partnerData.name || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Building2 size={12} />
                Company
              </p>
              <p className="text-sm text-gray-700">
                {partnerData.companyName || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Mail size={12} />
                Email
              </p>
              <p className="text-sm text-gray-700">
                {partnerData.email || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Phone size={12} />
                Phone
              </p>
              <p className="text-sm text-gray-700">
                {partnerData.phone || "N/A"}
              </p>
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Shield
                size={18}
                className="text-green-600 dark:text-green-400"
              />
              Status Information
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Status
              </p>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  normalizedStatus === "active"
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {normalizedStatus === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Calendar size={12} />
                Created At
              </p>
              <p className="text-sm text-gray-700">
                {formatDate(partnerData?.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPartner;
