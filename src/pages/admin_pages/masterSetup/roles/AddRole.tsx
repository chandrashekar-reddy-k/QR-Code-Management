import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  FormSectionWithDots,
} from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import BackButton from "../../../../components/common/BackButton";
import { roleSchema } from "../../../../validationSchema/role";
import {
  useCreateRole,
  useGetRoleDetailsById,
  useUpdateRole,
} from "../../../../hooks/role";

// Interface for form inputs
interface RoleFormInputs {
  name: string;
  permissions: string[];
}

// Interface for API permission payload
interface ApiPermission {
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// Interface for API payload
interface ApiRolePayload {
  name: string;
  permissions: ApiPermission[];
}

// Interface for API response
interface ApiRoleResponse {
  id: string;
  name: string;
  permissions: ApiPermission[];
  [key: string]: unknown;
}

// Interface for the hook response data structure
interface RoleResponseData {
  data: ApiRoleResponse;
  [key: string]: unknown;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  moduleId?: string; // Optional moduleId for mapping
}

// Available permissions for e-commerce
const availablePermissions: Permission[] = [
  {
    id: "dashboard.view",
    name: "View Dashboard",
    description: "Access to dashboard and analytics",
    category: "Dashboard",
  },
  {
    id: "products.view",
    name: "View Products",
    description: "View product listings",
    category: "Products",
  },
  {
    id: "products.create",
    name: "Create Products",
    description: "Add new products",
    category: "Products",
  },
  {
    id: "products.edit",
    name: "Edit Products",
    description: "Modify existing products",
    category: "Products",
  },
  {
    id: "products.delete",
    name: "Delete Products",
    description: "Remove products",
    category: "Products",
  },
  {
    id: "products.approve",
    name: "Approve Products",
    description: "Approve product requests",
    category: "Products",
  },
  {
    id: "categories.view",
    name: "View Categories",
    description: "View category listings",
    category: "Categories",
  },
  {
    id: "categories.create",
    name: "Create Categories",
    description: "Add new categories",
    category: "Categories",
  },
  {
    id: "categories.edit",
    name: "Edit Categories",
    description: "Modify categories",
    category: "Categories",
  },
  {
    id: "categories.delete",
    name: "Delete Categories",
    description: "Remove categories",
    category: "Categories",
  },
  {
    id: "orders.view",
    name: "View Orders",
    description: "View order listings",
    category: "Orders",
  },
  {
    id: "orders.edit",
    name: "Edit Orders",
    description: "Modify order details",
    category: "Orders",
  },
  {
    id: "orders.cancel",
    name: "Cancel Orders",
    description: "Cancel customer orders",
    category: "Orders",
  },
  {
    id: "orders.refund",
    name: "Process Refunds",
    description: "Handle order refunds",
    category: "Orders",
  },
  {
    id: "vendors.view",
    name: "View Vendors",
    description: "View vendor listings",
    category: "Vendors",
  },
  {
    id: "vendors.create",
    name: "Create Vendors",
    description: "Add new vendors",
    category: "Vendors",
  },
  {
    id: "vendors.edit",
    name: "Edit Vendors",
    description: "Modify vendor details",
    category: "Vendors",
  },
  {
    id: "vendors.approve",
    name: "Approve Vendors",
    description: "Approve vendor requests",
    category: "Vendors",
  },
  {
    id: "vendors.suspend",
    name: "Suspend Vendors",
    description: "Suspend vendor accounts",
    category: "Vendors",
  },
  {
    id: "delivery.view",
    name: "View Delivery Personnel",
    description: "View delivery agent listings",
    category: "Delivery",
  },
  {
    id: "delivery.create",
    name: "Create Delivery Personnel",
    description: "Add new delivery agents",
    category: "Delivery",
  },
  {
    id: "delivery.edit",
    name: "Edit Delivery Personnel",
    description: "Modify delivery agent details",
    category: "Delivery",
  },
  {
    id: "delivery.assign",
    name: "Assign Orders",
    description: "Assign orders to delivery agents",
    category: "Delivery",
  },
  {
    id: "support.view",
    name: "View Support Tickets",
    description: "View customer support tickets",
    category: "Support",
  },
  {
    id: "support.respond",
    name: "Respond to Tickets",
    description: "Respond to customer queries",
    category: "Support",
  },
  {
    id: "support.resolve",
    name: "Resolve Tickets",
    description: "Mark tickets as resolved",
    category: "Support",
  },
  {
    id: "inventory.view",
    name: "View Inventory",
    description: "View inventory levels",
    category: "Inventory",
  },
  {
    id: "inventory.edit",
    name: "Edit Inventory",
    description: "Update inventory levels",
    category: "Inventory",
  },
  {
    id: "inventory.transfer",
    name: "Transfer Inventory",
    description: "Transfer stock between locations",
    category: "Inventory",
  },
  {
    id: "users.view",
    name: "View Users",
    description: "View user listings",
    category: "Users",
  },
  {
    id: "users.create",
    name: "Create Users",
    description: "Add new users",
    category: "Users",
  },
  {
    id: "users.edit",
    name: "Edit Users",
    description: "Modify user details",
    category: "Users",
  },
  {
    id: "users.delete",
    name: "Delete Users",
    description: "Remove users",
    category: "Users",
  },
  {
    id: "roles.view",
    name: "View Roles",
    description: "View role listings",
    category: "Roles",
  },
  {
    id: "roles.create",
    name: "Create Roles",
    description: "Add new roles",
    category: "Roles",
  },
  {
    id: "roles.edit",
    name: "Edit Roles",
    description: "Modify role permissions",
    category: "Roles",
  },
  {
    id: "roles.delete",
    name: "Delete Roles",
    description: "Remove roles",
    category: "Roles",
  },
  {
    id: "reports.view",
    name: "View Reports",
    description: "Access sales and analytics reports",
    category: "Reports",
  },
  {
    id: "reports.export",
    name: "Export Reports",
    description: "Export report data",
    category: "Reports",
  },
  {
    id: "settings.view",
    name: "View Settings",
    description: "Access system settings",
    category: "Settings",
  },
  {
    id: "settings.edit",
    name: "Edit Settings",
    description: "Modify system settings",
    category: "Settings",
  },
];

// Helper function to map permission IDs to API permission structure
// This groups permissions by module and sets the appropriate flags
const transformPermissionsToApiFormat = (
  permissionIds: string[]
): ApiPermission[] => {
  // Group permissions by module prefix (e.g., 'products' from 'products.view')
  const moduleGroups: Record<string, Set<string>> = {};

  permissionIds.forEach((permissionId) => {
    const [module, action] = permissionId.split(".");
    if (module && action) {
      if (!moduleGroups[module]) {
        moduleGroups[module] = new Set();
      }
      moduleGroups[module].add(action);
    }
  });

  // Convert to API format
  // Note: This uses a placeholder moduleId. In production, you should map
  // module names to actual moduleIds from your API
  const moduleIdMap: Record<string, string> = {
    dashboard: "f7e32197-319c-4d28-9c74-082f08e6abe1", // Placeholder - replace with actual moduleId
    products: "a3985f14-c755-4d3f-b779-95a4e079135b", // Placeholder - replace with actual moduleId
    categories: "b3985f14-c755-4d3f-b779-95a4e079135c", // Placeholder
    orders: "c3985f14-c755-4d3f-b779-95a4e079135d", // Placeholder
    vendors: "d3985f14-c755-4d3f-b779-95a4e079135e", // Placeholder
    delivery: "e3985f14-c755-4d3f-b779-95a4e079135f", // Placeholder
    support: "f3985f14-c755-4d3f-b779-95a4e0791360", // Placeholder
    inventory: "03985f14-c755-4d3f-b779-95a4e0791361", // Placeholder
    users: "13985f14-c755-4d3f-b779-95a4e0791362", // Placeholder
    roles: "23985f14-c755-4d3f-b779-95a4e0791363", // Placeholder
    reports: "33985f14-c755-4d3f-b779-95a4e0791364", // Placeholder
    settings: "43985f14-c755-4d3f-b779-95a4e0791365", // Placeholder
  };

  return Object.entries(moduleGroups).map(([module, actions]) => {
    const moduleId =
      moduleIdMap[module] || "00000000-0000-0000-0000-000000000000"; // Fallback

    return {
      moduleId,
      canView: actions.has("view"),
      canCreate: actions.has("create"),
      canUpdate: actions.has("edit") || actions.has("update"),
      canDelete: actions.has("delete"),
    };
  });
};

// Helper function to transform API permissions back to permission IDs
// Note: This function is for future use when implementing edit mode with API data
// It requires a reverse mapping from moduleId to permission IDs
// const transformApiPermissionsToIds = (
//   apiPermissions: ApiPermission[]
// ): string[] => {
//   const permissionIds: string[] = [];
//   // This is a reverse mapping - you'll need the actual module-to-permission mapping
//   // For now, this is a placeholder that would need to be implemented based on your API
//   return permissionIds;
// };

const AddRole = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const { mutate, isPending } = useCreateRole();
  const { mutate: updateRole } = useUpdateRole(id || "");
  const {
    data: editData,
    refetch,
    isLoading: isEditLoading,
  } = useGetRoleDetailsById(id ?? "");

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleFormInputs>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(roleSchema) as any,
    mode: "onChange",
    defaultValues: {
      name: "",
      permissions: [],
    },
  });

  const watchPermissions = watch("permissions");

  // Handle edit mode data binding
  useEffect(() => {
    if (isEditMode && id) {
      refetch();
    }
  }, [id, isEditMode, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (isEditMode && editData) {
      const roleResponseData = editData as RoleResponseData;
      const roleEditData = roleResponseData?.data as ApiRoleResponse;

      if (!roleEditData) return;

      // Set form values
      setValue("name", roleEditData?.name || "");

      // Transform API permissions to permission IDs
      // Note: This requires a reverse mapping from moduleId to permission IDs
      // For now, we'll set an empty array and let the user re-select permissions
      // In production, you should implement transformApiPermissionsToIds
      if (
        roleEditData?.permissions &&
        Array.isArray(roleEditData.permissions)
      ) {
        // Placeholder: You'll need to implement the reverse mapping
        setValue("permissions", []);
      } else {
        setValue("permissions", []);
      }
    }
  }, [editData, isEditMode, setValue]);

  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = watchPermissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((id) => id !== permissionId)
      : [...currentPermissions, permissionId];
    setValue("permissions", newPermissions, { shouldValidate: true });
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);
    const currentPermissions = watchPermissions || [];
    const allSelected = categoryPermissions.every((id) =>
      currentPermissions.includes(id)
    );

    const newPermissions = allSelected
      ? currentPermissions.filter((id) => !categoryPermissions.includes(id))
      : [...new Set([...currentPermissions, ...categoryPermissions])];
    setValue("permissions", newPermissions, { shouldValidate: true });
  };

  const onSubmit = async (data: RoleFormInputs) => {
    try {
      // Prepare payload for API - map form values exactly to API payload structure
      const payload: ApiRolePayload = {
        name: data.name.trim(),
        permissions: transformPermissionsToApiFormat(data.permissions),
      };

      // Add id for edit mode and call appropriate mutation
      if (isEditMode && id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateRole(payload as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutate(payload as any);
      }

      navigate("/master-setup/roles");
    } catch (error: unknown) {
      console.error("Error saving role:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error saving role. Please try again."
      );
    }
  };

  const onError = (errors: Record<string, { message?: string }>) => {
    console.log("Form errors:", errors);
  };

  // Group permissions by category for display
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading role...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Edit Role" : "Add Role"}
        </h1>
        <BackButton to="/master-setup/roles" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Role Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="e.g., Manager"
                    error={errors.name?.message}
                  />
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Permissions Section */}
          <FormSectionWithDots title="Permissions">
            <Controller
              name="permissions"
              control={control}
              render={({ field }) => {
                const selectedPermissions = field.value || [];

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedPermissions.length} of{" "}
                        {availablePermissions.length} selected
                      </span>
                    </div>
                    {errors.permissions && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mb-2">
                        {errors.permissions.message}
                      </p>
                    )}
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-700/50">
                      {Object.entries(groupedPermissions).map(
                        ([category, permissions]) => {
                          const categoryPermissionIds = permissions.map(
                            (p) => p.id
                          );
                          const allSelected = categoryPermissionIds.every(
                            (id) => selectedPermissions.includes(id)
                          );
                          const someSelected = categoryPermissionIds.some(
                            (id) => selectedPermissions.includes(id)
                          );

                          return (
                            <div
                              key={category}
                              className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() => handleCategoryToggle(category)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                    allSelected
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                      : someSelected
                                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  {allSelected ? (
                                    <CheckCircle2 size={12} />
                                  ) : someSelected ? (
                                    <XCircle size={12} />
                                  ) : (
                                    <XCircle size={12} className="opacity-50" />
                                  )}
                                  {category} ({permissions.length})
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                                {permissions.map((permission) => (
                                  <label
                                    key={permission.id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(
                                        permission.id
                                      )}
                                      onChange={() =>
                                        handlePermissionToggle(permission.id)
                                      }
                                      className="w-3 h-3 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-700"
                                    />
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {permission.name}
                                      </span>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </>
                );
              }}
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/master-setup/roles")}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{isEditMode ? "Update Role" : "Create Role"}</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddRole;
