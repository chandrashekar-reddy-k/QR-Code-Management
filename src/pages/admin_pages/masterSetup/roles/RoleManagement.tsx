import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, RefreshCw, Download } from 'lucide-react';
import { SearchInput, Button, ConfirmModal, SortableTableHeader, ViewIconButton, EditIconButton, DeleteIconButton, PageHeader } from '../../../../components/ui';

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

type SortField = 'id' | 'name' | 'status' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc' | null;

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
  
  // Vendor Management
  { id: 'vendors.view', name: 'View Vendors', description: 'View vendor listings', category: 'Vendors' },
  { id: 'vendors.create', name: 'Create Vendors', description: 'Add new vendors', category: 'Vendors' },
  { id: 'vendors.edit', name: 'Edit Vendors', description: 'Modify vendor details', category: 'Vendors' },
  { id: 'vendors.approve', name: 'Approve Vendors', description: 'Approve vendor requests', category: 'Vendors' },
  { id: 'vendors.suspend', name: 'Suspend Vendors', description: 'Suspend vendor accounts', category: 'Vendors' },
  
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

// Mock data for roles
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
      'vendors.view', 'vendors.approve', 'vendors.suspend',
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
    name: 'Vendor',
    description: 'Vendor access for managing own products and orders',
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

const RoleManagement = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      setRoles(mockRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles(mockRoles);
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = (role: Role) => {
    navigate(`/master-setup/roles/edit/${role.id}`);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    
    try {
      setRoles(roles.filter((role) => role.id !== deleteConfirm.id));
      alert('Role deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.message || 'Error deleting role. Please try again.');
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleView = (role: Role) => {
    navigate(`/master-setup/roles/view/${role.id}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedRoles = () => {
    let filtered = roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField!];
        let bValue: any = b[sortField!];

        if (sortField === 'createdAt' || sortField === 'updatedAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };


  const getPermissionCount = (role: Role) => {
    return role.permissions.length;
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Permissions Count', 'Status', 'Created At'],
      ...roles.map((role) => [
        role.id.toString(),
        role.name,
        role.description,
        role.permissions.length.toString(),
        role.status,
        new Date(role.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Role Management"
        description="Manage e-commerce roles and permissions"
        action={{
          label: 'Add Role',
          onClick: () => navigate('/master-setup/roles/add'),
          icon: Plus,
          variant: 'primary'
        }}
      />

      {/* Search and Filters */}
      <div className="mb-4 bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <SearchInput
              placeholder="Search roles by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchRoles}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-green-50 border-b border-green-200 dark:border-gray-600">
              <tr>
                <SortableTableHeader
                  field="id"
                  label="ID"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-2 text-left font-semibold text-gray-700 hover:bg-green-100 dark:hover:bg-gray-600 transition-colors"
                />
                <SortableTableHeader
                  field="name"
                  label="Role Name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-2 text-left font-semibold text-gray-700 hover:bg-green-100 dark:hover:bg-gray-600 transition-colors"
                />
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Permissions</th>
                <SortableTableHeader
                  field="status"
                  label="Status"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-2 text-left font-semibold text-gray-700 hover:bg-green-100 dark:hover:bg-gray-600 transition-colors"
                />
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Loading roles...
                  </td>
                </tr>
              ) : getSortedRoles().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No roles found
                  </td>
                </tr>
              ) : (
                getSortedRoles().map((role) => (
                  <tr key={role.id} className="border-b border-gray-100 hover:bg-green-50/50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-3 py-2 text-gray-800 font-medium">{role.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-gray-800">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{role.description}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-medium">
                        {getPermissionCount(role)} permissions
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          role.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {role.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <ViewIconButton
                          onClick={() => handleView(role)}
                          size={14}
                        />
                        <EditIconButton
                          onClick={() => handleEdit(role)}
                          size={14}
                        />
                        <DeleteIconButton
                          onClick={() => handleDeleteClick(role.id)}
                          size={14}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        message="Are you sure you want to delete this role?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default RoleManagement;

