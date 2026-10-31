import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { prisma } from '../../config/prismaClient.js';

// Controller imports
import * as vehicleCtr from '../../controllers/vsms/vehicleController.js';
import * as vehDmgCtr from '../../controllers/vsms/vehicleDamageController.js';
import * as vehicleTripCtr from '../../controllers/vsms/vehicleTripController.js';
import * as fuelCtr from '../../controllers/vsms/fuelController.js';
import * as maintenanceCtr from '../../controllers/vsms/maintenanceController.js';
import * as routeCtr from '../../controllers/vsms/adminRouteController.js';
import * as villageCtr from '../../controllers/vsms/villageController.js';
import * as routePerformanceCtr from '../../controllers/vsms/routePerformanceController.js';
import * as activityCtr from '../../controllers/vsms/activityController.js';
import * as assetCtr from '../../controllers/vsms/assetController.js';
import * as assetCategoryCtr from '../../controllers/vsms/assetCategoryController.js';
import * as assetTransferCtr from '../../controllers/vsms/assetTransferController.js';
import * as settingsCtr from '../../controllers/vsms/settingsController.js';
import * as terminalCtr from '../../controllers/vsms/terminalController.js';
import * as agentRouteCtr from '../../controllers/vsms/agentRouteController.js';
import * as vgeCtr from '../../controllers/vsms/vgeController.js';
import * as shiftCtr from '../../controllers/vsms/shiftController.js';
import * as attendanceCtr from '../../controllers/vsms/attendanceController.js';
import * as expenseCtr from '../../controllers/vsms/expenseController.js';
import * as cashCtr from '../../controllers/vsms/cashController.js';
import * as inventoryCtr from '../../controllers/vsms/inventoryController.js';
import { getMyRefills } from '../../controllers/vsms/inventoryController.js';
import * as vsmsOrderCtr from '../../controllers/vsms/orderController.js';
import * as orderReturnCtr from '../../controllers/vsms/orderReturnController.js';
import * as locationCtr from '../../controllers/vsms/locationController.js';
import * as damageCtr from '../../controllers/vsms/damageController.js';
import * as cartCtr from '../../controllers/vsms/cartController.js';
import * as agentTransferCtr from '../../controllers/vsms/agentTransferController.js';
import * as barcodeCtr from '../../controllers/vsms/barcodeController.js';
import * as promotionCtr from '../../controllers/vsms/promotionController.js';
import * as villageActivityCtr from '../../controllers/vsms/villageActivityController.js';
import * as refillCtr from '../../controllers/vsms/refillController.js';
import * as lateEntryCtr from '../../controllers/vsms/lateEntryController.js';
import * as lateEntryAnalytics from '../../controllers/vsms/lateEntryAnalytics.js';
import * as bundleCtr from '../../controllers/vsms/bundleController.js';
import * as notifCtr from '../../controllers/vsms/notificationController.js';
import * as userCtr from '../../controllers/vsms/admin/userController.js';
import * as preOrderCtr from '../../controllers/vsms/preOrderController.js';
import * as reportCtr from '../../controllers/vsms/admin/reportController.js';
import * as agentReportCtr from '../../controllers/vsms/reportController.js';
import * as authCtr from '../../controllers/vsms/authController.js';
import * as customerCtr from '../../controllers/vsms/customerController.js';

import { InventoryCache } from '../../utils/cacheHelper.js';
import bcrypt from 'bcryptjs';
import { generateUserToken, generateRefreshToken } from '../../utils/jwtUtils.js';
import { prisma as prismaCli } from '../../config/prismaClient.js';
import { isUUID } from '../../utils/uuidUtils.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Generic cache GET wrapper middleware - DISABLED as requested (always live data)
const cacheGet = (cachePrefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Cache completely disabled to ensure 100% real-time data across all portals
    next();
  };
};

// ── Agent Login (public – no auth required) ──────────────────────────────────
// POST /api/v1/vsms/auth/agent-login
// Body: { phone: string, password: string }
router.post(['/auth/agent-login', '/auth/login'], async (req, res) => {
  try {
    const { phone, mobile, email, password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });
    const identifier = (phone || mobile || email || '').trim();
    if (!identifier) return res.status(400).json({ message: 'Phone, mobile, or email is required' });

    const isEmail = identifier.includes('@');
    const whereClause = isEmail ? { email: identifier } : { phone: identifier };

    const AGENT_ROLES = ['SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'SUPERVISOR', 'HELPER', 'SHOPKEEPER', 'PARTNER'];

    const user = await prisma.user.findFirst({
      where: whereClause,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        password: true,
        avatar: true,
        isActive: true,
        warehouseId: true,
        assignedVehicleId: true,
        lastLoginAt: true,
        Warehouse: { select: { id: true, name: true } },
        assignedVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
      }
    });

    if (!user) return res.status(401).json({ message: 'Invalid phone/email or password' });
    if (!AGENT_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'This account is not a VSMS agent account' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive. Contact support.' });
    if (!user.password) return res.status(400).json({ message: 'No password set. Please contact your manager.' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid phone/email or password' });

    const accessToken = generateUserToken(user);
    const refreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
      data: { userId: user.id, token: refreshToken, expiresAt }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: { id: true }
    });

    const isFirstLogin = user.lastLoginAt == null;

    return res.json({
      status: true,
      response: 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          storeId: user.warehouseId,
          store: user.Warehouse,
          assignedVehicleId: user.assignedVehicleId,
          assignedVehicle: user.assignedVehicle,
          isCreatedPassword: isFirstLogin,
          supplier: null,
        },
        accessToken,
        refreshToken,
        expiresIn: '30d',
      }
    });
  } catch (error) {
    console.error('[POST /vsms/auth/agent-login] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Public endpoint to view order invoices (used by customer invoice links via WhatsApp)
// Skips reserved sub-routes (/my-history, /session-sales, etc.) so they fall through to authMiddleware
const RESERVED_ORDER_ROUTES = new Set([
  'my-history',
  'session-sales',
  'return-report',
  'item-wise-report',
  'create-from-cart',
  'complete-payment',
  'freeze-session',
  'delivery',
  'pickup-store',
  'warehouse-stats',
  'atp-inventory'
]);

router.get('/orders/:id', (req, res, next) => {
  if (RESERVED_ORDER_ROUTES.has(req.params.id)) {
    return next();
  }
  return vsmsOrderCtr.getOrderById(req, res, next);
});

// Apply authMiddleware globally to all remaining vsms routes
router.use(authMiddleware);

// ── GET /api/v1/vsms/auth/me ─────────────────────────────────────────────────
// Used by userStore.ts refreshUserProfile() to hydrate the frontend user object.
// Returns partner profile with warehouseId so warehouse isolation works in UI.
router.get('/auth/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Look up in partner DB by JWT sub; fallback to phone/email
    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        warehouseId: true, avatar: true, isActive: true,
        customRoleId: true,
        assignedVehicleId: true,
        assignedVehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleName: true,
            status: true,
            rcDocument: true,
            insuranceDocument: true,
            permitDocument: true
          }
        },
        Warehouse: { select: { id: true, name: true } }
      }
    });

    if (!dbUser && (req.user?.phone || req.user?.email)) {
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(req.user.phone ? [{ phone: req.user.phone }] : []),
            ...(req.user.email ? [{ email: req.user.email }] : [])
          ]
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          warehouseId: true, avatar: true, isActive: true,
          customRoleId: true,
          assignedVehicleId: true,
          assignedVehicle: {
            select: {
              id: true,
              vehicleNumber: true,
              vehicleName: true,
              status: true,
              rcDocument: true,
              insuranceDocument: true,
              permitDocument: true
            }
          },
          Warehouse: { select: { id: true, name: true } }
        }
      });
    }

    // Load custom role permissions dynamically (since no schema relationship exists between User and Role models)
    let customRole = null;
    if (dbUser?.customRoleId && isUUID(dbUser.customRoleId)) {
      try {
        const role = await prisma.role.findUnique({
          where: { id: dbUser.customRoleId },
          include: {
            permissions: { include: { Module: true } }
          }
        });
        if (role) {
          const localMap = {};
          role.permissions.forEach(p => {
            if (p.Module?.name) {
              const modName = p.Module.name.toUpperCase();
              const actions = [];
              if (p.canView) actions.push('READ');
              if (p.canCreate) actions.push('CREATE');
              if (p.canUpdate) actions.push('UPDATE');
              if (p.canDelete) actions.push('DELETE');
              if (p.canManage) actions.push('ALL');
              localMap[modName] = actions;

              let alias = null;
              if (modName === 'POINT_OF_SALES' || modName === 'POINT_OF_SALE') alias = 'SALES';
              else if (modName === 'BARCODE_MASTER') alias = 'BARCODE';
              else if (modName === 'FLEET_ASSETS') alias = 'ASSETS';
              if (alias) localMap[alias] = actions;
            }
          });

          const adminRoles = ['SUPER_ADMIN', 'TENANT_OWNER', 'ADMIN', 'OPERATIONAL_ADMIN', 'REGIONAL_ADMIN', 'OWNER', 'DIRECTOR', 'PARTNER'];
          const userRole = dbUser?.role || req.user?.role || 'PARTNER';
          const portalType = adminRoles.includes(userRole) ? 'ADMIN' : 'AGENT';

          customRole = {
            id: role.id,
            name: role.name,
            portalType,
            permissions: localMap
          };
        }
      } catch (err) {
        console.error('[GET /auth/me] Error loading custom role:', err.message);
      }
    } else if (req.user?.customRole) {
      customRole = req.user.customRole;
    }

    // Build response: merge JWT claims with DB profile
    const profile = {
      id: dbUser?.id || userId,
      name: dbUser?.name || req.user?.name || '',
      email: dbUser?.email || req.user?.email || '',
      phone: dbUser?.phone || req.user?.phone || '',
      role: dbUser?.role || req.user?.role || 'PARTNER',
      avatar: dbUser?.avatar || null,
      isActive: dbUser?.isActive !== false,
      warehouseId: dbUser?.warehouseId || req.user?.warehouseId || null,
      storeId: dbUser?.warehouseId || req.user?.warehouseId || null,
      store: dbUser?.Warehouse || null,
      assignedVehicleId: dbUser?.assignedVehicleId || null,
      assignedVehicle: dbUser?.assignedVehicle || null,
      customRoleId: dbUser?.customRoleId || null,
      customRole: customRole,
      portalType: customRole?.portalType || null,
      tenantId: req.user?.tenantId || 'VK001',
      permissions: req.user?.flatPermissions || [],
    };

    console.log('[GET /auth/me] Returning profile for:', profile.email, '| warehouseId:', profile.warehouseId, '| vehicle:', profile.assignedVehicle?.vehicleNumber);
    return res.json(profile);
  } catch (error) {
    console.error('[GET /auth/me] Error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Automatic Redis Cache Invalidation Interceptors
router.use('/vehicles', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('vsms:vehicles:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/routes', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('vsms:routes:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

router.use('/inventory', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function () {
      InventoryCache.invalidatePrefix('vsms:inventory:').catch(console.error);
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

// Vehicles
router.get('/vehicles/agents', cacheGet('vsms:vehicles:'), vehicleCtr.getVehicleAgents);
router.route('/vehicles')
  .get(cacheGet('vsms:vehicles:'), vehicleCtr.getVehicles)
  .post(vehicleCtr.createVehicle);
router.route('/vehicles/:id')
  .get(cacheGet('vsms:vehicles:'), vehicleCtr.getVehicleById)
  .put(vehicleCtr.updateVehicle)
  .delete(vehicleCtr.deleteVehicle);
router.put('/vehicles/:id/assign', vehicleCtr.assignDriver);
router.post('/vehicles/:id/handover', vehicleCtr.executeVehicleHandover);
router.get('/vehicles/:id/stock', cacheGet('vsms:vehicles:'), vehicleCtr.getVehicleStock);
router.get('/vehicles/:id/sales', cacheGet('vsms:vehicles:'), vehicleCtr.getVehicleSales);

// Vehicle Trips
router.get('/vehicles/ops/trips', cacheGet('vsms:vehicles:'), vehicleTripCtr.getTrips);
router.post('/vehicles/ops/trips/start', vehicleTripCtr.startTrip);
router.put('/vehicles/ops/trips/:id/end', vehicleTripCtr.endTrip);
router.put('/vehicles/ops/trips/:id', vehicleTripCtr.updateTrip);
router.delete('/vehicles/ops/trips/:id', vehicleTripCtr.deleteTrip);

// Fuel & Maintenance
router.get('/vehicles/ops/fuel', cacheGet('vsms:vehicles:'), fuelCtr.getFuelLogs);
router.post('/vehicles/ops/fuel', fuelCtr.addFuelLog);
router.put('/vehicles/ops/fuel/:id', fuelCtr.updateFuelLog);
router.delete('/vehicles/ops/fuel/:id', fuelCtr.deleteFuelLog);
router.get('/vehicles/ops/maintenance', cacheGet('vsms:vehicles:'), maintenanceCtr.getMaintenanceLogs);
router.post('/vehicles/ops/maintenance', maintenanceCtr.addMaintenanceLog);
router.put('/vehicles/ops/maintenance/:id', maintenanceCtr.updateMaintenanceLog);
router.delete('/vehicles/ops/maintenance/:id', maintenanceCtr.deleteMaintenanceLog);

// Vehicle Damages
router.get('/vehicle-damages', vehDmgCtr.getVehicleDamages);
router.post('/vehicle-damages', vehDmgCtr.createVehicleDamage);
router.put('/vehicle-damages/:id', vehDmgCtr.updateVehicleDamage);
router.delete('/vehicle-damages/:id', vehDmgCtr.deleteVehicleDamage);
router.get('/vehicle-damages/:id', vehDmgCtr.getVehicleDamageById);

// Villages
router.route('/villages')
  .get(cacheGet('vsms:routes:'), villageCtr.getVillages)
  .post(villageCtr.createVillage);
router.route('/villages/:id')
  .put(villageCtr.updateVillage)
  .delete(villageCtr.deleteVillage);
router.post('/villages/resolve-link', villageCtr.resolveMapsLink);

// Routes & Assignments
router.get('/routes/loading-rules', routeCtr.getRouteLoadingRules);
router.post('/routes/loading-rules', routeCtr.saveRouteLoadingRules);
router.get('/routes/available-slots', routeCtr.getAvailableDeliverySlots);
router.route('/routes')
  .get(cacheGet('vsms:routes:'), routeCtr.getAdminRoutes)
  .post(routeCtr.createRoute);
router.route('/routes/:id')
  .put(routeCtr.updateRoute)
  .delete(routeCtr.deleteRoute);
router.route('/routes/assignments')
  .get(cacheGet('vsms:routes:'), routeCtr.getRouteAssignments)
  .post(routeCtr.assignRouteToVehicle);
router.route('/routes/assignments/:id')
  .put(routeCtr.updateRouteAssignment)
  .delete(routeCtr.deleteRouteAssignment);

// Agent Route & Coverage Status (Agent / Driver app APIs)
router.get('/agent-routes/today-plan', cacheGet('vsms:routes:'), agentRouteCtr.getTodayPlan);
router.get('/agent-routes/tomorrow-plan', cacheGet('vsms:routes:'), agentRouteCtr.getTomorrowPlan);
router.get('/agent-routes/scheduled-deliveries', agentRouteCtr.getScheduledDeliveries);
router.put('/agent-routes/scheduled-deliveries/:orderId/status', agentRouteCtr.updateScheduledDeliveryStatus);
router.get('/agent-routes/coverage-status', cacheGet('vsms:routes:'), agentRouteCtr.getCoverageStatus);
router.post('/agent-routes/mark-coverage', agentRouteCtr.markCoverage);
router.post('/agent-routes/location-check-in', agentRouteCtr.locationCheckIn);
router.get('/agent-routes/all-location-check-ins', agentRouteCtr.getAllLocationCheckIns);

// Agent Notifications & Route Notifications
router.get('/agent-notifications', agentRouteCtr.getNotifications);
router.post('/agent-notifications/read-all', agentRouteCtr.markAllNotificationsRead);
router.post('/agent-notifications/:id/read', agentRouteCtr.markNotificationRead);
router.get('/routes/notifications', agentRouteCtr.getNotifications);
router.post('/routes/notifications/read-all', agentRouteCtr.markAllNotificationsRead);
router.post('/routes/notifications/:id/read', agentRouteCtr.markNotificationRead);
router.post('/routes/location-check-in', agentRouteCtr.locationCheckIn);
router.get('/routes/all-location-check-ins', agentRouteCtr.getAllLocationCheckIns);
router.get('/agent-routes/notifications', agentRouteCtr.getNotifications);
router.post('/agent-routes/notifications/read-all', agentRouteCtr.markAllNotificationsRead);
router.post('/agent-routes/notifications/:id/read', agentRouteCtr.markNotificationRead);

// User Notifications (for Partner dashboard etc)
router.get('/notifications', notifCtr.getMyNotifications);
router.put('/notifications/read-all', notifCtr.markAllRead);
router.put('/notifications/:id/read', notifCtr.markRead);

// Agent Shifts
router.post('/shifts/start', shiftCtr.startShift);
router.post('/shifts/end', shiftCtr.endShift);
router.get('/shifts/status', shiftCtr.getShiftStatus);

// Agent Attendance
router.post('/attendance/punch-in', attendanceCtr.punchIn);
router.post('/attendance/punch-out', attendanceCtr.punchOut);
router.get('/attendance/today', attendanceCtr.getToday);
router.get('/attendance/my-history', attendanceCtr.getMyHistory);
router.get('/attendance/all', attendanceCtr.getAllAttendance);

// Attendance admin report routes
router.get('/attendance/admin/report', attendanceCtr.getAllAttendance);

// Cash wallet operations
router.post('/cash/opening', cashCtr.submitOpeningCash);
router.post('/cash/closing', cashCtr.submitClosingCash);
router.get('/cash/status', cashCtr.getCashStatus);
router.get('/cash/admin/reconciliation', cashCtr.getAdminCashSummary);
router.put('/cash/admin/reconciliation', cashCtr.adminUpdateReconciliation);
router.put('/cash/admin/closing/review', cashCtr.adminReviewClosingCash);
router.delete('/cash/admin/reconciliation/:vehicleId/:date', cashCtr.deleteReconciliation);
router.post('/cash/admin/opening', cashCtr.adminSubmitOpeningCash);

// Reports
router.get('/reports/pos-daily', cashCtr.getPOSDailyReport);

// Cash registers / safe movements
router.get('/cash/store-register/:date/ledger', cashCtr.getStoreCashLedger);
router.post('/cash/safe-movement', cashCtr.createSafeTransaction);
router.get('/cash/store-register/:date', cashCtr.getStoreCashRegister);
router.post('/cash/store-register/open', cashCtr.openStoreCashRegister);
router.post('/cash/store-register/close', cashCtr.closeStoreCashRegister);
router.post('/cash/store-register/deposit', cashCtr.createStoreDeposit);
router.patch('/cash/store-register/update', cashCtr.updateStoreCashRegister);
router.patch('/cash/store-register/deposit/:id', cashCtr.updateStoreDeposit);
router.delete('/cash/store-register/deposit/:id', cashCtr.deleteStoreDeposit);
router.post('/cash/store-register/bank-deposit', cashCtr.adminAddBankDeposit);
router.delete('/cash/store-register/bank-deposit/:id', cashCtr.deleteBankDeposit);
router.delete('/cash/store-register/:date/reset', cashCtr.resetStoreCashRegister);

// Expenses
router.post('/expenses', expenseCtr.addExpense);
router.put('/expenses/:id', expenseCtr.updateExpense);
router.get('/expenses/my', expenseCtr.getMyExpenses);
router.post('/expenses/chest-transfer', expenseCtr.submitToChest);
router.put('/expenses/:id/claim', expenseCtr.claimExpense);
router.put('/expenses/:id/dispute', expenseCtr.raiseDispute);
router.get('/expenses/admin/categories', expenseCtr.getExpenseCategories);
router.post('/expenses/admin/categories', expenseCtr.createExpenseCategory);
router.put('/expenses/admin/categories/:id', expenseCtr.updateExpenseCategory);
router.delete('/expenses/admin/categories/:id', expenseCtr.deleteExpenseCategory);
router.get('/expenses/admin/all', expenseCtr.getAllExpenses);
router.get('/expenses/admin/analytics', expenseCtr.getExpenseAnalytics);
router.put('/expenses/admin/bulk-status', expenseCtr.bulkUpdateStatus);
router.put('/expenses/admin/:id/reopen', expenseCtr.reopenExpense);
router.put('/expenses/admin/:id/status', expenseCtr.updateExpenseStatus);

// VGE Performance & incentive
router.get('/vge/my-performance', vgeCtr.getMyPerformance);
router.get('/vge/my-history', vgeCtr.getMyHistory);
router.get('/vge/my-monthly', vgeCtr.getMyMonthlySummary);
router.get('/vge/leaderboard', vgeCtr.getLeaderboardHandler);
router.get('/vge/admin/all-performance', vgeCtr.getAllPerformance);
router.get('/vge/admin/agent/:userId', vgeCtr.getAgentPerformance);
router.get('/vge/admin/monthly-report', vgeCtr.getMonthlyReport);
router.get('/vge/admin/config', vgeCtr.getConfig);
router.put('/vge/admin/config', vgeCtr.updateConfig);
router.post('/vge/admin/recalculate', vgeCtr.forceRecalculate);
router.post('/vge/admin/end-of-day', vgeCtr.triggerEndOfDay);
router.post('/vge/admin/generate-monthly', vgeCtr.triggerMonthlySummary);

// Assets
router.route('/assets')
  .get(assetCtr.getAssets)
  .post(assetCtr.createAsset);
router.post('/assets/assign', assetCtr.assignAsset);
router.post('/assets/return', assetCtr.returnAsset);
router.get('/assets/tracking', assetCtr.getAssetTracking);
router.get('/assets/issues', assetCtr.getIssues);
router.put('/assets/issues/:id', assetCtr.updateIssueStatus);
router.get('/assets/requests', assetCtr.getAssetRequests);
router.put('/assets/requests/:id', assetCtr.updateAssetRequestStatus);
router.get('/assets/reports', assetCtr.getAssetReports);
router.put('/assets/vehicle-mapping', assetCtr.updateAssetVehicleMapping);
router.get('/assets/depreciation', assetCtr.getDepreciationSchedules);
router.post('/assets/depreciation', assetCtr.saveDepreciationSchedule);
router.get('/assets/audits', assetCtr.getAssetAudits);
router.post('/assets/audits', assetCtr.createAssetAudit);
router.get('/assets/transfers', assetTransferCtr.getAssetTransfers);
router.post('/assets/transfers', assetTransferCtr.createAssetTransfer);
router.route('/assets/:id')
  .put(assetCtr.updateAsset)
  .delete(assetCtr.deleteAsset);
router.post('/assets/:id/units', assetCtr.addAssetUnits);

// Asset Categories
router.route('/asset-categories')
  .get(assetCategoryCtr.getAssetCategories)
  .post(assetCategoryCtr.createAssetCategory);
router.route('/asset-categories/:id')
  .put(assetCategoryCtr.updateAssetCategory)
  .delete(assetCategoryCtr.deleteAssetCategory);

// Route closure & performance
router.get('/routes/performance', routePerformanceCtr.getRoutePerformance);
router.get('/routes/performance/:assignmentId', routePerformanceCtr.getAssignmentPerformanceDetail);
router.get('/routes/performance/:assignmentId/closure', routePerformanceCtr.getRouteClosureSummary);

// Activity logs & settings
router.get('/activities/my', activityCtr.getMyActivityLogs);
router.get('/activities', cacheGet('vsms:activity:'), activityCtr.getActivityLogs);
router.get('/settings', settingsCtr.getSettings);
router.put('/settings', settingsCtr.updateSettings);

// Terminals
router.route('/terminals')
  .get(cacheGet('vsms:terminals:'), terminalCtr.getTerminals)
  .post(terminalCtr.createTerminal);
router.route('/terminals/:id')
  .put(terminalCtr.updateTerminal)
  .delete(terminalCtr.deleteTerminal);

// Inventory Operations
router.get('/inventory/init', cacheGet('vsms:inventory:', 60), inventoryCtr.getInventoryInitData);
router.route('/inventory/items')
  .get(cacheGet('vsms:inventory:'), inventoryCtr.getItems)
  .post(inventoryCtr.createItem);
router.post('/inventory/items/bulk', inventoryCtr.bulkCreateItems);
router.post('/inventory/items/bulk-import', inventoryCtr.bulkImportItems);
router.post('/inventory/items/bulk-delete', inventoryCtr.bulkDeleteItems);
router.post('/inventory/items/zip-import', inventoryCtr.importZipInventory);
router.route('/inventory/items/:id')
  .put(inventoryCtr.updateItem)
  .delete(inventoryCtr.deleteItem);

router.post('/inventory/load', inventoryCtr.loadStock);
router.get('/inventory/load-history', cacheGet('vsms:inventory:'), inventoryCtr.getLoadHistory);
router.post('/inventory/stock', inventoryCtr.updateProductStock);
router.post('/inventory/return', inventoryCtr.returnStock);
router.get('/inventory/return-history', cacheGet('vsms:inventory:'), inventoryCtr.getReturnHistory);
router.get('/inventory/refill-history', cacheGet('vsms:inventory:'), inventoryCtr.getRefillHistory);
router.get('/inventory/vehicle/:id', cacheGet('vsms:inventory:'), inventoryCtr.getVehicleInventory);
router.put('/inventory/vehicle/:id/audit', inventoryCtr.auditVehicleStock);
router.get('/inventory/audit-history', inventoryCtr.getAuditHistory);
router.get('/inventory/my-refills', getMyRefills);
router.get('/inventory/refills', cacheGet('vsms:inventory:'), inventoryCtr.getRefillRequests);
router.put('/inventory/refills/:id/approve', inventoryCtr.approveRefillRequest);
router.put('/inventory/refills/:id/reject', inventoryCtr.rejectRefillRequest);

// Returns management (VSMS agent return request loop)
router.get('/inventory/returns', cacheGet('vsms:inventory:'), inventoryCtr.getReturnRequests);
router.put('/inventory/returns/:id/approve', inventoryCtr.approveReturnRequest);
router.put('/inventory/returns/:id/reject', inventoryCtr.rejectReturnRequest);

// Agent transfers (Agent-to-Agent Stock Transfer)
router.get('/agent-transfers/active-agents', agentTransferCtr.getActiveAgents);
router.get('/admin/agent-transfers/active-agents', agentTransferCtr.getActiveAgents);
router.get('/agent-transfers/active-vehicles', agentTransferCtr.getActiveVehicles);
router.get('/admin/agent-transfers/active-vehicles', agentTransferCtr.getActiveVehicles);
router.post('/agent-transfers', agentTransferCtr.createTransfer);
router.post('/admin/agent-transfers', agentTransferCtr.createTransfer);
router.get('/agent-transfers', agentTransferCtr.getTransfers);
router.get('/admin/agent-transfers', agentTransferCtr.getTransfers);
router.get('/agent-transfers/:id', agentTransferCtr.getTransferById);
router.get('/admin/agent-transfers/:id', agentTransferCtr.getTransferById);
router.put('/agent-transfers/:id/approve', agentTransferCtr.approveTransfer);
router.post('/agent-transfers/:id/approve', agentTransferCtr.approveTransfer);
router.put('/admin/agent-transfers/:id/approve', agentTransferCtr.approveTransfer);
router.post('/admin/agent-transfers/:id/approve', agentTransferCtr.approveTransfer);
router.put('/agent-transfers/:id/reject', agentTransferCtr.rejectTransfer);
router.post('/agent-transfers/:id/reject', agentTransferCtr.rejectTransfer);
router.put('/admin/agent-transfers/:id/reject', agentTransferCtr.rejectTransfer);
router.post('/admin/agent-transfers/:id/reject', agentTransferCtr.rejectTransfer);

// Brands
router.get('/brands', authMiddleware, async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      where: {
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
});

// VSMS Agent & Admin Reports Endpoints
router.get('/reports/today', agentReportCtr.getTodayReport);
router.get('/reports/date', agentReportCtr.getDateReport);
router.get('/reports/trends', reportCtr.getTrendsReport);
router.get('/reports/day-detailed', reportCtr.getDayDetailedSales);
router.get('/reports/item', reportCtr.getItemWiseReport);
router.get('/reports/category-wise', reportCtr.getCategoryReport);
router.get('/reports/returns', reportCtr.getReturnReport);
router.get('/reports/daily', reportCtr.getDailyReport);
router.get('/reports/vehicle/:id', reportCtr.getVehicleWiseReport);
router.get('/reports/vehicle-sales', reportCtr.getVehicleSalesSummaryReport);
router.get('/reports/vehicle-opening-stock', reportCtr.getVehicleOpeningStockReport);
router.get('/reports/vehicle-current-stock', reportCtr.getVehicleCurrentStockReport);
router.get('/reports/vehicle-stock-movements', reportCtr.getVehicleStockMovementReport);
router.get('/reports/vehicle-item-sales', reportCtr.getVehicleItemSalesReport);
router.get('/reports/top-products', reportCtr.getTopProducts);
router.get('/reports/procurement-sales', reportCtr.getProcurementSalesReport);
router.get('/reports/credit-sales', reportCtr.getCreditSalesReport);
router.put('/reports/credit-sales/:orderId/payment-status', reportCtr.updateCreditPaymentStatus);

// Barcode management


router.get('/barcode/dashboard', barcodeCtr.getDashboardStats);
router.get('/barcode/lookup/:code', barcodeCtr.lookupBarcode);
router.get('/barcode/reports/no-barcode', barcodeCtr.getNoBarcodeProducts);
router.get('/barcode/reports/print-history', barcodeCtr.getPrintHistory);
router.get('/barcode/reports/scan-history', barcodeCtr.getScanHistory);
router.get('/barcode', barcodeCtr.getBarcodeMasterList);
router.post('/barcode', barcodeCtr.generateBarcode);
router.post('/barcode/quick-map', barcodeCtr.quickMapProductBarcode || barcodeCtr.quickMapBarcode);
router.post('/barcode/map-supplier', barcodeCtr.mapSupplierBarcode);
router.delete('/barcode/map-supplier/:id', barcodeCtr.deleteSupplierBarcodeMapping);
router.post('/barcode/log-print', barcodeCtr.logPrint);
router.post('/barcode/log-scan', barcodeCtr.logScan);
router.post('/barcode/import', barcodeCtr.bulkImport);
router.delete('/barcode/:productId', barcodeCtr.resetBarcode);

// Location Tracking (Agent breadcrumbs)
router.post('/location/log', locationCtr.logLocation);
router.get('/location/live', locationCtr.getLiveLocations);
router.get('/location/history', locationCtr.getLocationHistory);
router.put('/location/status', async (req, res, next) => {
  try {
    const { updateAgentStatus } = await import('../../controllers/vsms/authController.js');
    return updateAgentStatus(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Proxy for /products (productsAPI) client services mapping to inventoryCtr methods
router.get('/products', inventoryCtr.getItems);
router.get('/products/vehicle-inventory/:id', inventoryCtr.getVehicleInventory);
router.get('/products/audit-history/:id', inventoryCtr.getAuditHistory);
router.post('/products/refill', inventoryCtr.requestRefill);

// Bundle Deals CRUD
router.get('/partner/bundles', bundleCtr.listBundles);
router.post('/partner/bundles', bundleCtr.createBundle);
router.put('/partner/bundles/:id', bundleCtr.updateBundle);
router.delete('/partner/bundles/:id', bundleCtr.deleteBundle);

router.get('/bundles', bundleCtr.listBundles);
router.post('/bundles', bundleCtr.createBundle);
router.put('/bundles/:id', bundleCtr.updateBundle);
router.delete('/bundles/:id', bundleCtr.deleteBundle);

// VSMS Inventory Damage & Deductions
router.post('/damage/report', damageCtr.reportDamage);
router.get('/damage/my-reports', damageCtr.getMyDamageReports);
router.get('/damage/entries', damageCtr.getDamageEntries);
router.get('/damage/entries/:id', damageCtr.getDamageEntryById);
router.put('/damage/entries/:id/review', damageCtr.reviewDamage);
router.post('/damage/deductions', damageCtr.applyDeduction);
router.get('/damage/deductions', damageCtr.getDeductions);
router.put('/damage/deductions/:id', damageCtr.updateDeductionStatus);
router.get('/damage/reports', damageCtr.getDamageReports);

// Users Management
router.get('/users/shifts', userCtr.getShifts);
router.post('/users/shifts', userCtr.createShift);
router.get('/users', userCtr.getUsers);
router.post('/users', userCtr.createUser);
router.put('/users/:id', userCtr.updateUser);
router.delete('/users/:id', userCtr.deactivateUser);
router.post('/users/:userId/documents', userCtr.uploadUserDocument);
router.put('/users/documents/:documentId', userCtr.updateUserDocumentStatus);

// Stores proxy
router.get('/stores', async (req, res) => {
  try {
    const userWarehouseId = req.user.warehouseId || req.user.storeId || null;
    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN', 'PARTNER'].includes(req.user?.role) ||
      req.user?.customRole?.portalType === 'ADMIN';

    const where = {};
    if (!isGlobal && userWarehouseId) {
      where.id = userWarehouseId;
    }

    const stores = await prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        name: true,
        isPickupStore: true
      }
    });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stores', error: error.message });
  }
});

// Cache invalidation helper — call after any order mutation to bust the sales history cache
const invalidateSalesCache = () => InventoryCache.invalidatePrefix('vsms:sales:');

// VSMS POS Orders & Payments (with sales cache invalidation after writes)
router.post('/orders/create-from-cart', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return vsmsOrderCtr.createOrderFromCart(req, res, next);
});
router.post('/orders/complete-payment', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return vsmsOrderCtr.completePayment(req, res, next);
});
router.get('/orders/my-history', vsmsOrderCtr.getMyOrders);
router.get('/orders/session-sales', orderReturnCtr.getSessionSales);
router.post('/orders/freeze-session', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return orderReturnCtr.freezeSession(req, res, next);
});
router.get('/orders/:id', vsmsOrderCtr.getOrderById);

// ── Sales History (Admin) ──────────────────────────────────────────────────
// GET /vsms/sales — fetch all completed orders with full enrichment
router.get('/sales', async (req, res) => {
  try {
    const { fromDate, toDate, storeId, agentId, saleType, orderSource, status, deliveryType, fulfillmentType, search, limit, page = 1 } = req.query;

    // Resolve warehouseId first (needed for cache key)
    let targetWarehouseId = storeId || req.user.warehouseId || null;
    if (!targetWarehouseId && req.user?.id && !['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { warehouseId: true } });
      targetWarehouseId = dbUser?.warehouseId || null;
    }

    // Build a stable cache key scoped to warehouse + filters
    const dTypeKey = deliveryType || fulfillmentType || '';
    const cacheKey = `vsms:sales:${targetWarehouseId || 'all'}:${fromDate || ''}:${toDate || ''}:${agentId || ''}:${saleType || ''}:${orderSource || ''}:${status || ''}:${dTypeKey}:${search || ''}:${limit || 'all'}:${page}`;

    // Try cache first
    const cached = await InventoryCache.get(cacheKey);
    if (cached) {
      console.log(`[GET /vsms/sales] Cache HIT → key: ${cacheKey}`);
      return res.json(cached);
    }

    console.log(`[GET /vsms/sales] Cache MISS → key: ${cacheKey} | warehouse: ${targetWarehouseId}`);

    const where = {};

    // Date range filter with timezone tolerance (IST UTC+05:30)
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate.includes('T') ? new Date(fromDate) : new Date(`${fromDate}T00:00:00.000+05:30`);
      }
      if (toDate) {
        where.createdAt.lte = toDate.includes('T') ? new Date(toDate) : new Date(`${toDate}T23:59:59.999+05:30`);
      }
    }

    if (targetWarehouseId) {
      where.warehouseId = targetWarehouseId;
    }

    if (agentId) where.agentId = agentId;
    if (saleType === 'POS') where.vehicleId = null;
    if (saleType === 'AGENT') where.vehicleId = { not: null };

    const andConditions = [];

    // Delivery Type filter
    const activeDeliveryType = (deliveryType || fulfillmentType || '').toUpperCase();
    if (activeDeliveryType && activeDeliveryType !== 'ALL') {
      if (activeDeliveryType === 'VEHICLE_PICKUP' || activeDeliveryType === 'PICKUP_AT_VEHICLE') {
        andConditions.push({
          OR: [
            { fulfillmentType: 'VEHICLE_PICKUP' },
            { deliveryType: 'PICKUP_AT_VEHICLE' },
            { orderType: 'VEHICLE' }
          ]
        });
      } else if (activeDeliveryType === 'HOME_DELIVERY') {
        andConditions.push({ fulfillmentType: 'HOME_DELIVERY' });
      } else if (activeDeliveryType === 'STORE_PICKUP') {
        andConditions.push({
          OR: [
            { fulfillmentType: 'STORE_PICKUP' },
            { deliveryType: 'PICKUP_STORE' }
          ]
        });
      } else if (activeDeliveryType === 'POS') {
        andConditions.push({ orderType: 'POS' });
      }
    }

    // Order Source filter
    if (orderSource === 'POS') {
      andConditions.push({
        OR: [
          { orderType: 'POS' },
          { AND: [{ vehicleId: null }, { orderType: { not: 'ONLINE' } }, { fulfillmentType: { not: 'HOME_DELIVERY' } }] }
        ]
      });
    } else if (orderSource === 'APP') {
      andConditions.push({ orderType: 'ONLINE' });
    } else if (orderSource === 'VEHICLE') {
      andConditions.push({
        orderType: 'ONLINE',
        fulfillmentType: 'VEHICLE_PICKUP',
        vehicleId: { not: null }
      });
    }

    // Status filter
    if (status && status !== 'ALL') {
      const sUpper = status.toUpperCase();
      if (sUpper === 'COMPLETED') {
        where.status = { in: ['COMPLETED', 'DELIVERED'] };
      } else if (sUpper === 'DELIVERED') {
        where.status = 'DELIVERED';
      } else if (sUpper === 'READY_FOR_PICKUP') {
        where.status = 'READY_FOR_PICKUP';
      } else if (sUpper === 'OUT_FOR_DELIVERY') {
        where.status = 'OUT_FOR_DELIVERY';
      } else if (sUpper === 'PROCESSING') {
        where.status = { in: ['PROCESSING', 'PACKED'] };
      } else if (sUpper === 'CONFIRMED') {
        where.status = 'CONFIRMED';
      } else if (sUpper === 'PENDING') {
        where.status = { in: ['PENDING', 'PLACED', 'CREATED'] };
      } else if (sUpper === 'CANCELLED') {
        where.status = { in: ['CANCELLED', 'CANCELED'] };
      } else if (sUpper === 'RETURNED') {
        where.status = { in: ['RETURNED', 'RETURN_INITIATED'] };
      } else if (sUpper === 'PARTIALLY_RETURNED') {
        where.status = 'PARTIALLY_RETURNED';
      } else {
        where.status = sUpper;
      }
    } else {
      where.status = { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PLACED', 'PAID', 'COMPLETED', 'CANCELLED', 'RETURNED', 'RETURN_INITIATED', 'PENDING', 'CREATED', 'PACKED', 'ASSIGNED', 'ALLOCATED'] };
    }

    // Search filter across orderNumber, displayId, id, customer name, mobile
    if (search && search.trim()) {
      const sTerm = search.trim();
      const cleanTerm = sTerm.replace(/^vk-?/i, '');
      const searchConditions = [
        { orderNumber: { contains: sTerm, mode: 'insensitive' } },
        { customer: { name: { contains: sTerm, mode: 'insensitive' } } },
        { customer: { mobile: { contains: sTerm } } },
        { consumer: { name: { contains: sTerm, mode: 'insensitive' } } },
        { consumer: { phone: { contains: sTerm } } }
      ];
      if (cleanTerm && cleanTerm !== sTerm) {
        searchConditions.push({ orderNumber: { contains: cleanTerm, mode: 'insensitive' } });
      }
      andConditions.push({ OR: searchConditions });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Lean include — skip product join (migrated items have orphaned productIds; use stored productName scalar instead)
    const includeShape = {
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          productImage: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          discount: true,
          mrp: true,
          unit: true,
          isCancelled: true,
          taxAmount: true,
          cgst: true,
          sgst: true,
          igst: true,
        }
      },
      payment: true,
      customer: { select: { id: true, name: true, mobile: true } },
      consumer: { select: { id: true, name: true, phone: true } },
      agent: { select: { id: true, name: true, role: true } },
      vehicle: { 
        select: { 
          id: true, 
          vehicleNumber: true, 
          vehicleName: true, 
          storeId: true,
          assignedUsers: { select: { id: true, name: true, phone: true, role: true } }
        } 
      },
      route: { select: { id: true, routeName: true } },
      warehouse: { select: { id: true, name: true } },
    };

    const total = await prisma.order.count({ where });
    console.log(`[GET /vsms/sales] Total matching: ${total}`);

    let orders = [];

    const pageNum = parseInt(page) || 1;
    let limitNum;
    if (!limit || limit === 'all' || limit === '0' || limit === '50000') {
      limitNum = 50000;
    } else {
      limitNum = Math.min(parseInt(limit), 50000);
    }

    orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      include: includeShape
    });

    console.log(`[GET /vsms/sales] Returning ${orders.length} orders`);

// Collect product IDs requiring product-detail enrichment.
const missingProductIds = [
  ...new Set(
    orders
      .flatMap(order =>
        order.items
          .filter(
            item =>
              !item.productName ||
              item.productName === 'Unknown Product'
          )
          .map(item => item.productId)
      )
      .filter(Boolean)
  ),
];

let prodLookup = {};

if (missingProductIds.length > 0) {
  const foundProds = await prisma.product.findMany({
    where: {
      id: { in: missingProductIds },
    },
    select: {
      id: true,
      name: true,
      taxRate: true,
      mrp: true,
    },
  });

  prodLookup = foundProds.reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
}

const enriched = orders.map(order => {
  const assignedAgent = order.vehicle?.assignedUsers?.[0] || null;

  const resolvedAgentName =
    order.agent?.name ||
    assignedAgent?.name ||
    null;

  const resolvedAgent =
    order.agent ||
    (assignedAgent
      ? {
          id: assignedAgent.id,
          name: assignedAgent.name,
        }
      : null);

  return {
    ...order,

    customerName:
      order.customer?.name ||
      order.consumer?.name ||
      order.customerName ||
      null,

    mobile:
      order.customer?.mobile ||
      order.consumer?.phone ||
      order.mobile ||
      null,

    userName: resolvedAgentName,
    user: resolvedAgent,

    vehicle: order.vehicle
      ? {
          ...order.vehicle,
          driverName: resolvedAgentName,
        }
      : null,

    store: order.warehouse || null,
    storeId: order.warehouseId || null,
    displayId: order.orderNumber || order.id,

    items: order.items.map(item => {
      const product = prodLookup[item.productId];

      const finalName =
        item.productName &&
        item.productName !== 'Unknown Product'
          ? item.productName
          : product?.name || 'Unknown Product';

      return {
        ...item,
        name: finalName,
        productName: finalName,
        mrp: item.mrp ?? product?.mrp ?? null,
        taxRate: item.taxRate ?? product?.taxRate ?? 0,
        returnedQty: 0,
        returnableQty: item.quantity,
      };
    }),
  };
});
    const responsePayload = {
      data: enriched,
      total,
      page: parseInt(page) || 1,
      limit: limit ? parseInt(limit) : total
    };

    // Cache for 5 minutes (300s) — invalidated on new sale creation
    await InventoryCache.set(cacheKey, responsePayload, 300);

    res.json(responsePayload);
  } catch (error) {
    console.error('[GET /vsms/sales] Error:', error.message, '| code:', error.code, '| meta:', JSON.stringify(error.meta));
    res.status(500).json({ message: 'Failed to fetch sales history', error: error.message, code: error.code, meta: error.meta });
  }
});

// ── Finance Reports ────────────────────────────────────────────────────────
router.get('/finance/reports', cashCtr.getFinanceReports);




// Auth: update agent profile
router.put('/auth/me', authMiddleware, upload.single('avatar'), authCtr.updateUserProfile);

// Suspended Sales
router.post('/sales/suspend', async (req, res) => {
  try {
    const { storeId, terminalId, customerName, customerMobile, totalAmount, items } = req.body;
    const targetStoreId = req.user.warehouseId || '00000000-0000-0000-0000-000000000000';
    const cleanTerminalId = terminalId && terminalId !== 'undefined' && terminalId !== 'null' && terminalId !== '' ? terminalId : null;
    const suspended = await prisma.suspendedSale.create({
      data: {
        storeId: targetStoreId,
        terminalId: cleanTerminalId,
        customerName,
        customerMobile,
        totalAmount: parseFloat(totalAmount) || 0,
        items: items || [],
      }
    });
    res.json({ success: true, data: suspended });
  } catch (error) {
    console.error('[POST /sales/suspend] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend sale', error: error.message });
  }
});

router.get('/sales/suspended', async (req, res) => {
  try {
    const targetStoreId = req.user.warehouseId || '00000000-0000-0000-0000-000000000000';
    const suspendedSales = await prisma.suspendedSale.findMany({
      where: { storeId: targetStoreId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: suspendedSales });
  } catch (error) {
    console.error('[GET /sales/suspended] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suspended sales', error: error.message });
  }
});

router.delete('/sales/suspended/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.suspendedSale.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Suspended sale deleted' });
  } catch (error) {
    console.error('[DELETE /sales/suspended] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete suspended sale', error: error.message });
  }
});

// CONSOLIDATED VSMS AGENT ENDPOINTS
// ==========================================

// Cart Management
router.get('/cart', cartCtr.getCart);
router.post('/cart/add', cartCtr.addToCart);
router.post('/cart/update', cartCtr.updateCartItem);
router.post('/cart/remove', cartCtr.removeFromCart);
router.post('/cart/clear', cartCtr.clearCart);

// Order Mutations & Returns
router.get('/orders/session-sales', orderReturnCtr.getSessionSales);
router.get('/orders/return-report', orderReturnCtr.getReturnReport);
router.get('/orders/item-wise-report', orderReturnCtr.getItemWiseReport);
router.post('/orders/freeze-session', orderReturnCtr.freezeSession);
router.put('/orders/:orderId/items/:itemId', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return orderReturnCtr.editOrderItem(req, res, next);
});
router.delete('/orders/:orderId/items/:itemId', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return orderReturnCtr.removeOrderItem(req, res, next);
});
router.post('/orders/:orderId/return', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return orderReturnCtr.returnOrderItems(req, res, next);
});
router.post('/orders/:orderId/cancel', async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 400) invalidateSalesCache(); });
  return orderReturnCtr.cancelOrder(req, res, next);
});

// Promotions
router.get('/promotions', promotionCtr.getPromotions);
router.post('/promotions', promotionCtr.createPromotion);
router.post('/promotions/validate', promotionCtr.validatePromotion);
router.put('/promotions/:id', promotionCtr.updatePromotion);
router.delete('/promotions/:id', promotionCtr.deletePromotion);

// Village Visits / Activities
router.post('/village-activities/start', villageActivityCtr.startVillageVisit);
router.post('/village-activities/end', villageActivityCtr.endVillageVisit);
router.get('/village-activities/:shiftLogId', villageActivityCtr.getShiftActivities);

// Refills
router.post('/refills/log', refillCtr.logRefill);
router.get('/refills/my-history', refillCtr.getMyRefillHistory);

// Late Entry Management
router.get('/late-entry/config', lateEntryCtr.getConfig);
router.post('/late-entry/config', lateEntryCtr.updateConfig);
router.get('/late-entry/my', lateEntryCtr.getMyLateHistory);
router.get('/late-entry/admin/report', lateEntryCtr.getAdminReport);
router.patch('/late-entry/:id', lateEntryCtr.updateLateEntry);
router.get('/late-entry/analytics/stats', lateEntryAnalytics.getLateEntryStats);
router.get('/late-entry/analytics/top-offenders', lateEntryAnalytics.getTopOffenders);
router.post('/late-entry/exception', lateEntryCtr.requestException);
router.patch('/late-entry/exception/:id', lateEntryCtr.reviewException);
router.get('/late-entry/leave-balance', lateEntryCtr.getLeaveBalance);

// Shift Configurations Management
router.get('/shift-configs', shiftCtr.listShiftConfigs);
router.post('/shift-configs', shiftCtr.createShiftConfig);
router.put('/shift-configs/:id', shiftCtr.updateShiftConfig);
router.delete('/shift-configs/:id', shiftCtr.deleteShiftConfig);


// Pre-Orders Management (Partner & Admin)
router.post('/pre-orders', preOrderCtr.createPreOrder);
router.get('/pre-orders', preOrderCtr.getPartnerPreOrders);
router.get('/pre-orders/packing-summary', preOrderCtr.getPreOrderPackingSummary);
router.get('/pre-orders/search-customer', preOrderCtr.searchPreOrderCustomers);
router.get('/pre-orders/:id', preOrderCtr.getPreOrderById);
router.put('/pre-orders/:id/status', preOrderCtr.updatePreOrderStatus);
router.put('/pre-orders/:id/assign-vehicle', preOrderCtr.assignPreOrderVehicle);

// Customers Management & POS Customer Authentication
router.post('/customers', authMiddleware, customerCtr.registerCustomer);
router.post('/customers/login', authMiddleware, customerCtr.loginCustomer);
router.get('/customers', authMiddleware, customerCtr.getCustomers);
router.get('/customers/:id/history', authMiddleware, customerCtr.getCustomerHistory);
router.put('/customers/:id', authMiddleware, customerCtr.updateCustomerProfile);
router.post('/customers/:id/credit', authMiddleware, customerCtr.adjustCreditBalance);
router.post('/customers/:id/points', authMiddleware, customerCtr.adjustLoyaltyPoints);

export default router;
