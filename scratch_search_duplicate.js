import fs from 'fs';

const content = fs.readFileSync('src/pages/admin_pages/products/AddProducts.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('duplicate') || line.toLowerCase().includes('clone')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
