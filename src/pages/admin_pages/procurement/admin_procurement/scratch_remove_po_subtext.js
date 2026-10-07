import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function removePoSubtext(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    /{\s*p\.po\s*&&\s*<span[^>]*>\s*PO:[\s\S]*?<\/span>\s*}/g,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Removed PO subtext from", filePath);
}

removePoSubtext(file1);
removePoSubtext(file2);
