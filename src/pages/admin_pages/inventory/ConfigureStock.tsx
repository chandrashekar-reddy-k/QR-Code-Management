import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  SearchInput,
  Button,
  Pagination
} from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import procurementService from '../vsms/services/procurementService';

interface ConfigureStockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  image: string;
}

const ConfigureStock: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ConfigureStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await procurementService.getUnconfiguredGRNItems();
      if (res.data?.success) {
        const items = res.data.data.map((item: any) => ({
          id: item.id,
          name: item.product?.name || 'Unknown',
          sku: item.product?.sku || 'Unknown',
          category: item.product?.category?.name || item.product?.category || 'Unknown',
          quantity: item.receivedQty || 0,
          unit: item.product?.unit || 'Units',
          price: item.grn?.po?.totalAmount || 0, // Fallback
          image: item.product?.name?.[0]?.toUpperCase() || 'P'
        }));
        setData(items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleConfigure = async (type: 'BRANDED' | 'NON-BRANDED') => {
    if (!selectedItems.length) return;
    try {
      setLoading(true);
      const payload = {
        items: selectedItems.map(id => ({ grnItemId: id, type }))
      };
      const res = await procurementService.configureGRNItemsToRaw(payload);
      if (res.data?.success) {
        setSelectedItems([]);
        navigate('/inventory/raw');
      }
    } catch (error) {
      console.error("Configuration failed", error);
    } finally {
      setLoading(false);
      fetchItems();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
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
        const aValue = a[sortField as keyof ConfigureStockItem];
        const bValue = b[sortField as keyof ConfigureStockItem];
        
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

  const columns = [
    {
      key: 'checkbox',
      label: (
        <input 
          type="checkbox" 
          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
          checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
          onChange={toggleAll}
        />
      ),
      sortable: false,
      render: (item: ConfigureStockItem) => {
        const isSelected = selectedItems.includes(item.id);
        return (
          <input 
            type="checkbox" 
            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
          />
        );
      }
    },
    {
      key: 'name',
      label: 'STOCK NAME',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-lg">
            {item.image}
          </div>
          <span className="text-sm font-medium text-gray-700">{item.name}</span>
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-[#0066cc] hover:underline cursor-pointer">{item.sku}</span>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-500">{item.category}</span>
      )
    },
    {
      key: 'quantity',
      label: 'QUANTITY',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-600">{item.quantity}</span>
      )
    },
    {
      key: 'unit',
      label: 'UNIT',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-500">{item.unit}</span>
      )
    },
    {
      key: 'price',
      label: 'PURCHASE PRICE (₹)',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-600">{item.price}</span>
      )
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start">
          <button 
            onClick={() => navigate('/inventory/raw')}
            className="mr-3 mt-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Configure Stock</h1>
            <p className="text-gray-500 text-sm hidden sm:block">Select procured stock items and mark them as Branded or Unbranded to add to Raw Inventory.</p>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>
          
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[120px] cursor-pointer">
              <option>Unit</option>
              <option>Packets</option>
              <option>kg</option>
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
            loading={loading}
            keyExtractor={(item) => item.id}
            emptyMessage="No items to configure"
          />
        </div>

        {/* Selection Bar or Pagination */}
        {selectedItems.length > 0 ? (
          <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold text-gray-900">{selectedItems.length}</span>
              <span className="text-gray-500 ml-1">items selected</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="primary" 
                disabled={loading}
                onClick={() => handleConfigure('NON-BRANDED')}
                className="bg-[#ea580c] hover:bg-orange-700 text-white border-none flex items-center gap-2 px-5 py-2"
              >
                <Package size={16} />
                Mark as Unbranded
              </Button>
              <Button 
                variant="primary" 
                disabled={loading}
                onClick={() => handleConfigure('BRANDED')}
                className="bg-[#0f9d58] hover:bg-green-700 text-white border-none flex items-center gap-2 px-5 py-2"
              >
                <Package size={16} />
                Mark as Branded
              </Button>
            </div>
          </div>
        ) : (
          filteredAndSortedData.length > 0 && (
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
          )
        )}
      </div>
    </div>
  );
};

export default ConfigureStock;
