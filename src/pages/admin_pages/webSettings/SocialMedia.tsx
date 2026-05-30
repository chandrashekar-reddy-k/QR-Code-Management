import { useState, useMemo } from "react";
import { Plus, Share2, Filter, ChevronDown, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  SearchInput,
  ConfirmModal,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  StatCard,
  SelectInput,
  Pagination,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

interface SocialMedia {
  id: number;
  icon: string;
  link: string;
}

// Mock data
const mockSocialMedia: SocialMedia[] = [
  {
    id: 1,
    icon: "Facebook",
    link: "https://www.facebook.com/villagkart",
  },
  {
    id: 2,
    icon: "Twitter",
    link: "https://www.twitter.com/villagkart",
  },
  {
    id: 3,
    icon: "Instagram",
    link: "https://www.instagram.com/villagkart",
  },
  {
    id: 4,
    icon: "LinkedIn",
    link: "https://www.linkedin.com/company/villagkart",
  },
  {
    id: 5,
    icon: "YouTube",
    link: "https://www.youtube.com/villagkart",
  },
];

const SocialMedia = () => {
  const navigate = useNavigate();
  const [socialMedia, setSocialMedia] =
    useState<SocialMedia[]>(mockSocialMedia);
  const [searchTerm, setSearchTerm] = useState("");
  const [iconFilter, setIconFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get unique icons for filter
  const uniqueIcons = useMemo(() => {
    const icons = new Set(socialMedia.map((item) => item.icon));
    return Array.from(icons).sort();
  }, [socialMedia]);

  // Filter + sort
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...socialMedia];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.icon.toLowerCase().includes(term) ||
          item.link.toLowerCase().includes(term) ||
          item.id.toString().includes(term)
      );
    }

    // Icon filter
    if (iconFilter) {
      filtered = filtered.filter((item) => item.icon === iconFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "icon":
            aValue = a.icon.toLowerCase();
            bValue = b.icon.toLowerCase();
            break;
          case "link":
            aValue = a.link.toLowerCase();
            bValue = b.link.toLowerCase();
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [socialMedia, searchTerm, iconFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setIconFilter("");
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id === null) return;
    setSocialMedia(socialMedia.filter((item) => item.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const total = socialMedia.length;
    const facebook = socialMedia.filter(
      (item) => item.icon === "Facebook"
    ).length;
    const instagram = socialMedia.filter(
      (item) => item.icon === "Instagram"
    ).length;

    return [
      {
        title: "Total Social Media",
        value: total.toLocaleString(),
        icon: Share2,
        variant: "blue" as const,
      },
      {
        title: "Facebook",
        value: facebook.toLocaleString(),
        icon: Share2,
        variant: "green" as const,
      },
      {
        title: "Instagram",
        value: instagram.toLocaleString(),
        icon: Share2,
        variant: "purple" as const,
      },
    ];
  }, [socialMedia]);

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (item: SocialMedia) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{item.id}</span>
        </div>
      ),
    },
    {
      key: "icon",
      label: "ICON",
      sortable: true,
      render: (item: SocialMedia) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-semibold">
            {item.icon}
          </span>
        </div>
      ),
    },
    {
      key: "link",
      label: "LINK",
      sortable: true,
      render: (item: SocialMedia) => (
        <div className="text-center">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline max-w-xs truncate block mx-auto"
            title={item.link}
          >
            {item.link}
          </a>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (item: SocialMedia) => (
        <div className="flex items-center justify-center gap-2">
          <EditIconButton
            onClick={() =>
              navigate(`/web-settings/social-media/edit/${item.id}`)
            }
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(item.id)}
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
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Social Media
          </h1>
          <PrimaryButton
            onClick={() => navigate("/web-settings/social-media/add")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Social Media</span>
          </PrimaryButton>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="md"
            valueSize="2xl"
          />
        ))}
      </div>

      {/* Filters + Search + Actions */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[720px] overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Icon Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={iconFilter}
                onChange={(e) => setIconFilter(e.target.value)}
                options={[
                  { value: "", label: "Icon" },
                  ...uniqueIcons.map((icon) => ({
                    value: icon,
                    label: icon,
                  })),
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <div className="w-full sm:w-auto lg:min-w-[200px]">
            <SearchInput
              placeholder="Search social media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedData}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(item) => item.id.toString()}
            emptyMessage={
              searchTerm
                ? "No social media links found matching your search"
                : "No social media links found"
            }
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedData.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedData.length}
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
        title="Delete Social Media Link"
        message="Are you sure you want to delete this social media link? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SocialMedia;
