import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixGrid(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix form grid block: remove extra closing divs between grid items and ensure grid-cols-4
  content = content.replace(
    /(<div className="grid grid-cols-1 md:grid-cols-(?:3|4) gap-3">[\s\S]*?)(<\/div>\s*<\/div>\s*<div className="space-y-1">\s*<label[^>]*>Invoice Date<\/label>[\s\S]*?<\/div>\s*<\/div>)/,
    (match, p1) => {
      // Extract invoice date div
      const dateMatch = match.match(/<div className="space-y-1">\s*<label[^>]*>Invoice Date<\/label>[\s\S]*?<\/div>/);
      const dateBlock = dateMatch ? dateMatch[0] : '';
      return p1 + dateBlock + '\n            </div>';
    }
  );

  // Clean up any double blank lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Fixed grid in", filePath);
}

fixGrid(file1);
fixGrid(file2);
