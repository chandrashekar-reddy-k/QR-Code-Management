const fs = require('fs');
const files = [
  'c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-admin-web/src/components/shopkeeper/Dashboard.tsx',
  'c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-admin-web/src/components/shopkeeper/ReadyOrders.tsx',
  'c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-admin-web/src/components/shopkeeper/SLAMonitoring.tsx'
];

const classMap = {
  'bg-white': 'dark:bg-gray-800',
  'bg-[#F3F4F6]': 'dark:bg-gray-900',
  'text-gray-900': 'dark:text-gray-100',
  'text-gray-800': 'dark:text-gray-200',
  'text-gray-700': 'dark:text-gray-300',
  'text-gray-600': 'dark:text-gray-400',
  'text-gray-500': 'dark:text-gray-400',
  'text-[#111827]': 'dark:text-gray-100',
  'text-[#9EA3AE]': 'dark:text-gray-400',
  'border-gray-200': 'dark:border-gray-700',
  'border-gray-300': 'dark:border-gray-600',
  'border-gray-100': 'dark:border-gray-700',
  'border-slate-100': 'dark:border-slate-800',
  'divide-gray-100': 'dark:divide-gray-800',
  'divide-gray-200': 'dark:divide-gray-700',
  'bg-gray-50': 'dark:bg-gray-900',
  'bg-gray-100': 'dark:bg-gray-800',
  'hover:bg-gray-50': 'dark:hover:bg-gray-700',
  'hover:bg-gray-100': 'dark:hover:bg-gray-700',
  'bg-orange-50': 'dark:bg-orange-900/30',
  'text-orange-700': 'dark:text-orange-400',
  'border-orange-100': 'dark:border-orange-800',
  'bg-amber-50': 'dark:bg-amber-900/30',
  'text-amber-700': 'dark:text-amber-400',
  'border-amber-200': 'dark:border-amber-800',
  'bg-blue-50': 'dark:bg-blue-900/30',
  'text-blue-700': 'dark:text-blue-400',
  'border-blue-200': 'dark:border-blue-800',
  'bg-red-50': 'dark:bg-red-900/20',
  'border-red-200': 'dark:border-red-800',
  'border-red-100': 'dark:border-red-800',
  'text-red-700': 'dark:text-red-400',
  'text-red-650': 'dark:text-red-400',
  'bg-green-50': 'dark:bg-green-900/20',
  'border-green-100': 'dark:border-green-800',
  'text-green-700': 'dark:text-green-400'
};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Parse through className attributes explicitly
  const classNameRegex = /className=(["'])(.*?)\1/g;
  content = content.replace(classNameRegex, (match, quote, classes) => {
    let parts = classes.split(' ').filter(p => p.trim() !== '');
    let newParts = [...parts];
    for (let p of parts) {
      if (classMap[p]) {
        const darkClass = classMap[p];
        if (!parts.includes(darkClass)) {
          newParts.push(darkClass);
        }
      }
    }
    return 'className=' + quote + newParts.join(' ') + quote;
  });

  fs.writeFileSync(file, content, 'utf8');
});
console.log('Update finished.');
