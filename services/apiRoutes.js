//services/apiRoutes.js
//Import Route Path
import { prisma } from "../config/prismaClient.js";
import router from "../routes/authRoutes.js";
import storeRouter from "../routes/storeRoutes.js";
import partnerOrderRouter from "../routes/partnerOrderRoutes.js";
import partnerReturnRequestRouter from "../routes/partnerReturnRequestRoutes.js";
import partnerRefundRouter from "../routes/partnerRefundRoutes.js";
import partnerDeliverySettingsRouter from "../routes/partnerDeliverySettingsRoutes.js";
import supplierRouter from "../routes/supplierRoutes.js";
import partnerAuthRouter from "../routes/partnerAuthRoutes.js";
import varientRoutes from "../routes/product&invManagement/varientRoutes.js";
import productRoutes from "../routes/product&invManagement/productRoutes.js";
import mediaRoutes from "../routes/product&invManagement/mediaRoutes.js";
import inventoryRoutes from "../routes/product&invManagement/inventoryRoutes.js";
import grnRoutes from "../routes/product&invManagement/grnRoutes.js";
import cycleCountRoutes from "../routes/product&invManagement/cycleCountRoutes.js";
import alertsRoutes from "../routes/product&invManagement/alertsRoutes.js";
import stockAdjustRoutes from "../routes/product&invManagement/stockAdjustRoutes.js";
import pricingRoutes from "../routes/product&invManagement/pricingRoutes.js";
import masterCategoryRoutes from "../routes/masterCategoryRoutes.js";
import auditRoutes from "../routes/product&invManagement/auditRoutes.js";
import deliveryAgentRoutes from "../routes/deliveryAgentRoutes.js";
import internalSyncRoutes from "../routes/internalSyncRoutes.js";
import internalRealtimeRoutes from "../routes/internalRealtimeRoutes.js";
import rateLimit from "express-rate-limit";
import { internalApiRateLimiter } from "../middlewares/internalApiRateLimiter.js";
import {
  healthAggregate,
  healthFirebase,
  healthSocket
} from "../controllers/healthController.js";
import config from "../config/config.js";
import fileUploadRoutes from "../routes/product&invManagement/fileUploadRoutes.js"
import bannerRoutes from "../routes/bannerRoutes.js";
import campaignRoutes from "../routes/campaignRoutes.js";
import promoCodeRoutes from "../routes/promocodesRoutes.js";
import appSectionConfigRoutes from "../routes/appSectionConfigRoutes.js";
import vsmsRouter from "../routes/admin/vsmsRoutes.js";
import procurementRouter from "../routes/procurementRoutes.js";
import shopkeeperRouter from "../routes/shopkeeperRoutes.js";
import settingsRouter from "../routes/settingsRoutes.js";
import agentRouter from "../routes/agentRoutes.js";
import agentTransferRoutes from "../routes/agentTransferRoutes.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as vsmsOrderCtr from "../controllers/vsms/orderController.js";
import { getOrderTimeline, getOrderAuditHistory } from "../controllers/partnerOrderController.js";

// Packing ERP Route Imports
import masterDataPackingRoutes from "../routes/packing/masterDataRoutes.js";
import workOrderPackingRoutes from "../routes/packing/workOrderRoutes.js";
import approvalPackingRoutes from "../routes/packing/approvalRoutes.js";
import workflowPackingRoutes from "../routes/packing/workflowRoutes.js";
import barcodePackingRoutes from "../routes/packing/barcodeRoutes.js";
import issuePackingRoutes from "../routes/packing/issueRoutes.js";
import authPackingRoutes from "../routes/packing/authPackingRoutes.js";
import qrStudioRoutes, { handleQRRedirect } from "../routes/qrStudioRoutes.js";

const routes = (app) => {
  const { fullPrefix } = config.api;

  // Rate limiter for public invoice access: max 60 requests per 15 minutes per IP
  const publicInvoiceRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
      success: false,
      message: "Too many invoice requests from this IP. Please try again after 15 minutes."
    }
  });

  // Public invoice view for customers (no login or auth token required)
  // Strictly enforces 36-character UUIDv4 to forbid scraping or guessing short order numbers
  app.get(`${fullPrefix}/public/invoices/:id`, publicInvoiceRateLimiter, (req, res, next) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice identifier. Full 36-character UUID is required."
      });
    }
    return vsmsOrderCtr.getOrderById(req, res, next);
  });

  // Mount QR Studio routes
  app.use(`${fullPrefix}`, qrStudioRoutes);
  app.get("/r/:code", handleQRRedirect);

  // Mount shopkeeper routes
  app.use(`${fullPrefix}`, shopkeeperRouter);

  // Generic user routes (for admin/other roles)
  app.use(`${fullPrefix}/user`, router);

  // Partner-specific routes
  app.use(`${fullPrefix}/partner/auth`, partnerAuthRouter);
  app.use(`${fullPrefix}/partner/store`, storeRouter);
  app.use(`${fullPrefix}/partner/supplier`, supplierRouter);
  app.use(`${fullPrefix}/partner/settings`, settingsRouter);
  // app.use(`${fullPrefix}/partner/products`, partnerProductRouter);

  app.use(`${fullPrefix}/partner/orders`, partnerOrderRouter);
  app.use(`${fullPrefix}/partner/return-requests`, partnerReturnRequestRouter);
  app.use(`${fullPrefix}/partner/refunds`, partnerRefundRouter);
  app.use(`${fullPrefix}/orders`, partnerOrderRouter);
  app.get(`${fullPrefix}/oms/orders/:id/timeline`, authMiddleware, getOrderTimeline);
  app.get(`${fullPrefix}/oms/orders/:id/audit-history`, authMiddleware, getOrderAuditHistory);
  app.use(
    `${fullPrefix}/partner/delivery-settings`,
    partnerDeliverySettingsRouter,
  );
  app.use(`${fullPrefix}/productmanagement/product`, productRoutes);
  app.use(`${fullPrefix}/product`, productRoutes);
  app.use(`${fullPrefix}/productmanagement/variant`, varientRoutes);
  app.use(`${fullPrefix}/productmanagement/media`, authMiddleware, mediaRoutes);
  app.use(`${fullPrefix}/pricing`, authMiddleware, pricingRoutes);
  app.use(`${fullPrefix}/inventorymanagement/inventory`, inventoryRoutes);
  app.use(`${fullPrefix}/inventorymanagement/audits`, auditRoutes);
  app.use(`${fullPrefix}/inventorymanagement/grn`, grnRoutes);
  app.use(`${fullPrefix}/inventorymanagement/alerts`, alertsRoutes);
  app.use(`${fullPrefix}/alerts`, alertsRoutes);
  app.use(`${fullPrefix}/inventorymanagement/adjust`, stockAdjustRoutes);
  app.use(`${fullPrefix}/partner/categories`, masterCategoryRoutes);
  app.use(`${fullPrefix}/partner/deliveryagents`, deliveryAgentRoutes);
  app.use(`${fullPrefix}/internal`, internalApiRateLimiter, internalSyncRoutes);
  app.use(`${fullPrefix}/internal/realtime`, internalRealtimeRoutes);
  app.use(`${fullPrefix}/files`, fileUploadRoutes);
  app.use(`${fullPrefix}/partner/promotions/banners`, bannerRoutes);
  app.use(`${fullPrefix}/partner/promotions/campaigns`, campaignRoutes);
  app.use(`${fullPrefix}/partner/promotions/promocodes`, promoCodeRoutes);
  app.use(`${fullPrefix}/partner/promotions/app-sections`, appSectionConfigRoutes);
  app.use(`${fullPrefix}/partner/app-sections`, appSectionConfigRoutes);
  app.use(`${fullPrefix}/vsms`, vsmsRouter);
  app.use(`${fullPrefix}/procurement`, procurementRouter);

  // VSMS Agent Portal routes (formerly vsms-agent-apis on port 5001)
  app.use(`${fullPrefix}/agent`, agentRouter);
  app.use(`${fullPrefix}/agent-routes`, agentRouter);
  app.use(`${fullPrefix}/agent-transfers`, agentTransferRoutes);
  app.use(`${fullPrefix}/admin/agent-transfers`, agentTransferRoutes);

  // Packing ERP routes
  app.use(`${fullPrefix}/master-data`, masterDataPackingRoutes);
  app.use(`${fullPrefix}/work-orders`, workOrderPackingRoutes);
  app.use(`${fullPrefix}/approvals`, approvalPackingRoutes);
  app.use(`${fullPrefix}/workflows`, workflowPackingRoutes);
  app.use(`${fullPrefix}/barcodes`, barcodePackingRoutes);
  app.use(`${fullPrefix}/issues`, issuePackingRoutes);
  app.use(`${fullPrefix}/auth`, authPackingRoutes);

  app.get(`${fullPrefix}/debug-broadcasts/:agentId`, async (req, res) => {
    try {
      const { activeBroadcasts } = await import('./deliveryBroadcastService.js');
      const all = {};
      for (const [k, v] of activeBroadcasts.entries()) {
        all[k] = { ...v, notifiedSet: Array.from(v.notifiedSet) };
      }
      res.json(all);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`${fullPrefix}/trigger-broadcasts`, async (req, res) => {
    try {
      const { startDeliveryBroadcast } = await import('./deliveryBroadcastService.js');
      const { prisma } = await import('../config/prismaClient.js');
      const orders = await prisma.order.findMany({
        where: { status: 'READY_FOR_PICKUP', agentId: null }
      });
      for (const o of orders) {
        await startDeliveryBroadcast(o.id, o.warehouseId);
      }
      res.json({ success: true, count: orders.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Read-only Category, Unit, and Subcategory dropdown data lookups for VSMS/Procurement views
  app.get(`${fullPrefix}/category/getCategoryList`, async (req, res) => {
    try {
      let { page, limit, isActive, search } = req.query;
      const whereClause = {};
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }
      if (search && search.trim()) {
        whereClause.name = { contains: search.trim(), mode: "insensitive" };
      }

      const categories = await prisma.category.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
      });

      const total = await prisma.category.count({ where: whereClause });
      const stats = {
        total: await prisma.category.count(),
        active: await prisma.category.count({ where: { isActive: true } }),
        inactive: await prisma.category.count({ where: { isActive: false } })
      };

      res.json({
        status: true,
        response: "Categories fetched successfully",
        data: {
          categories,
          stats
        },
        pagination: {
          total,
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 1000
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(`${fullPrefix}/unit/getall`, async (req, res) => {
    try {
      const units = await prisma.unit.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      });
      res.json(units);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(`${fullPrefix}/subCategory/getSubCategoryList`, async (req, res) => {
    try {
      let { page, limit, isActive, search } = req.query;
      const whereClause = {};
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }
      if (search && search.trim()) {
        whereClause.name = { contains: search.trim(), mode: "insensitive" };
      }

      const subCategories = await prisma.subCategory.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        include: { category: true }
      });

      const formattedSubCategories = subCategories.map(sc => ({
        ...sc,
        categoryName: sc.category?.name || ''
      }));

      const total = await prisma.subCategory.count({ where: whereClause });
      const stats = {
        total: await prisma.subCategory.count(),
        active: await prisma.subCategory.count({ where: { isActive: true } }),
        inactive: await prisma.subCategory.count({ where: { isActive: false } })
      };

      res.json({
        status: true,
        response: "SubCategories fetched successfully",
        data: {
          subCategories: formattedSubCategories,
          stats
        },
        pagination: {
          total,
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 1000
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Warehouses List (for location dropdowns) ───────────────────────────────
  app.get(`${fullPrefix}/warehouses`, async (req, res) => {
    try {
      const warehouses = await prisma.warehouse.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, address: true },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: warehouses });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/health", healthAggregate);

  app.get(`${fullPrefix}/health`, healthAggregate);
  app.get("/health/socket", healthSocket);
  app.get(`${fullPrefix}/health/socket`, healthSocket);
  app.get("/health/firebase", healthFirebase);
  app.get(`${fullPrefix}/health/firebase`, healthFirebase);

  // Health check
  app.get(`${fullPrefix}/check`, (req, res) => {
    res.json({
      message: "VillagKart-Partner API is running",
      status: "success",
      timestamp: new Date().toISOString(),
      version: config.api.version,
    });
  });
};

export default routes;
