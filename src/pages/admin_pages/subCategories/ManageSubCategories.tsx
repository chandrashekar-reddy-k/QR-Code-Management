import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Package, RefreshCw, Download, FileUp, Camera } from 'lucide-react';
import { SearchInput, ConfirmModal, StatCard, ViewIconButton, EditIconButton, DeleteIconButton, DataTable, Pagination, PrimaryButton, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { useDeleteSubCategory, useGetAllSubCategoriesForManage, useToggleSubCategory } from '../../../hooks/subCategory';

// Define the API response type
interface ApiSubCategory {
  id: string;
  name: string;
  slug: string | null;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  icon: string | null;
  colorCode: string | null;
  metaTitle: string | null;
  metaKeyword: string | null;
  schemaMarkup: any;
  metaDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  categoryName: string;
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
    subCategories: ApiSubCategory[];
  };
  pagination: ApiPagination;
}

// Table sub category type for internal use
interface TableSubCategory {
  id: string;
  name: string;
  subtitle: string;
  image: string | null;
  status: 'active' | 'inactive';
  slug: string;
  categoryId: string;
  categoryName: string;
}

const ManageSubCategories = () => {
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
  
  const { data, isLoading, refetch } = useGetAllSubCategoriesForManage(currentPage, itemsPerPage);
  const { mutate } = useDeleteSubCategory();
  const { mutate: toggleSubCategory, isPending: isTogglingSubCategory } = useToggleSubCategory();

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;
  
  const subCategories: ApiSubCategory[] = apiData?.data?.subCategories || [];
  const stats: ApiStats = apiData?.data?.stats || { total: 0, active: 0, inactive: 0 };
  const pagination: ApiPagination = apiData?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 1,
    hasNext: false,
    hasPrev: false 
  };

  // Transform API sub categories to table format
  const tableSubCategories: TableSubCategory[] = useMemo(() => {
    return subCategories.map(subCategory => ({
      id: subCategory.id,
      name: subCategory.name,
      subtitle: subCategory.subtitle || '',
      image: subCategory.image,
      status: subCategory.isActive ? 'active' : 'inactive',
      slug: subCategory.slug || '',
      categoryId: subCategory.categoryId || '',
      categoryName: subCategory.categoryName || ''
    }));
  }, [subCategories]);

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

  // Filter and sort sub categories
  const filteredAndSortedSubCategories: TableSubCategory[] = useMemo(() => {
    let filtered = tableSubCategories.filter((subCategory) => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        subCategory.name.toLowerCase().includes(searchLower) ||
        subCategory.subtitle.toLowerCase().includes(searchLower) ||
        subCategory.id.toLowerCase().includes(searchLower) ||
        subCategory.slug.toLowerCase().includes(searchLower) ||
        subCategory.categoryName.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableSubCategory, b: TableSubCategory) => {
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
          case 'subtitle':
            aValue = a.subtitle.toLowerCase();
            bValue = b.subtitle.toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'categoryName':
            aValue = a.categoryName.toLowerCase();
            bValue = b.categoryName.toLowerCase();
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
  }, [tableSubCategories, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSubCategories.length / itemsPerPage);
  const paginatedSubCategories = filteredAndSortedSubCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export sub categories to CSV
  const handleExport = () => {
    const headers = ['ID', 'Parent Category', 'Name', 'Subtitle', 'Slug', 'Status'];
    const rows = subCategories.map((cat: ApiSubCategory) => [
      cat.id,
      cat.categoryName || '',
      cat.name,
      cat.subtitle || '',
      cat.slug || '',
      cat.isActive ? 'active' : 'inactive',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sub_categories_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import sub categories from CSV
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
            const lines = text.split('\n').filter((line) => line.trim());
            alert('Import functionality needs to be connected to API');
          } catch (error) {
            console.error('Error importing sub categories:', error);
            alert('Error importing sub categories. Please check the file format.');
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
      console.error('Error deleting sub category:', error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (subCategory: TableSubCategory) => {
    navigate(`/categories/sub-categories/${subCategory.id}/edit`);
  };

  const handleView = (subCategory: TableSubCategory) => {
    navigate(`/categories/sub-categories/view/${subCategory.id}`);
  };

  const handleToggleStatus = (id: string, currentStatus: "active" | "inactive") => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    toggleSubCategory(
      { id, newStatus },
      { onSuccess: () => refetch?.() }
    );
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalSubCategories = stats.total;
  const activeSubCategories = stats.active;
  const inactiveSubCategories = stats.inactive;
  const subCategoriesWithImages = subCategories.filter((c: ApiSubCategory) => c.image).length;
  const uniqueParentCategories = new Set(subCategories.map(sc => sc.categoryId)).size;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading sub categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Manage Sub Categories
        </h1>
        <PrimaryButton
          onClick={() => navigate('/categories/sub-categories/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Sub Category</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Sub Categories"
          value={totalSubCategories}
          icon={Package}
          variant="purple"
        />
        <StatCard
          title="Active Sub Categories"
          value={activeSubCategories}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Inactive Sub Categories"
          value={inactiveSubCategories}
          icon={Package}
          variant="green"
        />
        <StatCard
          title="Parent Categories"
          value={uniqueParentCategories}
          icon={Package}
          variant="red"
        />
      </div>

      {/* Action Buttons (Export, Import, Refresh) and Search Bar */}
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
            placeholder="Search sub categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Sub Categories Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSubCategories}
            columns={[
              {
                key: 'id',
                label: 'ID',
                sortable: true,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      {subCategory.id.slice(0, 8)}...
                    </span>
                  </div>
                ),
              },
              {
                key: 'image',
                label: 'IMAGE',
                sortable: false,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    {subCategory.image ? (
                      <img
                        src={subCategory.image}
                        alt={subCategory.name}
                        className="w-10 h-10 object-cover rounded mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = 
                            '<span class="text-[10px] text-gray-400">No image</span>';
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
                key: 'categoryName',
                label: 'PARENT CATEGORY',
                sortable: true,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {subCategory.categoryName || 'No parent'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'name',
                label: 'NAME',
                sortable: true,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {subCategory.name}
                    </span>
                  </div>
                ),
              },
              {
                key: 'subtitle',
                label: 'SUBTITLE',
                sortable: true,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {subCategory.subtitle || 'No subtitle'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'STATUS',
                sortable: true,
                render: (subCategory: TableSubCategory) => {
                  const isActive = subCategory.status === 'active';
                  return (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(subCategory.id, subCategory.status)}
                        disabled={isTogglingSubCategory}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isActive ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} ${isTogglingSubCategory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={isActive ? 'Click to make inactive' : 'Click to make active'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                label: 'ACTIONS',
                sortable: false,
                render: (subCategory: TableSubCategory) => (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ViewIconButton
                        onClick={() => handleView(subCategory)}
                        size={12}
                        tooltip="View"
                      />
                      <EditIconButton
                        onClick={() => handleEdit(subCategory)}
                        size={12}
                        tooltip="Edit"
                      />
                      <DeleteIconButton
                        onClick={() => handleDeleteClick(subCategory.id)}
                        size={12}
                        tooltip="Delete"
                      />
                    </div>
                  </div>
                ),
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(subCategory) => subCategory.id}
            emptyMessage="No sub categories found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedSubCategories.length > 0 && (
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedSubCategories.length)}{' '}
                  of {filteredAndSortedSubCategories.length}
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
        title="Delete Sub Category"
        message="Are you sure you want to delete this sub category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageSubCategories;