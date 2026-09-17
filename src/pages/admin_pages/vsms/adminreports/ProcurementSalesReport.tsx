// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, TrendingUp, Percent, RefreshCw, Search, ArrowUpDown } from 'lucide-react';
import { adminAPI } from '../services/adminService';

export default function ProcurementSalesReport() {
  const [data, setData] = useState({ summary: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedVendor && selectedVendor !== 'ALL') params.vendor = selectedVendor;
      const res = await adminAPI.getProcurementSalesReport(params);
      if (res.data) {
        setData({
          summary: res.data.summary || null,
          vendors: res.data.vendors || [],
          items: res.data.items || []
        });
      }
    } catch (err) {
      console.error('Error fetching procurement sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedVendor]);

  const filteredItems = (data.items || []).filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVendor = selectedVendor === 'ALL' || item.vendorName === selectedVendor;
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base sm:text-lg">Procurement Sales Report</h2>
            <p className="text-xs text-gray-500">Sales performance vs procurement landing cost & margins</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 shadow-sm"
          >
            <option value="ALL">All Vendors / Suppliers</option>
            {(data.vendors || []).map((v, i) => (
              <option key={i} value={v}>{v}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      {data.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Sales Revenue</span>
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">₹{data.summary.totalSalesRevenue?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-500 mt-1">{data.summary.totalItemsSold} items sold</div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Procurement Cost</span>
              <ShoppingCart size={18} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">₹{data.summary.totalProcurementValue?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-500 mt-1">Cost of Goods Sold</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Gross Profit</span>
              <TrendingUp size={18} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">₹{data.summary.totalGrossMargin?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">Net gross margin</div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Margin %</span>
              <Percent size={18} className="text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">{data.summary.marginPercentage}%</div>
            <div className="text-xs text-purple-700 font-medium mt-1">Overall margin rate</div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by item name, category, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
          />
        </div>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 shadow-sm"
        >
          <option value="ALL">Filter by Vendor: All Vendors</option>
          {(data.vendors || []).map((v, i) => (
            <option key={i} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Item Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Vendor / Supplier</th>
              <th className="py-3 px-4 text-right">Procurement Cost</th>
              <th className="py-3 px-4 text-right">Selling Price</th>
              <th className="py-3 px-4 text-center">Qty Sold</th>
              <th className="py-3 px-4 text-right">Sales Revenue</th>
              <th className="py-3 px-4 text-right">Procurement Value</th>
              <th className="py-3 px-4 text-right">Gross Margin</th>
              <th className="py-3 px-4 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400 font-medium">
                  Loading procurement sales data...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400 font-medium">
                  No procurement sales data available for selected period.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                  <td className="py-3 px-4 text-gray-600">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-lg">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-lg">
                      {item.vendorName || 'Direct Procurement'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">₹{item.procurementCost?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-medium">₹{item.sellingPrice?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">{item.totalQtySold}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">₹{item.totalRevenue?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right text-gray-600">₹{item.totalCost?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{item.grossMargin?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                      item.marginPercentage >= 20 ? 'bg-emerald-100 text-emerald-800' :
                      item.marginPercentage >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.marginPercentage}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
