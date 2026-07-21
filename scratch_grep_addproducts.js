import fs from 'fs';
const file = fs.readFileSync('src/pages/admin_pages/products/AddProducts.tsx', 'utf8');
const lines = file.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('categories') || line.includes('subCategories') || line.includes('taxes')) {
    console.log(`${i + 1}: ${line}`);
  }
}
