import fs from 'fs';
const file = fs.readFileSync('src/pages/admin_pages/products/ImportProducts.tsx', 'utf8');
const lines = file.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('useQuery') || line.includes('fetchData') || line.includes('api/') || line.includes('product')) {
    if (line.includes('useQuery') || line.includes('fetchData') || line.includes('import')) {
      console.log(`${i + 1}: ${line}`);
    }
  }
}
