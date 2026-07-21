import fs from 'fs';
const file = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const lines = file.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<<<<<<<') || lines[i].includes('=======') || lines[i].includes('>>>>>>>')) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
    count++;
  }
}
console.log("Total conflict markers:", count);
