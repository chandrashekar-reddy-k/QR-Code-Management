import fs from 'fs';

const src = 'c:/Users/Abhiram/Desktop/Villagkart/villagkart-partner-apis/vehiclepointer.png';
const b64 = fs.readFileSync(src).toString('base64');
const content = `export const VEHICLE_POINTER_PNG = "data:image/png;base64,${b64}";\n`;

const dest = 'c:/Users/Abhiram/Desktop/Villagkart/villagkart-partner-web/src/pages/admin_pages/vsms/components/vehiclePointerBase64.ts';
fs.writeFileSync(dest, content);
console.log('Successfully written vehiclePointerBase64.ts, length:', content.length);
