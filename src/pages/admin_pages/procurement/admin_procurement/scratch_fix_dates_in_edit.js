import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixDatesInEdit(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace mfgDate and expDate in handleEdit
  content = content.replace(
    /mfgDate:\s*i\.mfgDate\s*\?\s*format\([^)]+\)\s*:\s*'',\s*\n?\s*expDate:\s*i\.expDate\s*\?\s*format\([^)]+\)\s*:\s*''/,
    `mfgDate: (i.mfgDate || i.mfg_date || i.mfg) ? String(i.mfgDate || i.mfg_date || i.mfg).split('T')[0] : '',
            expDate: (i.expDate || i.expiryDate || i.exp_date || i.exp) ? String(i.expDate || i.expiryDate || i.exp_date || i.exp).split('T')[0] : ''`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Multi-line updated mfg/exp date resolution in", filePath);
}

fixDatesInEdit(file1);
fixDatesInEdit(file2);
