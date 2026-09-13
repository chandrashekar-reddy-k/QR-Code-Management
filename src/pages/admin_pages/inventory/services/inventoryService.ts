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
  }
};

export default inventoryService;
