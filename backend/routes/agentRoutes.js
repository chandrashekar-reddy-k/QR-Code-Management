// routes/agentRoutes.js
// Consolidated VSMS Vehicle Agent API routes
// Mounted at: /api/v1/agent

import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { prisma } from '../config/prismaClient.js';
import multer from 'multer';

// ─── Controllers ────────────────────────────────────────────────────────────
import * as authCtr from '../controllers/vsms/authController.js';
import * as productCtr from '../controllers/vsms/productController.js';
import * as cartCtr from '../controllers/vsms/cartController.js';
import * as orderCtr from '../controllers/vsms/orderController.js';
import * as orderReturnCtr from '../controllers/vsms/orderReturnController.js';
import * as reportCtr from '../controllers/vsms/reportController.js';
import * as cashCtr from '../controllers/vsms/cashController.js';
import * as routeCtr from '../controllers/vsms/routeController.js';
import * as notifCtr from '../controllers/vsms/notificationController.js';
import * as vgeCtr from '../controllers/vsms/vgeController.js';
import * as assetCtr from '../controllers/vsms/assetController.js';
import * as expenseCtr from '../controllers/vsms/expenseController.js';
import * as roleCtr from '../controllers/vsms/roleController.js';
import * as activityCtr from '../controllers/vsms/activityController.js';
import * as damageCtr from '../controllers/vsms/damageController.js';
import * as attendanceCtr from '../controllers/vsms/attendanceController.js';
import * as shiftCtr from '../controllers/vsms/shiftController.js';
import * as villageActivityCtr from '../controllers/vsms/villageActivityController.js';
import * as locationCtr from '../controllers/vsms/locationController.js';
import * as refillCtr from '../controllers/vsms/refillController.js';
import * as lateEntryCtr from '../controllers/vsms/lateEntryController.js';
import * as lateEntryAnalytics from '../controllers/vsms/lateEntryAnalytics.js';
import * as customerCtr from '../controllers/vsms/customerController.js';
import * as promotionCtr from '../controllers/vsms/promotionController.js';
import * as inventoryCtr from '../controllers/vsms/inventoryController.js';
import * as agentRouteCtr from '../controllers/vsms/agentRouteController.js';
import * as trackingCtr from '../controllers/vsms/trackingReportController.js';
import * as preOrderCtr from '../controllers/vsms/preOrderController.js';
import * as agentTransferCtr from '../controllers/vsms/agentTransferController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Stock Transfers (Agent-to-Agent) ─────────────────────────────────────
router.get('/agent-transfers/active-agents', authMiddleware, agentTransferCtr.getActiveAgents);
router.get('/agent-transfers/active-vehicles', authMiddleware, agentTransferCtr.getActiveVehicles);
router.post('/agent-transfers', authMiddleware, agentTransferCtr.createTransfer);
router.get('/agent-transfers', authMiddleware, agentTransferCtr.getTransfers);
router.get('/agent-transfers/:id', authMiddleware, agentTransferCtr.getTransferById);

// ─── Auth (Public) ─────────────────────────────────────────────────────────
router.post('/auth/login', authCtr.loginUser);
router.post('/auth/register', authCtr.registerUser);
router.post('/auth/logout', authMiddleware, authCtr.logoutUser);
router.get('/auth/me', authMiddleware, authCtr.getUserProfile);
router.put('/auth/me', authMiddleware, upload.single('avatar'), authCtr.updateUserProfile);
router.put('/auth/business', authMiddleware, upload.single('logo'), authCtr.updateBusinessProfile);
router.post('/auth/password', authMiddleware, authCtr.updatePassword);
router.put('/auth/password', authMiddleware, authCtr.updatePassword);
router.put('/auth/status', authMiddleware, authCtr.updateAgentStatus);
router.post('/auth/me/documents', authMiddleware, upload.single('document'), authCtr.uploadMyDocument);

// ─── Products ─────────────────────────────────────────────────────────────
router.get('/products', authMiddleware, productCtr.getProducts);
router.get('/products/categories', authMiddleware, productCtr.getVehicleCategories);
router.get('/products/vehicle-inventory/:id', authMiddleware, inventoryCtr.getVehicleInventory);
router.get('/products/audit-history/:vehicleId', authMiddleware, inventoryCtr.getAuditHistory);
router.post('/products/refill', authMiddleware, productCtr.requestRefill);
router.post('/products/return', authMiddleware, inventoryCtr.returnStock);
router.post('/inventory/return', authMiddleware, inventoryCtr.returnStock);
router.get('/products/:id', authMiddleware, productCtr.getProductById);

// ─── Cart ─────────────────────────────────────────────────────────────────
router.get('/cart', authMiddleware, cartCtr.getCart);
router.post('/cart/add', authMiddleware, cartCtr.addToCart);
router.post('/cart/update', authMiddleware, cartCtr.updateCartItem);
router.post('/cart/remove', authMiddleware, cartCtr.removeFromCart);
router.post('/cart/clear', authMiddleware, cartCtr.clearCart);

// ─── Orders ───────────────────────────────────────────────────────────────
router.post('/orders/create-from-cart', authMiddleware, orderCtr.createOrderFromCart);
router.post('/orders/complete-payment', authMiddleware, orderCtr.completePayment);
router.get('/orders/my-history', authMiddleware, orderCtr.getMyOrders);
router.get('/orders/session-sales', authMiddleware, orderReturnCtr.getSessionSales);
router.get('/orders/return-report', authMiddleware, orderReturnCtr.getReturnReport);
router.get('/orders/item-wise-report', authMiddleware, orderReturnCtr.getItemWiseReport);
router.post('/orders/freeze-session', authMiddleware, orderReturnCtr.freezeSession);
router.put('/orders/:orderId/items/:itemId', authMiddleware, orderReturnCtr.editOrderItem);
router.delete('/orders/:orderId/items/:itemId', authMiddleware, orderReturnCtr.removeOrderItem);
router.post('/orders/:orderId/return', authMiddleware, orderReturnCtr.returnOrderItems);
router.post('/orders/:orderId/cancel', authMiddleware, orderReturnCtr.cancelOrder);
router.get('/orders/:id', authMiddleware, orderCtr.getOrderById);

// ─── Route Orders (App Orders for Vehicle Agent) ──────────────────────────
router.get('/route-orders/app-orders', authMiddleware, orderCtr.getAgentAppOrders);
router.put('/route-orders/:orderId/status', authMiddleware, orderCtr.updateAgentOrderStatus);

// ─── Pre-Orders ───────────────────────────────────────────────────────────
router.post('/pre-orders', authMiddleware, preOrderCtr.createPreOrder);
router.get('/pre-orders', authMiddleware, preOrderCtr.getAgentPreOrders);
router.get('/pre-orders/search-customer', authMiddleware, preOrderCtr.searchPreOrderCustomers);
router.get('/pre-orders/:id', authMiddleware, preOrderCtr.getPreOrderById);
router.put('/pre-orders/:id/status', authMiddleware, preOrderCtr.updatePreOrderStatus);

// ─── Reports ─────────────────────────────────────────────────────────────
router.get('/reports/today', authMiddleware, reportCtr.getTodayReport);
router.get('/reports/date', authMiddleware, reportCtr.getDateReport);

// ─── Cash / Wallet ────────────────────────────────────────────────────────
router.post('/cash/opening', authMiddleware, cashCtr.submitOpeningCash);
router.post('/cash/closing', authMiddleware, cashCtr.submitClosingCash);
router.get('/cash/status', authMiddleware, cashCtr.getCashStatus);
router.get('/cash/admin/reconciliation', authMiddleware, cashCtr.getAdminCashSummary);
router.put('/cash/admin/reconciliation', authMiddleware, cashCtr.adminUpdateReconciliation);
router.put('/cash/admin/closing/review', authMiddleware, cashCtr.adminReviewClosingCash);
router.delete('/cash/admin/reconciliation/:vehicleId/:date', authMiddleware, cashCtr.deleteReconciliation);
router.post('/cash/admin/opening', authMiddleware, cashCtr.adminSubmitOpeningCash);

// Store Cash Safe Routes
router.get('/cash/store-register/:date/ledger', authMiddleware, cashCtr.getStoreCashLedger);
router.post('/cash/safe-movement', authMiddleware, cashCtr.createSafeTransaction);
router.get('/cash/store-register/:date', authMiddleware, cashCtr.getStoreCashRegister);
router.post('/cash/store-register/open', authMiddleware, cashCtr.openStoreCashRegister);
router.post('/cash/store-register/close', authMiddleware, cashCtr.closeStoreCashRegister);
router.post('/cash/store-register/deposit', authMiddleware, cashCtr.createStoreDeposit);
router.patch('/cash/store-register/update', authMiddleware, cashCtr.updateStoreCashRegister);
router.patch('/cash/store-register/deposit/:id', authMiddleware, cashCtr.updateStoreDeposit);
router.delete('/cash/store-register/deposit/:id', authMiddleware, cashCtr.deleteStoreDeposit);
router.post('/cash/store-register/bank-deposit', authMiddleware, cashCtr.adminAddBankDeposit);
router.delete('/cash/store-register/bank-deposit/:id', authMiddleware, cashCtr.deleteBankDeposit);
router.delete('/cash/store-register/:date/reset', authMiddleware, cashCtr.resetStoreCashRegister);

// ─── Routes ───────────────────────────────────────────────────────────────
router.get('/today-plan', authMiddleware, agentRouteCtr.getTodayPlan);
router.get('/routes/today-plan', authMiddleware, agentRouteCtr.getTodayPlan);
router.get('/agent-routes/today-plan', authMiddleware, agentRouteCtr.getTodayPlan);

router.get('/tomorrow-plan', authMiddleware, agentRouteCtr.getTomorrowPlan);
router.get('/routes/tomorrow-plan', authMiddleware, agentRouteCtr.getTomorrowPlan);
router.get('/agent-routes/tomorrow-plan', authMiddleware, agentRouteCtr.getTomorrowPlan);

router.get('/scheduled-deliveries', authMiddleware, agentRouteCtr.getScheduledDeliveries);
router.get('/routes/scheduled-deliveries', authMiddleware, agentRouteCtr.getScheduledDeliveries);
router.get('/agent-routes/scheduled-deliveries', authMiddleware, agentRouteCtr.getScheduledDeliveries);
router.put('/scheduled-deliveries/:orderId/status', authMiddleware, agentRouteCtr.updateScheduledDeliveryStatus);
router.put('/routes/scheduled-deliveries/:orderId/status', authMiddleware, agentRouteCtr.updateScheduledDeliveryStatus);
router.put('/agent-routes/scheduled-deliveries/:orderId/status', authMiddleware, agentRouteCtr.updateScheduledDeliveryStatus);

router.get('/coverage-status', authMiddleware, agentRouteCtr.getCoverageStatus);
router.get('/routes/coverage-status', authMiddleware, agentRouteCtr.getCoverageStatus);
router.get('/agent-routes/coverage-status', authMiddleware, agentRouteCtr.getCoverageStatus);

router.post('/mark-coverage', authMiddleware, agentRouteCtr.markCoverage);
router.post('/routes/mark-coverage', authMiddleware, agentRouteCtr.markCoverage);
router.post('/agent-routes/mark-coverage', authMiddleware, agentRouteCtr.markCoverage);

router.get('/notifications', authMiddleware, agentRouteCtr.getNotifications);
router.get('/routes/notifications', authMiddleware, agentRouteCtr.getNotifications);
router.get('/agent-routes/notifications', authMiddleware, agentRouteCtr.getNotifications);
router.post('/routes/notifications/:id/read', authMiddleware, agentRouteCtr.markNotificationRead);
router.post('/agent-routes/notifications/:id/read', authMiddleware, agentRouteCtr.markNotificationRead);
router.post('/routes/notifications/read-all', authMiddleware, agentRouteCtr.markAllNotificationsRead);
router.post('/agent-routes/notifications/read-all', authMiddleware, agentRouteCtr.markAllNotificationsRead);
router.post('/location-check-in', authMiddleware, agentRouteCtr.locationCheckIn);
router.post('/routes/location-check-in', authMiddleware, agentRouteCtr.locationCheckIn);
router.post('/agent-routes/location-check-in', authMiddleware, agentRouteCtr.locationCheckIn);
router.get('/all-location-check-ins', authMiddleware, agentRouteCtr.getAllLocationCheckIns);
router.get('/routes/all-location-check-ins', authMiddleware, agentRouteCtr.getAllLocationCheckIns);
router.get('/agent-routes/all-location-check-ins', authMiddleware, agentRouteCtr.getAllLocationCheckIns);
// sjdkfgdjksf
// ─── Notifications ───────────────────────────────────────────────────────
router.get('/notifications', authMiddleware, notifCtr.getMyNotifications);
router.put('/notifications/read-all', authMiddleware, notifCtr.markAllRead);
router.put('/notifications/:id/read', authMiddleware, notifCtr.markRead);

// ─── VGE Targets ─────────────────────────────────────────────────────────
// ─── VGE Targets / Performance ───────────────────────────────────────────
router.get('/vge/my-performance', authMiddleware, vgeCtr.getMyPerformance);
router.get('/vge/my-history', authMiddleware, vgeCtr.getMyHistory);
router.get('/vge/my-monthly', authMiddleware, vgeCtr.getMyMonthlySummary);
router.get('/vge/leaderboard', authMiddleware, vgeCtr.getLeaderboardHandler);

// VGE Admin Targets / Performance
router.get('/vge/admin/all-performance', authMiddleware, vgeCtr.getAllPerformance);
router.get('/vge/admin/agent/:userId', authMiddleware, vgeCtr.getAgentPerformance);
router.get('/vge/admin/monthly-report', authMiddleware, vgeCtr.getMonthlyReport);
router.get('/vge/admin/config', authMiddleware, vgeCtr.getConfig);
router.put('/vge/admin/config', authMiddleware, vgeCtr.updateConfig);
router.post('/vge/admin/recalculate', authMiddleware, vgeCtr.forceRecalculate);
router.post('/vge/admin/end-of-day', authMiddleware, vgeCtr.triggerEndOfDay);
router.post('/vge/admin/generate-monthly', authMiddleware, vgeCtr.triggerMonthlySummary);

// ─── Assets ──────────────────────────────────────────────────────────────
router.get('/assets/my-assets', authMiddleware, assetCtr.getMyAssets);
router.post('/assets/report-issue', authMiddleware, upload.array('photos', 5), assetCtr.reportIssue);
router.post('/assets/requests', authMiddleware, assetCtr.createAssetRequest);
router.get('/assets/requests', authMiddleware, assetCtr.getMyAssetRequests);
router.get('/assets/catalog', authMiddleware, assetCtr.getAssetCatalog);

// ─── Expenses ────────────────────────────────────────────────────────────
router.get('/expenses/my', authMiddleware, expenseCtr.getMyExpenses);
router.post('/expenses', authMiddleware, expenseCtr.addExpense);
router.put('/expenses/:id', authMiddleware, expenseCtr.updateExpense);
router.post('/expenses/chest-transfer', authMiddleware, expenseCtr.submitToChest);
router.put('/expenses/:id/claim', authMiddleware, expenseCtr.claimExpense);

// ─── Roles ────────────────────────────────────────────────────────────────
router.get('/roles', authMiddleware, roleCtr.getRoles);

// ─── Activity Logs ────────────────────────────────────────────────────────
router.get('/activities/my', authMiddleware, activityCtr.getMyActivityLogs);

// ─── Damage ───────────────────────────────────────────────────────────────
router.get('/damage/my-reports', authMiddleware, damageCtr.getMyDamageReports);
router.post('/damage/report', authMiddleware, upload.array('images', 5), damageCtr.reportDamage);

// ─── Attendance ───────────────────────────────────────────────────────────
router.post('/attendance/punch-in', authMiddleware, attendanceCtr.punchIn);
router.post('/attendance/punch-out', authMiddleware, attendanceCtr.punchOut);
router.get('/attendance/today', authMiddleware, attendanceCtr.getToday);
router.get('/attendance/my-history', authMiddleware, attendanceCtr.getMyHistory);

// ─── Shifts ───────────────────────────────────────────────────────────────
router.post('/shifts/start', authMiddleware, shiftCtr.startShift);
router.post('/shifts/end', authMiddleware, shiftCtr.endShift);
router.get('/shifts/status', authMiddleware, shiftCtr.getShiftStatus);

// ─── Village Activities ───────────────────────────────────────────────────
router.post('/village-activities/start', authMiddleware, villageActivityCtr.startVillageVisit);
router.post('/village-activities/end', authMiddleware, villageActivityCtr.endVillageVisit);
router.get('/village-activities/:shiftLogId', authMiddleware, villageActivityCtr.getShiftActivities);

// ─── Location ────────────────────────────────────────────────────────────
router.post('/location/log', authMiddleware, locationCtr.logLocation);
router.get('/location/live', authMiddleware, locationCtr.getLiveLocations);
router.get('/location/history', authMiddleware, locationCtr.getLocationHistory);

// ─── Refills ─────────────────────────────────────────────────────────────
router.post('/refills/log', authMiddleware, refillCtr.logRefill);
router.get('/refills/my-history', authMiddleware, refillCtr.getMyRefillHistory);


// ─── Customers ───────────────────────────────────────────────────────────
router.post('/customers', authMiddleware, customerCtr.registerCustomer);
router.post('/customers/login', authMiddleware, customerCtr.loginCustomer);
router.get('/customers', authMiddleware, customerCtr.getCustomers);
router.get('/customers/:id/history', authMiddleware, customerCtr.getCustomerHistory);
router.put('/customers/:id', authMiddleware, customerCtr.updateCustomerProfile);
router.post('/customers/:id/credit', authMiddleware, customerCtr.adjustCreditBalance);
router.post('/customers/:id/points', authMiddleware, customerCtr.adjustLoyaltyPoints);

// ─── Promotions ──────────────────────────────────────────────────────────
router.get('/promotions', authMiddleware, promotionCtr.getPromotions);
router.post('/promotions/validate', authMiddleware, promotionCtr.validatePromotion);

// ─── Late Entry ──────────────────────────────────────────────────────────
router.get('/late-entry/config', authMiddleware, lateEntryCtr.getConfig);
router.get('/late-entry/my', authMiddleware, lateEntryCtr.getMyLateHistory);
router.get('/late-entry/leave-balance', authMiddleware, lateEntryCtr.getLeaveBalance);
router.post('/late-entry/exception', authMiddleware, lateEntryCtr.requestException);

// ─── Tracking Reports ────────────────────────────────────────────────────
router.get('/reports/tracking/village-visits', authMiddleware, trackingCtr.getVillageVisitReport);
router.get('/reports/tracking/geo-compliance', authMiddleware, trackingCtr.getGeoComplianceReport);
router.get('/reports/tracking/time-deviation', authMiddleware, trackingCtr.getTimeDeviationReport);

// ─── Pre-Orders (VSMS Agent) ─────────────────────────────────────────────
router.post('/pre-orders', authMiddleware, preOrderCtr.createPreOrder);
router.get('/pre-orders', authMiddleware, preOrderCtr.getAgentPreOrders);
router.get('/pre-orders/search-customer', authMiddleware, preOrderCtr.searchPreOrderCustomers);
router.get('/pre-orders/:id', authMiddleware, preOrderCtr.getPreOrderById);
router.put('/pre-orders/:id/status', authMiddleware, preOrderCtr.updatePreOrderStatus);

export default router;

