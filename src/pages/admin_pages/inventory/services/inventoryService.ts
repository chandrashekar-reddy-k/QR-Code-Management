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
  updateProductInventoryType: async (productId: string, inventoryType: 'RAW' | 'READY' | 'RESERVE' | 'PRODUCTION', extra?: { transferQty?: number; grnId?: string; name?: string; sku?: string; price?: number; [key: string]: any }) => {
    return api.put(`/product/${productId}`, { inventoryType, ...extra });
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
      const [grnRes, poRes] = await Promise.allSettled([
        api.get('/procurement/grns'),
        api.get('/procurement/purchase-orders')
      ]);

      const grnList = grnRes.status === 'fulfilled' ? (grnRes.value.data?.data || grnRes.value.data || []) : [];
      const poList = poRes.status === 'fulfilled' ? (Array.isArray(poRes.value.data) ? poRes.value.data : (poRes.value.data?.data || [])) : [];

      const poMap = new Map(poList.map((po: any) => [po.id, po]));

      const mappedGRNs = grnList.map((grn: any) => {
        const parentPo = grn.po || poMap.get(grn.poId);
        const vendorName = grn.vendorName || parentPo?.vendor?.vendorName || parentPo?.vendorName || '';
        return {
          ...grn,
          po: parentPo ? { ...parentPo, vendor: { vendorName: parentPo.vendor?.vendorName || vendorName } } : { vendor: { vendorName } }
        };
      });

      return { data: { data: mappedGRNs } };
    } catch (err) {
      console.error('getProcurementGRNs error:', err);
      return { data: { data: [] } };
    }
  }
};

export default inventoryService;
