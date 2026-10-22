import api from './api';

export const adminAPI = {
  // Dashboard
  getDashboardStats: (params?: any) => api.get('/admin/dashboard', { params }),
  getLocationCheckIns: () => api.get('/routes/all-location-check-ins'),

  // Tracking
  getLiveLocations: (params?: any) => api.get('/location/live', { params }),
  getBreadcrumbHistory: (params?: any) => api.get('/location/history', { params }),

  // Users
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  createUser: (data?: any) => api.post('/admin/users', data),
  updateUser: (id?: any, data?: any) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id?: any) => api.delete(`/admin/users/${id}`),
  uploadUserDocument: (userId?: any, data?: any) => api.post(`/admin/users/${userId}/documents`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateUserDocumentStatus: (documentId?: any, status?: any) => api.put(`/admin/users/documents/${documentId}`, { status }),
  getShifts: () => api.get('/admin/users/shifts'),
  createShift: (data?: any) => api.post('/admin/users/shifts', data),

  // Vehicles
  getVehicles: (params?: any) => api.get('/admin/vehicles', { params }),
  getVehicleAgents: (params?: any) => api.get('/admin/vehicles/agents', { params }),
  getAgents: (params?: any) => api.get('/admin/vehicles/agents', { params }),
  createVehicle: (data?: any) => api.post('/admin/vehicles', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateVehicle: (id?: any, data?: any) => api.put(`/admin/vehicles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteVehicle: (id?: any) => api.delete(`/admin/vehicles/${id}`),
  assignDriver: (id?: any, userId?: any) => api.put(`/admin/vehicles/${id}/assign`, { userId }),
  executeVehicleHandover: (id?: any, payload?: any) => api.post(`/admin/vehicles/${id}/handover`, payload),
  getVehicleStock: (id?: any) => api.get(`/admin/vehicles/${id}/stock`),
  getVehicleSales: (id?: any) => api.get(`/admin/vehicles/${id}/sales`),
  
  // Vehicle Operations
  getVehicleOpsTrips: (params?: any) => api.get('/admin/vehicles/ops/trips', { params }),
  startVehicleTrip: (data?: any) => api.post('/admin/vehicles/ops/trips/start', data),
  endVehicleTrip: (id?: any, data?: any) => api.put(`/admin/vehicles/ops/trips/${id}/end`, data),
  updateVehicleTrip: (id?: any, data?: any) => api.put(`/admin/vehicles/ops/trips/${id}`, data),
  deleteVehicleTrip: (id?: any) => api.delete(`/admin/vehicles/ops/trips/${id}`),
  getFuelLogs: (params?: any) => api.get('/admin/vehicles/ops/fuel', { params }),
  addFuelLog: (data?: any) => api.post('/admin/vehicles/ops/fuel', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateFuelLog: (id?: any, data?: any) => api.put(`/admin/vehicles/ops/fuel/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFuelLog: (id?: any) => api.delete(`/admin/vehicles/ops/fuel/${id}`),
  getMaintenanceLogs: (params?: any) => api.get('/admin/vehicles/ops/maintenance', { params }),
  addMaintenanceLog: (data?: any) => api.post('/admin/vehicles/ops/maintenance', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateMaintenanceLog: (id?: any, data?: any) => api.put(`/admin/vehicles/ops/maintenance/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMaintenanceLog: (id?: any) => api.delete(`/admin/vehicles/ops/maintenance/${id}`),

  // Inventory
  getInventoryInit: (params?: any) => api.get('/admin/inventory/init', { params }),
  getItems: (params?: any) => api.get('/admin/inventory/items', { params }),
  createItem: (data?: any) => api.post('/admin/inventory/items', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkCreateItems: (data?: any) => api.post('/admin/inventory/items/bulk', data),
  bulkImportItems: (data?: any) => api.post('/admin/inventory/items/bulk-import', data),
  bulkDeleteItems: (ids?: any) => api.post('/admin/inventory/items/bulk-delete', { ids }),
  updateItem: (id?: any, data?: any) => api.put(`/admin/inventory/items/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteItem: (id?: any) => api.delete(`/admin/inventory/items/${id}`),
  loadStock: (data?: any) => api.post('/admin/inventory/load', data),
  returnStock: (data?: any) => api.post('/admin/inventory/return', data),
  getVehicleInventory: (id?: any) => api.get(`/admin/inventory/vehicle/${id}`),
  auditVehicleStock: (id?: any, data?: any) => api.put(`/admin/inventory/vehicle/${id}/audit`, data),
  getRefillRequests: (params?: any) => api.get('/admin/inventory/refills', { params }),
  getAuditHistory: (params?: any) => api.get('/admin/inventory/audit-history', { params }),
  getLoadHistory: (params?: any) => api.get('/admin/inventory/load-history', { params }),
  getReturnHistory: (params?: any) => api.get('/admin/inventory/return-history', { params }),
  getRefillHistory: (params?: any) => api.get('/admin/inventory/refill-history', { params }),
  approveRefillRequest: (id?: any, data?: any) => api.put(`/admin/inventory/refills/${id}/approve`, data),
  rejectRefillRequest: (id?: any, data?: any) => api.put(`/admin/inventory/refills/${id}/reject`, data),
  updateProductStock: (data?: any) => api.post('/admin/inventory/stock', data),
  updateInventory: (data?: any) => api.post('/admin/inventory/stock', data),
  importZipInventory: (data?: any) => api.post('/admin/inventory/items/zip-import', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Returns management
  getReturnRequests: (params?: any) => api.get('/admin/inventory/returns', { params }),
  approveReturnRequest: (id?: any) => api.put(`/admin/inventory/returns/${id}/approve`),
  rejectReturnRequest: (id?: any) => api.put(`/admin/inventory/returns/${id}/reject`),

  // Agent Transfers
  getAgentTransfers: (params?: any) => api.get('/admin/agent-transfers', { params }),
  getActiveAgents: () => api.get('/admin/agent-transfers/active-agents'),
  createAgentTransfer: (data?: any) => api.post('/admin/agent-transfers', data),
  getAgentTransferById: (id?: any) => api.get(`/admin/agent-transfers/${id}`),
  approveAgentTransfer: (id?: any, data?: any) => api.post(`/admin/agent-transfers/${id}/approve`, data),
  rejectAgentTransfer: (id?: any, data?: any) => api.post(`/admin/agent-transfers/${id}/reject`, data),

  // Brands
  getBrands: (params?: any) => api.get('/admin/brands', { params }),

  // Sales
  getSales: (params?: any) => api.get('/admin/sales', { params }),
  createManualSale: (data?: any) => api.post('/admin/sales', data),
  getSuspendedSales: (params?: any) => api.get('/admin/sales/suspended', { params }),
  suspendSale: (data?: any) => api.post('/admin/sales/suspend', data),
  deleteSuspendedSale: (id?: any) => api.delete(`/admin/sales/suspended/${id}`),

  // Activity Logs
  getActivityLogs: (params?: any) => api.get('/admin/activities', { params }),

  // Reports
  getDailyReport: (params?: any) => api.get('/admin/reports/daily', { params }),
  getPOSDailyReport: (params?: any) => api.get('/admin/reports/pos-daily', { params }),
  getTrendsReport: (params?: any) => api.get('/admin/reports/trends', { params }),
  getTopProducts: (params?: any) => api.get('/admin/reports/top-products', { params }),
  getVehicleReport: (id?: any) => api.get(`/admin/reports/vehicle/${id}`),
  getItemReport: (params?: any) => api.get('/admin/reports/item', { params }),
  getDateRangeReport: (params?: any) => api.get('/admin/reports/date-range', { params }),
  getReconciliationReport: (params?: any) => api.get('/admin/reports/reconciliation', { params }),
  getRouteWiseReport: (params?: any) => api.get('/admin/reports/route-wise', { params }),
  getVillageWiseReport: (params?: any) => api.get('/admin/reports/village-wise', { params }),
  getAgentPerformance: (params?: any) => api.get('/admin/reports/agent-performance', { params }),
  getCategoryReport: (params?: any) => api.get('/admin/reports/category-wise', { params }),
  getReturnReport: (params?: any) => api.get('/admin/reports/returns', { params }),
  getSessionReport: (params?: any) => api.get('/admin/reports/sessions', { params }),
  getVehicleAllPerformance: (params?: any) => api.get('/admin/reports/vehicle-all', { params }),
  getVehicleSalesSummaryReport: (params?: any) => api.get('/admin/reports/vehicle-sales', { params }),
  getVehicleOpeningStockReport: (params?: any) => api.get('/admin/reports/vehicle-opening-stock', { params }),
  getVehicleCurrentStockReport: (params?: any) => api.get('/admin/reports/vehicle-current-stock', { params }),
  getVehicleStockMovementReport: (params?: any) => api.get('/admin/reports/vehicle-stock-movements', { params }),
  getVehicleItemSalesReport: (params?: any) => api.get('/admin/reports/vehicle-item-sales', { params }),
  getDayDetailedSales: (params?: any) => api.get('/admin/reports/day-detailed', { params }),
  getPaymentReport: (params?: any) => api.get('/admin/reports/daily', { params }),
  getDamageReports: (params?: any) => api.get('/damage/reports', { params }),
  getProcurementSalesReport: (params?: any) => api.get('/admin/reports/procurement-sales', { params }),
  getCreditSalesReport: (params?: any) => api.get('/admin/reports/credit-sales', { params }),
  updateCreditPaymentStatus: (orderId: string, data: any) => api.put(`/admin/reports/credit-sales/${orderId}/payment-status`, data),
  getDamageEntries: (params?: any) => api.get('/damage/entries', { params }),

  // Vehicle Damage CRUD (Separate)
  getVehicleDamages: (params?: any) => api.get('/admin/vehicle-damages', { params }),
  getVehicleDamageById: (id?: any) => api.get(`/admin/vehicle-damages/${id}`),
  createVehicleDamage: (data?: any) => api.post('/admin/vehicle-damages', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateVehicleDamage: (id?: any, data?: any) => api.put(`/admin/vehicle-damages/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteVehicleDamage: (id?: any) => api.delete(`/admin/vehicle-damages/${id}`),
  getInvoiceReport: (params?: any) => api.get('/admin/sales', { params }),
  getTrackingVillageVisits: (params?: any) => api.get('/reports/tracking/village-visits', { params }),
  getTrackingTimeDeviation: (params?: any) => api.get('/reports/tracking/time-deviation', { params }),

  // Settings
  getSettings: (params?: any) => api.get('/admin/settings', { params }).catch(err => {
    if (err.response?.status === 404) {
      console.warn('[System] Admin settings route not found on server yet. Using defaults.');
      return { data: { success: true, data: { businessName: 'VillagKart', taxRates: '0,5,12,18' } } };
    }
    throw err;
  }),
  updateSettings: (data: any) => api.put('/admin/settings', data),

  // Shift Configurations
  getShiftConfigs: (params?: any) => api.get('/admin/shift-configs', { params }).catch((err: any) => {
    console.warn('[System] Fallback for shift-configs:', err.message);
    return api.get('/admin/settings', { params });
  }),
  createShiftConfig: (data: any) => api.post('/admin/shift-configs', data),
  updateShiftConfig: (id: string, data: any) => api.put(`/admin/shift-configs/${id}`, data),
  deleteShiftConfig: (id: string) => api.delete(`/admin/shift-configs/${id}`),

  // Units
  getUnits: (params?: any) => api.get('/unit/getall', { params }),
  createUnit: (data?: any) => api.post('/unit/create', data),
  updateUnit: (id?: any, data?: any) => api.put(`/unit/update/${id}`, data),
  deleteUnit: (id?: any) => api.delete(`/unit/toggle/${id}`),

  // Categories
  getCategories: (params?: any) => api.get('/category/getCategoryList', { params }),
  createCategory: (data?: any) => api.post('/category/createCategory', data),
  updateCategory: (id?: any, data?: any) => api.patch(`/category/${id}`, data),
  deleteCategory: (id?: any) => api.delete(`/category/${id}`),

  // Sub-Categories
  getSubCategories: (params?: any) => api.get('/subCategory/getSubCategoryList', { params }),
  createSubCategory: (data?: any) => api.post('/subCategory/createSubCategory', data),
  updateSubCategory: (id?: any, data?: any) => api.patch(`/subCategory/${id}`, data),
  deleteSubCategory: (id?: any) => api.delete(`/subCategory/${id}`),

  // VGE Targets & Incentives
  vgeAllPerformance: (params?: any) => api.get('/vge/admin/all-performance', { params }),
  vgeAgentPerformance: (userId?: any, params?: any) => api.get(`/vge/admin/agent/${userId}`, { params }),
  vgeMonthlyReport: (params?: any) => api.get('/vge/admin/monthly-report', { params }),
  vgeGetConfig: (params?: any) => api.get('/vge/admin/config', { params }),
  vgeUpdateConfig: (data?: any) => api.put('/vge/admin/config', data),
  vgeRecalculate: (data?: any) => api.post('/vge/admin/recalculate', data),
  vgeEndOfDay: (data?: any) => api.post('/vge/admin/end-of-day', data || {}),
  vgeGenerateMonthly: (data?: any) => api.post('/vge/admin/generate-monthly', data || {}),

  // Asset Management
  getAssets: (params?: any) => api.get('/admin/assets', { params }),
  createAsset: (data?: any) => api.post('/admin/assets', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAsset: (id?: any, data?: any) => api.put(`/admin/assets/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAsset: (id?: any) => api.delete(`/admin/assets/${id}`),
  addAssetUnits: (id?: any, data?: any) => api.post(`/admin/assets/${id}/units`, data),
  assignAsset: (data?: any) => api.post('/admin/assets/assign', data),
  returnAsset: (data?: any) => api.post('/admin/assets/return', data),
  getAssetTracking: (params?: any) => api.get('/admin/assets/tracking', { params }),
  getAssetIssues: (params?: any) => api.get('/admin/assets/issues', { params }),
  updateAssetIssue: (id?: any, data?: any) => api.put(`/admin/assets/issues/${id}`, data),
  getAssetRequests: (params?: any) => api.get('/admin/assets/requests', { params }),
  updateAssetRequest: (id?: any, data?: any) => api.put(`/admin/assets/requests/${id}`, data),
  getAssetReports: (params?: any) => api.get('/admin/assets/reports', { params }),

  // Asset Categories
  getAssetCategories: (params?: any) => api.get('/admin/asset-categories', { params }),
  createAssetCategory: (data?: any) => api.post('/admin/asset-categories', data),
  updateAssetCategory: (id?: any, data?: any) => api.put(`/admin/asset-categories/${id}`, data),
  deleteAssetCategory: (id?: any) => api.delete(`/admin/asset-categories/${id}`),

  // Financial Reports
  getFinancialReport: async (params?: any) => {
    const response = await api.get('/admin/finance/reports', { params });
    return response.data;
  },
  resolveVillageLink: (url?: any) => api.post('/admin/villages/resolve-link', { url }),

  // Organization Stores Management (Admin Perspective)
  getStores: () => api.get('/admin/stores'),
  createStore: (data?: any) => api.post('/admin/stores', data),
  updateStore: (id?: any, data?: any) => api.put(`/admin/stores/${id}`, data),
  deleteStore: (id?: any) => api.delete(`/admin/stores/${id}`),

  // Warehouses (for location dropdowns)
  getWarehouses: (params?: any) => api.get('/warehouses', { params }),

  // Role & Privileges Management
  getRoles: () => api.get('/admin/roles'),
  getRole: (id?: any) => api.get(`/admin/roles/${id}`),
  createRole: (data?: any) => api.post('/admin/roles', data),
  updateRole: (id?: any, data?: any) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id?: any) => api.delete(`/admin/roles/${id}`),
  assignRole: (data?: any) => api.put('/admin/roles/assign', data),

  // Media / Uploads
  uploadProductImage: (data?: any) => api.post('/admin/upload-image', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadImage: (data?: any) => api.post('/admin/upload-image', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Customers Module
  getCustomers: (params?: any) => api.get('/customers', { params }),
  registerCustomer: (data?: any) => api.post('/customers', data),
  loginCustomer: (data?: any) => api.post('/customers/login', data),
  getCustomerHistory: (id?: any) => api.get(`/customers/${id}/history`),
  updateCustomerProfile: (id?: any, data?: any) => api.put(`/customers/${id}`, data),
  adjustCreditBalance: (id?: any, data?: any) => api.post(`/customers/${id}/credit`, data),
  adjustLoyaltyPoints: (id?: any, data?: any) => api.post(`/customers/${id}/points`, data),

  // Module 14 Enterprise Asset Extensions
  updateAssetVehicleMapping: (data?: any) => api.put('/admin/assets/vehicle-mapping', data),
  getDepreciationSchedules: (params?: any) => api.get('/admin/assets/depreciation', { params }),
  saveDepreciationSchedule: (data?: any) => api.post('/admin/assets/depreciation', data),
  getAssetAudits: (params?: any) => api.get('/admin/assets/audits', { params }),
  createAssetAudit: (data?: any) => api.post('/admin/assets/audits', data),

  // POS Terminals
  getTerminals: (params?: any) => api.get('/admin/terminals', { params }),
  createTerminal: (data?: any) => api.post('/admin/terminals', data),
  updateTerminal: (id?: any, data?: any) => api.put(`/admin/terminals/${id}`, data),
  deleteTerminal: (id?: any) => api.delete(`/admin/terminals/${id}`),

  // Asset Transfers
  getAssetTransfers: (params?: any) => api.get('/admin/assets/transfers', { params }),
  createAssetTransfer: (data?: any) => api.post('/admin/assets/transfers', data),

  // Bundle Deals (Partner Scope)
  getBundles: (params?: any) => api.get('/partner/bundles', { params }),
  createBundle: (data?: any) => api.post('/partner/bundles', data),
  updateBundle: (id?: any, data?: any) => api.put(`/partner/bundles/${id}`, data),
  deleteBundle: (id?: any) => api.delete(`/partner/bundles/${id}`),

  // Procurement
  getGRNs: async (params?: any) => {
    try {
      const grnRes = await api.get('/procurement/grns', { params });
      const list = grnRes.data?.data || grnRes.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return grnRes;
      }
      const poRes = await api.get('/procurement/purchase-orders', { params });
      const pos = Array.isArray(poRes.data) ? poRes.data : (poRes.data?.data || []);
      const mappedPosAsGRNs = pos.map((po: any) => ({
        id: po.id,
        displayId: po.displayId || (po.poNumber ? `PO-#${po.poNumber}` : po.id.slice(0, 8)),
        po: { vendor: po.vendor },
        items: (po.items || []).map((item: any) => ({
          productId: item.productId,
          receivedQuantity: item.quantity
        }))
      }));
      return { data: { data: mappedPosAsGRNs } };
    } catch (err) {
      console.error('adminService getGRNs error:', err);
      return { data: { data: [] } };
    }
  },
};

export default adminAPI;
