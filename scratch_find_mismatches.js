import fs from 'fs';

const sidebarFile = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const configFile = fs.readFileSync('src/components/layout/sidebarConfig.ts', 'utf8');

// Find all keys defined in stateSetters map in Sidebar.tsx
const stateSettersMatch = sidebarFile.match(/stateSetters[\s\S]+?\}/);
const settersKeys = [];
if (stateSettersMatch) {
  const lines = stateSettersMatch[0].split('\n');
  for (const line of lines) {
    const keyMatch = line.match(/^\s*(\w+)\s*:/);
    if (keyMatch) {
      settersKeys.push(keyMatch[1]);
    }
  }
}
console.log("Defined in stateSetters:", settersKeys);

// Find all stateKey values in sidebarConfig.ts
const configLines = configFile.split('\n');
const configStateKeys = [];
for (const line of configLines) {
  const match = line.match(/stateKey\s*:\s*["'](\w+)["']/);
  if (match) {
    configStateKeys.push(match[1]);
  }
}
console.log("Used stateKeys in config:", [...new Set(configStateKeys)]);

// Find mismatch
const missing = configStateKeys.filter(k => !settersKeys.includes(k));
console.log("MISSING SETTERS:", [...new Set(missing)]);
