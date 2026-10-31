export const productHeaderMap = {
  "Product Name": "name",
  "Description": "description",
  "Selling Price (₹)": "price",
  "MRP (₹)": "mrp",
  "Category": "category",
  "Sub Category": "subCategory",
  "Brand": "brand",
  "Unit": "unit",
  "Stock": "stock",
  "Threshold": "threshold",
  "Is Active": "isActive",
  "Tags": "tags",
  "Warehouse": "warehouse",
  "Supplier": "supplierIds",
  "Weight": "weight",
  "Dimensions": "dimensions",
  "Stock Gap": "stockGap",
  "Featured": "isFeatured",
  "Minimum Stock": "minStock",
  "Maximum Stock": "maxStock",
  "Cost Price": "costPrice",
  "Margin %": "margin",
  "Batch Number": "batchNumber",
  "Certifications": "certifications",
};

export const normalizeExcelRow = (row, headerMap) => {
  const normalized = {};
  for (const [excelHeader, value] of Object.entries(row)) {
    const mappedKey = headerMap[excelHeader?.trim()];
    if (mappedKey) normalized[mappedKey] = value;
  }
  return normalized;
};
