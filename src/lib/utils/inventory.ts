import { InventorySnapshot, InventoryStatus, InventoryStatusInfo } from '../types/inventory.types';

/**
 * Calculate available stock (onHand - reserved)
 */
export const calculateAvailable = (snapshot: InventorySnapshot): number => {
  return snapshot.onHand - snapshot.reserved;
};

/**
 * Get inventory status based on snapshot data
 */
export const getInventoryStatus = (snapshot: InventorySnapshot): InventoryStatusInfo => {
  const available = calculateAvailable(snapshot);

  let status: InventoryStatus;
  
  if (available < 0) {
    status = 'NEGATIVE_STOCK';
  } else if (available > snapshot.safetyStock) {
    status = 'IN_STOCK';
  } else if (available > 0 && available <= snapshot.safetyStock) {
    status = 'LOW_STOCK';
  } else if (available <= 0 && snapshot.inbound > 0) {
    status = 'COMING_SOON';
  } else {
    status = 'OUT_OF_STOCK';
  }

  return getStatusInfo(status);
};

/**
 * Get status info with label and color class
 */
export const getStatusInfo = (status: InventoryStatus): InventoryStatusInfo => {
  const statusMap: Record<InventoryStatus, InventoryStatusInfo> = {
    IN_STOCK: {
      code: 'IN_STOCK',
      label: 'In stock',
      colorClass: 'bg-green-100 text-green-800',
    },
    LOW_STOCK: {
      code: 'LOW_STOCK',
      label: 'Low stock',
      colorClass: 'bg-amber-100 text-amber-800',
    },
    OUT_OF_STOCK: {
      code: 'OUT_OF_STOCK',
      label: 'Out of stock',
      colorClass: 'bg-red-100 text-red-800',
    },
    COMING_SOON: {
      code: 'COMING_SOON',
      label: 'Coming soon',
      colorClass: 'bg-blue-100 text-blue-800',
    },
    NEGATIVE_STOCK: {
      code: 'NEGATIVE_STOCK',
      label: 'Negative stock',
      colorClass: 'bg-orange-100 text-orange-800',
    },
  };

  return statusMap[status];
};

