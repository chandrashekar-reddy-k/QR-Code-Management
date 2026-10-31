// server.js - Updated with enhanced logging CICD pipeline testing testing -- 17-04-2026, 21-04-2026, testing, key sync 10
console.log("[DEBUG] Starting imports...");
import "dotenv/config";
console.log("[DEBUG] dotenv loaded.");
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import fileUpload from "express-fileupload";
import { fileURLToPath } from "url";
import path from "path";

console.log("[DEBUG] importing prismaClient...");
import { connectPostGreSQL, prisma } from "./config/prismaClient.js";
console.log("[DEBUG] importing config...");
import config, { validateJwtConfig } from "./config/config.js";
import { bootstrapIdentityPublicKey } from "./middlewares/authMiddleware.js";
console.log("[DEBUG] importing rateLimitMiddleware...");
import rateLimitMiddleware from "./middlewares/rateLimitMiddleware.js";
import requestContextMiddleware from "./middlewares/requestContext.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
console.log("[DEBUG] importing logger...");
import logger, { logRequest } from "./utils/logger.js";
console.log("[DEBUG] importing env...");
import "./config/env.js";
console.log("[DEBUG] importing firebase...");
import "./config/firebase.js";
console.log("[DEBUG] importing apiRoutes...");
import routes from "./services/apiRoutes.js";
console.log("[DEBUG] importing workers...");
import { flushAuditOutboxNow, startAuditFlushWorker, stopAuditFlushWorker } from "./audit/auditFlushWorker.js";
import { startAllocationService } from "./services/allocationService.js";
import { startIdempotencyCleanupWorker, stopIdempotencyCleanupWorker } from "./services/idempotencyCleanupService.js";
import { startUnassignedDeliverySlaWorker, stopUnassignedDeliverySlaWorker } from "./services/unassignedDeliverySlaWorker.js";
import { initSocket } from "./services/socketService.js";
console.log("[DEBUG] All imports finished.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

/** Canonical origin for CORS matching (handles trailing slashes and comma-separated FRONTEND_URL). */
const canonicalOrigin = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

const allowedFrontendOrigins = () =>
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => canonicalOrigin(s))
    .filter(Boolean);

const defaultAllowedOrigins = [
  "https://partner.villagkart.com",
  "https://erppartner.villagkart.com",
  "https://devpartner.villagkart.com",
  "http://localhost:8082",
  "http://localhost:3000",
];

const getAllowedOrigins = () => {
  const configured = allowedFrontendOrigins();
  // Always include the default allowed origins plus any env-configured origins
  return [...new Set([...defaultAllowedOrigins, ...configured])];
};

//Hello Ismail CI/CD test - Partner
// Hello test again with Hari testing

// Core Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    // Default is same-origin; partner web (partner.villagkart.com) calls this API on another host.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  fileUpload({
    useTempFiles: false,
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const corsOptions = {
  origin: '*',
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "x-request-id",
    "x-idempotency-key",
    "x-audit-origin",
    "x-parent-event-id"
  ],
  optionsSuccessStatus: 204,
};

// Explicitly handle preflight OPTIONS for all routes with 204
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-request-id, x-idempotency-key, x-audit-origin, x-parent-event-id");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Enhanced logging middleware (replaces morgan)
app.use(logRequest);
app.use(requestContextMiddleware);
//app.use(rateLimitMiddleware);

// Routes
routes(app);

app.use("*", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  logger.warn("Route not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);
// Startup sync to ensure categories are approved & mapped to all warehouses in all environments (local & deployed dev)
const autoApproveAndMapWarehouseCategories = async () => {
  try {
    const prismaModule = await import("./config/prismaClient.js");
    const prismaClient = prismaModule.prisma;

    // 1. Auto-approve all existing warehouse categories
    const approvedCount = await prismaClient.warehouseCategory.updateMany({
      where: {
        OR: [
          { approvalStatus: { not: "APPROVED" } },
          { isEnabled: false }
        ]
      },
      data: {
        isEnabled: true,
        approvalStatus: "APPROVED"
      }
    });
    if (approvedCount.count > 0) {
      console.log(`[AutoSync] Approved and enabled ${approvedCount.count} existing warehouse categories.`);
    }

    // 2. Map all active categories to all warehouses
    const categories = await prismaClient.category.findMany({ where: { isActive: true }, select: { id: true } });
    const warehouses = await prismaClient.warehouse.findMany({ select: { id: true } });
    const existingMappings = await prismaClient.warehouseCategory.findMany({
      select: { warehouseId: true, categoryId: true }
    });

    const existingSet = new Set(existingMappings.map(m => `${m.warehouseId}-${m.categoryId}`));

    const newMappings = [];
    for (const w of warehouses) {
      for (const c of categories) {
        if (!existingSet.has(`${w.id}-${c.id}`)) {
          newMappings.push({
            warehouseId: w.id,
            categoryId: c.id,
            isEnabled: true,
            approvalStatus: "APPROVED"
          });
        }
      }
    }

    if (newMappings.length > 0) {
      const inserted = await prismaClient.warehouseCategory.createMany({
        data: newMappings,
        skipDuplicates: true
      });
      console.log(`[AutoSync] Auto-mapped ${inserted.count} new category-warehouse relations.`);
    }
  } catch (error) {
    console.error("[AutoSync Error] Failed to auto-approve/map categories:", error.message);
  }
};

// Server Start
const PORT = process.env.PORT || config.app.port || 3004;

const startServer = async () => {
  console.log("[DEBUG] Reached startServer(), attempting DB connection...");
  // ── Validate JWT config before any network I/O ───────────────────────────
  // Throws with a clear message if keys/private.key or JWT_PRIVATE_KEY is missing.
  validateJwtConfig();
  try {
    await connectPostGreSQL();
    console.log("[DEBUG] connectPostGreSQL() finished.");
    // Disable startup auto-mapping of categories to warehouses so partners must request/import them
    // await autoApproveAndMapWarehouseCategories();

    logger.info("Database connection established", { database: "PostgreSQL" });

    // ── Bootstrap Identity Service public key ──────────────────────────────────
    // Must run BEFORE the server starts accepting requests.
    // Retries up to 5x so a slow Identity Service start doesn't break the deploy.
    await bootstrapIdentityPublicKey();

    startAuditFlushWorker();
    startIdempotencyCleanupWorker();
    startUnassignedDeliverySlaWorker();
    // const stopAlloc = startAllocationService();

    const server = app.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        appName: config.app.name,
        timestamp: new Date().toISOString(),
      });
    });
    initSocket(server);

    const gracefulShutdown = (signal) => {
      logger.warn("Shutdown signal received", { signal });
      server.close(async () => {
        try {
          stopAuditFlushWorker();
          stopIdempotencyCleanupWorker();
          stopUnassignedDeliverySlaWorker();
          await flushAuditOutboxNow();
          await prisma.$disconnect();
          logger.info("Graceful shutdown completed", {
            signal,
            timestamp: new Date().toISOString(),
          });
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown", {
            error: error.message,
            stack: error.stack,
          });
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (error) => {
      logger.error("Unhandled promise rejection", {
        error: error.message,
        stack: error.stack,
        type: "unhandledRejection",
      });
      gracefulShutdown("unhandledRejection");
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", {
        error: error.message,
        stack: error.stack,
        type: "uncaughtException",
      });
      gracefulShutdown("uncaughtException");
    });
  } catch (error) {
    logger.error("Server startup failed", {
      error: error.message,
      stack: error.stack,
      port: PORT,
    });
    process.exit(1);
  }
};

startServer();
setInterval(() => {}, 1000); // Prevent premature exit while connecting to DB
