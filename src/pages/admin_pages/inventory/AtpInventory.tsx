import { useState } from "react";
import { useAtpInventory } from "../../../hooks/oms";
import { AtpCard } from "../../../components/oms/AtpCard";
import { Search, PackageOpen, Layers } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

export default function AtpInventory() {
  const { data: atpData, isLoading } = useAtpInventory();
  const [searchTerm, setSearchTerm] = useState("");

  const items = atpData?.data || [];

  const filteredItems = items.filter((item: any) =>
    item.variantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 mt-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ATP Inventory Visibility
            <Layers className="text-indigo-500" size={24} />
          </h1>
          <Breadcrumbs />
        </div>

        {/* Search */}
        <div className="relative mt-3 sm:mt-0 w-full sm:w-64">
          <input
            type="text"
            placeholder="Search variant name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3.5 top-2.5 text-slate-400" size={14} />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
          <PackageOpen className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Inventory Items Found</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Try adjusting your search criteria or confirm category mapping.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item: any) => (
            <AtpCard
              key={item.id}
              sku={item.sku}
              variantName={item.variantName}
              onHand={item.onHand}
              reserved={item.reserved}
              safetyStock={item.safetyStock}
              incomingStock={item.incomingStock}
              atp={item.atp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
