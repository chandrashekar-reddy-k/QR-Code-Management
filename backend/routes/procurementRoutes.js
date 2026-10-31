import express from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import * as poCtr from '../controllers/procurement/purchaseOrderController.js';
import * as purchaseCtr from '../controllers/procurement/purchaseController.js';
import * as reportCtr from '../controllers/procurement/procurementReportController.js';
import * as vendorCtr from '../controllers/procurement/procurementVendorController.js';
import * as grnCtr from '../controllers/procurement/procurementGRNController.js';
import * as paymentCtr from '../controllers/procurement/procurementPaymentController.js';
import { InventoryCache } from '../utils/cacheHelper.js';

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// Helpers to handle cached GET responses - DISABLED as requested (always live data)
const cacheGet = (prefix, ttl = 300) => {
  return async (req, res, next) => {
    next();
  };
};

// Automatic Redis Cache Invalidation Interceptors
router.use('/vendors', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('procurement:vendors:').catch(console.error);
      InventoryCache.invalidatePrefix('procurement:reports:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/purchase-orders', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('procurement:po:').catch(console.error);
      InventoryCache.invalidatePrefix('procurement:reports:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/purchases', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('procurement:purchases:').catch(console.error);
      InventoryCache.invalidatePrefix('procurement:reports:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/payments', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('procurement:payments:').catch(console.error);
      InventoryCache.invalidatePrefix('procurement:reports:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/grns', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('procurement:grns:').catch(console.error);
      InventoryCache.invalidatePrefix('procurement:reports:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

// ─── VENDORS ─────────────────────────────────────
router.route('/vendors')
  .get(cacheGet('procurement:vendors:'), vendorCtr.getVendors)
  .post(vendorCtr.createVendor);
router.route('/vendors/:id')
  .get(cacheGet('procurement:vendors:'), vendorCtr.getVendorById)
  .put(vendorCtr.updateVendor)
  .delete(vendorCtr.deleteVendor);
router.put('/vendors/:id/toggle-status', vendorCtr.toggleVendorStatus);
router.put('/vendors/:id/approval', vendorCtr.updateVendorApproval);
router.get('/vendors/:id/ledger', cacheGet('procurement:vendors:'), vendorCtr.getVendorLedger);

router.route('/vendors/:vendorId/mappings')
  .get(cacheGet('procurement:vendors:'), vendorCtr.getVendorMappings)
  .put(vendorCtr.updateVendorMappings);

// ─── PURCHASE ORDERS ─────────────────────────────────────
router.route('/purchase-orders')
  .get(cacheGet('procurement:po:'), poCtr.getPOs)
  .post(poCtr.createPO);
router.route('/purchase-orders/:id')
  .get(cacheGet('procurement:po:'), poCtr.getPOById)
  .put(poCtr.updatePO)
  .delete(poCtr.deletePO);
router.put('/purchase-orders/:id/status', poCtr.updatePOStatus);

// ─── PURCHASE INVOICES ─────────────────────────────────────
router.route('/purchases')
  .get(cacheGet('procurement:purchases:'), purchaseCtr.getPurchases)
  .post(purchaseCtr.createPurchase);
router.get('/purchases/product-dates/:productId', purchaseCtr.getProductPurchaseDates);
router.route('/purchases/:id')
  .get(cacheGet('procurement:purchases:'), purchaseCtr.getPurchaseById)
  .put(purchaseCtr.updatePurchase)
  .delete(purchaseCtr.deletePurchase);

// ─── PAYMENTS ─────────────────────────────────────
router.route('/payments')
  .get(cacheGet('procurement:payments:'), paymentCtr.getPayments)
  .post(paymentCtr.createPayment);
router.route('/payments/:id')
  .put(paymentCtr.updatePayment)
  .delete(paymentCtr.deletePayment);
router.get('/payments/outstanding/:vendorId', cacheGet('procurement:payments:'), paymentCtr.getOutstandingInvoices);

// ─── GOODS RECEIPT NOTES (GRNs) ──────────────────────────────────
router.get('/grns/unconfigured-items', grnCtr.getUnconfiguredGRNItems);
router.post('/grns/configure-to-raw', grnCtr.configureGRNItemsToRaw);

router.route('/grns')
  .get(cacheGet('procurement:grns:'), grnCtr.getProcurementGRNs)
  .post(grnCtr.createProcurementGRN);
router.route('/grns/item/:itemId/qc')
  .put(grnCtr.updateQCStatus);
router.route('/grns/:id')
  .get(cacheGet('procurement:grns:'), grnCtr.getProcurementGRNById)
  .put(grnCtr.updateProcurementGRN)
  .delete(grnCtr.deleteProcurementGRN);

// ─── REPORTS ─────────────────────────────────────
router.get('/reports/stock', cacheGet('procurement:reports:'), reportCtr.getStockReport);
router.get('/reports/low-stock', cacheGet('procurement:reports:'), reportCtr.getLowStockAlert);
router.get('/reports/purchases', cacheGet('procurement:reports:'), reportCtr.getPurchaseReport);
router.get('/reports/vendors', cacheGet('procurement:reports:'), reportCtr.getVendorReport);
router.get('/reports/outstanding', cacheGet('procurement:reports:'), reportCtr.getOutstandingPayables);
router.get('/reports/aging', cacheGet('procurement:reports:'), reportCtr.getAgingReport);
router.get('/reports/profitability', cacheGet('procurement:reports:'), reportCtr.getProfitabilityReport);
router.get('/reports/stock-ledger', cacheGet('procurement:reports:'), reportCtr.getStockLedger);

export default router;
