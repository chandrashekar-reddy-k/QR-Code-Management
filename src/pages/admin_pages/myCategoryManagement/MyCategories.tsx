import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Box,
  CheckCircle,
  XCircle,
  Filter,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  SelectInput,
  StatCard,
  PrimaryButton,
  Pagination,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

// ---------------- MOCK DATA ----------------
interface Category {
  id: number;
  image: string;
  name: string;
  subtitle: string;
  status: boolean;
}

const mockCategories: Category[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2",
    name: "Fruits & Vegetables",
    subtitle: "Fresh fruits and organic vegetables",
    status: false,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1580910051074-3eb694886505",
    name: "Dairy Products",
    subtitle: "Milk, cheese and dairy items",
    status: false,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc",
    name: "Grains & Pulses",
    subtitle: "Healthy grains and pulses",
    status: false,
  },
];

const MyCategories = () => {
  const navigate = useNavigate();
  const [categories] = useState<Category[]>(mockCategories);

  // Static pagination values (UI only)
  const currentPage = 1;
  const totalPages = 5;
  const itemsPerPage = 10;

  const kpiData = [
    {
      title: "Total Categories",
      value: "14",
      icon: Box,
      variant: "purple" as const,
    },
    {
      title: "Active Categories",
      value: "13",
      icon: CheckCircle,
      variant: "yellow" as const,
    },
    {
      title: "Inactive Categories",
      value: "0",
      icon: XCircle,
      variant: "green" as const,
    },
  ];

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (item: Category) => (
        <div className="text-center">
        <span className="text-sm text-gray-800 dark:text-gray-200">
          {item.id}
        </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      render: (item: Category) => (
                 <div className="flex items-center justify-center">
        <img
          src={item.image}
          alt="category"
          className="w-12 h-12 rounded-lg object-cover"
        />
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (item: Category) => (
         <div className="text-center">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {item.name}
        </span>
        </div>
      ),
    },
    {
      key: "subtitle",
      label: "SUBTITLE",
      sortable: true,
      render: (item: Category) => (
          <div className="text-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {item.subtitle}
        </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: () => (

        <div className="flex justify-center">
          <div className="w-10 h-5 bg-gray-300 rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-2 sm:px-4 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 mb-3 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            My Categories
          </h1>
          <Breadcrumbs />
        </div>

        <PrimaryButton onClick={() => navigate('/my-categories/requests')}  className="flex items-center gap-2">
          <Plus size={16} />
          Request Category
        </PrimaryButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

       {/* FILTERS + SEARCH (UI ONLY) */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* STATUS DROPDOWN */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
              value=""
              onChange={() => {}}
              options={[
                { value: "", label: "Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* CATEGORY DROPDOWN */}
            <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
              value=""
              onChange={() => {}}
              options={[
                { value: "", label: "Category" },
                { value: "1", label: "Fruits" },
                { value: "2", label: "Dairy" },
              ]}
            />
          </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* RESET */}
          <div className="px-4 py-3">
            <button className="flex items-center gap-2 text-orange-600 text-sm">
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        </div>
    {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
            <SearchInput
            placeholder="Search"
            value=""
            onChange={() => {}}
          />
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border overflow-hidden">
        <DataTable
          data={categories}
          columns={columns}
          keyExtractor={(item) => item.id.toString()}
        />

        {/*  PAGINATION UI (ADDED) */}
        <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">

            {/* LEFT SIDE */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="text-gray-600 dark:text-gray-400">Show</span>

              <div className="[&_select]:text-orange-600 [&_select]:px-2 [&_select]:py-1 [&_select]:border [&_select]:rounded-lg [&_select]:w-16 [&_select]:h-7">
                <SelectInput
                  value="10"
                  onChange={() => {}}
                  options={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                  ]}
                />
              </div>

              <span className="text-gray-600 dark:text-gray-400">
                Showing results{" "}
                <span className="text-orange-600 font-medium">10</span> of{" "}
                <span className="text-orange-600 font-medium">14</span>
              </span>
            </div>

            {/* RIGHT SIDE */}
            <div className="w-full sm:w-auto flex justify-center sm:justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={() => {}}
                itemsPerPage={itemsPerPage}
                totalItems={14}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCategories;