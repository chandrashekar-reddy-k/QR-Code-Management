// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Search, Calendar, RefreshCw, Download, 
  Package, IndianRupee, ShoppingCart, User, Layers, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const safeNum = (val) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (val) => {
  return `₹${safeNum(val).toLocaleString()}`;
};

const formatNumber = (val) => {
  return safeNum(val).toLocaleString();
};

export default function VehicleWiseReport({ initialSubTab = 'sales' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const subTabFromUrl = searchParams.get('subTab') || initialSubTab;

  const [activeSubTab, setActiveSubTab] = useState(subTabFromUrl);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickPreset, setQuickPreset] = useState('30days');
  const [isLoading, setIsLoading] = useState(false);

  // Data states for 5 sub-reports
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  // Sync activeSubTab when URL subTab changes
  useEffect(() => {
    if (searchParams.get('subTab')) {
      setActiveSubTab(searchParams.get('subTab'));
    }
  }, [searchParams]);

  const handleSubTabChange = (newTab) => {
    setActiveSubTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'vehicle-wise');
    newParams.set('subTab', newTab);
    setSearchParams(newParams);
  };

  // Quick Presets
  const handleQuickPreset = (preset) => {
    setQuickPreset(preset);
    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = formatDateStr(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'yesterday') {
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      const dStr = formatDateStr(yest);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      setStartDate(formatDateStr(past));
      setEndDate(formatDateStr(today));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      setStartDate(formatDateStr(past));
      setEndDate(formatDateStr(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Initialize 30 days preset
  useEffect(() => {
    handleQuickPreset('30days');
  }, []);

  // Fetch vehicles dropdown
  useEffect(() => {
    const fetchVehiclesList = async () => {
      try {
        const res = await adminAPI.getVehicles({ storeId });
        setVehicles(res.data || []);
      } catch (err) {
        console.error('Failed to load vehicles list', err);
      }
    };
    fetchVehiclesList();
  }, [storeId]);

  // Main data fetch based on activeSubTab
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = {
        vehicleId: selectedVehicleId,
        storeId,
        search: searchQuery
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let res;
      if (activeSubTab === 'sales') {
        res = await adminAPI.getVehicleSalesSummaryReport(params);
      } else if (activeSubTab === 'opening-stock') {
        res = await adminAPI.getVehicleOpeningStockReport(params);
      } else if (activeSubTab === 'current-stock') {
        res = await adminAPI.getVehicleCurrentStockReport(params);
      } else if (activeSubTab === 'loading') {
        res = await adminAPI.getVehicleStockMovementReport({ ...params, type: 'LOAD' });
      } else if (activeSubTab === 'refilling') {
        res = await adminAPI.getVehicleStockMovementReport({ ...params, type: 'REFILL' });
      } else if (activeSubTab === 'item-sales') {
        res = await adminAPI.getVehicleItemSalesReport(params);
      }

      if (res?.data?.success) {
        setReportData(res.data.data || []);
        setSummaryData(res.data.summary || null);
      } else {
        setReportData([]);
        setSummaryData(null);
      }
    } catch (error) {
      console.error('Failed to load vehicle report:', error);
      toast.error('Failed to load report data');
      setReportData([]);
      setSummaryData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab, selectedVehicleId, storeId, startDate, endDate]);

  // Filter reportData locally with searchQuery if present
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase().trim();
    return reportData.filter((item) => {
      return (
        (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(q)) ||
        (item.vehicleName && item.vehicleName.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.driverName && item.driverName.toLowerCase().includes(q))
      );
    });
  }, [reportData, searchQuery]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    let excelRows = [];
    let fileName = `Vehicle_${activeSubTab}_Report`;

    if (activeSubTab === 'sales') {
      fileName = 'Vehicle_Wise_Sales_Report';
      excelRows = filteredData.map((r) => ({
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Display ID': r.displayId,
        'Warehouse/Store': r.storeName,
        'Driver / Agent': r.driverName,
        'Orders Count': r.orderCount,
        'Total Items Sold': r.totalItemsSold,
        'Total Sales (₹)': r.totalSales,
        'Cash Sales (₹)': r.cashSales,
        'UPI Sales (₹)': r.upiSales,
        'Card Sales (₹)': r.cardSales,
        'Credit Sales (₹)': r.creditSales,
      }));
    } else if (activeSubTab === 'opening-stock') {
      fileName = 'Vehicle_Opening_Stock_Report';
      excelRows = filteredData.map((r) => ({
        'Date & Time': r.date ? new Date(r.date).toLocaleString() : '—',
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Warehouse/Store': r.storeName,
        'Driver / Agent': r.driverName,
        'Product Name': r.productName,
        'SKU': r.sku,
        'Category': r.category,
        'Unit Price (₹)': r.price,
        'Opening Qty Loaded': r.openingQuantity,
        'Opening Stock Value (₹)': r.openingValue,
        'Current Live Stock': r.currentStock,
        'Current Stock Value (₹)': r.currentValue,
        'Loaded By': r.loadedBy || '—',
      }));
    } else if (activeSubTab === 'current-stock') {
      fileName = 'Vehicle_Current_Stock_Report';
      excelRows = filteredData.map((r) => ({
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Warehouse/Store': r.storeName,
        'Driver / Agent': r.driverName,
        'Product Name': r.productName,
        'SKU': r.sku,
        'Category': r.category,
        'Unit Price (₹)': r.price,
        'Current Stock Qty': r.currentStock,
        'Opening Qty': r.openingQuantity,
        'Stock Value (₹)': r.stockValue,
      }));
    } else if (activeSubTab === 'loading') {
      fileName = 'Vehicle_Loading_Report';
      excelRows = filteredData.map((r) => ({
        'Date & Time': r.date ? new Date(r.date).toLocaleString() : '—',
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Product Name': r.productName,
        'SKU': r.sku,
        'Category': r.category,
        'Loaded Quantity': r.quantity,
        'Unit Price (₹)': r.unitPrice,
        'Total Loaded Value (₹)': r.totalValue,
        'Handled By': r.handledBy,
      }));
    } else if (activeSubTab === 'refilling') {
      fileName = 'Vehicle_Refilling_Report';
      excelRows = filteredData.map((r) => ({
        'Date & Time': r.date ? new Date(r.date).toLocaleString() : '—',
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Product Name': r.productName,
        'SKU': r.sku,
        'Category': r.category,
        'Refilled Quantity': r.quantity,
        'Unit Price (₹)': r.unitPrice,
        'Total Refill Value (₹)': r.totalValue,
        'Handled By': r.handledBy,
      }));
    } else if (activeSubTab === 'item-sales') {
      fileName = 'Vehicle_Item_Wise_Sales_Report';
      excelRows = filteredData.map((r) => ({
        'Date & Time': r.date ? new Date(r.date).toLocaleString() : '—',
        'Vehicle Number': r.vehicleNumber,
        'Vehicle Name': r.vehicleName,
        'Driver / Agent': r.driverName,
        'Product Name': r.productName,
        'SKU': r.sku,
        'Category': r.category,
        'Orders Count': r.orderCount,
        'Sold Quantity': r.totalQuantity,
        'Total Sales Revenue (₹)': r.totalRevenue,
        'Average Price/Unit (₹)': Math.round(r.avgPricePerUnit || 0),
      }));
    }

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report downloaded successfully');
  };

  return (
    <div className="space-y-6">

      {/* KPI Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {activeSubTab === 'sales' && (
            <>
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Sales Revenue</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{formatCurrency(summaryData.totalRevenue)}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">{summaryData.activeVehicles || 0} active vehicles</span>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Orders</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-950">{formatNumber(summaryData.totalOrders)}</h3>
                <span className="text-[10px] text-blue-600 font-semibold">Across all vehicles</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Units Sold</p>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950">{formatNumber(summaryData.totalItems)}</h3>
                <span className="text-[10px] text-purple-600 font-semibold">Item quantities</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Tracked Vehicles</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800">{summaryData.totalVehicles || 0}</h3>
                <span className="text-[10px] text-slate-500 font-semibold">In fleet inventory</span>
              </div>
            </>
          )}

          {activeSubTab === 'opening-stock' && (
            <>
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Total Baseline Opening Qty</p>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-950">{formatNumber(summaryData.totalOpeningQuantity)}</h3>
                <span className="text-[10px] text-indigo-600 font-semibold">Preserved initial allocation</span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Opening Valuation</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{formatCurrency(summaryData.totalOpeningValue)}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">At unit selling price</span>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Current Stock Remaining</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-950">{formatNumber(summaryData.totalCurrentQuantity)}</h3>
                <span className="text-[10px] text-blue-600 font-semibold">Valuation: {formatCurrency(summaryData.totalCurrentValue)}</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Allocated Vehicles</p>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950">{summaryData.uniqueVehicles || 0}</h3>
                <span className="text-[10px] text-purple-600 font-semibold">{summaryData.uniqueProducts || 0} unique SKUs</span>
              </div>
            </>
          )}

          {activeSubTab === 'current-stock' && (
            <>
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Available Units</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{formatNumber(summaryData.totalQuantity)}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">On-board current stock</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Estimated Stock Value</p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-950">{formatCurrency(summaryData.totalValue)}</h3>
                <span className="text-[10px] text-amber-600 font-semibold">At current selling prices</span>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Vehicles with Stock</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-950">{summaryData.uniqueVehicles || 0}</h3>
                <span className="text-[10px] text-blue-600 font-semibold">Stocked substores</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Distinct Products</p>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950">{summaryData.uniqueProducts || 0}</h3>
                <span className="text-[10px] text-purple-600 font-semibold">Unique SKUs in vehicles</span>
              </div>
            </>
          )}

          {(activeSubTab === 'loading' || activeSubTab === 'refilling') && (
            <>
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                  {activeSubTab === 'loading' ? 'Total Loaded Qty' : 'Total Refilled Qty'}
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{formatNumber(summaryData.totalQuantity)}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">Units transferred</span>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Valuation</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-950">{formatCurrency(summaryData.totalValue)}</h3>
                <span className="text-[10px] text-blue-600 font-semibold">Transferred stock value</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Vehicles Involved</p>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950">{summaryData.uniqueVehicles || 0}</h3>
                <span className="text-[10px] text-purple-600 font-semibold">Unique substores</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Transaction Records</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800">{summaryData.totalRecords || 0}</h3>
                <span className="text-[10px] text-slate-500 font-semibold">Movement logs</span>
              </div>
            </>
          )}

          {activeSubTab === 'item-sales' && (
            <>
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Item Sales Revenue</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{formatCurrency(summaryData.totalSoldRevenue)}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">From vehicle sales</span>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Units Sold</p>
                <h3 className="text-xl sm:text-2xl font-black text-blue-950">{formatNumber(summaryData.totalSoldQuantity)}</h3>
                <span className="text-[10px] text-blue-600 font-semibold">All items & variants</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Active Vehicles</p>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950">{summaryData.uniqueVehicles || 0}</h3>
                <span className="text-[10px] text-purple-600 font-semibold">Generated item sales</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Unique SKUs Sold</p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-950">{summaryData.uniqueProducts || 0}</h3>
                <span className="text-[10px] text-amber-600 font-semibold">Item catalog coverage</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vehicle Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
            <Truck size={14} className="text-emerald-600" />
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="text-xs font-semibold bg-transparent focus:outline-none text-gray-800"
            >
              <option value="ALL">All Vehicles ({vehicles.length})</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} {v.vehicleName ? `(${v.vehicleName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets (applicable for date-driven reports) */}
          {activeSubTab !== 'current-stock' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: '7days', label: '7D' },
                { key: '30days', label: '30D' },
                { key: 'all', label: 'All' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleQuickPreset(p.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    quickPreset === p.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Date Pickers */}
          {activeSubTab !== 'current-stock' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickPreset('');
                }}
                className="bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickPreset('');
                }}
                className="bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 bg-white text-gray-600 hover:text-emerald-600 rounded-xl border border-gray-200 hover:border-emerald-200 transition-all"
            title="Reload Report"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Right Search & Export Controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vehicle, product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleExportExcel}
            disabled={isLoading || filteredData.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 whitespace-nowrap"
          >
            <Download size={14} />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400">Loading vehicle report data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center">
            <Truck size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-600">No records found for the selected criteria</p>
            <p className="text-xs text-gray-400 mt-1">Try expanding the date range or choosing a different vehicle filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. Vehicle-wise Sales Table */}
            {activeSubTab === 'sales' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Vehicle Details</th>
                    <th className="py-3.5 px-4">Driver / Agent</th>
                    <th className="py-3.5 px-4 text-center">Orders</th>
                    <th className="py-3.5 px-4 text-center">Items Sold</th>
                    <th className="py-3.5 px-4 text-right">Cash (₹)</th>
                    <th className="py-3.5 px-4 text-right">UPI (₹)</th>
                    <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                    <th className="py-3.5 px-4 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row) => (
                    <tr key={row.vehicleId} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm">{row.vehicleNumber}</div>
                        <div className="text-[11px] text-gray-500 font-medium">
                          {row.vehicleName} • <span className="font-mono text-gray-400">{row.displayId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{row.driverName}</div>
                        <div className="text-[11px] text-gray-400">{row.driverPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {formatNumber(row.orderCount)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                        {formatNumber(row.totalItemsSold)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(row.cashSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(row.upiSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-amber-700">
                        {formatCurrency(row.creditSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-black text-emerald-700">
                          {formatCurrency(row.totalSales)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 1.5 Opening Stock Report Table */}
            {activeSubTab === 'opening-stock' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-center">Opening Qty Loaded</th>
                    <th className="py-3.5 px-4 text-right">Opening Valuation</th>
                    <th className="py-3.5 px-4 text-center">Current Live Stock</th>
                    <th className="py-3.5 px-4">Loaded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {row.date ? new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.vehicleNumber}</div>
                        <div className="text-[11px] text-gray-500">{row.vehicleName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.productName}</div>
                        <div className="text-[11px] font-mono text-gray-400">SKU: {row.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(row.price)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900">
                          {formatNumber(row.openingQuantity)} Units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        {formatCurrency(row.openingValue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          safeNum(row.currentStock) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {formatNumber(row.currentStock)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium text-[11px]">
                        {row.loadedBy || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Current Stock Report Table */}
            {activeSubTab === 'current-stock' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-center">Opening Qty</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.vehicleNumber}</div>
                        <div className="text-[11px] text-gray-500">{row.vehicleName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.productName}</div>
                        <div className="text-[11px] font-mono text-gray-400">SKU: {row.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(row.price)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500 font-medium">
                        {formatNumber(row.openingQuantity)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          safeNum(row.currentStock) > 10 ? 'bg-emerald-100 text-emerald-800' :
                          safeNum(row.currentStock) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {formatNumber(row.currentStock)} Units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        {formatCurrency(row.stockValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3 & 4. Loading / Refilling Report Table */}
            {(activeSubTab === 'loading' || activeSubTab === 'refilling') && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Item Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">
                      {activeSubTab === 'loading' ? 'Loaded Quantity' : 'Refilled Quantity'}
                    </th>
                    <th className="py-3.5 px-4 text-right">Unit Price</th>
                    <th className="py-3.5 px-4 text-right">Total Transferred Value</th>
                    <th className="py-3.5 px-4">Handled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {row.date ? new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.vehicleNumber}</div>
                        <div className="text-[11px] text-gray-500">{row.vehicleName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.productName}</div>
                        <div className="text-[11px] font-mono text-gray-400">SKU: {row.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900">
                          +{formatNumber(row.quantity)} Units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(row.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        {formatCurrency(row.totalValue)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{row.handledBy}</div>
                        <div className="text-[11px] text-gray-400">{row.userRole}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. Item-wise Sales Report Table */}
            {activeSubTab === 'item-sales' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Orders Count</th>
                    <th className="py-3.5 px-4 text-center">Total Quantity Sold</th>
                    <th className="py-3.5 px-4 text-right">Average Price (₹)</th>
                    <th className="py-3.5 px-4 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {row.date ? new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.vehicleNumber}</div>
                        <div className="text-[11px] text-gray-500">{row.vehicleName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{row.productName}</div>
                        <div className="text-[11px] font-mono text-gray-400">SKU: {row.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {formatNumber(row.orderCount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900">
                          {formatNumber(row.totalQuantity)} Sold
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                        {formatCurrency(Math.round(row.avgPricePerUnit || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-black text-emerald-700">
                          {formatCurrency(row.totalRevenue)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
