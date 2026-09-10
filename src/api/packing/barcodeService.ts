import API from './axios';

export interface PrintJobData {
  id?: string;
  workOrderId: string;
  batchNumber: string;
  barcodeType: string;
  printedQty: number;
  operatorId?: string;
  printer?: string;
  labelTemplate?: string;
}

export interface ReprintJobData {
  jobId: string;
  reprintReason: string;
  printedQty?: number;
}

export const barcodeService = {
  getPrintHistory: async () => {
    const res = await API.get('/barcodes/history');
    return res.data;
  },
  printLabels: async (data: PrintJobData) => {
    const res = await API.post('/barcodes/print', data);
    return res.data;
  },
  reprintLabels: async (data: ReprintJobData) => {
    const res = await API.post('/barcodes/reprint', data);
    return res.data;
  },
  getMyTasks: async () => {
    const res = await API.get('/barcodes/my-tasks');
    return res.data;
  },
  completeTask: async (data: { workOrderId: string; appliedQuantity: number }) => {
    const res = await API.post('/barcodes/complete-task', data);
    return res.data;
  }
};

