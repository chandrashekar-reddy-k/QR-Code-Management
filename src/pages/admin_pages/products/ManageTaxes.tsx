import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Percent, RefreshCw, Download, FileUp } from 'lucide-react';
import { SearchInput, ConfirmModal, StatCard, ViewIconButton, EditIconButton, DeleteIconButton, DataTable, Pagination, Badge, PrimaryButton, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { useDeleteTax, useGetAllTaxList } from '../../../hooks/tax';

// Define the API response type
interface ApiTax {
  id: string;
  title: string;
  percentage: string | number;
  status: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
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
    taxes: ApiTax[];
  };
  pagination: ApiPagination;
}

// Table tax type for internal use
interface TableTax {
  id: string;
  title: string;
  percentage: number;
  status: 'active' | 'inactive';
}

const ManageTaxes = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { data, isLoading, refetch } = useGetAllTaxList(currentPage, itemsPerPage);
  const { mutate } = useDeleteTax();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => { refetch && refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;
  
  const taxes: ApiTax[] = apiData?.data?.taxes || [];
  const stats: ApiStats = apiData?.data?.stats || { total: 0, active: 0, inactive: 0 };
  const pagination: ApiPagination = apiData?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 1,
    hasNext: false,
    hasPrev: false 
  };

  // Transform API taxes to table format
  const tableTaxes: TableTax[] = useMemo(() => {
    return taxes.map(tax => ({
      id: tax.id,
      title: tax.title,
      percentage: typeof tax.percentage === 'string' ? parseFloat(tax.percentage) || 0 : tax.percentage,
      status: (tax.status?.toLowerCase() === 'active' || tax.status === 'ACTIVE') ? 'active' : 'inactive'
    }));
  }, [taxes]);

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

  // Filter and sort taxes
  const filteredAndSortedTaxes: TableTax[] = useMemo(() => {
    let filtered = tableTaxes.filter((tax) => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        tax.title.toLowerCase().includes(searchLower) ||
        tax.id.toLowerCase().includes(searchLower) ||
        tax.percentage.toString().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableTax, b: TableTax) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'percentage':
            aValue = a.percentage;
            bValue = b.percentage;
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
  }, [tableTaxes, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTaxes.length / itemsPerPage);
  const paginatedTaxes = filteredAndSortedTaxes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export taxes to CSV
  const handleExport = () => {
    const headers = ['ID', 'Title', 'Percentage', 'Status'];
    const rows = taxes.map((t: ApiTax) => [
      t.id,
      t.title,
      typeof t.percentage === 'string' ? t.percentage : t.percentage.toString(),
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `taxes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import taxes from CSV
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            alert('Import functionality needs to be connected to API');
          } catch (error) {
            console.error('Error importing taxes:', error);
            alert('Error importing taxes. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      mutate(deleteConfirm.id);
    } catch (error: any) {
      console.error('Error deleting tax:', error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (tax: TableTax) => {
    navigate(`/products/taxes/${tax.id}/edit`);
  };

  const handleView = (tax: TableTax) => {
    navigate(`/products/taxes/view/${tax.id}`);
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalTaxes = stats.total;
  const activeTaxes = stats.active;
  const inactiveTaxes = stats.inactive;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading taxes...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (tax: TableTax) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {tax.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'TITLE',
      sortable: true,
      render: (tax: TableTax) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800">{tax.title}</span>
        </div>
      ),
    },
    {
      key: 'percentage',
      label: 'PERCENTAGE',
      sortable: true,
      render: (tax: TableTax) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700">{tax.percentage}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: false,
      render: (tax: TableTax) => (
        <div className="text-center">
          <Badge
            status={tax.status}
            size="sm"
            customColor={tax.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (tax: TableTax) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => handleView(tax)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => handleEdit(tax)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(tax.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Taxes</h1>
        <PrimaryButton
          onClick={() => navigate('/products/taxes/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Tax</span>
        </PrimaryButton>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Taxes"
          value={totalTaxes}
          icon={Percent}
          variant="purple"
        />
        <StatCard
          title="Active Taxes"
          value={activeTaxes}
          icon={Percent}
          variant="yellow"
        />
        <StatCard
          title="Inactive Taxes"
          value={inactiveTaxes}
          icon={Percent}
          variant="green"
        />
      </div>

      {/* Search, Refresh, Import/Export Bar */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="text-xs sm:text-sm">Refresh</span>
          </Button>
          <Button
            onClick={handleExport}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 bg-white"
          >
            <Download size={14} />
            <span className="text-xs sm:text-sm">Export</span>
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 bg-white"
          >
            <FileUp size={14} />
            <span className="text-xs sm:text-sm">Import</span>
          </Button>
        </div>
      </div>

      {/* Taxes Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedTaxes}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(tax) => tax.id}
            emptyMessage="No taxes found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedTaxes.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTaxes.length)} of {filteredAndSortedTaxes.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        message="Are you sure you want to delete this tax? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageTaxes;

