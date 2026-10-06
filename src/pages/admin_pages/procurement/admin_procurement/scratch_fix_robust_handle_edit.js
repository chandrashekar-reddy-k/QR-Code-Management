import fs from 'fs';

const file1 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/procurement/admin_procurement/PurchasesSection.jsx`;
const file2 = `c:/Users/Nisha Reddy Teegala/Desktop/ERP/villagkart-partner-web/src/pages/admin_pages/vsms/agent/admin/admin_procurement/PurchasesSection.jsx`;

function fixRobustHandleEdit(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const newHandleEdit = `  const handleEdit = async (purchase) => {
    setActionLoading({ id: purchase.id, type: 'edit' });
    try {
      const res = await procurementAPI.getPurchaseById(purchase.id);
      const data = res.data?.data || res.data || purchase;

      let vMappings = [];
      if (data.vendorId) {
        try {
          const vRes = await procurementAPI.getVendorMappings(data.vendorId);
          vMappings = Array.isArray(vRes.data?.data) ? vRes.data.data : (Array.isArray(vRes.data) ? vRes.data : []);
        } catch (e) {
          console.warn('Vendor mappings fetch warning:', e);
        }
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const invoiceDateFormatted = data.invoiceDate 
        ? String(data.invoiceDate).split('T')[0] 
        : format(new Date(), 'yyyy-MM-dd');

      setForm({
        id: data.id,
        vendorId: data.vendorId || '',
        grnId: data.grnId || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: invoiceDateFormatted,
        transportCharges: String(data.transportCharges || 0),
        otherCharges: String(data.otherCharges || 0),
        items: rawItems.map(i => {
          const cost = parseFloat(i.unitCostBeforeDiscount) || parseFloat(i.price) || 0;
          const taxRate = parseFloat(i.taxPercent) || 0;
          const prod = (products || []).find(p => p.id === i.productId || p.productId === i.productId);
          const m = vMappings.find(x => 
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
            quantity: String(i.quantity || 1),
            maxQuantity: i.quantity || 1,
            mrp: String(mappedMrp || 0),
            unitCostBeforeDiscount: String(cost),
            discountPercent: String(i.discountPercent || 0),
            unitCostBeforeTax: String(i.unitCostBeforeTax || cost),
            subtotalBeforeTax: String(i.subtotalBeforeTax || (i.quantity * cost)),
            taxType: i.taxType || (taxRate > 0 ? 'GST' : 'NONE'),
            taxPercent: String(taxRate),
            netCost: String(i.netCost || cost),
            profitMargin: String(i.profitMargin || 0),
            unitSellingPrice: String(i.unitSellingPrice || m?.sellingPrice || i.product?.price || prod?.price || cost),
            mfgDate: (i.mfgDate || i.mfg_date || i.mfg) ? String(i.mfgDate || i.mfg_date || i.mfg).split('T')[0] : '',
            expDate: (i.expDate || i.expiryDate || i.exp_date || i.exp) ? String(i.expDate || i.expiryDate || i.exp_date || i.exp).split('T')[0] : '',
            total: String(i.total || (i.quantity * i.price))
          };
          return calculateItemValues(baseItem);
        })
      });
      setShowForm(true);
    } catch (err) {
      console.error('handleEdit error:', err);
      toast.error(err.response?.data?.message || err.message || 'Error loading purchase invoice for edit');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };`;

  content = content.replace(
    /const handleEdit = async \(purchase\) => \{[\s\S]*?finally \{\s*setActionLoading\(\{ id: null, type: null \}\);\s*\}\s*\};/,
    newHandleEdit
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Robust handleEdit updated in", filePath);
}

fixRobustHandleEdit(file1);
fixRobustHandleEdit(file2);
