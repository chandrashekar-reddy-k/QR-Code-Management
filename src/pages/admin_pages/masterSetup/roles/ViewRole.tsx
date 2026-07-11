import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Shield, CheckCircle2, Users, Calendar } from "lucide-react";
import { Badge } from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import BackButton from "../../../../components/common/BackButton";
import { formatDate } from "../../../../utils/formatters";
import { useGetRoleDetailsById } from "../../../../hooks/role";

// Interface for API permission response
interface ApiPermission {
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// Interface for API response
interface RoleResponse {
  id: string;
  name: string;
  description?: string | null;
  permissions: ApiPermission[];
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// Interface for hook response data structure
interface RoleResponseData {
  data: RoleResponse;
  [key: string]: unknown;
}

// Helper function to format module ID for display
const formatModuleId = (moduleId: string): string => {
  return moduleId?.slice(0, 8) + "...";
};

const ViewRole = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useGetRoleDetailsById(id || "");

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as RoleResponseData;
  const role = responseData?.data;

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
            Loading role...
          </p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            Role not found
          </p>
          <BackButton to="/master-setup/roles" />
        </div>
      </div>
    );
  }

  // Normalize status: API returns "ACTIVE"/"INACTIVE" (uppercase), convert to lowercase
  const status = role.status === "ACTIVE" ? "active" : "inactive";

  // Count total permissions (modules with at least one permission enabled)
  const totalPermissions = role.permissions?.length || 0;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Role Details{" "}
          <span className="text-gray-500">
            #{role.id?.slice(0, 8)}...
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
          <BackButton to="/master-setup/roles" />
        </div>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Shield size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>
            
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Role ID
              </p>
              <p
                className="text-sm text-gray-800"
                title={role.id}
              >
                {role.id?.slice(0, 8)}...
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Role Name
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {role.name || "N/A"}
              </p>
            </div>

            {role.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700">
                  {role.description}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Users size={12} />
                Total Permissions
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {totalPermissions} module{totalPermissions !== 1 ? "s" : ""}
              </p>
            </div>

            {role.createdAt && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  Created At
                </p>
                <p className="text-sm text-gray-700">
                  {formatDateDisplay(role.createdAt)}
                </p>
              </div>
            )}

            {role.updatedAt && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  Updated At
                </p>
                <p className="text-sm text-gray-700">
                  {formatDateDisplay(role.updatedAt)}
                </p>
              </div>
            )}

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

          {/* Permissions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-green-600 dark:text-green-400"
              />
              Permissions ({totalPermissions})
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {role.permissions && role.permissions.length > 0 ? (
                role.permissions.map((permission, index) => {
                  const enabledActions = [];
                  if (permission.canView) enabledActions.push("View");
                  if (permission.canCreate) enabledActions.push("Create");
                  if (permission.canUpdate) enabledActions.push("Update");
                  if (permission.canDelete) enabledActions.push("Delete");

                  return (
                    <div
                      key={permission.moduleId || index}
                      className="border border-gray-200 rounded-lg p-3 bg-green-50 dark:bg-green-900/20"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={14}
                          className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-800 mb-1">
                            Module ID:{" "}
                            <span
                              className="font-mono"
                              title={permission.moduleId}
                            >
                              {formatModuleId(permission.moduleId)}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {enabledActions.length > 0 ? (
                              enabledActions.map((action) => (
                                <span
                                  key={action}
                                  className="px-2 py-0.5 text-[10px] rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                >
                                  {action}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-500">
                                No permissions enabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No permissions assigned
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRole;

