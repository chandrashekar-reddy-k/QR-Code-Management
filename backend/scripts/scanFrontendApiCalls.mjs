import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../../villagkart-partner-web/src');

const apiCalls = [];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.resolve(__dirname, '../../'), filePath).replace(/\\/g, '/');

  // Regex patterns for axios/api calls
  // api.get('/path'), axios.get('/path'), ordersAPI.get..., etc.
  const httpMethodRegex = /(?:\.|\b)(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = httpMethodRegex.exec(line)) !== null) {
      const method = match[1].toUpperCase();
      const rawUrl = match[2];
      apiCalls.push({
        file: relPath,
        line: index + 1,
        method,
        rawUrl,
        snippet: line.trim()
      });
    }
  });
}

scanDirectory(webRoot);
console.log(`Discovered ${apiCalls.length} frontend HTTP call sites in villagkart-partner-web.`);

const outputDir = path.resolve(__dirname, '../reports/partner-api-audit');
fs.writeFileSync(
  path.join(outputDir, 'frontend-api-calls.json'),
  JSON.stringify(apiCalls, null, 2)
);
console.log(`Saved to ${path.join(outputDir, 'frontend-api-calls.json')}`);
