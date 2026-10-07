import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixOpenFormBug(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove await openForm(); inside handleEdit
  content = content.replace(/await\s+openForm\(\);\s*/g, '');

  // Replace openForm(); in button onClick handlers with setShowForm(true);
  content = content.replace(/openForm\(\);/g, 'setShowForm(true);');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Fixed openForm bug in", filePath);
}

fixOpenFormBug(file1);
fixOpenFormBug(file2);
