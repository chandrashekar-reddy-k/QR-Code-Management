import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function removeVendorModal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Vendor label header with just label
  content = content.replace(
    /<div className="flex items-center justify-between">\s*<label[^>]*>Vendor \*<\/label>\s*<button[^>]*onClick={handleOpenVendorModal}[\s\S]*?<\/button>\s*<\/div>/g,
    '<label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>'
  );

  // Remove Quick Vendor Modal markup section if present
  content = content.replace(
    /{\/\* Quick Vendor Modal \(Wizard UI\) \*\/}[\s\S]*?{\/\* Quick Product Form \(Inline\) \*\//g,
    '{/* Quick Product Form (Inline) */}'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Removed Add New vendor from", filePath);
}

removeVendorModal(file1);
removeVendorModal(file2);
