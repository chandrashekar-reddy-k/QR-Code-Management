import React from "react";

interface AtpCardProps {
  sku: string;
  variantName: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  incomingStock: number;
  atp: number;
}

export const AtpCard: React.FC<AtpCardProps> = ({
  sku,
  variantName,
  onHand,
  reserved,
  safetyStock,
  incomingStock,
  atp,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">
            {variantName}
          </h4>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {sku}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Promiseable</span>
          <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{atp}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-slate-50 dark:border-slate-800/80 pt-3">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">On Hand</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{onHand}</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <span className="text-[9px] text-slate-400 block font-bold uppercase">Reserved</span>
          <span className="text-sm font-bold text-slate-750 dark:text-slate-350">{reserved}</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10">
          <span className="text-[9px] text-amber-500 block font-bold uppercase">Safety</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{safetyStock}</span>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-50/50 dark:bg-green-950/10">
          <span className="text-[9px] text-green-500 block font-bold uppercase">Incoming</span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">{incomingStock}</span>
        </div>
      </div>
    </div>
  );
};
