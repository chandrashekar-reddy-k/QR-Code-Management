import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import BackButton from "../../../../components/common/BackButton";
import { Badge } from "../../../../components/ui";
import { formatDate } from "../../../../utils/formatters";
import { useGetAreaDetailsById } from "../../../../hooks/area";

// Interface for API response
interface AreaResponse {
  id: string;
  cityName: string;
  district: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// Interface for hook response data structure
interface AreaResponseData {
  data: AreaResponse;
  [key: string]: unknown;
}

const ViewArea = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetAreaDetailsById(id || "");

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as AreaResponseData;
  const area = responseData?.data;

  // Format date for display
  const formatDateDisplay = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return formatDate(dateString, "DD-MM-YYYY, HH:mm A");
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading area/city...
          </p>
        </div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Area/City not found
          </p>
          <BackButton to="/master-setup/areas" />
        </div>
      </div>
    );
  }

  // Normalize status: API returns "ACTIVE"/"INACTIVE" (uppercase), convert to lowercase
  const status = area.status === "ACTIVE" ? "active" : "inactive";

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Back Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Area/City Details{" "}
          <span className="text-gray-500 dark:text-gray-400">
            #{area.id?.slice(0, 8)}...
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <Badge
            status={status}
            size="sm"
            customColor={
              status === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800"
            }
            className="rounded"
          />
          <BackButton to="/master-setup/areas" />
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <MapPin size={18} className="text-orange-600 dark:text-orange-400" />
                Basic Information
              </h2>
              <Badge
                status={area.status}
                size="sm"
                customColor={area.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800'}
                className="rounded"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Area/City ID
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200" title={area.id}>
                  {area.id?.slice(0, 8)}...
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Area/City Name
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {area.cityName || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  District
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {area.district || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </p>
                <Badge
                  status={status}
                  size="sm"
                  customColor={
                    status === "active"
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800"
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
          {area.createdAt && area.updatedAt && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Calendar size={18} className="text-orange-600 dark:text-orange-400" />
                Timestamps
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Created At:
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {formatDateDisplay(area.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Updated At:
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {formatDateDisplay(area.updatedAt)}
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

export default ViewArea;

