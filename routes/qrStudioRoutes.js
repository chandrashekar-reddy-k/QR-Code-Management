// backend/routes/qrStudioRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prismaClient.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "qr_studio_store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultStore = {
  qrCodes: [
    {
      id: "VK-QR-1001",
      name: "Phirangipuram Hub Onboarding QR",
      type: "DYNAMIC",
      status: "Active",
      destinationUrl: "https://villagkart.com/partner/onboarding?hub=phirangipuram",
      fallbackUrl: "https://villagkart.com",
      routingBehavior: "REDIRECT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hub: "Phirangipuram Warehouse",
      hubId: "9f337243-9b4c-4fb1-9ce5-05ed5a2acfb8",
      totalScans: 48,
      uniqueUsers: 34,
      design: {
        fgColor: "#00891D",
        bgColor: "#FFFFFF",
        eyeColor: "#00891D",
        showLogo: true,
      },
    },
    {
      id: "VK-QR-1002",
      name: "Vehicle Dispatch Gate Pass",
      type: "STATIC",
      status: "Active",
      destinationUrl: "https://villagkart.com/agent/dispatch",
      routingBehavior: "REDIRECT",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      hub: "Phirangipuram Warehouse",
      hubId: "9f337243-9b4c-4fb1-9ce5-05ed5a2acfb8",
      totalScans: 120,
      uniqueUsers: 85,
      design: {
        fgColor: "#111827",
        bgColor: "#FFFFFF",
        eyeColor: "#00891D",
        showLogo: true,
      },
    },
  ],
  scanEvents: [
    {
      id: "scan_001",
      qrId: "VK-QR-1001",
      qrName: "Phirangipuram Hub Onboarding QR",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      ip: "192.168.1.45",
      device: "Mobile (Android)",
      browser: "Chrome Mobile 124",
      city: "Guntur",
      state: "Andhra Pradesh",
      hub: "Phirangipuram Warehouse",
      status: "Success",
    },
  ],
  approvals: [],
};

const readStore = () => {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("[QRStudio] Failed reading store:", err.message);
  }
  return defaultStore;
};

const writeStore = (data) => {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[QRStudio] Failed writing store:", err.message);
  }
};

// Helper to format DB record into the shape expected by frontend QR Studio
const formatQRRecord = (q) => {
  const design = typeof q.designJson === "object" && q.designJson !== null ? q.designJson : {};
  const sUpper = String(q.status || "").toUpperCase().replace(/[\s-]+/g, "_");
  let formattedStatus = "Pending Approval";
  if (sUpper === "ACTIVE" || sUpper === "APPROVED" || sUpper === "ACCEPTED") {
    formattedStatus = "Active";
  } else if (sUpper === "DRAFT") {
    formattedStatus = "Draft";
  } else if (sUpper === "PAUSED" || sUpper === "PAUSE" || sUpper === "ARCHIVED") {
    formattedStatus = "Paused";
  } else if (sUpper === "EXPIRED") {
    formattedStatus = "Expired";
  } else if (sUpper === "REJECTED" || sUpper === "REJECT") {
    formattedStatus = "Rejected";
  } else if (sUpper.includes("PENDING") || sUpper.includes("REVIEW")) {
    formattedStatus = "Pending Approval";
  }

  return {
    id: q.id,
    name: q.name,
    type: q.type === "DYNAMIC" ? "DYNAMIC" : (design.type || "STATIC"),
    status: formattedStatus,
    destinationUrl: q.destinationUrl,
    fallbackUrl: q.fallbackUrl || q.destinationUrl,
    androidUrl: q.androidUrl || q.destinationUrl,
    iosUrl: q.iosUrl || q.destinationUrl,
    destination: {
      fallbackUrl: q.fallbackUrl || q.destinationUrl,
      androidUrl: q.androidUrl || q.fallbackUrl || q.destinationUrl,
      iosUrl: q.iosUrl || q.fallbackUrl || q.destinationUrl,
      redirectCode: design.redirectCode || q.id,
      routingBehavior: q.routingBehavior || "REDIRECT",
    },
    hub: q.warehouse?.name || "Phirangipuram Warehouse",
    hubId: q.warehouseId,
    hubName: q.warehouse?.name || "Phirangipuram Warehouse",
    village: design.village || "Phirangipuram Village",
    campaign: design.campaign || "Direct Routing",
    campaignId: design.campaignId || "CMP-001",
    owner: design.owner || "Anita Rao",
    department: design.department || "Marketing",
    startDate: design.startDate || (q.createdAt ? q.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
    neverEnding: design.neverEnding !== false && (!design.expiryDate || design.expiryDate === "Never Ending"),
    expiryDate: (design.neverEnding !== false && (!design.expiryDate || design.expiryDate === "Never Ending")) ? "Never Ending" : (design.expiryDate || "Never Ending"),
    design: {
      template: design.template || "VillagKart Branded",
      fgColor: design.fgColor || "#00891D",
      bgColor: design.bgColor || "#FFFFFF",
      showLogo: design.showLogo !== false,
      hasCtaFrame: design.hasCtaFrame !== false,
      ctaText: design.ctaText || "SCAN FOR FRESH SAVINGS",
      campaignTitle: design.campaignTitle || "VillagKart Fresh Harvest",
      supportingText: design.supportingText || "Farm direct to your village doorstep",
      quietZone: design.quietZone || 4,
      errorCorrection: design.errorCorrection || "Q",
    },
    totalScans: q.scans?.length || 0,
    uniqueUsers: q.scans?.length || 0,
    metrics: {
      scans: q.scans?.length || 0,
      uniqueVisitors: q.scans?.length || 0,
      verifiedRegistrations: q.scans?.filter((s) => s.conversionTriggered)?.length || 0,
      firstOrders: 0,
    },
    createdAt: q.createdAt ? q.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: q.updatedAt ? q.updatedAt.toISOString() : new Date().toISOString(),
  };
};

// 1. Get Hubs (live from PostgreSQL Warehouse table)
router.get("/hubs", async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        contactNumber: true,
        phone: true,
        state: true,
      },
      orderBy: { name: "asc" },
    });
    const hubs = warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      region: "Andhra Pradesh",
      region: w.state || "Andhra Pradesh",
    }));
    return res.json({ success: true, data: hubs });
  } catch (err) {
    console.warn("[QRStudio] Database hubs query error, using fallback hubs:", err.message);
    const store = readStore();
    return res.json({
      success: true,
      data: [
        { id: "9f337243-9b4c-4fb1-9ce5-05ed5a2acfb8", name: "Phirangipuram Warehouse", region: "Andhra Pradesh" },
        { id: "9f4a90b9-dc35-423f-b78c-e96c248b72d4", name: "Raidurg's Warehouse", region: "Telangana" },
        { id: "2df5a849-371a-4999-a4b9-f2d0daad5249", name: "Test Warehouse", region: "Andhra Pradesh" },
      ],
    });
  }
});

// 2. Get QR Codes from PostgreSQL DB (with fallback to store)
router.get("/qr", async (req, res) => {
  try {
    const dbList = await prisma.qRCode.findMany({
      include: {
        warehouse: true,
        scans: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbList && dbList.length > 0) {
      const formatted = dbList.map(formatQRRecord);
      return res.json({ success: true, data: formatted });
    }

    // If DB has 0 records yet, seed from defaultStore into PostgreSQL
    const store = readStore();
    if (store.qrCodes && store.qrCodes.length > 0) {
      for (const item of store.qrCodes) {
        try {
          await prisma.qRCode.create({
            data: {
              id: item.id,
              name: item.name || "VillagKart QR",
              status: (item.status || "Active").toUpperCase(),
              type: (item.type || "DYNAMIC").toUpperCase() === "STATIC" ? "STATIC" : "DYNAMIC",
              destinationUrl: item.destinationUrl || item.fallbackUrl || "https://villagkart.com",
              fallbackUrl: item.fallbackUrl || item.destinationUrl,
              androidUrl: item.destination?.androidUrl || item.destinationUrl,
              iosUrl: item.destination?.iosUrl || item.destinationUrl,
              routingBehavior: "REDIRECT",
              designJson: item.design || {},
              warehouseId: item.hubId && item.hubId.length === 36 ? item.hubId : null,
            },
          });
        } catch {
          // ignore seeding duplicates
        }
      }
      return res.json({ success: true, data: store.qrCodes });
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    console.warn("[QRStudio] DB query error on GET /qr, using json store fallback:", err.message);
    const store = readStore();
    return res.json({ success: true, data: store.qrCodes || [] });
  }
});

// 3. Get single QR Code
router.get("/qr/:id", async (req, res) => {
  try {
    const found = await prisma.qRCode.findUnique({
      where: { id: req.params.id },
      include: { warehouse: true, scans: true },
    });
    if (found) {
      return res.json({ success: true, data: formatQRRecord(found) });
    }
  } catch (err) {
    console.warn("[QRStudio] DB findUnique error, falling back to store:", err.message);
  }

  const store = readStore();
  const match = (store.qrCodes || []).find((q) => q.id === req.params.id);
  if (!match) {
    return res.status(404).json({ success: false, message: "QR Code not found" });
  }
  return res.json({ success: true, data: match });
});

// 4. Create QR Code in PostgreSQL DB
router.post("/qr", async (req, res) => {
  const body = req.body || {};
  const newId = body.id || `VK-QR-${Date.now().toString().slice(-4)}`;
  const store = readStore();

  const destinationUrl =
    body.destinationUrl ||
    body.destination?.fallbackUrl ||
    body.fallbackUrl ||
    "https://villagkart.com";

  let createdInDb = null;
  try {
    // Resolve warehouse UUID
    let warehouseId = body.hubId;
    if (warehouseId && warehouseId.length !== 36) {
      const defaultWh = await prisma.warehouse.findFirst({ select: { id: true } });
      warehouseId = defaultWh?.id || null;
    }

    const rawStatus = String(body.status || "Pending Approval").toUpperCase().replace(/[\s-]+/g, "_");
    let initialDbStatus = "PENDING_APPROVAL";
    if (rawStatus === "DRAFT") initialDbStatus = "DRAFT";
    else if (rawStatus === "ACTIVE" || rawStatus === "APPROVED" || rawStatus === "ACCEPTED") initialDbStatus = "ACTIVE";
    else if (rawStatus === "PAUSED" || rawStatus === "PAUSE" || rawStatus === "ARCHIVED") initialDbStatus = "PAUSED";
    else if (rawStatus === "REJECTED" || rawStatus === "REJECT") initialDbStatus = "REJECTED";
    else if (rawStatus === "EXPIRED") initialDbStatus = "EXPIRED";

    createdInDb = await prisma.qRCode.create({
      data: {
        id: newId,
        name: body.name || `QR Code ${newId}`,
        status: initialDbStatus,
        type: (body.type || "DYNAMIC").toUpperCase() === "STATIC" ? "STATIC" : "DYNAMIC",
        destinationUrl,
        fallbackUrl: body.fallbackUrl || body.destination?.fallbackUrl || destinationUrl,
        androidUrl: body.androidUrl || body.destination?.androidUrl || destinationUrl,
        iosUrl: body.iosUrl || body.destination?.iosUrl || destinationUrl,
        routingBehavior: "REDIRECT",
        designJson: {
          ...(body.design || {}),
          purpose: body.purpose || "",
          campaign: body.campaign || "Direct Routing",
          campaignId: body.campaignId || "CMP-001",
          owner: body.owner || "Anita Rao",
          department: body.department || "Marketing",
          village: body.village || "Phirangipuram Village",
          redirectCode: body.destination?.redirectCode || newId,
          startDate: body.startDate || new Date().toISOString().split("T")[0],
          neverEnding: body.neverEnding !== false && (!body.expiryDate || body.expiryDate === "Never Ending"),
          expiryDate: (body.neverEnding !== false && (!body.expiryDate || body.expiryDate === "Never Ending")) ? "Never Ending" : (body.expiryDate || "Never Ending"),
        },
        warehouseId: warehouseId || null,
      },
      include: { warehouse: true, scans: true },
    });
    console.log(`[QRStudio] Successfully saved QR Code ${newId} to PostgreSQL DB.`);
  } catch (err) {
    console.error(`[QRStudio] Failed to save QR to PostgreSQL DB:`, err.message);
  }

  // Also sync to store.json as backup
  const newQr = {
    ...body,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: body.status || "Active",
    totalScans: 0,
    uniqueUsers: 0,
  };
  store.qrCodes = [newQr, ...(store.qrCodes || []).filter((q) => q.id !== newId)];
  writeStore(store);

  if (createdInDb) {
    return res.status(201).json({ success: true, data: formatQRRecord(createdInDb) });
  }
  return res.status(201).json({ success: true, data: newQr });
});

// 5. Update QR Code in PostgreSQL DB
router.put("/qr/:id", async (req, res) => {
  const body = req.body || {};
  let updatedInDb = null;

  try {
    const existing = await prisma.qRCode.findUnique({ where: { id: req.params.id } });
    if (existing) {
      const design = typeof existing.designJson === "object" ? existing.designJson : {};
      const newDesign = {
        ...design,
        ...(body.design || {}),
        purpose: body.purpose !== undefined ? body.purpose : design.purpose,
        campaign: body.campaign !== undefined ? body.campaign : design.campaign,
        redirectCode: body.destination?.redirectCode || design.redirectCode,
        startDate: body.startDate !== undefined ? body.startDate : design.startDate,
        neverEnding: body.neverEnding !== undefined ? body.neverEnding : (body.expiryDate !== undefined ? (body.expiryDate === "Never Ending") : design.neverEnding),
        expiryDate: body.expiryDate !== undefined ? body.expiryDate : design.expiryDate,
      };

      updatedInDb = await prisma.qRCode.update({
        where: { id: req.params.id },
        data: {
          name: body.name || existing.name,
          status: body.status ? body.status.toUpperCase().replace(/\s+/g, "_") : existing.status,
          destinationUrl: body.destinationUrl || body.destination?.fallbackUrl || existing.destinationUrl,
          fallbackUrl: body.fallbackUrl || body.destination?.fallbackUrl || existing.fallbackUrl,
          androidUrl: body.androidUrl || body.destination?.androidUrl || existing.androidUrl,
          iosUrl: body.iosUrl || body.destination?.iosUrl || existing.iosUrl,
          designJson: newDesign,
        },
        include: { warehouse: true, scans: true },
      });
      console.log(`[QRStudio] Successfully updated QR Code ${req.params.id} in PostgreSQL DB.`);
    }
  } catch (err) {
    console.warn(`[QRStudio] Error updating QR in PostgreSQL DB:`, err.message);
  }

  const store = readStore();
  const index = (store.qrCodes || []).findIndex((q) => q.id === req.params.id);
  if (index !== -1) {
    store.qrCodes[index] = {
      ...store.qrCodes[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
  }

  if (updatedInDb) {
    return res.json({ success: true, data: formatQRRecord(updatedInDb) });
  }
  if (index !== -1) {
    return res.json({ success: true, data: store.qrCodes[index] });
  }
  return res.status(404).json({ success: false, message: "QR Code not found" });
});

// 6. Delete QR Code in PostgreSQL DB
router.delete("/qr/:id", async (req, res) => {
  try {
    await prisma.qRCode.delete({ where: { id: req.params.id } });
    console.log(`[QRStudio] Successfully deleted QR Code ${req.params.id} from PostgreSQL DB.`);
  } catch (err) {
    console.warn(`[QRStudio] Error deleting from PostgreSQL DB:`, err.message);
  }

  const store = readStore();
  const beforeLen = (store.qrCodes || []).length;
  store.qrCodes = (store.qrCodes || []).filter((q) => q.id !== req.params.id);
  writeStore(store);

  return res.json({ success: true, message: "QR Code deleted successfully", count: beforeLen - store.qrCodes.length });
});

// 7. Get Scan Events
router.get("/qr/scans", async (req, res) => {
  try {
    const dbScans = await prisma.qRScanEvent.findMany({
      include: { qrCode: true },
      orderBy: { scannedAt: "desc" },
    });
    if (dbScans && dbScans.length > 0) {
      const formatted = dbScans.map((s) => {
        const info = s.deviceInfoJson || {};
        const qrDesign = typeof s.qrCode?.designJson === "object" ? s.qrCode.designJson : {};
        const purpose = `${qrDesign.purpose || ""} ${s.qrCode?.purpose || ""} ${s.qrCode?.name || ""}`.toLowerCase();
        let defaultSource = "Direct Print / Flyer";
        if (/vehicle|van|vinyl/i.test(purpose)) defaultSource = "Vehicle Vinyl Sticker";
        else if (/product|label/i.test(purpose)) defaultSource = "Product Label";
        else if (/hub|banner|facade/i.test(purpose)) defaultSource = "Hub Facade Banner";
        else if (/poster|reatchall/i.test(purpose)) defaultSource = "Direct Print / Poster";

        return {
          id: s.id,
          qrId: s.qrCodeId,
          qrName: s.qrCode?.name || info.qrName || "VillagKart QR",
          campaign: qrDesign.campaign || info.campaign || "Direct Routing",
          timestamp: s.scannedAt.toISOString().replace("T", " ").substring(0, 19),
          device: info.device || "Desktop",
          source: info.source || defaultSource,
          medium: info.medium || "QR Scan Event",
          hub: info.hub || s.qrCode?.warehouse?.name || "Phirangipuram Warehouse",
          village: info.village || qrDesign.village || "Phirangipuram Village",
          outcome: s.conversionTriggered ? "Conversion Attributed" : (info.outcome || "Redirected"),
          conversion: info.conversion || (s.conversionTriggered ? "Verified Registration" : "None (Direct Scan)"),
          ipCountry: info.ipCountry || "India (Andhra Pradesh)",
          durationMs: info.durationMs || 185,
        };
      });
      return res.json({ success: true, data: formatted });
    }
  } catch (err) {
    console.warn("[QRStudio] DB query error on scans:", err.message);
  }

  const store = readStore();
  return res.json({ success: true, data: store.scanEvents || [] });
});

// 8. Record Scan Event in PostgreSQL DB
router.post("/qr/scans", async (req, res) => {
  const body = req.body || {};
  const eventId = `scan_${Date.now()}`;

  try {
    if (body.qrId) {
      const qrExists = await prisma.qRCode.findUnique({ where: { id: body.qrId } });
      if (qrExists) {
        await prisma.qRScanEvent.create({
          data: {
            id: eventId,
            qrCodeId: body.qrId,
            deviceInfoJson: body,
            conversionTriggered: Boolean(body.triggerConversion),
          },
        });
        console.log(`[QRStudio] Successfully recorded scan event for QR ${body.qrId} in DB.`);
      }
    }
  } catch (err) {
    console.warn(`[QRStudio] Error saving scan to DB:`, err.message);
  }

  const store = readStore();
  const event = {
    id: eventId,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    ...body,
  };
  store.scanEvents = [event, ...(store.scanEvents || [])];
  writeStore(store);

  return res.status(201).json({ success: true, data: event });
});

export const handleQRRedirect = async (req, res) => {
  const code = req.params.code;
  try {
    const found = await prisma.qRCode.findFirst({
      where: {
        OR: [
          { id: code },
          { id: `QR-${code}` },
          { destinationUrl: { contains: code } },
        ],
      },
    });
    if (found && found.destinationUrl) {
      return res.redirect(found.destinationUrl);
    }
  } catch (err) {
    console.warn("[QRStudio] Redirect query error:", err.message);
  }
  const store = readStore();
  const match = (store.qrCodes || []).find((q) => q.id === code || q.destination?.redirectCode === code);
  if (match) {
    const dest = match.destinationUrl || match.destination?.fallbackUrl || "https://villagkart.com";
    return res.redirect(dest);
  }
  return res.redirect("https://villagkart.com");
};

export default router;
