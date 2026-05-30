import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, Wallet, XCircle, Filter, RotateCcw, ChevronDown, Store, Package, MessageSquare, Calendar, Users, Banknote } from 'lucide-react';
import { StatCard, SearchInput, SelectInput, PrimaryButton, DataTable, Pagination, Badge, ViewIconButton, EditIconButton, DeleteIconButton, ConfirmModal } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { formatCurrency, formatDate } from "../../../utils/formatters";
import { WalletTransaction } from '../../../types';

// Mock data for wallet transactions
const mockWalletTransactions: WalletTransaction[] = [
  {
    id: 1,
    vendorId: 1,
    vendorName: 'Rajesh Kumar',
    orderId: 242,
    orderItemId: 500,
    productName: 'Stainless Steel Water Bottle',
    measurement: '1 PC',
    type: 'Credit',
    amount: 122.4,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T07:40:19Z',
  },
  {
    id: 2,
    vendorId: 2,
    vendorName: 'Priya Sharma',
    orderId: 243,
    orderItemId: 501,
    productName: 'Cotton T-Shirt',
    measurement: '1 PC',
    type: 'Credit',
    amount: 89.85,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T08:15:30Z',
  },
  {
    id: 3,
    vendorId: 1,
    vendorName: 'Rajesh Kumar',
    orderId: 244,
    orderItemId: 502,
    productName: 'Wireless Headphones',
    measurement: '1 PC',
    type: 'Credit',
    amount: 374.85,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T09:20:45Z',
  },
  {
    id: 4,
    vendorId: 4,
    vendorName: 'Sneha Reddy',
    orderId: 245,
    orderItemId: 503,
    productName: 'Face Serum',
    measurement: '30ml',
    type: 'Credit',
    amount: 179.82,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T10:30:12Z',
  },
  {
    id: 5,
    vendorId: 3,
    vendorName: 'Amit Patel',
    orderId: 246,
    orderItemId: 504,
    productName: 'Organic Honey',
    measurement: '500g',
    type: 'Credit',
    amount: 49.9,
    message: 'Order Item Commission',
    status: 'Active',
    date: '2025-11-15T11:45:28Z',
  },
  {
    id: 6,
    vendorId: 2,
    vendorName: 'Priya Sharma',
    orderId: 247,
    orderItemId: 505,
    productName: 'Denim Jeans',
    measurement: '1 PC',
    type: 'Debit',
    amount: 250.0,
    message: 'Withdrawal',
    status: 'Active',
    date: '2025-11-15T12:00:00Z',
  },
];

const SellerWalletTransactions = () => {
  const navigate = useNavigate();
  const [transactions] = useState<WalletTransaction[]>(mockWalletTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  // Calculate KPI metrics
  const totalTransactions = transactions.length;
  const creditTransactionsCount = transactions.filter(t => t.type === 'Credit').length;
  const creditTransactionsAmount = transactions
    .filter(t => t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const debitTransactions = transactions.filter(t => t.type === 'Debit').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.id.toString().includes(searchTerm) ||
          t.vendorId.toString().includes(searchTerm) ||
          t.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.orderId.toString().includes(searchTerm) ||
          t.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Date filter (simplified - you can enhance this)
    if (dateFilter) {
      // Add date filtering logic if needed
    }

    // Sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'vendorId':
            aValue = a.vendorId;
            bValue = b.vendorId;
            break;
          case 'vendorName':
            aValue = a.vendorName.toLowerCase();
            bValue = b.vendorName.toLowerCase();
            break;
          case 'orderId':
            aValue = a.orderId;
            bValue = b.orderId;
            break;
          case 'orderItemId':
            aValue = a.orderItemId;
            bValue = b.orderItemId;
            break;
          case 'productName':
            aValue = a.productName.toLowerCase();
            bValue = b.productName.toLowerCase();
            break;
          case 'measurement':
            aValue = a.measurement.toLowerCase();
            bValue = b.measurement.toLowerCase();
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'message':
            aValue = a.message.toLowerCase();
            bValue = b.message.toLowerCase();
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
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
  }, [transactions, searchTerm, typeFilter, statusFilter, dateFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;
    
    try {
      // Using mock data for now - replace with API call when ready
      // await walletTransactionsAPI.delete(deleteConfirm.id);
      alert('Transaction deleted successfully!');
      // In real app, refetch transactions here
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      alert(error.message || 'Error deleting transaction. Please try again.');
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
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{transaction.id}</span>
        </div>
      ),
    },
    {
      key: 'vendorName',
      label: 'VENDOR NAME',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Store size={12} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-words">{transaction.vendorName}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'orderId',
      label: 'ORDER ID',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{transaction.orderId}</span>
        </div>
      ),
    },
    {
      key: 'productName',
      label: 'PRODUCT NAME',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Package size={12} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-words">{transaction.productName}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'measurement',
      label: 'MEASUREMENT',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{transaction.measurement}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <Badge
            status={transaction.type}
            size="sm"
            customColor={transaction.type === 'Credit' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'}
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <DollarSign size={12} className="text-gray-400 dark:text-gray-500" />
            <span className={`text-xs sm:text-sm font-medium ${
              transaction.type === 'Credit' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      label: 'MESSAGE',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <MessageSquare size={12} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-words">{transaction.message}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <Badge
            status={transaction.status}
            size="sm"
            customColor={transaction.status === 'Active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800'}
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: 'date',
      label: 'DATE',
      sortable: true,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {formatDate(transaction.date, 'DD-MM-YYYY, HH:mm A')}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      sortable: false,
      render: (transaction: WalletTransaction) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/vendors/wallet-transactions/view/${transaction.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/vendors/wallet-transactions/edit/${transaction.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => setDeleteConfirm({ isOpen: true, id: transaction.id })}
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
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Vendor Wallet Transactions</h1>
        <PrimaryButton
          onClick={() => navigate('/vendors/wallet-transactions/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Transaction</span>
        </PrimaryButton>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Transactions"
          value={totalTransactions.toLocaleString()}
          icon={RotateCcw}
          variant="green"
        />
        <StatCard
          title="Credit Transactions"
          value={formatCurrency(creditTransactionsAmount)}
          icon={RotateCcw}
          variant="green"
        />
        <StatCard
          title="Debit Transactions"
          value={debitTransactions.toLocaleString()}
          icon={Users}
          variant="yellow"
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={Banknote}
          variant="green"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Date Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: '', label: 'Date' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Type Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: '', label: 'Type' },
                  { value: 'Credit', label: 'Credit' },
                  { value: 'Debit', label: 'Debit' },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Reset Filter Button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search - Beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedTransactions}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(transaction) => transaction.id.toString()}
            emptyMessage="No transactions found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedTransactions.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing <span className="text-orange-600 dark:text-orange-500 font-medium">{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}</span> of{' '}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">{filteredAndSortedTransactions.length.toLocaleString()}</span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedTransactions.length}
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
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SellerWalletTransactions;
