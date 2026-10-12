import React, { useState, useEffect } from 'react';
import { Package, List, AlertTriangle, PackageX } from 'lucide-react';
import inventoryService from './services/inventoryService';

interface StatCardItemProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

const formatCurrencyShort = (amount: number): string => {
  if (!amount || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    const val = abs / 10000000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    const val = abs / 100000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} L`;
  }
  if (abs >= 1000) {
    const val = abs / 1000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} K`;
  }
  return `${sign}₹${Math.round(abs)}`;
};

const StatCardItem: React.FC<StatCardItemProps> = ({ title, value, icon: Icon, iconBgColor, iconColor }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
    <div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <div className={`p-3 rounded-xl ${iconBgColor}`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
  </div>
);

const InventoryDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
    rawValue: 0,
    readyValue: 0,
    rawCount: 0,
    readyCount: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await inventoryService.getDashboardStats();
      if (response.data?.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    }
  };

  return (
    <div className="p-6 bg-[#f8f9fc] min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a233a] mb-2">Inventory by Store / Warehouse</h1>
          <p className="text-gray-500 text-sm">Select a store or warehouse to view its inventory summary.</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-gray-800">Select Inventory By</span>
            <select className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600 shadow-sm min-w-[120px]">
              <option>Select</option>
              {/* Add options here */}
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-gray-800">Date</span>
            <div className="relative">
              <input 
                type="text" 
                value="20 May 2025"
                readOnly
                className="border border-gray-200 rounded-md pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 w-[140px] shadow-sm text-gray-600"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardItem 
          title="Total Inventory Value" 
          value={formatCurrencyShort(stats.totalValue)} 
          icon={Package} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Total Items" 
          value={stats.totalItems.toString()} 
          icon={List} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Low Stock Items" 
          value={stats.lowStockItems.toString()} 
          icon={AlertTriangle} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Out of Stock Items" 
          value={stats.outOfStockItems.toString()} 
          icon={PackageX} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        
        <StatCardItem 
          title="Raw Inventory Value" 
          value={formatCurrencyShort(stats.rawValue)} 
          icon={Package} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Ready Inventory Value" 
          value={formatCurrencyShort(stats.readyValue)} 
          icon={List} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Raw Inventory" 
          value={stats.rawCount.toString()} 
          icon={AlertTriangle} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
        <StatCardItem 
          title="Ready Inventory" 
          value={stats.readyCount.toString()} 
          icon={PackageX} 
          iconBgColor="bg-[#eaf8f1]" 
          iconColor="text-[#20b05e]" 
        />
      </div>
    </div>
  );
};

export default InventoryDashboard;
