import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import fetchData from "../../../helper";
import { toast } from "react-toastify";

interface PriceComparisonItem {
  id: string;
  name: string;
  sku: string;
  baseMrp: number;
  basePrice: number;
  posMrp: number;
  posPrice: number;
  onlineMrp: number;
  onlinePrice: number;
  quickMrp: number;
  quickPrice: number;
  vehicleMrp: number;
  vehiclePrice: number;
}

export default function PriceComparison() {
  const [comparisonData, setComparisonData] = useState<PriceComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadComparison = async () => {
    setLoading(true);
    try {
      const response = await fetchData<{ status: number; data: PriceComparisonItem[] }>("/pricing/prices/comparison");
      if (response && response.data) {
        setComparisonData(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load price comparisons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, []);

  const filteredComparison = comparisonData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Price Comparison Matrix</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Side-by-side pricing analysis across all sales channels</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search products to compare prices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="px-6 py-4 min-w-[200px]">Product Details</th>
                  <th className="px-6 py-4 text-center bg-slate-100/30 dark:bg-slate-800/30">POS (Store)</th>
                  <th className="px-6 py-4 text-center">Online App</th>
                  <th className="px-6 py-4 text-center bg-slate-100/30 dark:bg-slate-800/30">Quick Del.</th>
                  <th className="px-6 py-4 text-center">Vehicle Store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-300">
                {filteredComparison.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku || "—"}</div>
                      <div className="text-xs text-slate-400 font-mono">Base Price: Rs {item.basePrice} (MRP: Rs {item.baseMrp})</div>
                    </td>
                    
                    {/* POS (Store) */}
                    <td className="px-6 py-4 text-center bg-slate-50/30 dark:bg-slate-900/10 font-mono">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Rs {item.posPrice}</div>
                      <div className="text-xs text-slate-400">MRP: Rs {item.posMrp}</div>
                    </td>

                    {/* Online App */}
                    <td className="px-6 py-4 text-center font-mono">
                      <div className="font-semibold text-green-600 dark:text-green-400">Rs {item.onlinePrice}</div>
                      <div className="text-xs text-slate-400">MRP: Rs {item.onlineMrp}</div>
                      {item.onlinePrice < item.basePrice && (
                        <span className="text-[10px] bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 px-1.5 py-0.5 rounded font-sans font-bold">
                          -{Math.round((1 - item.onlinePrice / item.basePrice) * 100)}%
                        </span>
                      )}
                    </td>

                    {/* Quick Delivery */}
                    <td className="px-6 py-4 text-center bg-slate-50/30 dark:bg-slate-900/10 font-mono">
                      <div className="font-semibold text-amber-600 dark:text-amber-400">Rs {item.quickPrice}</div>
                      <div className="text-xs text-slate-400">MRP: Rs {item.quickMrp}</div>
                      {item.quickPrice > item.basePrice && (
                        <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-sans font-bold">
                          +{Math.round((item.quickPrice / item.basePrice - 1) * 100)}%
                        </span>
                      )}
                    </td>

                    {/* Vehicle Store */}
                    <td className="px-6 py-4 text-center font-mono">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Rs {item.vehiclePrice}</div>
                      <div className="text-xs text-slate-400">MRP: Rs {item.vehicleMrp}</div>
                      {item.vehiclePrice < item.basePrice && (
                        <span className="text-[10px] bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 px-1.5 py-0.5 rounded font-sans font-bold">
                          -{Math.round((1 - item.vehiclePrice / item.basePrice) * 100)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredComparison.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
