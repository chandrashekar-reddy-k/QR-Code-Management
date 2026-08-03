import fs from 'fs';

const content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx + 1 >= 660 && idx + 1 <= 800) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
