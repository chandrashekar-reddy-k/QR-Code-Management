// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import DayWiseReport from './adminreports/DayWiseReport';
import ItemWiseReport from './adminreports/ItemWiseReport';
import CategoryWiseReport from './adminreports/CategoryWiseReport';
import InvoiceReport from './adminreports/InvoiceReport';
import ReturnReport from './adminreports/ReturnReport';
import DamageReport from './adminreports/DamageReport';
import ProcurementSalesReport from './adminreports/ProcurementSalesReport';
import CreditSalesReport from './adminreports/CreditSalesReport';

export default function AdminReports() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (!param) return 'day-wise';
    if (param === 'day-wise' || param === 'daily') return 'day-wise';
    if (param === 'item-wise' || param === 'item') return 'item-wise';
    if (param === 'category-wise' || param === 'category') return 'category-wise';
    if (param === 'invoices' || param === 'invoice-wise' || param === 'invoice') return 'invoices';
    if (param === 'returns' || param === 'return') return 'returns';
    if (param === 'damages' || param === 'damage') return 'damages';
    if (param === 'procurement' || param === 'procurement-sales') return 'procurement';
    if (param === 'credit' || param === 'credit-sales') return 'credit';
    return param;
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const reportTitles = {
    'day-wise': 'Day-wise Sales Report',
    'item-wise': 'Item-wise Sales Report',
    'category-wise': 'Category-wise Sales Report',
    'invoices': 'Invoice-wise Report',
    'returns': 'Return Report',
    'damages': 'Damage Report',
    'procurement': 'Procurement Sales Report',
    'credit': 'Credit Sales Report',
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-8 relative">
      {/* Header */}
      <div className="mb-6 mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <BarChart3 size={24} />
            </div>
            {reportTitles[activeTab] || 'VSMS Reports & Analytics'}
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* Active Report Screen Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 min-h-[500px]">
        {activeTab === 'day-wise' && <DayWiseReport />}
        {activeTab === 'item-wise' && <ItemWiseReport />}
        {activeTab === 'category-wise' && <CategoryWiseReport />}
        {activeTab === 'invoices' && <InvoiceReport />}
        {activeTab === 'returns' && <ReturnReport />}
        {activeTab === 'damages' && <DamageReport />}
        {activeTab === 'procurement' && <ProcurementSalesReport />}
        {activeTab === 'credit' && <CreditSalesReport />}
      </div>
    </div>
  );
}
