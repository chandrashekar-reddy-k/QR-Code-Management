import fs from 'fs';

const path = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Remove unused Lucide imports: Bike, Eye, Bell, Monitor, Languages
content = content.replace('Bike, ', '')
                 .replace('Eye, ', '')
                 .replace('Bell, ', '')
                 .replace('Monitor, ', '')
                 .replace('Languages, ', '');

// 2. Remove states: isMasterSetupOpen to isWebSettingsOpen
// We will look for: const [isMasterSetupOpen, setIsMasterSetupOpen] = useState( ... ); up to isWebSettingsOpen block.
const stateBlockRegex = /const \[isMasterSetupOpen, setIsMasterSetupOpen\] =[\s\S]*?const \[isWebSettingsOpen, setIsWebSettingsOpen\] = useState\(\s*location\.pathname\.startsWith\('\/web-settings'\)\s*\);/;
content = content.replace(stateBlockRegex, '');

// 3. Remove contact, delivery, staff, shopkeeper states and navItems
// We will search for isContactOpen, isDeliveryOpen, isStaffOpen, isShopkeeperOpen states and navItems
const moreStatesRegex = /const \[isContactOpen, setIsContactOpen\] =[\s\S]*?const navItems = \[\s*\{\s*path:\s*'\/',\s*icon:\s*Home,\s*label:\s*'Dashboard'\s*\}\s*\];/;
content = content.replace(moreStatesRegex, '');

// 4. Remove filtered sub-items and active variables (lines 670-775 approx)
// From: const filteredUserManagementSubItems = ...
// To: const finalStaffActive = ...
const dynamicFiltersRegex = /const filteredUserManagementSubItems =[\s\S]*?const finalStaffActive =\s*location\.pathname\.startsWith\('\/staff-management'\);/;
content = content.replace(dynamicFiltersRegex, '');

// 5. Remove unused activityLogSubItems definition
content = content.replace(/const activityLogSubItems = \[\s*\{[\s\S]*?\}\s*\];\s*/, '');

fs.writeFileSync(path, content, 'utf-8');
console.log('Sidebar.tsx successfully cleaned up!');
