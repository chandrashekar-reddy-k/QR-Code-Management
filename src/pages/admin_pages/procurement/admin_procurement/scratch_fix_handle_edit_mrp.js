import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixHandleEditMrp(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace data.items.map(i => { ... })
  content = content.replace(
    /items:\s*data\.items\.map\(i => \{[\s\S]*?return calculateItemValues\(baseItem\);\s*\}\)/,
    `items: data.items.map(i => {
          const cost = parseFloat(i.unitCostBeforeDiscount) || i.price || 0;
          const taxRate = parseFloat(i.taxPercent) || 0;
          const prod = (products || []).find(p => p.id === i.productId || p.productId === i.productId);
          const m = (vendorMappings || []).find(x => 
            String(x.vendorId) === String(data.vendorId) && 
            (String(x.productId) === String(i.productId) || String(x.product?.id) === String(i.productId))
          );
          const mappedMrp = (i.mrp !== undefined && i.mrp !== null && i.mrp !== '' && parseFloat(i.mrp) > 0)
            ? i.mrp
            : (m?.mrp || m?.price || i.product?.mrp || prod?.mrp || prod?.price || 0);

          const baseItem = {
            productId: i.productId,
            name: i.product?.name || prod?.name || 'Unknown',
            skuCode: i.product?.skuCode || prod?.skuCode || 'NO-SKU',
            quantity: String(i.quantity),
            maxQuantity: i.quantity,
            mrp: String(mappedMrp),
            unitCostBeforeDiscount: String(cost),
            discountPercent: String(i.discountPercent || 0),
            unitCostBeforeTax: String(i.unitCostBeforeTax || cost),
            subtotalBeforeTax: String(i.subtotalBeforeTax || (i.quantity * cost)),
            taxType: i.taxType || (taxRate > 0 ? 'GST' : 'NONE'),
            taxPercent: String(taxRate),
            netCost: String(i.netCost || cost),
            profitMargin: String(i.profitMargin || 0),
            unitSellingPrice: String(i.unitSellingPrice || m?.sellingPrice || i.product?.price || prod?.price || cost),
            mfgDate: i.mfgDate ? format(new Date(i.mfgDate), 'yyyy-MM-dd') : '',
            expDate: i.expDate ? format(new Date(i.expDate), 'yyyy-MM-dd') : '',
            total: String(i.total || (i.quantity * i.price))
          };
          return calculateItemValues(baseItem);
        })`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Regex updated handleEdit MRP in", filePath);
}

fixHandleEditMrp(file1);
fixHandleEditMrp(file2);
