import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function cleanFormGrid(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace lines 870 to 895 with a clean 4-column grid block
  const targetRegex = /<div className="space-y-1">\s*<div className="flex items-center justify-between pl-1 pr-1">[\s\S]*?<label[^>]*>Invoice #[\s\S]*?<\/div>\s*<input[^>]*value={form\.invoiceNumber}[\s\S]*?\/>[\s\S]*?<div className="space-y-1">\s*<label[^>]*>Invoice Date[\s\S]*?<\/div>\s*<\/div>/;

  const replacement = `<div className="space-y-1">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice # *</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, invoiceNumber: generateInvoiceNumber() })}
                    className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    title="Generate a new invoice number"
                  >
                    ↻ Regenerate
                  </button>
                </div>
                <input required placeholder="e.g. VGK-20260917-A3F9" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono tracking-wide" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice Date</label>
                <input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>`;

  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Cleaned grid in", filePath);
}

cleanFormGrid(file1);
cleanFormGrid(file2);
