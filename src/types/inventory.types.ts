export interface InventorySnapshot {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  locationName: string;
  locationCode: string;
  onHand: number;
  reserved: number;
  inbound: number;
  reorderPoint: number;
  safetyStock: number;
}

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'COMING_SOON' | 'NEGATIVE_STOCK';

export interface InventoryStatusInfo {
  code: InventoryStatus;
  label: string;
  colorClass: string;
}

export interface StockLedgerEntry {
  id: string;
  variantId: string;
  locationCode: string;
  dateTime: string;
  qtyChange: number;
  reason: 'GRN' | 'RESERVE' | 'SALE_ALLOCATE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'CYCLE_COUNT_VARIANCE';
  reference: string;
  performedBy: string;
}

export interface Reservation {
  id: string;
  orderId: string;
  customerName: string;
  variantId: string;
  sku: string;
  locationCode: string;
  qty: number;
  status: 'active' | 'released';
  createdAt: string;
  expiresAt: string;
}

export interface Transfer {
  id: string;
  fromLocation: string;
  toLocation: string;
  skus: TransferLine[];
  status: 'Requested' | 'Approved' | 'In transit' | 'Received' | 'Canceled';
  requestedBy: string;
  requestedAt: string;
  notes?: string;
}

export interface TransferLine {
  variantId: string;
  sku: string;
  productName: string;
  currentOnHand: number;
  transferQty: number;
}

export interface GRN {
  id: string;
  supplier: string;
  locationCode: string;
  status: 'Draft' | 'Completed';
  receivedAt: string;
  linkedPO?: string;
  lines: GRNLine[];
}

export interface GRNLine {
  variantId: string;
  sku: string;
  productName: string;
  expectedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface CycleCount {
  id: string;
  locationCode: string;
  scope: 'All SKUs' | 'Category' | 'Custom SKUs';
  status: 'Scheduled' | 'In progress' | 'Completed';
  assignedTo: string;
  createdAt: string;
  completedAt?: string;
}

export interface Alert {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE_STOCK';
  variantId: string;
  sku: string;
  locationCode: string;
  description: string;
  createdAt: string;
  status: 'Open' | 'Acknowledged' | 'Closed';
}

export interface Location {
  code: string;
  name: string;
}

export interface InventorySettings {
  defaultSafetyStock: number;
  defaultReorderPoint: number;
}

