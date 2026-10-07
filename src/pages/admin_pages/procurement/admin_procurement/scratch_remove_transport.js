import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove Transport input block
  content = content.replace(
    /<div className="space-y-1">\s*<label[^>]*>Transport ₹<\/label>[\s\S]*?<\/div>/g,
    ''
  );
  // Remove Other input block
  content = content.replace(
    /<div className="space-y-1">\s*<label[^>]*>Other ₹<\/label>[\s\S]*?<\/div>/g,
    ''
  );

  // Remove grid-cols-3 container wrapper around Invoice Date if present
  content = content.replace(
    /<div className="grid grid-cols-3 gap-3">\s*/g,
    ''
  );

  // Ensure main grid is grid-cols-4
  content = content.replace(
    /grid-cols-1 md:grid-cols-3 gap-3/g,
    'grid-cols-1 md:grid-cols-4 gap-3'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully processed", filePath);
}

processFile(file1);
processFile(file2);
