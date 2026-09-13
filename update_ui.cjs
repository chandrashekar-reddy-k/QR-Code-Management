const fs = require('fs');
const file = 'src/pages/admin_pages/packing/PackingFinishedGoods.tsx';
let content = fs.readFileSync(file, 'utf8');

// State initialization
content = content.replace(
  /const \[allocations, setAllocations\] = useState\(\{ pos: 0, online: 0, vehicle: 0 \}\);/g,
  'const [allocations, setAllocations] = useState({ ready: 0 });'
);

// State reset
content = content.replace(
  /setAllocations\(\{ pos: 0, online: 0, vehicle: 0 \}\);/g,
  'setAllocations({ ready: 0 });'
);

// Allocation sums
content = content.replace(/allocations\.pos \+ allocations\.online \+ allocations\.vehicle/g, 'allocations.ready');

// The JSX for inputs
const jsxOld = `                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      POS Stock Allocation
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={allocations.pos || ''}
                      onChange={(e) => setAllocations(prev => ({ ...prev, pos: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Online Stock Allocation
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={allocations.online || ''}
                      onChange={(e) => setAllocations(prev => ({ ...prev, online: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Vehicle Stock Allocation
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={allocations.vehicle || ''}
                      onChange={(e) => setAllocations(prev => ({ ...prev, vehicle: Number(e.target.value) }))}
                    />
                  </div>
                </div>`;

const jsxNew = `                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Ready Inventory (Warehouse) Allocation
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                      value={allocations.ready || ''}
                      onChange={(e) => setAllocations(prev => ({ ...prev, ready: Number(e.target.value) }))}
                    />
                  </div>
                </div>`;

content = content.replace(jsxOld, jsxNew);

// Payload handling
const payloadOld = `      const payloadAllocations: { destination: string, qty: number }[] = [];
      if (allocations.pos > 0) payloadAllocations.push({ destination: 'POS Stock', qty: allocations.pos });
      if (allocations.online > 0) payloadAllocations.push({ destination: 'Online Stock', qty: allocations.online });
      if (allocations.vehicle > 0) payloadAllocations.push({ destination: 'Vehicle Stock', qty: allocations.vehicle });`;

const payloadNew = `      const payloadAllocations: { destination: string, qty: number }[] = [];
      if (allocations.ready > 0) payloadAllocations.push({ destination: 'Ready Inventory', qty: allocations.ready });`;

content = content.replace(payloadOld, payloadNew);

// Destinations badge display
const destinationsOld = `{allocations.pos > 0 && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">POS ({allocations.pos})</span>}
                      {allocations.online > 0 && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">Online ({allocations.online})</span>}
                      {allocations.vehicle > 0 && <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">Vehicle ({allocations.vehicle})</span>}`;

const destinationsNew = `{allocations.ready > 0 && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Ready Inventory ({allocations.ready})</span>}`;

content = content.replace(destinationsOld, destinationsNew);

fs.writeFileSync(file, content);
console.log('Updated PackingFinishedGoods.tsx successfully!');
