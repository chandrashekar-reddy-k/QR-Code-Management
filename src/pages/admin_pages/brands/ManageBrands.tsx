import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, RefreshCw, Download, FileUp, Settings, Camera } from 'lucide-react';
import { SearchInput, ConfirmModal, StatCard, ViewIconButton, EditIconButton, DeleteIconButton, DataTable, Pagination, Badge, PrimaryButton, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { useGetAllBrandsList, useDeleteBrands } from '../../../hooks/brands';

// Define the API response type
interface ApiBrand {
  id: string;
  title: string | null;
  name: string;
  image: string | null;
  description: string | null;
  priority: number;
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
    brands: ApiBrand[];
  };
  pagination: ApiPagination;
}

// Table brand type for internal use
interface TableBrand {
  id: string;
  name: string;
  title: string | null;
  image: string | null;
  status: 'active' | 'inactive';
  priority: number;
}

const ManageBrands = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { data, isLoading, refetch } = useGetAllBrandsList(currentPage, itemsPerPage);
  const { mutate: deleteBrand } = useDeleteBrands();

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;
  
  const brands: ApiBrand[] = apiData?.data?.brands || [];
  const stats: ApiStats = apiData?.data?.stats || { total: 0, active: 0, inactive: 0 };
  const pagination: ApiPagination = apiData?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 1,
    hasNext: false,
    hasPrev: false 
  };

  // Effect to refetch data when location changes or component mounts
  useEffect(() => {
    if (refetch) {
      refetch();
    }
    
    const onFocus = () => {
      refetch && refetch();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [location, refetch]);

  // Transform API brands to table format
  const tableBrands: TableBrand[] = useMemo(() => {
    return brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      title: brand.title,
      image: brand.image,
      status: brand.isActive ? 'active' : 'inactive',
      priority: brand.priority
    }));
  }, [brands]);

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

  // Filter and sort brands
  const filteredAndSortedBrands: TableBrand[] = useMemo(() => {
    let filtered = tableBrands.filter((brand) => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        brand.name.toLowerCase().includes(searchLower) ||
        (brand.title && brand.title.toLowerCase().includes(searchLower)) ||
        brand.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableBrand, b: TableBrand) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'priority':
            aValue = a.priority;
            bValue = b.priority;
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
  }, [tableBrands, searchTerm, sortField, sortDirection]);

  // Client-side pagination for filtered results
  const totalFilteredPages = Math.ceil(filteredAndSortedBrands.length / itemsPerPage);
  const paginatedBrands = filteredAndSortedBrands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export brands to CSV
  const handleExport = () => {
    const headers = ['ID', 'Name', 'Title', 'Status', 'Priority', 'Created At'];
    const rows = brands.map((brand: ApiBrand) => [
      brand.id,
      brand.name,
      brand.title || '',
      brand.isActive ? 'active' : 'inactive',
      brand.priority,
      new Date(brand.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `brands_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import brands from CSV
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
            console.error('Error importing brands:', error);
            alert('Error importing brands. Please check the file format.');
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
      deleteBrand(deleteConfirm.id);
    } catch (error: any) {
      console.error('Error deleting brand:', error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (brand: TableBrand) => {
    navigate(`/products/brands/${brand.id}/edit`);
  };

  const handleView = (brand: TableBrand) => {
    navigate(`/products/brands/view/${brand.id}`);
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalBrands = stats.total;
  const activeBrands = stats.active;
  const inactiveBrands = stats.inactive;
  const brandsWithImages = brands.filter((brand: ApiBrand) => brand.image).length;

  if (isLoading && !brands.length) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (brand: TableBrand) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 truncate max-w-[120px] mx-auto block">
            {brand.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'NAME',
      sortable: true,
      render: (brand: TableBrand) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800">{brand.name}</span>
          {brand.title && (
            <p className="text-[10px] text-gray-500 mt-0.5">{brand.title}</p>
          )}
        </div>
      ),
    },
    {
      key: 'image',
      label: 'IMAGE',
      sortable: false,
      render: (brand: TableBrand) => (
        <div className="text-center">
          {brand.image ? (
            <img
              src={brand.image}
              alt={brand.name}
              className="w-12 h-12 object-cover rounded mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-[10px] text-gray-400">No image</span>';
                }
              }}
            />
          ) : (
            <span className="text-[10px] text-gray-400">
              No image
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (brand: TableBrand) => (
        <div className="text-center">
          <Badge
            status={brand.status}
            size="sm"
            customColor={brand.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 text-gray-800'}
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'PRIORITY',
      sortable: true,
      render: (brand: TableBrand) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{brand.priority}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (brand: TableBrand) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => handleView(brand)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => handleEdit(brand)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(brand.id)}
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Brands</h1>
        <PrimaryButton
          onClick={() => navigate('/products/brands/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Brand</span>
        </PrimaryButton>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Brands"
          value={totalBrands}
          icon={Settings}
          variant="purple"
        />
        <StatCard
          title="Active Brands"
          value={activeBrands}
          icon={Settings}
          variant="yellow"
        />
        <StatCard
          title="Inactive Brands"
          value={inactiveBrands}
          icon={Settings}
          variant="green"
        />
        <StatCard
          title="With Images"
          value={brandsWithImages}
          icon={Camera}
          variant="red"
        />
      </div>

      {/* Search, Refresh, Import/Export Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export, Import, Refresh Buttons - Left */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
            title="Export to CSV"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
            title="Import from CSV"
          >
            <FileUp size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={`sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search Bar - Right */}
        <div className="w-full sm:w-auto sm:ml-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedBrands}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(brand) => brand.id}
            emptyMessage="No brands found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedBrands.length > 0 && (
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedBrands.length)}{' '}
                  of {filteredAndSortedBrands.length}
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
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageBrands;