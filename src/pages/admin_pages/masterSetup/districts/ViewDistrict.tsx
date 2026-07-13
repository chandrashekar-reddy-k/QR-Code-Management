import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import BackButton from "../../../../components/common/BackButton";
import { Badge } from "../../../../components/ui";
import { formatDate } from "../../../../utils/formatters";
import { useGetDistrictDetailsById } from "../../../../hooks/district";

// Interface for API response
interface DistrictResponse {
  id: string;
  districtName: string;
  state: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// Interface for hook response data structure
interface DistrictResponseData {
  data: DistrictResponse;
  [key: string]: unknown;
}

const ViewDistrict = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetDistrictDetailsById(id || "");

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as DistrictResponseData;
  const district = responseData?.data;

  // Format date for display
  const formatDateDisplay = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return formatDate(dateString, "DD-MM-YYYY, HH:mm A");
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading district...
          </p>
        </div>
      </div>
    );
  }

  if (!district) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            District not found
          </p>
          <BackButton to="/master-setup/districts" />
        </div>
      </div>
    );
  }

  // Normalize status: API returns "ACTIVE"/"INACTIVE" (uppercase), convert to lowercase
  const status = district.status === "ACTIVE" ? "active" : "inactive";

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Back Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          District Details{" "}
          <span className="text-gray-500">
            #{district.id?.slice(0, 8)}...
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <Badge
            status={status}
            size="sm"
            customColor={
              status === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : "bg-gray-100 text-gray-800"
            }
            className="rounded"
          />
          <BackButton to="/master-setup/districts" />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin
                  size={18}
                  className="text-orange-600 dark:text-orange-400"
                />
                Basic Information
              </h2>
              <Badge
                status={status}
                size="sm"
                customColor={
                  status === "active"
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-gray-100 text-gray-800"
                }
                className="rounded"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  District ID
                </p>
                <p
                  className="text-sm text-gray-800"
                  title={district.id}
                >
                  {district.id?.slice(0, 8)}...
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  District Name
                </p>
                <p className="text-sm text-gray-800">
                  {district.districtName || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  State
                </p>
                <p className="text-sm text-gray-800">
                  {district.state || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Status
                </p>
                <Badge
                  status={status}
                  size="sm"
                  customColor={
                    status === "active"
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                      : "bg-gray-100 text-gray-800"
                  }
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timestamps */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Timestamps Card */}
          {district.createdAt && district.updatedAt && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200 flex items-center gap-2">
                <Calendar
                  size={18}
                  className="text-orange-600 dark:text-orange-400"
                />
                Timestamps
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-500">
                    Created At:
                  </p>
                  <p className="text-sm text-gray-800">
                    {formatDateDisplay(district.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-500">
                    Updated At:
                  </p>
                  <p className="text-sm text-gray-800">
                    {formatDateDisplay(district.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewDistrict;
