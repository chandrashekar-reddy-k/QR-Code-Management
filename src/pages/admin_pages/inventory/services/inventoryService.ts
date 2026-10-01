import api from '../../../../api/axios';

export const inventoryService = {
  getRawInventory: async (params: any) => {
    return api.get('/product', { params: { ...params, inventoryType: 'RAW' } });
  },
  getReadyInventory: async (params: any) => {
    return api.get('/product', { params: { ...params, inventoryType: 'READY', showAll: 'true' } });
  },
  getReserveInventory: async (params: any) => {
    return api.get('/product', { params: { ...params, inventoryType: 'RESERVE' } });
  },
  updateProductInventoryType: async (productId: string, inventoryType: 'RAW' | 'READY' | 'RESERVE' | 'PRODUCTION') => {
    return api.put(`/product/${productId}`, { inventoryType });
  },
  saveChannelAllocation: async (productId: string, allocation: { onlineQty: number; posQty: number; vehicleQty: number }) => {
    return api.patch(`/product/${productId}/channel-allocation`, allocation);
  },
  updateProductStock: async (productId: string, stock: number) => {
    return api.put(`/product/${productId}`, { stock });
  },
  toggleProductStatus: async (productId: string) => {
    return api.patch(`/product/toggle/${productId}`);
  },
  getDashboardStats: async () => {
    return api.get('/product/dashboard/stats');
  },
  getProcurementGRNs: async () => {
    try {
      const grnRes = await api.get('/procurement/grns');
      const list = grnRes.data?.data || grnRes.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return grnRes;
      }
      // Fallback to Purchase Orders if GRNs are empty
      const poRes = await api.get('/procurement/purchase-orders');
      const pos = Array.isArray(poRes.data) ? poRes.data : (poRes.data?.data || []);
      const mappedPosAsGRNs = pos.map((po: any) => ({
        id: po.id,
        displayId: po.displayId || po.poNumber ? `PO-#${po.poNumber}` : po.id.slice(0, 8),
        po: { vendor: po.vendor },
        items: (po.items || []).map((item: any) => ({
          productId: item.productId,
          receivedQuantity: item.quantity
        }))
      }));
      return { data: { data: mappedPosAsGRNs } };
    } catch (err) {
      console.error('getProcurementGRNs error:', err);
      return { data: { data: [] } };
    }
  }
};

export default inventoryService;
