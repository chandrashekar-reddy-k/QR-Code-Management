export type ApprovalType = 
  | 'WORK_ORDER'
  | 'MATERIAL_ISSUE'
  | 'PACKING_VARIANCE'
  | 'QC_REWORK'
  | 'REPACKING'
  | 'BARCODE_REPRINT'
  | 'FINISHED_GOODS'
  | 'WASTAGE_SCRAP';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';

export interface InventoryValidationItem {
  id: string;
  materialId?: string;
  SKU?: string;
  materialName: string;
  type: 'RAW_MATERIAL' | 'PACKAGING' | 'FINISHED_GOOD';
  requiredQty: number;
  uom: string;
  availableStock: number;
  shortage: number;
  status: 'AVAILABLE' | 'INSUFFICIENT' | 'OUT_OF_STOCK' | 'INVENTORY_UNAVAILABLE';
}

export interface WoApprovalDetails {
  woNumber: string;
  outputProduct: string;
  recipeCode: string;
  targetQty: number;
  targetYieldQty: number;
  uomName: string;
  requestedBy: string;
  requestedDate: string;
  priority: Priority;
  status: string;
  warehouseName?: string;
  availableQty?: number;
  sourceItems?: any[];
  outputAllocations?: any[];
  requiredQty?: number;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  relatedEntityId: string;
  relatedEntityName: string;
  productName?: string;
  requestedBy: string;
  requestedDate: string;
  reason: string;
  priority: Priority;
  status: ApprovalStatus;
  
  // Context details
  existingValues?: Record<string, any>;
  proposedValues?: Record<string, any>;
  remarks?: string;
  attachments?: string[];
  
  // Work Order specific enriched properties
  inventoryStatus?: 'STOCK_AVAILABLE' | 'STOCK_SHORTAGE' | 'NOT_CHECKED';
  inventoryValidation?: InventoryValidationItem[];
  woDetails?: WoApprovalDetails;
  
  // History
  history: ApprovalHistory[];
}

export interface ApprovalHistory {
  action: string;
  actionBy: string;
  actionDate: string;
  comments?: string;
}
