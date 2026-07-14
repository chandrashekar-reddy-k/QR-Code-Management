const fs = require('fs');

const files = [
  'c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-admin-web/src/components/shopkeeper/StaffTracker.tsx',
  'c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/components/shopkeeper/StaffTracker.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Instead of exact string match, we can find the exact line and insert after
  const searchLine = '                    {member.status}\n                  </span>\n                </div>';
  const replaceStr = `                    {member.status}
                  </span>
                  {member.status === "Busy" && member.activeOrder?.activeOrdersCount > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 whitespace-nowrap">
                      {member.activeOrder.activeOrdersCount} Active Orders
                    </span>
                  )}
                </div>`;
                
  if (content.indexOf(searchLine) !== -1) {
    content = content.replace(searchLine, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  } else {
    // try a regex
    content = content.replace(/{\s*member\.status\s*}\s*<\/span>\s*<\/div>/, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Regex Fixed', file);
  }
}
