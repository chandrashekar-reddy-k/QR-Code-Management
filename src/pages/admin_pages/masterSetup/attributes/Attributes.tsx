import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Tag, Percent, RefreshCw, Download } from 'lucide-react';
import { StatCard, SearchInput, SelectInput, PrimaryButton, DataTable, Pagination, Badge, ViewIconButton, EditIconButton, DeleteIconButton, ConfirmModal, Button } from '../../../../components/ui';
import Breadcrumbs from '../../../../components/common/Breadcrumbs';
import { useGetAllAttributeList, useDeleteAttribute } from '../../../../hooks/attribute';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import fetchData from '../../../../helper';
import { toast } from 'react-toastify';

// Define the API response type
interface ApiAttribute {
  id: string;
  name: string;
  type: string;
  displayOrder: number;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiStats {
  total: number;
  active: number;
  inactive: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    stats: ApiStats;
    attributes: ApiAttribute[];
  };
  pagination: ApiPagination;
}

// Table attribute type for internal use
interface TableAttribute {
  id: string;
  name: string;
  type: string;
  displayOrder: number;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  status: 'active' | 'inactive';
}

const Attributes = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    const onFocus = () => { refetch && refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [location]);

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, refetch } = useGetAllAttributeList(currentPage, itemsPerPage);
  const { mutate: deleteAttribute, isPending: isDeleting } = useDeleteAttribute();
  const queryClient = useQueryClient();
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      fetchData(`attribute/${id}`, 'PATCH', { status }),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['attribute'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['attribute']);

      // Optimistically update to the new value
      queryClient.setQueryData(['attribute'], (old: any) => {
        if (!old?.data?.attributes) return old;
        return {
          ...old,
          data: {
            ...old.data,
            attributes: old.data.attributes.map((attr: ApiAttribute) =>
              attr.id === id
                ? { ...attr, isActive: status === 'ACTIVE' }
                : attr
            ),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(['attribute'], context.previousData);
      }
      toast.error('Failed to update status');
      setUpdatingStatusId(null);
    },
    onSuccess: () => {
      setUpdatingStatusId(null);
      // Refetch to ensure stats are updated
      queryClient.invalidateQueries({ queryKey: ['attribute'] });
    },
    onSettled: () => {
      setUpdatingStatusId(null);
    },
  });

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;

  const attributes: ApiAttribute[] = apiData?.data?.attributes || [];
  const stats: ApiStats = apiData?.data?.stats || { total: 0, active: 0, inactive: 0 };
  const pagination: ApiPagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };

  // Transform API attributes to table format
  const tableAttributes: TableAttribute[] = useMemo(() => {
    return attributes.map(attribute => ({
      id: attribute.id,
      name: attribute.name,
      type: attribute.type,
      displayOrder: attribute.displayOrder,
      isRequired: attribute.isRequired,
      isFilterable: attribute.isFilterable,
      isSearchable: attribute.isSearchable,
      status: attribute.isActive ? 'active' : 'inactive',
    }));
  }, [attributes]);

  const handleSort = (field: string) => {
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

  // Filter and sort attributes
  const filteredAndSortedAttributes: TableAttribute[] = useMemo(() => {
    let filtered = tableAttributes.filter((attribute) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        attribute.name.toLowerCase().includes(searchLower) ||
        attribute.type.toLowerCase().includes(searchLower) ||
        attribute.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableAttribute, b: TableAttribute) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case 'displayOrder':
            aValue = a.displayOrder;
            bValue = b.displayOrder;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            return 0;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [tableAttributes, searchTerm, sortField, sortDirection]);

  const handleRefresh = async () => {
    if (refetch) {
      refetch();
    }
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Type', 'Display Order', 'Required', 'Filterable', 'Searchable', 'Status'];
    const rows = filteredAndSortedAttributes.map(a => [
      a.id,
      a.name,
      a.type,
      a.displayOrder,
      a.isRequired ? 'Yes' : 'No',
      a.isFilterable ? 'Yes' : 'No',
      a.isSearchable ? 'Yes' : 'No',
      a.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attributes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    
    deleteAttribute(deleteConfirm.id, {
      onSuccess: () => {
        setDeleteConfirm({ isOpen: false, id: null });
      },
      onError: () => {
        // Error is handled by the hook's error handling
        setDeleteConfirm({ isOpen: false, id: null });
      },
    });
  };

  const handleStatusToggle = (attributeId: string, currentStatus: 'active' | 'inactive') => {
    setUpdatingStatusId(attributeId);
    const newStatus = currentStatus === 'active' ? 'INACTIVE' : 'ACTIVE';
    updateStatusMutation.mutate({ id: attributeId, status: newStatus });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'TEXT': 'Text',
      'SINGLE_SELECT': 'Single Select',
      'MULTI_SELECT': 'Multi Select',
      'NUMBER': 'Number',
      'BOOLEAN': 'Boolean',
      'DATE': 'Date',
    };
    return labels[type] || type;
  };

  // Create a map of id to index for serial numbers
  const serialNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredAndSortedAttributes.forEach((attr, index) => {
      map.set(attr.id, index + 1);
    });
    return map;
  }, [filteredAndSortedAttributes]);

  // Table columns
  const columns = [
    {
      key: 'sno',
      label: 'S.NO',
      sortable: false,
      render: (attribute: TableAttribute) => {
        const serialNumber = serialNumberMap.get(attribute.id) || 0;
        return (
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-800">{serialNumber}</span>
          </div>
        );
      },
    },
    {
      key: 'name',
      label: 'ATTRIBUTE NAME',
      sortable: true,
      render: (attribute: TableAttribute) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Tag size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800 break-words">{attribute.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (attribute: TableAttribute) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{getTypeLabel(attribute.type)}</span>
        </div>
      ),
    },
    {
      key: 'displayOrder',
      label: 'DISPLAY ORDER',
      sortable: true,
      render: (attribute: TableAttribute) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{attribute.displayOrder}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (attribute: TableAttribute) => {
        const isActive = attribute.status === 'active';
        const isUpdating = updatingStatusId === attribute.id;
        return (
          <div className="text-center flex items-center justify-center gap-2">
            <button
              onClick={() => handleStatusToggle(attribute.id, attribute.status)}
              disabled={isUpdating}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                ${isActive
                  ? 'bg-orange-600 dark:bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-600'
                }
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={isActive ? 'Click to deactivate' : 'Click to activate'}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isActive ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
            <span className="text-xs text-gray-600">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (attribute: TableAttribute) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/master-setup/attributes/view/${attribute.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/master-setup/attributes/edit/${attribute.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(attribute.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading attributes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Manage Attributes</h1>
        <PrimaryButton
          onClick={() => navigate('/master-setup/attributes/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Attribute</span>
        </PrimaryButton>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Attributes"
          value={stats.total.toLocaleString()}
          icon={Percent}
          variant="purple"
        />
        <StatCard
          title="Active Attributes"
          value={stats.active.toLocaleString()}
          icon={Percent}
          variant="green"
        />
        <StatCard
          title="Inactive Attributes"
          value={stats.inactive.toLocaleString()}
          icon={Percent}
          variant="yellow"
        />
      </div>

      {/* Export/Refresh Buttons and Search Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export and Refresh Buttons - Left */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={`sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search Bar - Right */}
        <div className="flex-1 w-full sm:max-w-md sm:ml-auto">
          <SearchInput
            placeholder="Search attributes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={filteredAndSortedAttributes}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(attribute) => attribute.id}
            emptyMessage="No attributes found"
          />
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 [&_select]:font-medium">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                    ]}
                    className="w-14 sm:w-16 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing <span className="text-orange-600 font-medium">{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}</span> to{' '}
                  <span className="text-orange-600 font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedAttributes.length).toLocaleString()}</span> of{' '}
                  <span className="text-orange-600 font-medium">{filteredAndSortedAttributes.length.toLocaleString()}</span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={pagination.total}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Attribute"
        message="Are you sure you want to delete this attribute? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Attributes;
