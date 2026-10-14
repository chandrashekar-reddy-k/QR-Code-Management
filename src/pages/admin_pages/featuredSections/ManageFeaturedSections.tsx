import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import { FeaturedSection, SortField, SortDirection } from '../../../types';
import { SearchInput, ConfirmModal, DataTable, StatCard, ViewIconButton, EditIconButton, DeleteIconButton, SelectInput, Pagination, PrimaryButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

import { getStoredFeaturedSections, saveStoredFeaturedSections } from '../../../utils/featuredSectionsStorage';

const ManageFeaturedSections = () => {
  const navigate = useNavigate();
  const [featuredSections, setFeaturedSections] = useState<FeaturedSection[]>(getStoredFeaturedSections);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setFeaturedSections(getStoredFeaturedSections());
  }, []);

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

  const filteredAndSortedSections = useMemo(() => {
    let filtered = featuredSections;

    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.id.toString().includes(searchTerm.toLowerCase()) ||
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.style.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.productType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!sortField || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
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
        case 'shortDescription':
          aValue = a.shortDescription.toLowerCase();
          bValue = b.shortDescription.toLowerCase();
          break;
        case 'style':
          aValue = a.style.toLowerCase();
          bValue = b.style.toLowerCase();
          break;
        case 'productType':
          aValue = a.productType.toLowerCase();
          bValue = b.productType.toLowerCase();
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
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
  }, [featuredSections, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSections.length / itemsPerPage);
  const paginatedSections = filteredAndSortedSections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    
    try {
      const updated = featuredSections.filter(fs => fs.id !== deleteConfirm.id);
      setFeaturedSections(updated);
      saveStoredFeaturedSections(updated);
      alert('Featured section deleted successfully!');
    } catch (error: unknown) {
      console.error('Error deleting featured section:', error);
      const message = error instanceof Error ? error.message : 'Error deleting featured section. Please try again.';
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800">{section.id}</span>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'TITLE',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-left font-semibold text-gray-900">
          <span className="text-xs sm:text-sm">
            {section.title}
          </span>
        </div>
      ),
    },
    {
      key: 'shortDescription',
      label: 'SHORT DESCRIPTION',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-left text-gray-600">
          <span className="text-xs sm:text-sm max-w-xs truncate block" title={section.shortDescription}>
            {section.shortDescription}
          </span>
        </div>
      ),
    },
    {
      key: 'titleType',
      label: 'TYPE',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-left">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {section.titleType || 'SHOP_MORE_UNLOCK_MORE'}
          </span>
        </div>
      ),
    },
    {
      key: 'roleName',
      label: 'ROLE',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-left">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
            {section.roleName || 'CUSTOMER'}
          </span>
        </div>
      ),
    },
    {
      key: 'linkPath',
      label: 'LINK PATH',
      sortable: true,
      render: (section: FeaturedSection) => (
        <div className="text-left font-mono text-xs text-blue-600">
          {section.linkPath || '/coupons'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (section: FeaturedSection) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/featured-sections/view/${section.id}`)}
            size={14}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/featured-sections/edit/${section.id}`)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(section.id)}
            size={14}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-4 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              Featured Sections
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage in-app section titles, descriptions, roles, and deep link paths
            </p>
          </div>
          <PrimaryButton
            onClick={() => navigate('/featured-sections/create')}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Section</span>
          </PrimaryButton>
        </div>
        <Breadcrumbs />
      </div>

      {/* Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-end">
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <div className="w-full sm:w-auto lg:min-w-[200px]">
            <SearchInput
              placeholder="Search featured sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Featured Sections Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSections}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(section) => section.id.toString()}
            emptyMessage={
              searchTerm
                ? "No featured sections found matching your search"
                : "No featured sections found"
            }
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedSections.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 font-medium">
                    {filteredAndSortedSections.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedSections.length}
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
        title="Delete Featured Section"
        message="Are you sure you want to delete this featured section? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageFeaturedSections;

