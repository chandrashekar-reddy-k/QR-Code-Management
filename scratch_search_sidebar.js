import fs from 'fs';
const file = fs.readFileSync('src/components/layout/sidebarConfig.ts', 'utf8');
const lines = file.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('isProductMasterDataOpen')) {
    console.log(`${i + 1}: ${line}`);
  }
}
