import { useState, useMemo, useEffect } from 'react';
import { Plus, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  SearchInput,
  DataTable,
  Pagination,
  StatCard,
  PrimaryButton,
  ConfirmModal,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
} from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

interface SEOSetting {
  id: number;
  pageType: string;
  metaTitle: string;
  metaKeywords: string;
  schemaMarkup: string;
  metaDescription: string;
  ogImage: string;
}

// Mock data
const mockSEOSettings: SEOSetting[] = [
  {
    id: 1,
    pageType: 'Home',
    metaTitle: 'VillagKart - Online Shopping for Rural & Urban Communities',
    metaKeywords: 'online shopping, ecommerce, rural marketplace, villagkart',
    schemaMarkup: '{"@type":"WebSite","name":"VillagKart"}',
    metaDescription: 'Shop quality products from rural and urban communities. Fast delivery, secure payments, and 24/7 customer support.',
    ogImage: '/images/og-home.jpg',
  },
  {
    id: 2,
    pageType: 'Products',
    metaTitle: 'Products - VillagKart Online Store',
    metaKeywords: 'products, shopping, buy online, villagkart products',
    schemaMarkup: '{"@type":"ItemList","name":"Products"}',
    metaDescription: 'Browse our wide range of quality products. Find the best deals and offers on your favorite items.',
    ogImage: '/images/og-products.jpg',
  },
  {
    id: 3,
    pageType: 'About Us',
    metaTitle: 'About Us - VillagKart',
    metaKeywords: 'about us, company, villagkart, mission, vision',
    schemaMarkup: '{"@type":"AboutPage","name":"About VillagKart"}',
    metaDescription: 'Learn about VillagKart, our mission to bridge rural and urban communities through quality products and excellent service.',
    ogImage: '/images/og-about.jpg',
  },
  {
    id: 4,
    pageType: 'Contact Us',
    metaTitle: 'Contact Us - VillagKart Customer Support',
    metaKeywords: 'contact, support, help, customer service, villagkart',
    schemaMarkup: '{"@type":"ContactPage","name":"Contact VillagKart"}',
    metaDescription: 'Get in touch with VillagKart customer support. We are here to help with any questions or concerns.',
    ogImage: '/images/og-contact.jpg',
  },
];

const SEOSettings = () => {
  const navigate = useNavigate();
  const [seoSettings, setSeoSettings] = useState<SEOSetting[]>(mockSEOSettings);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchSEOSettings();
  }, []);

  const fetchSEOSettings = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      setSeoSettings(mockSEOSettings);
    } catch (error: unknown) {
      console.error('Error fetching SEO settings:', error);
      setSeoSettings(mockSEOSettings);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredAndSortedSettings = useMemo(() => {
    const filtered = seoSettings.filter((setting) =>
      setting.pageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.metaTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.metaKeywords.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number = a[sortField as keyof SEOSetting] as string | number;
      let bValue: string | number = b[sortField as keyof SEOSetting] as string | number;
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [seoSettings, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedSettings.length / itemsPerPage)
  );
  const paginatedSettings = filteredAndSortedSettings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // Using mock data for now - replace with API call when ready
      setSeoSettings(seoSettings.filter((setting) => setting.id !== deleteConfirm.id));
      alert('SEO setting deleted successfully!');
    } catch (error: unknown) {
      console.error('Error deleting SEO setting:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Error deleting SEO setting. Please try again.';
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const totalSettings = seoSettings.length;
    return [
      {
        title: 'Total SEO Settings',
        value: totalSettings.toLocaleString(),
        icon: Globe,
        variant: 'blue' as const,
      },
    ];
  }, [seoSettings]);

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{setting.id}</span>
        </div>
      ),
    },
    {
      key: 'pageType',
      label: 'PAGE TYPE',
      sortable: true,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
            {setting.pageType}
          </span>
        </div>
      ),
    },
    {
      key: 'metaTitle',
      label: 'META TITLE',
      sortable: true,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block mx-auto" title={setting.metaTitle}>
            {setting.metaTitle}
          </span>
        </div>
      ),
    },
    {
      key: 'metaKeywords',
      label: 'META KEYWORDS',
      sortable: true,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block mx-auto" title={setting.metaKeywords}>
            {setting.metaKeywords}
          </span>
        </div>
      ),
    },
    {
      key: 'schemaMarkup',
      label: 'SCHEMA MARKUP',
      sortable: false,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block mx-auto font-mono" title={setting.schemaMarkup}>
            {setting.schemaMarkup.substring(0, 50)}...
          </span>
        </div>
      ),
    },
    {
      key: 'metaDescription',
      label: 'META DESCRIPTION',
      sortable: false,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block mx-auto" title={setting.metaDescription}>
            {setting.metaDescription.substring(0, 50)}...
          </span>
        </div>
      ),
    },
    {
      key: 'ogImage',
      label: 'OG IMAGE',
      sortable: false,
      render: (setting: SEOSetting) => (
        <div className="flex items-center justify-center">
          <img
            src={setting.ogImage}
            alt={setting.pageType}
            className="w-12 h-12 object-cover rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50';
            }}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (setting: SEOSetting) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <EditIconButton
              onClick={() => navigate(`/system/seo-settings/edit/${setting.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(setting.id)}
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
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            SEO Settings
          </h1>
          <PrimaryButton
            onClick={() => navigate('/system/seo-settings/add')}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add SEO</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </div>

      {/* Search Bar */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* SEO Settings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSettings}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(setting) => setting.id.toString()}
            emptyMessage="No SEO settings found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedSettings.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-16 sm:w-20 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedSettings.length
                  )}{' '}
                  of {filteredAndSortedSettings.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredAndSortedSettings.length}
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
        title="Delete SEO Setting"
        message="Are you sure you want to delete this SEO setting?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SEOSettings;

