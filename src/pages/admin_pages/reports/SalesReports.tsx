import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Phone,
  User,
  Store,
  CreditCard,
  Package,
  MapPin,
  Filter,
  RotateCcw,
} from 'lucide-react';
 
import { StatCard, SearchInput, DataTable, SelectInput, Pagination, ViewIconButton } from '../../../components/ui';
import { formatCurrency } from "../../../utils/formatters";
import Breadcrumbs from '../../../components/common/Breadcrumbs';
 
// Mock lookups
const mockSellers = [
  { id: 1, name: 'KADAPA STORES' },
  { id: 2, name: 'Mumbai Mart' },
  { id: 3, name: 'Delhi Store' },
];
 
const mockCategories = [
  { id: 'sports', name: 'Sports' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'grocery', name: 'Grocery' },
];
 
const mockDeliveryBoys = [
  { id: 101, name: 'Ramesh' },
  { id: 102, name: 'Suresh' },
  { id: 103, name: 'Raj' },
];
 
const PAYMENT_METHODS = ['All', 'UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery'] as const;
 
// Mock sales data: one row per order item (so order item id is unique)
const mockSales = [
  {
    orderItemId: 5001,
    orderId: 2001,
    userId: 301,
    userName: 'Rajesh Kumar',
    productName: 'Bowling Pin',
    mobile: '9876543210',
    sellerId: 1,
    sellerName: 'KADAPA STORES',
    category: 'sports',
    deliveryBoyId: 101,
    deliveryBoyName: 'Ramesh',
    paymentMethod: 'UPI',
    total: 15300,
    orderDate: '2025-01-15T10:30:00Z',
  },
  {
    orderItemId: 5002,
    orderId: 2002,
    userId: 302,
    userName: 'Priya Sharma',
    productName: 'Cricket Ball',
    mobile: '9876543211',
    sellerId: 2,
    sellerName: 'Mumbai Mart',
    category: 'sports',
    deliveryBoyId: 102,
    deliveryBoyName: 'Suresh',
    paymentMethod: 'Credit Card',
    total: 500,
    orderDate: '2025-01-20T11:20:00Z',
  },
  {
    orderItemId: 5003,
    orderId: 2003,
    userId: 303,
    userName: 'Amit Patel',
    productName: 'Tennis Racket',
    mobile: '9876543212',
    sellerId: 3,
    sellerName: 'Delhi Store',
    category: 'sports',
    deliveryBoyId: 103,
    deliveryBoyName: 'Raj',
    paymentMethod: 'Cash on Delivery',
    total: 12000,
    orderDate: '2025-01-18T09:15:00Z',
  },
  {
    orderItemId: 5004,
    orderId: 2004,
    userId: 304,
    userName: 'Sneha Reddy',
    productName: 'Headphones',
    mobile: '9876543213',
    sellerId: 3,
    sellerName: 'Delhi Store',
    category: 'electronics',
    deliveryBoyId: 101,
    deliveryBoyName: 'Ramesh',
    paymentMethod: 'Debit Card',
    total: 2500,
    orderDate: '2025-01-19T14:45:00Z',
  },
  {
    orderItemId: 5005,
    orderId: 2005,
    userId: 305,
    userName: 'Vikram Singh',
    productName: 'Organic Rice',
    mobile: '9876543214',
    sellerId: 2,
    sellerName: 'Mumbai Mart',
    category: 'grocery',
    deliveryBoyId: 102,
    deliveryBoyName: 'Suresh',
    paymentMethod: 'UPI',
    total: 1800,
    orderDate: '2025-01-19T08:30:00Z',
  },
];
 
const SalesReports = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState(mockSales);
  const [loading, setLoading] = useState(false);
 
  // filters
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<'all' | string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<'all' | string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
 
  // pagination + sorting (basic)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'orderItemId' | 'userName' | 'productName' | 'total' | 'orderDate' | null>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
 
  useEffect(() => {
    // placeholder: replace with API calls if needed
    setSales(mockSales);
  }, []);
 
  // Filtering logic
  const filtered = useMemo(() => {
    return sales.filter((row) => {
      // search across orderItemId, userName, productName, mobile, sellerName
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        row.orderItemId.toString().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q) ||
        row.mobile.includes(q) ||
        row.sellerName.toLowerCase().includes(q);
 
      const matchesSeller = selectedSeller === 'all' || row.sellerId.toString() === selectedSeller;
      const matchesCategory = selectedCategory === 'all' || row.category === selectedCategory;
      const matchesDeliveryBoy = selectedDeliveryBoy === 'all' || row.deliveryBoyId.toString() === selectedDeliveryBoy;
      const matchesPayment = (selectedPayment === 'All') || row.paymentMethod === selectedPayment;
 
      let matchesDate = true;
      if (dateFilter) {
        const now = new Date();
        const orderDate = new Date(row.orderDate);
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
 
        if (dateFilter === 'today') {
          matchesDate =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'week') {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === 'month') {
          matchesDate = diffDays <= 30;
        }
      }
 
      return matchesSearch && matchesSeller && matchesCategory && matchesDeliveryBoy && matchesPayment && matchesDate;
    });
  }, [sales, searchTerm, selectedSeller, selectedCategory, selectedDeliveryBoy, selectedPayment, dateFilter]);
 
  // sorting
  const sorted = useMemo(() => {
    if (!sortField || !sortDirection) return filtered;
    const copy = [...filtered];
    copy.sort((a: any, b: any) => {
      const aV = a[sortField];
      const bV = b[sortField];
      if (typeof aV === 'number' && typeof bV === 'number') {
        return sortDirection === 'asc' ? aV - bV : bV - aV;
      }
      if (sortField === 'orderDate') {
        const da = new Date(aV).getTime();
        const db = new Date(bV).getTime();
        return sortDirection === 'asc' ? da - db : db - da;
      }
      return sortDirection === 'asc'
        ? String(aV).localeCompare(String(bV), undefined, { numeric: true })
        : String(bV).localeCompare(String(aV), undefined, { numeric: true });
    });
    return copy;
  }, [filtered, sortField, sortDirection]);
 
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
      setSortField(field as typeof sortField);
      setSortDirection('asc');
    }
  };
 
  // pagination
  useEffect(() => setPage(1), [searchTerm, dateFilter, selectedSeller, selectedCategory, selectedDeliveryBoy, selectedPayment]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
 
  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setSelectedSeller('all');
    setSelectedCategory('all');
    setSelectedDeliveryBoy('all');
    setSelectedPayment('All');
    setPage(1);
  };
 
  // KPIs
  const totalOrders = sorted.length;
  const totalRevenue = sorted.reduce((s, r) => s + r.total, 0);
  const uniqueProducts = new Set(sorted.map(s => s.productName)).size;
  const byPayment = sorted.reduce((acc: Record<string, number>, r) => {
    acc[r.paymentMethod] = (acc[r.paymentMethod] || 0) + 1;
    return acc;
  }, {});
 
  // Table columns
  const columns = [
    {
      key: 'orderItemId',
      label: 'ORDER ITEM ID',
      sortable: true,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {row.orderItemId}
          </span>
        </div>
      ),
    },
    {
      key: 'userName',
      label: 'USER',
      sortable: true,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <User size={12} className="text-gray-400" />
            <div>
              <div className="text-xs text-gray-800">{row.userName}</div>
              <div className="text-[10px] text-gray-500">({row.sellerName})</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'productName',
      label: 'PRODUCT',
      sortable: true,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{row.productName}</span>
        </div>
      ),
    },
    {
      key: 'mobile',
      label: 'MOBILE',
      sortable: false,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Phone size={12} className="text-gray-400" />
            <span className="text-xs text-gray-800">{row.mobile}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'TOTAL (₹)',
      sortable: true,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            {formatCurrency(row.total)}
          </span>
        </div>
      ),
    },
    {
      key: 'orderDate',
      label: 'DATE',
      sortable: true,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700">
            {new Date(row.orderDate).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (row: typeof mockSales[0]) => (
        <div className="text-center">
          <ViewIconButton onClick={() => navigate(`/orders/view/${row.orderId}`)} size={12} />
        </div>
      ),
    },
  ];
 
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
          Sales Reports
        </h1>
        <Breadcrumbs />
      </div>
 
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Order Items" value={totalOrders} icon={Package} variant="blue" size="md" valueSize="2xl" />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={MapPin} variant="purple" size="md" valueSize="2xl" />
        <StatCard title="Unique Products" value={uniqueProducts} icon={Store} variant="green" size="md" valueSize="2xl" />
        <StatCard title="Top Payment" value={Object.keys(byPayment).length ? Object.entries(byPayment).sort((a,b)=>b[1]-a[1])[0][0] : '—'} icon={CreditCard} variant="gray" size="md" valueSize="2xl" />
      </div>
 
      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[720px] overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>
 
          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: '', label: 'From & to Date' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>
 
          {/* Seller Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                options={[
                  { value: 'all', label: 'Seller' },
                  ...mockSellers.map(s => ({ value: s.id.toString(), label: s.name })),
                ]}
              />
            </div>
            <ChevronDown className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={16} />
          </div>
 
          {/* Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: 'all', label: 'Category' },
                  ...mockCategories.map(c => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <ChevronDown className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={16} />
          </div>
 
          {/* Delivery Boy Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedDeliveryBoy}
                onChange={(e) => setSelectedDeliveryBoy(e.target.value)}
                options={[
                  { value: 'all', label: 'Delivery Boy' },
                  ...mockDeliveryBoys.map(d => ({ value: d.id.toString(), label: d.name })),
                ]}
              />
            </div>
            <ChevronDown className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={16} />
          </div>
 
          {/* Payment Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                options={PAYMENT_METHODS.map(pm => ({ value: pm, label: pm }))}
              />
            </div>
            <ChevronDown className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={16} />
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
              placeholder="Search order item id, user, product, mobile, seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>
 
      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginated}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(row) => row.orderItemId.toString()}
            emptyMessage={
              searchTerm || dateFilter || selectedSeller !== 'all' || selectedCategory !== 'all' || selectedDeliveryBoy !== 'all' || selectedPayment !== 'All'
                ? "No records found matching your search"
                : "No records found"
            }
            loading={loading}
          />
        </div>
 
        {/* Pagination */}
        {sorted.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={pageSize.toString()}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
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
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {pageSize}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {sorted.length.toLocaleString()}
                  </span>
                </span>
              </div>
 
              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemsPerPage={pageSize}
                  totalItems={sorted.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default SalesReports;
 
 