import fs from 'fs';

const content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx + 1 >= 800 && idx + 1 <= 1173) {
    if (line.includes('filtered') || line.includes('Active') || line.includes('Open')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
