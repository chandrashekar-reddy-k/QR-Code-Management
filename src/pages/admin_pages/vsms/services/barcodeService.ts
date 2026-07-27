import api from './api';

export const barcodeAPI = {
  getDashboardStats: () => api.get('/barcode/dashboard'),
  getBarcodeMasterList: (params) => api.get('/barcode', { params }),
  generateBarcode: (productId, variantId) => api.post('/barcode', { productId, variantId }),
  mapSupplierBarcode: (data) => api.post('/barcode/map-supplier', data),
  deleteSupplierMapping: (id) => api.delete(`/barcode/map-supplier/${id}`),
  logPrint: (data) => api.post('/barcode/log-print', data),
  logScan: (data) => api.post('/barcode/log-scan', data),
  lookupBarcode: (code) => api.get(`/barcode/lookup/${code}`),
  bulkImport: (items) => api.post('/barcode/import', { items }),
  getNoBarcodeProducts: () => api.get('/barcode/reports/no-barcode'),
  getPrintHistory: () => api.get('/barcode/reports/print-history'),
  getScanHistory: () => api.get('/barcode/reports/scan-history'),
  resetBarcode: (productId, variantId) => api.delete(`/barcode/${productId}`, { params: variantId ? { variantId } : {} }),
  updateProductStatus: (productId, isActive) => api.put(`/productmanagement/product/${productId}`, { isActive }),
  updateVariantStatus: (variantId, status) => api.put(`/productmanagement/variant/${variantId}`, { status })
};

export default barcodeAPI;
