import fs from 'fs';

const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixVsmsGrid(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    /grid-cols-1 md:grid-cols-4 gap-3/g,
    'grid-cols-1 md:grid-cols-2 gap-4'
  );

  content = content.replace(
    /(<input required placeholder="Vendor's Invoice Number"[\s\S]*?\/>)\s*(<div className="space-y-1">\s*<label[^>]*>Invoice Date)/,
    '$1\n              </div>\n              $2'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Updated 2-col grid in", filePath);
}

fixVsmsGrid(file2);
