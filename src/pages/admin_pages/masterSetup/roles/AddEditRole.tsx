import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader, FormSection, TextInput, SelectInput } from '../../../../components/ui';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Available permissions for e-commerce
const availablePermissions: Permission[] = [
  // Dashboard & Overview
  { id: 'dashboard.view', name: 'View Dashboard', description: 'Access to dashboard and analytics', category: 'Dashboard' },
  
  // Product Management
  { id: 'products.view', name: 'View Products', description: 'View product listings', category: 'Products' },
  { id: 'products.create', name: 'Create Products', description: 'Add new products', category: 'Products' },
  { id: 'products.edit', name: 'Edit Products', description: 'Modify existing products', category: 'Products' },
  { id: 'products.delete', name: 'Delete Products', description: 'Remove products', category: 'Products' },
  { id: 'products.approve', name: 'Approve Products', description: 'Approve product requests', category: 'Products' },
  
  // Category Management
  { id: 'categories.view', name: 'View Categories', description: 'View category listings', category: 'Categories' },
  { id: 'categories.create', name: 'Create Categories', description: 'Add new categories', category: 'Categories' },
  { id: 'categories.edit', name: 'Edit Categories', description: 'Modify categories', category: 'Categories' },
  { id: 'categories.delete', name: 'Delete Categories', description: 'Remove categories', category: 'Categories' },
  
  // Order Management
  { id: 'orders.view', name: 'View Orders', description: 'View order listings', category: 'Orders' },
  { id: 'orders.edit', name: 'Edit Orders', description: 'Modify order details', category: 'Orders' },
  { id: 'orders.cancel', name: 'Cancel Orders', description: 'Cancel customer orders', category: 'Orders' },
  { id: 'orders.refund', name: 'Process Refunds', description: 'Handle order refunds', category: 'Orders' },
  
  // Seller Management
  { id: 'sellers.view', name: 'View Sellers', description: 'View seller listings', category: 'Sellers' },
  { id: 'sellers.create', name: 'Create Sellers', description: 'Add new sellers', category: 'Sellers' },
  { id: 'sellers.edit', name: 'Edit Sellers', description: 'Modify seller details', category: 'Sellers' },
  { id: 'sellers.approve', name: 'Approve Sellers', description: 'Approve seller requests', category: 'Sellers' },
  { id: 'sellers.suspend', name: 'Suspend Sellers', description: 'Suspend seller accounts', category: 'Sellers' },
  
  // Delivery Management
  { id: 'delivery.view', name: 'View Delivery Personnel', description: 'View delivery agent listings', category: 'Delivery' },
  { id: 'delivery.create', name: 'Create Delivery Personnel', description: 'Add new delivery agents', category: 'Delivery' },
  { id: 'delivery.edit', name: 'Edit Delivery Personnel', description: 'Modify delivery agent details', category: 'Delivery' },
  { id: 'delivery.assign', name: 'Assign Orders', description: 'Assign orders to delivery agents', category: 'Delivery' },
  
  // Customer Support
  { id: 'support.view', name: 'View Support Tickets', description: 'View customer support tickets', category: 'Support' },
  { id: 'support.respond', name: 'Respond to Tickets', description: 'Respond to customer queries', category: 'Support' },
  { id: 'support.resolve', name: 'Resolve Tickets', description: 'Mark tickets as resolved', category: 'Support' },
  
  // Inventory Management
  { id: 'inventory.view', name: 'View Inventory', description: 'View inventory levels', category: 'Inventory' },
  { id: 'inventory.edit', name: 'Edit Inventory', description: 'Update inventory levels', category: 'Inventory' },
  { id: 'inventory.transfer', name: 'Transfer Inventory', description: 'Transfer stock between locations', category: 'Inventory' },
  
  // User Management
  { id: 'users.view', name: 'View Users', description: 'View user listings', category: 'Users' },
  { id: 'users.create', name: 'Create Users', description: 'Add new users', category: 'Users' },
  { id: 'users.edit', name: 'Edit Users', description: 'Modify user details', category: 'Users' },
  { id: 'users.delete', name: 'Delete Users', description: 'Remove users', category: 'Users' },
  
  // Role Management
  { id: 'roles.view', name: 'View Roles', description: 'View role listings', category: 'Roles' },
  { id: 'roles.create', name: 'Create Roles', description: 'Add new roles', category: 'Roles' },
  { id: 'roles.edit', name: 'Edit Roles', description: 'Modify role permissions', category: 'Roles' },
  { id: 'roles.delete', name: 'Delete Roles', description: 'Remove roles', category: 'Roles' },
  
  // Reports & Analytics
  { id: 'reports.view', name: 'View Reports', description: 'Access sales and analytics reports', category: 'Reports' },
  { id: 'reports.export', name: 'Export Reports', description: 'Export report data', category: 'Reports' },
  
  // Settings
  { id: 'settings.view', name: 'View Settings', description: 'Access system settings', category: 'Settings' },
  { id: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'Settings' },
];

// Mock data for roles - in real app, fetch from API
const mockRoles: Role[] = [
  {
    id: 1,
    name: 'Admin',
    description: 'Full system access with all permissions',
    permissions: availablePermissions.map(p => p.id),
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Manager',
    description: 'Management access with operational permissions',
    permissions: [
      'dashboard.view',
      'products.view', 'products.create', 'products.edit', 'products.approve',
      'categories.view', 'categories.create', 'categories.edit',
      'orders.view', 'orders.edit', 'orders.cancel', 'orders.refund',
      'sellers.view', 'sellers.approve', 'sellers.suspend',
      'delivery.view', 'delivery.assign',
      'support.view', 'support.respond', 'support.resolve',
      'inventory.view', 'inventory.edit', 'inventory.transfer',
      'reports.view', 'reports.export',
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 3,
    name: 'Seller',
    description: 'Seller access for managing own products and orders',
    permissions: [
      'dashboard.view',
      'products.view', 'products.create', 'products.edit',
      'categories.view',
      'orders.view',
      'inventory.view', 'inventory.edit',
      'reports.view',
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 4,
    name: 'Delivery Personnel',
    description: 'Access for delivery agents to manage assigned orders',
    permissions: [
      'orders.view',
      'delivery.view',
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 5,
    name: 'Customer Support',
    description: 'Access for customer support team to handle tickets and orders',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.edit', 'orders.refund',
      'support.view', 'support.respond', 'support.resolve',
      'users.view',
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

const AddEditRole = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    status: 'active' as 'active' | 'inactive',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      // Fetch role data for editing
      const role = mockRoles.find(r => r.id === parseInt(id || '0'));
      if (role) {
        setFormData({
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          status: role.status,
        });
      } else {
        alert('Role not found');
        navigate('/master-setup/roles');
      }
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);
    const allSelected = categoryPermissions.every((id) => formData.permissions.includes(id));

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((id) => !categoryPermissions.includes(id))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setLoading(true);
        
        alert(isEditMode ? 'Role updated successfully!' : 'Role created successfully!');
        navigate('/master-setup/roles');
      } catch (error: any) {
        console.error('Error saving role:', error);
        alert(error.message || 'Error saving role. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div>
      <PageHeader
        title={isEditMode ? 'Edit Role' : 'Add New Role'}
        description={isEditMode ? 'Update role information and permissions' : 'Create a new role with specific permissions'}
        showBackButton={true}
        onBack={() => navigate('/master-setup/roles')}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <FormSection title="Basic Information" variant="white" className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Role Name"
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Manager"
              error={errors.name}
            />

            <SelectInput
              label="Status"
              required
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectInput>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.description ? 'border-red-300' : 'border-green-300'
              }`}
              placeholder="Describe the role and its responsibilities..."
            />
            {errors.description && <p className="text-[10px] text-red-500 mt-0.5">{errors.description}</p>}
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                Permissions
              </h2>
              <span className="text-xs text-gray-500">
                {formData.permissions.length} of {availablePermissions.length} selected
              </span>
            </div>
            {errors.permissions && <p className="text-[10px] text-red-500 mb-2">{errors.permissions}</p>}

            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
              {Object.entries(groupedPermissions).map(([category, permissions]) => {
                const categoryPermissionIds = permissions.map((p) => p.id);
                const allSelected = categoryPermissionIds.every((id) => formData.permissions.includes(id));
                const someSelected = categoryPermissionIds.some((id) => formData.permissions.includes(id));

                return (
                  <div key={category} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(category)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          allSelected
                            ? 'bg-green-100 text-green-700'
                            : someSelected
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="w-3 h-3 text-gray-600 border-0 rounded focus:ring-gray-400"
                          />
                          <div className="flex-1">
                            <span className="text-xs font-medium text-gray-800">{permission.name}</span>
                            <p className="text-[10px] text-gray-500">{permission.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/master-setup/roles')}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </FormSection>
      </form>
    </div>
  );
};

export default AddEditRole;

