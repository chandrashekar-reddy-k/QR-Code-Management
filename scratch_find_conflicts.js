import fs from 'fs';
const file = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const lines = file.split('\n');
let inside = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('<<<<<<<') || line.startsWith('=======') || line.startsWith('>>>>>>>')) {
    console.log(`Marker at line ${i + 1}: ${line}`);
    // Print 5 lines before and after
    const start = Math.max(0, i - 4);
    const end = Math.min(lines.length - 1, i + 4);
    for (let j = start; j <= end; j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
  }
}
