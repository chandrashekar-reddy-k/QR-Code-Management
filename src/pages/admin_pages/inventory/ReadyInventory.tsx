import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  SearchInput,
  PrimaryButton,
  Pagination,
  EditIconButton
} from '../../../components/ui';
import { inventoryService } from './services/inventoryService';

interface ReadyInventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  units: string;
  readyQty: string;
  online: string;
  pos: string;
  vehicle: string;
  remainingQty: string;
  image: string;
}


const ReadyInventory: React.FC = () => {
  const [data, setData] = useState<ReadyInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [editingItem, setEditingItem] = useState<ReadyInventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ readyQty: '', online: '0', pos: '0', vehicle: '0' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await inventoryService.getReadyInventory({ page: 1, limit: 100 });
      if (response.data && response.data.data) {
        const mappedData = response.data.data.products.map((item: any) => {
          const totalStock = item.baseStock ?? item.stock ?? 0;
          // Channels start at 0 — user allocates manually
          const onlineQty = item.onlineAppStock?.onlineStock ?? 0;
          const posQty = item.posStoreStock?.posStock ?? 0;
          const vehicleQty = item.vehicleStock ?? 0;
          const remainingQty = totalStock - onlineQty - posQty - vehicleQty;
          return {
            id: item.id,
            name: item.name,
            sku: item.sku || '-',
            category: item.category?.name || 'N/A',
            units: item.unit ? `${totalStock} ${item.unit}` : `${totalStock} units`,
            readyQty: String(totalStock),
            online: String(onlineQty),
            pos: String(posQty),
            vehicle: String(vehicleQty),
            remainingQty: String(Math.max(0, remainingQty)),
            image: item.name ? item.name.charAt(0).toUpperCase() : 'N'
          };
        });
        setData(mappedData);
      }
    } catch (error) {
      console.error('Error fetching ready inventory:', error);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField as keyof ReadyInventoryItem];
        const bValue = b[sortField as keyof ReadyInventoryItem];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pagination = {
    page: currentPage,
    limit: itemsPerPage,
    total: filteredAndSortedData.length,
    totalPages: Math.ceil(filteredAndSortedData.length / itemsPerPage),
    hasNext: currentPage < Math.ceil(filteredAndSortedData.length / itemsPerPage),
    hasPrev: currentPage > 1,
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openEdit = (item: ReadyInventoryItem) => {
    setEditingItem(item);
    setEditForm({ readyQty: item.readyQty, online: item.online, pos: item.pos, vehicle: item.vehicle });
  };

  const closeEdit = () => {
    setEditingItem(null);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const totalQty = Number(editForm.readyQty) || 0;

      await inventoryService.updateProductStock(editingItem.id, totalQty);

      setData(prev => prev.map(p => {
        if (p.id === editingItem.id) {
          const remaining = Math.max(0, totalQty - Number(p.online) - Number(p.pos) - Number(p.vehicle));
          return { ...p, readyQty: String(totalQty), remainingQty: String(remaining) };
        }
        return p;
      }));
      closeEdit();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save allocation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'STOCK NAME',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <div className="min-w-[180px] max-w-[250px]">
          <span className="text-sm font-medium text-gray-800 line-clamp-2" title={item.name}>{item.name}</span>
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.sku}</span>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.category}</span>
      )
    },
    {
      key: 'units',
      label: 'UNITS',
      sortable: false,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.units}</span>
      )
    },
    {
      key: 'readyQty',
      label: 'READY QTY',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm font-semibold text-gray-900">{item.readyQty}</span>
      )
    },
    {
      key: 'online',
      label: '(ONLINE)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-700">{item.online}</span>
      )
    },
    {
      key: 'pos',
      label: '(POS)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-700">{item.pos}</span>
      )
    },
    {
      key: 'vehicle',
      label: '(VEHICLE)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-700">{item.vehicle}</span>
      )
    },
    {
      key: 'remainingQty',
      label: 'REMAINING QTY',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="inline-block px-3 py-1 rounded bg-[#eaf8f1] text-[#20b05e] text-sm font-semibold">
          {item.remainingQty}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'ACTION',
      sortable: false,
      render: (item: ReadyInventoryItem) => (
        <div className="flex justify-center items-center">
          <EditIconButton onClick={() => openEdit(item)} size={16} tooltip="Edit" />
        </div>
      )
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Ready Inventory</h2>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{editingItem.name}</p>
              </div>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Total Ready Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.readyQty}
                  onChange={e => setEditForm(f => ({ ...f, readyQty: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-2">To allocate quantities to sales channels, use the Reserve Stock screen.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-[#008f33] hover:bg-[#007a2a] rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Ready Inventory</h1>
          <p className="text-gray-500 text-sm hidden sm:block">Manage sellable stock and reserve quantities across sales channels (Online, POS and Vehicle Sales).</p>
        </div>
        <PrimaryButton
          onClick={() => navigate('/inventory/ready/reserve')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Lock size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Reserve Stock</span>
        </PrimaryButton>
      </div>


      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>
          
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[120px] cursor-pointer">
              <option>Units</option>
              <option>kg</option>
              <option>g</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-4 h-full text-[#ea580c] hover:bg-orange-50 transition-colors text-sm font-medium cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Filter</span>
          </button>
        </div>
        
        <div className="w-full lg:w-auto lg:min-w-[320px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search...."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-lg"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedData}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={false}
            keyExtractor={(item) => item.id}
            emptyMessage="No stock items found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
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
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedData.length > 0 ? ((currentPage - 1) * itemsPerPage + 1).toLocaleString() : 0}
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
                  pagination={pagination}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadyInventory;
