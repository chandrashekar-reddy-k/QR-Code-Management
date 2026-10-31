// controllers/partnerOrderController.js
// Partner-specific order management: view, accept, reject, update status, assign agent
import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
} from "../utils/responseHelper.js";
import {
  releaseDeliverySlotByIdWithTx,
  releaseDeliverySlotWithTxRetry,
  releasePickupSlot,
} from "../utils/slotReleaseUtils.js";
import { InventoryService } from "../services/inventoryService.js";
import { randomUUID } from "crypto";
import { getRouteMapIfBelongsToWarehouse } from "../services/routePincodeService.js";
import { validateOrderTransition } from "../services/orderLifecycleService.js";
import { emitCanonicalEvent, emitTransportEvent } from "../audit/auditLogger.js";
import { AUDIT_ORIGIN, AUDIT_SEVERITY, CANONICAL_EVENTS, TRANSPORT_EVENTS } from "../audit/auditConstants.js";
import { getAuditContext } from "../audit/auditContext.js";
import { startDeliveryBroadcast, cancelDeliveryBroadcast } from "../services/deliveryBroadcastService.js";

import { notifyConsumerOrderStatusSync, emitToDeliveryApp } from "../utils/realtimeFanout.js";
import { notifyDeliveryAgentOrderAssigned } from "../services/agentPushNotification.js";
import { dispatchPartnerOrderNotification } from "../services/notificationBridgeService.js";
import { getIO } from "../services/socketService.js";

import {
  PARTNER_ORDER_STATUS,
  toInternalPartnerOrderStatus,
  toPartnerOrderStatus,
  isValidPartnerOrderStatusTransition,
  getPartnerAllowedNextStatuses
} from "../utils/partnerOrderStatusEngine.js";
import { restoreOnlineStock } from "./partnerReturnRequestController.js";

/** Partner-allowed status transitions (acceptance → preparation → handover → delivery) */
const PARTNER_ALLOWED_TRANSITIONS = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  // CONFIRMED → PROCESSING (standard warehouse flow) OR directly → READY_FOR_PICKUP (pre-packed/store pickup)
  CONFIRMED: ["PROCESSING", "READY_FOR_PICKUP", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  // In-flight fulfillment is owned by delivery-api; partner may trigger pickup/in-transit via those endpoints.
  OUT_FOR_DELIVERY: ["PICKED_UP", "IN_TRANSIT", "CANCELLED"],
};

/**
 * Get partner's warehouse ID (User.warehouseId)
 * Partners must have warehouseId to manage orders
 */
const getPartnerWarehouseId = async (reqUser) => {
  if (typeof reqUser === "object" && reqUser?.warehouseId) {
    return reqUser.warehouseId;
  }

  const userId = typeof reqUser === "string" ? reqUser : reqUser?.id;
  const email = typeof reqUser === "object" ? reqUser?.email : null;
  const phone = typeof reqUser === "object" ? reqUser?.phone : null;

  try {
    if (email || phone) {
      const fallback = await prisma.user.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : [])
          ]
        },
        select: { warehouseId: true }
      });
      if (fallback?.warehouseId) {
        return fallback.warehouseId;
      }
    }

    if (userId) {
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, warehouseId: true, phone: true, email: true },
      });
      if (user?.warehouseId) {
        return user.warehouseId;
      }

      if (user?.email || user?.phone) {
        const fallback = await prisma.user.findFirst({
          where: {
            OR: [
              ...(user.phone ? [{ phone: user.phone }] : []),
              ...(user.email ? [{ email: user.email }] : [])
            ]
          },
          select: { warehouseId: true }
        });
        if (fallback?.warehouseId) {
          return fallback.warehouseId;
        }
      }
    }
    // Fallback to the first available warehouse if unassigned
    const defaultWarehouse = await prisma.warehouse.findFirst({ select: { id: true } });
    if (defaultWarehouse?.id) {
      return defaultWarehouse.id;
    }
  } catch (err) {
    logger.warn("getPartnerWarehouseId query failed in partnerOrderController", err);
  }

  // Return a dummy UUID to prevent leaking other warehouses' data
  return "00000000-0000-0000-0000-000000000000";
};

/**
 * Verify order belongs to partner's warehouse.
 * Queries Order directly (FulfillmentOrder is not in partner-apis schema).
 * Returns a shape-compatible object so callers don't need to change.
 * fulfillmentOrderId is set to the orderId so OMS resolves it via its orderId fallback.
 */
const verifyOrderOwnership = async (orderId, warehouseId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, warehouseId },
    select: {
      id: true,
      status: true,
      deliveryType: true,
      agentId: true,
      orderNumber: true,
      warehouseId: true,
      deliveryCharge: true,
    }
  });

  if (!order) return null;

  return {
    id: order.id,
    // Use orderId as fulfillmentOrderId: OMS transitionFulfillment endpoint
    // falls back to findFirst({ where: { orderId } }) when the ID is not a FulfillmentOrder UUID.
    fulfillmentOrderId: order.id,
    // Reflect current order status as fulfillment status (best-effort mapping)
    status: order.status,
    deliveryType: order.deliveryType,
    agentId: order.agentId,
    orderNumber: order.orderNumber,
    warehouseId: order.warehouseId,
    deliveryCharge: order.deliveryCharge,
  };
};


/**
 * Log order status change to OrderStatusHistory
 */
const logOrderStatusChange = async (
  orderId,
  fromStatus,
  toStatus,
  changedBy,
  reason = null,
) => {
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      reason: reason || `Status updated by partner`,
    },
  });
};

/** Delivery filter: 'all' | 'delivery' (FAST + SCHEDULED) | 'pickup_store' */
const DELIVERY_FILTER = {
  ALL: "all",
  DELIVERY: "delivery", // FAST + SCHEDULED
  PICKUP_STORE: "pickup_store",
};

const DELIVERY_API_BASE_URL = (
  process.env.DELIVERY_API_BASE_URL || "http://localhost:3005/api/v1"
).replace(/\/$/, "");
const PARTNER_OWNED_ORDER_STATUSES = new Set([
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

function partnerOrderStatusEventId(orderId, fromStatus, toStatus) {
  return `PARTNER_ORDER_STATUS_CHANGED:${orderId}:${fromStatus || "UNKNOWN"}:${toStatus}`;
}

async function emitPartnerOrderLifecycleEvent({
  orderId,
  fromStatus,
  toStatus,
  actorId,
  actorRole,
  reason = null
}) {
  if (!PARTNER_OWNED_ORDER_STATUSES.has(toStatus) || fromStatus === toStatus) return;
  const statusEventId = partnerOrderStatusEventId(orderId, fromStatus, toStatus);
  await emitCanonicalEvent({
    eventName: CANONICAL_EVENTS.orderStatusChanged,
    eventId: statusEventId,
    entityType: "ORDER",
    entityId: orderId,
    action: "STATUS_CHANGED",
    payload: { fromStatus, toStatus, actorId, actorRole, reason }
  });
  if (fromStatus === "PLACED" && toStatus === "CONFIRMED") {
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.partnerOrderAccepted,
      eventId: `PARTNER_ORDER_ACCEPTED:${orderId}`,
      entityType: "ORDER",
      entityId: orderId,
      action: "PARTNER_ACCEPTED",
      payload: { actorId, actorRole, reason }
    });
  }
  if (fromStatus === "PLACED" && toStatus === "CANCELLED") {
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.partnerOrderRejected,
      eventId: `PARTNER_ORDER_REJECTED:${orderId}`,
      entityType: "ORDER",
      entityId: orderId,
      action: "PARTNER_REJECTED",
      payload: { actorId, actorRole, reason }
    });
  }
  if (toStatus === "READY_FOR_PICKUP") {
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.partnerOrderReady,
      eventId: `PARTNER_ORDER_READY:${orderId}`,
      entityType: "ORDER",
      entityId: orderId,
      action: "READY_FOR_PICKUP",
      payload: { actorId, actorRole, reason }
    });
  }

  // Real-time sync to consumer API
  notifyConsumerOrderStatusSync(orderId, toStatus);

  // Dispatch platform notifications (WhatsApp / Email / SMS) to Central Notification Service
  dispatchPartnerOrderNotification({ orderId, toStatus, reason }).catch(() => {});
}

const OMS_CORE_URL = process.env.OMS_CORE_URL || "http://localhost:3003/api/v1/oms";

async function callOmsApi({ path, method = "POST", body }) {
  const url = `${OMS_CORE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-internal-sync-key": process.env.DELIVERY_API_SYNC_KEY || "",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || `OMS Core returned error status ${response.status}`);
    }
    return payload.response;
  } catch (error) {
    logger.error(`Error calling OMS Core API: ${error.message}`);
    throw error;
  }
}

/**
 * Call delivery-api. Prefer useServiceAuth + shared DELIVERY_API_SYNC_KEY so we do not forward
 * partner-issued JWTs (delivery-api verifies with its own key pair — forwarding caused 401/invalid token).
 * Legacy token forwarding remains for callers that pass token + useServiceAuth false.
 */
export async function callDeliveryApi({
  path,
  method = "POST",
  token,
  body,
  useServiceAuth = false,
}) {
  const syncKey = process.env.DELIVERY_API_SYNC_KEY || "";
  const context = getAuditContext() || {};
  const maxAttempts = Number(process.env.PARTNER_SYNC_MAX_ATTEMPTS || 3);
  const baseEventId = context.parentEventId || context.requestId || randomUUID();
  const headers = { "Content-Type": "application/json" };
  if (useServiceAuth) {
    if (!syncKey) {
      const err = new Error(
        "DELIVERY_API_SYNC_KEY is not configured; cannot reach delivery API securely",
      );
      err.statusCode = 500;
      throw err;
    }
    headers["x-internal-sync-key"] = syncKey;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  headers["x-request-id"] = context.requestId || headers["x-request-id"] || randomUUID();
  headers["x-idempotency-key"] = context.idempotencyKey || headers["x-idempotency-key"] || baseEventId;
  headers["x-parent-event-id"] = baseEventId;
  headers["x-audit-origin"] = context.auditOrigin || AUDIT_ORIGIN.internalSync;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await emitTransportEvent({
      eventName: TRANSPORT_EVENTS.syncDispatchAttempted,
      eventId: `${method}:${path}:${baseEventId}:attempt:${attempt}`,
      entityType: "INTERNAL_SYNC",
      entityId: path,
      action: "SYNC_DISPATCH_ATTEMPTED",
      payload: { path, method, attempt, maxAttempts }
    });
    try {
      const fullUrl = `${DELIVERY_API_BASE_URL}${path}`;
      const reqPayload = body ? JSON.stringify(body) : undefined;
      logger.info(`[Delivery API Call] URL: ${fullUrl}, Payload: ${reqPayload}`);
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: reqPayload,
      });

      const resBodyText = await response.text();
      logger.info(`[Delivery API Response] Status: ${response.status}, Body: ${resBodyText}`);
      
      let payload = {};
      try { payload = JSON.parse(resBodyText); } catch(e) {}
      
      if (!response.ok) {
        const err = new Error(
          payload?.message ||
          payload?.response ||
          `Delivery API call failed: ${response.status}`,
        );
        err.statusCode = response.status;
        throw err;
      }
      return payload;
    } catch (error) {
      const isFinalAttempt = attempt === maxAttempts;
      await emitTransportEvent({
        eventName: TRANSPORT_EVENTS.syncDispatchFailed,
        eventId: `${method}:${path}:${baseEventId}:failed:${attempt}`,
        entityType: "INTERNAL_SYNC",
        entityId: path,
        action: "SYNC_DISPATCH_FAILED",
        severity: AUDIT_SEVERITY.warn,
        payload: { path, method, attempt, maxAttempts, message: error.message || null }
      });
      if (isFinalAttempt) {
        await emitTransportEvent({
          eventName: TRANSPORT_EVENTS.syncDispatchRetryExhausted,
          eventId: `${method}:${path}:${baseEventId}:exhausted`,
          entityType: "INTERNAL_SYNC",
          entityId: path,
          action: "SYNC_DISPATCH_RETRY_EXHAUSTED",
          severity: AUDIT_SEVERITY.error,
          payload: { path, method, attempt, maxAttempts, message: error.message || null }
        });
        error.statusCode = error.statusCode || 500;
        throw error;
      }
      await emitTransportEvent({
        eventName: TRANSPORT_EVENTS.syncDispatchRetryScheduled,
        eventId: `${method}:${path}:${baseEventId}:retry:${attempt}`,
        entityType: "INTERNAL_SYNC",
        entityId: path,
        action: "SYNC_DISPATCH_RETRY_SCHEDULED",
        severity: AUDIT_SEVERITY.warn,
        payload: { path, method, attempt, maxAttempts, message: error.message || null }
      });
      const backoffMs = 200 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error("Delivery API sync failed after retries");
}

/**
 * GET /api/v1/partner/orders/delivery-agents
 * Partner/warehouse fetches list of delivery agents (for assigning orders).
 * Returns active DELIVERY_AGENT users; optionally scoped to partner's warehouse.
 */
export const getDeliveryAgents = async (req, res) => {
  try {
    const userId = req.user.id;

    /* ------------------------------
       1️⃣ Get warehouseId
    ------------------------------ */
    const warehouseId = await getPartnerWarehouseId(req.user);

    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account."
      );
    }

    /* ------------------------------
       2️⃣ Fetch delivery agents
    ------------------------------ */
    let agents = [];
    if (warehouseId) {
      agents = await prisma.user.findMany({
        where: {
          warehouseId,
          role: { in: ['DELIVERY_AGENT', 'VEHICLE_AGENT'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isOnline: true,
          vehicleType: true,
          avatar: true,
          _count: {
            select: {
              agentOrders: {
                where: { status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } }
              }
            }
          }
        },
        orderBy: [
          { isOnline: "desc" },
          { name: "asc" }
        ],
      });
    }

    if (agents.length === 0) {
      agents = await prisma.user.findMany({
        where: {
          role: { in: ['DELIVERY_AGENT', 'VEHICLE_AGENT'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          isOnline: true,
          vehicleType: true,
          avatar: true,
          _count: {
            select: {
              agentOrders: {
                where: { status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } }
              }
            }
          }
        },
        orderBy: [
          { isOnline: "desc" },
          { name: "asc" }
        ],
      });
    }

    const maxActiveOrders = parseInt(process.env.MAX_ACTIVE_ORDERS || '50', 10);
    const eligibleAgents = agents.filter((agent) => (agent._count?.agentOrders || 0) < maxActiveOrders);

    // Map properties for UI and DTO compatibility
    const mappedAgents = eligibleAgents.map((agent) => {
      const { _count, ...rest } = agent;
      return {
        ...rest,
        deliveryAgentId: agent.id, // For backward compatibility with DTO
        mobileNumber: agent.phone // For backward compatibility with DTO
      };
    });

    return successResponse(
      res,
      200,
      mappedAgents,
      "Delivery agents fetched successfully"
    );

  } catch (error) {
    logger.error("[PartnerOrders] Error fetching delivery agents", {
      error: error.message,
    });

    return errorResponse(res, 500, "Failed to fetch delivery agents");
  }
};


/** Delivery type filter for delivery orders: 'scheduled' | 'express' | 'fast' (express and fast both map to FAST) */
const DELIVERY_TYPE_FILTER = {
  SCHEDULED: "scheduled",
  EXPRESS: "express",
  FAST: "fast",
};

/** Cart type filter: 'single' | 'group' (Single = individual customer, Group = Group/Shared Cart) */
const CART_TYPE_FILTER = {
  SINGLE: "single",
  GROUP: "group",
};

/**
 * Shared: build where clause for partner orders with optional delivery type, route, and cart type filter
 * @param {string} warehouseId
 * @param {Object} options - status, search, deliveryFilter, deliveryTypeFilter, routeMapId, cartTypeFilter ('single'|'group')
 */
const buildPartnerOrdersWhere = async (warehouseId, { status, search, deliveryFilter, deliveryTypeFilter, routeMapId, cartTypeFilter }) => {
  const where = { warehouseId };

  // Always exclude pre-payment PENDING orders unless specifically requested.
  // PENDING = consumer at checkout / payment screen, payment not completed yet.
  // Only PLACED and beyond (post-payment confirmation) should be visible on shopkeeper/partner portal.
  if (status) {
    const s = status.toUpperCase();
    if (s === "PLACED") {
      where.status = "PLACED";
    } else if (s === "PENDING") {
      where.status = "PENDING";
    } else {
      where.status = s;
    }
  } else {
    // Default list query: strictly exclude PENDING orders waiting on checkout/payment completion
    where.status = { not: "PENDING" };
  }

  if (search && search.trim() !== "") {
    const searchStr = search.trim();
    let isUUID = false;
    let formattedUUID = searchStr;
    const cleanSearch = searchStr.replace(/[^0-9a-fA-F]/g, '');
    if (cleanSearch.length === 32) {
      isUUID = true;
      formattedUUID = `${cleanSearch.slice(0, 8)}-${cleanSearch.slice(8, 12)}-${cleanSearch.slice(12, 16)}-${cleanSearch.slice(16, 20)}-${cleanSearch.slice(20)}`;
    } else if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(searchStr)) {
      isUUID = true;
    }

    let matchingIds = [];
    const isHexPartial = /^[0-9a-fA-F-]{8,36}$/.test(searchStr);
    if (isHexPartial && !isUUID) {
      try {
        const sqlSearch = `%${searchStr.toLowerCase()}%`;
        const rows = await prisma.$queryRaw`
          SELECT id FROM "Order" 
          WHERE CAST(id AS TEXT) LIKE ${sqlSearch}
          LIMIT 100
        `;
        matchingIds = rows.map(r => r.id);
      } catch (e) {
        logger.error("Error doing partial UUID search:", e);
      }
    }

    where.OR = [
      { orderNumber: { contains: searchStr, mode: "insensitive" } },
      { consumer: { name: { contains: searchStr, mode: "insensitive" } } },
      { consumer: { phone: { contains: searchStr, mode: "insensitive" } } }
    ];
    if (isUUID) {
      where.OR.push({ id: formattedUUID });
    }
    if (matchingIds.length > 0) {
      where.OR.push({ id: { in: matchingIds } });
    }
  }

  if (deliveryFilter === DELIVERY_FILTER.DELIVERY) {
    if (deliveryTypeFilter === DELIVERY_TYPE_FILTER.SCHEDULED) {
      where.deliveryType = "SCHEDULED";
      if (routeMapId) {
        where.routeMapId = routeMapId;
      }
    } else if (deliveryTypeFilter === DELIVERY_TYPE_FILTER.EXPRESS || deliveryTypeFilter === DELIVERY_TYPE_FILTER.FAST) {
      where.deliveryType = "FAST";
    } else {
      where.deliveryType = { in: ["FAST", "SCHEDULED"] };
    }
  } else if (deliveryFilter === DELIVERY_FILTER.PICKUP_STORE) {
    where.deliveryType = "PICKUP_STORE";
  } else if (deliveryFilter === DELIVERY_FILTER.ALL && deliveryTypeFilter) {
    // When listing all orders, optional delivery type and route filter
    if (deliveryTypeFilter === DELIVERY_TYPE_FILTER.SCHEDULED) {
      where.deliveryType = "SCHEDULED";
      if (routeMapId) {
        where.routeMapId = routeMapId;
      }
    } else if (deliveryTypeFilter === DELIVERY_TYPE_FILTER.EXPRESS || deliveryTypeFilter === DELIVERY_TYPE_FILTER.FAST) {
      where.deliveryType = "FAST";
    }
  }

  if (cartTypeFilter === CART_TYPE_FILTER.SINGLE) {
    where.cartType = "SINGLE";
  } else if (cartTypeFilter === CART_TYPE_FILTER.GROUP) {
    where.cartType = "GROUP";
  }

  return where;
};

/**
 * Shared: fetch orders + total + status counts for partner (with delivery filter)
 */
const fetchPartnerOrdersList = async (whereClause, skip, limit) => {

  const [orders, total, countByOrderStatus] = await Promise.all([

    /* ------------------------------
       1️⃣ Orders List
    ------------------------------ */
    prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        addressId: true,
        warehouseId: true,
        status: true,
        totalAmount: true,
        deliveryCharge: true,
        discount: true,
        deliverySlot: true,
        deliverySlotId: true,
        deliveryDate: true,
        specialInstructions: true,
        createdAt: true,
        updatedAt: true,
        confirmedAt: true,
        agentId: true,
        otp: true,
        consumerId: true,
        couponCode: true,
        couponDiscount: true,
        couponId: true,
        paymentStatus: true,
        paymentMethod: true,
        cancellationFee: true,
        cancellationReason: true,
        cancelledAt: true,
        cancelledBy: true,
        cgst: true,
        igst: true,
        sgst: true,
        taxAmount: true,
        taxableAmount: true,
        deliveryDistance: true,
        deliveryType: true,
        cartType: true,
        fastDeliveryETA: true,
        pickupStoreId: true,
        pickupTimeSlot: true,
        routeMapId: true,
        scheduledSlotId: true,
        pickupSlotId: true,
        assignedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        allocationStatus: true,
        failureReason: true,
        otpExpiresAt: true,
        consumer: { select: { id: true, name: true, phone: true } },
        address: {
          select: { line1: true, city: true, state: true, pincode: true },
        },
        routeMap: { select: { id: true, area: true } },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: { select: { id: true, name: true, images: true } },
          },
        },
        payment: {
          select: {
            status: true,
            method: true,
          },
        },
        statusHistory: true,
      },
    }),

    /* ------------------------------
       2️⃣ Total Count
    ------------------------------ */
    prisma.order.count({ where: whereClause }),

    /* ------------------------------
       3️⃣ Order Status Count
    ------------------------------ */
    prisma.order.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { status: true },
    }),

  ])

  return {
    orders,
    total,
    countByStatus: countByOrderStatus
  }
}


/**
 * GET /api/v1/partner/orders
 * List orders for ALL delivery types (FAST + SCHEDULED + PICKUP_STORE).
 * Optional: deliveryType, routeMapId (when deliveryType=scheduled), cartType (single | group).
 */
export const getPartnerOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page, limit, status, search, deliveryType, routeMapId, cartType } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }

    const deliveryTypeFilter = [DELIVERY_TYPE_FILTER.SCHEDULED, DELIVERY_TYPE_FILTER.EXPRESS, DELIVERY_TYPE_FILTER.FAST].includes(deliveryType)
      ? deliveryType
      : null;
    const effectiveRouteMapId = deliveryTypeFilter === DELIVERY_TYPE_FILTER.SCHEDULED && routeMapId && String(routeMapId).trim() ? String(routeMapId).trim() : null;
    if (effectiveRouteMapId) {
      const route = await getRouteMapIfBelongsToWarehouse(effectiveRouteMapId, warehouseId);
      if (!route) {
        return errorResponse(res, 400, "Invalid route or route does not belong to your warehouse.");
      }
    }

    const cartTypeFilter = [CART_TYPE_FILTER.SINGLE, CART_TYPE_FILTER.GROUP].includes(cartType) ? cartType : null;

    const whereClause = await buildPartnerOrdersWhere(warehouseId, {
      status,
      search,
      deliveryFilter: DELIVERY_FILTER.ALL,
      deliveryTypeFilter,
      routeMapId: effectiveRouteMapId,
      cartTypeFilter,
    });

    if (req.query.period) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let periodGte = null;
      if (req.query.period === 'today') periodGte = todayStart;
      else if (req.query.period === 'week') periodGte = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (req.query.period === 'month') periodGte = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (req.query.period === 'year') periodGte = new Date(now.getFullYear(), 0, 1);

      if (periodGte) {
        whereClause.createdAt = { gte: periodGte };
      }
    }

    if (req.query.view === 'shopkeeper') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        { OR: [{ fulfillmentType: { not: 'HOME_DELIVERY' } }, { assignedShopkeeperId: { not: null } }, { status: 'CONFIRMED' }] },
        { statusHistory: { none: { changedBy: req.user?.id, reason: 'IGNORED_BY_SHOPKEEPER' } } }
      ];
    } else if (req.query.view === 'shopkeeper_ignored') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        { statusHistory: { some: { changedBy: req.user?.id, reason: 'IGNORED_BY_SHOPKEEPER' } } }
      ];
    }

    const { orders, total, countByStatus } = await fetchPartnerOrdersList(
      whereClause,
      skip,
      limit,
    );

    console.log(`[DEBUG] getPartnerOrders returned ${orders.length} orders. Confirmed count: ${orders.filter(o => o.status === 'CONFIRMED').length}`);

    const statusCounts = {};
    countByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    return paginatedResponse(
      res,
      200,
      { orders, statusCounts },
      { total, page, limit },
      "Orders fetched successfully",
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching orders", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch orders");
  }
};

/**
 * GET /api/v1/partner/orders/delivery
 * List orders for delivery types only (FAST + SCHEDULED).
 * Query params: page, limit, status, search, deliveryType, routeMapId (when scheduled), cartType (single | group).
 */
export const getPartnerDeliveryOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page, limit, status, search, deliveryType, routeMapId, cartType } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    const warehouseId = await getPartnerWarehouseId(req.user);

    if (!warehouseId || warehouseId === "00000000-0000-0000-0000-000000000000") {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }

    const deliveryTypeFilter = [DELIVERY_TYPE_FILTER.SCHEDULED, DELIVERY_TYPE_FILTER.EXPRESS, DELIVERY_TYPE_FILTER.FAST].includes(deliveryType)
      ? deliveryType
      : null;
    // routeMapId only applies when delivery type is scheduled; ignore otherwise
    const effectiveRouteMapId = deliveryTypeFilter === DELIVERY_TYPE_FILTER.SCHEDULED && routeMapId && String(routeMapId).trim() ? String(routeMapId).trim() : null;

    if (effectiveRouteMapId) {
      const route = await getRouteMapIfBelongsToWarehouse(effectiveRouteMapId, warehouseId);
      if (!route) {
        return errorResponse(res, 400, "Invalid route or route does not belong to your warehouse.");
      }
    }

    const cartTypeFilter = [CART_TYPE_FILTER.SINGLE, CART_TYPE_FILTER.GROUP].includes(cartType) ? cartType : null;

    const whereClause = await buildPartnerOrdersWhere(warehouseId, {
      status,
      search,
      deliveryFilter: DELIVERY_FILTER.DELIVERY,
      deliveryTypeFilter,
      routeMapId: effectiveRouteMapId,
      cartTypeFilter,
    });
    const { orders, total, countByStatus } = await fetchPartnerOrdersList(
      whereClause,
      skip,
      limit,
    );

    const statusCounts = {};
    countByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    return paginatedResponse(
      res,
      200,
      { orders, statusCounts },
      { total, page, limit },
      "Delivery orders fetched successfully",
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching delivery orders", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch delivery orders");
  }
};

/**
 * GET /api/v1/partner/orders/pickup-store
 * List orders for delivery type PICKUP_STORE only. Optional: cartType (single | group).
 */
export const getPartnerPickupStoreOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    let { page, limit, status, search, cartType } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }

    const cartTypeFilter = [CART_TYPE_FILTER.SINGLE, CART_TYPE_FILTER.GROUP].includes(cartType) ? cartType : null;

    const whereClause = await buildPartnerOrdersWhere(warehouseId, {
      status,
      search,
      deliveryFilter: DELIVERY_FILTER.PICKUP_STORE,
      cartTypeFilter,
    });
    const { orders, total, countByStatus } = await fetchPartnerOrdersList(
      whereClause,
      skip,
      limit,
    );

    const statusCounts = {};
    countByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    return paginatedResponse(
      res,
      200,
      { orders, statusCounts },
      { total, page, limit },
      "Pickup store orders fetched successfully",
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching pickup store orders", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch pickup store orders");
  }
};

/**
 * GET /api/v1/partner/orders/:orderId
 * Get order details (partner's warehouse only)
 */
export const getPartnerOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const warehouseId = await getPartnerWarehouseId(req.user);
    console.log("[DEBUG] getPartnerOrderById:", { userId, orderId, warehouseId });
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account.",
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, warehouseId },
      include: {
        consumer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                price: true,
                mrp: true,
                finalPrice: true,
                discountValue: true,
                taxRate: true,
              },
            },
          },
        },
        payment: {
          select: { id: true, amount: true, method: true, status: true },
        },
        orderReturnHistory: {
          orderBy: { createdAt: 'desc' },
        },
        refundTransactions: {
          orderBy: { createdAt: 'desc' },
        },
        delivery: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            pickedUpAt: true,
            deliveredAt: true,
          },
        },
        fulfillmentOrders: {
          where: { assignedWarehouseId: warehouseId },
          select: { id: true, status: true, assignedWarehouseId: true, fulfillmentOrderNo: true }
        },
      },
    });

    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    if (order.assignedShopkeeperId) {
      const sk = await prisma.shopkeeper.findUnique({
        where: { id: order.assignedShopkeeperId },
        select: { id: true, name: true, phone: true }
      }) || await prisma.user.findUnique({
        where: { id: order.assignedShopkeeperId },
        select: { id: true, name: true, phone: true }
      });
      order.assignedShopkeeper = sk;
    } else {
      order.assignedShopkeeper = null;
    }

    // Enrich items with layout locations
    for (const item of order.items) {
      let loc = null;
      if (prisma.productLocation) {
        loc = await prisma.productLocation.findFirst({
          where: {
            warehouseId,
            productId: item.productId,
            productVariantId: item.productVariantId || null,
          },
          include: {
            tray: {
              include: {
                shelf: {
                  include: {
                    rack: true,
                  },
                },
              },
            },
          },
        });

        if (!loc) {
          loc = await prisma.productLocation.findFirst({
            where: {
              warehouseId,
              productId: item.productId,
            },
            include: {
              tray: {
                include: {
                  shelf: {
                    include: {
                      rack: true,
                    },
                  },
                },
              },
            },
          });
        }
      }

      if (loc && loc.tray) {
        item.aisle_location = `${loc.tray.shelf.rack.name}-${loc.tray.shelf.name}-${loc.tray.name}`;
      } else {
        item.aisle_location = "Not-Assigned";
      }
    }

    return successResponse(res, 200, order, "Order fetched successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching order", {
      error: error.message,
      orderId: req.params?.orderId,
    });
    return errorResponse(res, 500, "Failed to fetch order");
  }
};

/**
 * POST /api/v1/partner/orders/:orderId/accept
 * Partner accepts order (PLACED → CONFIRMED)
 */
export const acceptOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account.",
      );
    }

    const order = await verifyOrderOwnership(orderId, warehouseId);
    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    const allowedAcceptStatuses = ["PENDING_ACCEPTANCE", "ALLOCATED", "PENDING", "PLACED"];
    if (!allowedAcceptStatuses.includes(order.status)) {
      return errorResponse(
        res,
        400,
        `Order cannot be accepted. Current status: ${order.status}.`,
      );
    }

    // Call OMS Core API to transition fulfillment order status
    try {
      await callOmsApi({
        path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
        method: "POST",
        body: {
          nextStatus: "ACCEPTED",
          reason: "Order accepted by partner",
        },
      });
    } catch (error) {
      logger.warn(`OMS Core API failed for acceptOrder, falling back to Prisma update: ${error.message}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
      include: {
        consumer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    logger.info("[PartnerOrders] Order accepted", {
      orderId,
      partnerId: userId,
    });
    await emitPartnerOrderLifecycleEvent({
      orderId,
      fromStatus: order.status,
      toStatus: "ACCEPTED",
      actorId: userId,
      actorRole: req.user?.role
    });

    await emitCanonicalEvent({
      eventName: "shopkeeper:new_order",
      eventId: `SHOPKEEPER_NEW_ORDER_${orderId}_${Date.now()}`,
      entityType: "ORDER",
      entityId: orderId,
      action: "STATUS_CHANGED",
      payload: updatedOrder
    });

    return successResponse(
      res,
      200,
      updatedOrder,
      "Order accepted successfully",
    );
  } catch (error) {
    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null;
    const status = downstreamStatus ?? 500;
    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to accept order";
    logger.error("[PartnerOrders] Error accepting order", {
      error: error.message,
      orderId: req.params?.orderId,
      status,
    });
    return errorResponse(res, status, message);
  }
};

/**
 * POST /api/v1/partner/orders/:orderId/reject
 * Partner rejects order (PLACED → CANCELLED). Releases DeliverySlot or PickupSlot in same transaction.
 */
export const rejectOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body || {};

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account.",
      );
    }

    const order = await verifyOrderOwnership(orderId, warehouseId);
    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    if (order.status !== "PENDING_ACCEPTANCE" && order.status !== "ALLOCATED") {
      return errorResponse(
        res,
        400,
        `Order cannot be rejected. Current status: ${order.status}.`,
      );
    }

    // Call OMS Core API to transition fulfillment order status to REJECTED
    try {
      await callOmsApi({
        path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
        method: "POST",
        body: {
          nextStatus: "REJECTED",
          reason: reason || "Rejected by partner",
        },
      });
    } catch (error) {
      logger.warn(`OMS Core API failed for rejectOrder, falling back to Prisma update: ${error.message}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: {
        consumer: { select: { name: true, phone: true } },
      },
    });

    logger.info("[PartnerOrders] Order rejected via OMS Core", {
      orderId,
      partnerId: userId,
    });
    await emitPartnerOrderLifecycleEvent({
      orderId,
      fromStatus: order.status,
      toStatus: "CANCELLED",
      actorId: userId,
      actorRole: req.user?.role,
      reason: reason || "Order rejected by partner"
    });
    return successResponse(
      res,
      200,
      updatedOrder,
      "Order rejected successfully",
    );
  } catch (error) {
    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null;
    const status = downstreamStatus ?? 500;
    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to reject order";
    logger.error("[PartnerOrders] Error rejecting order", {
      error: error.message,
      orderId: req.params?.orderId,
      status,
    });
    return errorResponse(res, status, message);
  }
};

/**
 * PUT /api/v1/partner/orders/:orderId/status
 * Partner updates order status (CONFIRMED -> PROCESSING -> READY_FOR_PICKUP)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const { orderId } = req.params

    const {
      nextStatus,
      status,
      reasonCode,
      reason,
      note,
      metadata
    } = req.body

    const nextStatusInput = nextStatus || status

    if (!nextStatusInput) {
      return errorResponse(res, 400, "status is required")
    }

    const rawStatus = String(nextStatusInput)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")

    const statusReason = reasonCode || reason || note || null

    logger.info("[PartnerOrders] Status update request received", {
      orderId,
      partnerId: userId,
      requestedStatus: rawStatus,
      reasonCode,
      reason,
      note,
      metadata
    })

    const warehouseId = await getPartnerWarehouseId(req.user)

    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account."
      )
    }

    const order = await verifyOrderOwnership(orderId, warehouseId)

    if (!order) {
      return errorResponse(res, 404, "Order not found")
    }

    // 1. Special delivery-flow actions
    if (rawStatus === "PICKED_UP") {
      if (!order.agentId) {
        return res.status(400).json({
          status: false,
          response:
            "Delivery agent assignment is required before marking the order as picked up.",
          errors: []
        })
      }

      // Transition via OMS Core API
      try {
        await callOmsApi({
          path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
          method: "POST",
          body: {
            nextStatus: "PICKED_UP",
            reason: statusReason || "Partner handoff: PICKED_UP",
            note
          }
        });
      } catch (error) {
        logger.warn(`OMS Core API failed for PICKED_UP, falling back to Prisma update: ${error.message}`);
      }

      // Call delivery API to sync
      let deliveryPayload = null;
      try {
        deliveryPayload = await callDeliveryApi({
          path: "/order/order-status",
          method: "PUT",
          useServiceAuth: true,
          body: {
            orderId,
            status: "PICKED_UP",
            actorUserId: userId,
            actorRole: String(req.user.role),
            reason: statusReason,
            metadata
          }
        })
      } catch (error) {
        logger.warn(`Delivery API sync failed for PICKED_UP: ${error.message}`);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "OUT_FOR_DELIVERY" },
        include: {
          consumer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      })

      const otp = deliveryPayload?.data?.otp

      const responseData =
        updatedOrder != null
          ? {
            ...updatedOrder,
            status: toPartnerOrderStatus(updatedOrder.status),
            internalStatus: updatedOrder.status,
            ...(otp != null ? { pickupOtp: otp } : {})
          }
          : {
            orderId,
            status: "OUT_FOR_DELIVERY",
            internalStatus: "OUT_FOR_DELIVERY",
            pickupOtp: otp ?? null
          }

      logger.info("[PartnerOrders] Order marked picked up via OMS Core", {
        orderId,
        from: order.status,
        to: "PICKED_UP",
        partnerId: userId
      })

      await emitPartnerOrderLifecycleEvent({
        orderId,
        fromStatus: order.status,
        toStatus: "OUT_FOR_DELIVERY",
        actorId: userId,
        actorRole: req.user?.role,
        reason: statusReason
      })

      return successResponse(
        res,
        200,
        responseData,
        "Order marked picked up. Pickup OTP generated for the delivery agent."
      )
    }

    if (rawStatus === "IN_TRANSIT") {
      if (!order.agentId) {
        return res.status(400).json({
          status: false,
          response:
            "Delivery agent assignment is required before marking the order as in transit.",
          errors: []
        })
      }

      // Transition via OMS Core API
      try {
        await callOmsApi({
          path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
          method: "POST",
          body: {
            nextStatus: "OUT_FOR_DELIVERY",
            reason: statusReason || "Partner handoff: IN_TRANSIT",
            note
          }
        });
      } catch (error) {
        logger.warn(`OMS Core API failed for IN_TRANSIT, falling back to Prisma update: ${error.message}`);
      }

      // Call delivery API to sync
      try {
        await callDeliveryApi({
          path: "/order/order-status",
          method: "PUT",
          useServiceAuth: true,
          body: {
            orderId,
            status: "IN_TRANSIT",
            actorUserId: userId,
            actorRole: String(req.user.role),
            reason: statusReason,
            metadata
          }
        })
      } catch (error) {
        logger.warn(`Delivery API sync failed for IN_TRANSIT: ${error.message}`);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "OUT_FOR_DELIVERY" },
        include: {
          consumer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      })

      logger.info("[PartnerOrders] Order moved to in transit via OMS Core", {
        orderId,
        from: order.status,
        to: "OUT_FOR_DELIVERY",
        partnerId: userId
      })

      await emitPartnerOrderLifecycleEvent({
        orderId,
        fromStatus: order.status,
        toStatus: "OUT_FOR_DELIVERY",
        actorId: userId,
        actorRole: req.user?.role,
        reason: statusReason
      })

      return successResponse(
        res,
        200,
        updatedOrder
          ? {
            ...updatedOrder,
            status: toPartnerOrderStatus(updatedOrder.status),
            internalStatus: updatedOrder.status
          }
          : {
            orderId,
            status: "OUT_FOR_DELIVERY",
            internalStatus: "OUT_FOR_DELIVERY"
          },
        "Order moved to in transit successfully."
      )
    }

    const normalizedStatus = toInternalPartnerOrderStatus(rawStatus)

    if (!normalizedStatus) {
      return errorResponse(res, 400, "Invalid order status")
    }

    if (order.status === normalizedStatus) {
      return errorResponse(
        res,
        400,
        `Order is already in ${order.status} status.`
      )
    }

    // Self Pickup flow
    if (
      order.deliveryType === "PICKUP_STORE" &&
      order.status === "READY_FOR_PICKUP" &&
      normalizedStatus === "DELIVERED"
    ) {
      // Transition via OMS Core API
      try {
        await callOmsApi({
          path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
          method: "POST",
          body: {
            nextStatus: "DELIVERED",
            reason: statusReason || "Self pickup order marked as delivered by partner",
            note
          }
        });
      } catch (error) {
        logger.warn(`OMS Core API failed for DELIVERED, falling back to Prisma update: ${error.message}`);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
        include: {
          consumer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      })

      // Consume reservation upon delivery
      await InventoryService.consumeReservation({ orderId }).catch(err => {
        logger.error("[PartnerOrders] Failed to consume reservation on pickup delivery:", { error: err.message });
      });

      logger.info("[PartnerOrders] Self pickup order delivered by partner via OMS Core", {
        orderId,
        from: order.status,
        to: "DELIVERED",
        partnerId: userId,
        deliveryType: order.deliveryType
      })

      await emitPartnerOrderLifecycleEvent({
        orderId,
        fromStatus: order.status,
        toStatus: "DELIVERED",
        actorId: userId,
        actorRole: req.user?.role,
        reason: statusReason || "Self pickup order delivered by partner"
      })

      return successResponse(
        res,
        200,
        {
          previousStatus: toPartnerOrderStatus(order.status),
          nextStatus: toPartnerOrderStatus("DELIVERED"),
          internalPreviousStatus: order.status,
          internalNextStatus: "DELIVERED",
          order: {
            ...updatedOrder,
            status: toPartnerOrderStatus(updatedOrder.status),
            internalStatus: updatedOrder.status
          }
        },
        "Self pickup order marked as delivered successfully"
      )
    }

    // Map internal partner status to FulfillmentOrderStatus
    let mappedFulfillmentStatus = "CANCELLED";
    if (normalizedStatus === "CONFIRMED") {
      mappedFulfillmentStatus = "ACCEPTED";
    } else if (normalizedStatus === "PROCESSING") {
      mappedFulfillmentStatus = "PROCESSING";
    } else if (normalizedStatus === "READY_FOR_PICKUP") {
      mappedFulfillmentStatus = "READY_FOR_PICKUP";
    } else if (normalizedStatus === "OUT_FOR_DELIVERY" || normalizedStatus === "PICKED_UP") {
      mappedFulfillmentStatus = "OUT_FOR_DELIVERY";
    } else if (normalizedStatus === "DELIVERED" || normalizedStatus === "COMPLETED") {
      mappedFulfillmentStatus = "DELIVERED";
    } else if (normalizedStatus === "RETURN_INITIATED" || normalizedStatus === "RETURNED") {
      mappedFulfillmentStatus = "CANCELLED";
    } else if (normalizedStatus === "CANCELLED" || normalizedStatus === "REJECTED" || normalizedStatus === "FAILED") {
      mappedFulfillmentStatus = "CANCELLED";
    }

    if (
      order.status === "PLACED" &&
      normalizedStatus === "CANCELLED"
    ) {
      return errorResponse(
        res,
        400,
        "Use reject endpoint for PLACED -> CANCELLED transition to keep single cancellation authority."
      )
    }

    // Call OMS Core API to transition fulfillment status
    try {
      if (order.status === "PENDING" || !order.fulfillmentOrderId) {
        await callOmsApi({
          path: `/orders/${orderId}/status`,
          method: "PATCH",
          body: {
            status: normalizedStatus,
            remarks: statusReason || `Status updated to ${normalizedStatus} by partner`
          }
        });
      } else {
        await callOmsApi({
          path: `/fulfillment/${order.fulfillmentOrderId}/transition`,
          method: "POST",
          body: {
            nextStatus: mappedFulfillmentStatus,
            reason: statusReason || `Status updated to ${mappedFulfillmentStatus} by partner`,
            note
          }
        });
      }
    } catch (error) {
      logger.warn(`OMS Core API failed, falling back to Prisma update: ${error.message}`);
    }

    const updateData = { status: normalizedStatus };
    if (normalizedStatus === "DELIVERED") {
      if (order.deliveryType !== "PICKUP_STORE") {
        const { otp } = req.body;
        if (!otp) {
          return errorResponse(
            res,
            400,
            "Customer Delivery OTP verification is required to complete delivery. Please provide the OTP shared by the customer."
          );
        }
        await callDeliveryApi({
          path: "/order/verify/delivery-otp",
          method: "PATCH",
          useServiceAuth: true,
          body: { orderId, otp: String(otp).trim() }
        });
      }
      updateData.deliveredAt = new Date();
    } else if (normalizedStatus === "OUT_FOR_DELIVERY" && !order.pickedUpAt) {
      updateData.pickedUpAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        consumer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } }
      }
    });

    // Synchronize inventory reservations based on order terminal status
    if (["DELIVERED", "COMPLETED"].includes(normalizedStatus)) {
      await InventoryService.consumeReservation({ orderId }).catch(err => {
        logger.error("[PartnerOrders] Failed to consume reservation on status change:", { error: err.message });
      });
    } else if (["CANCELLED", "REJECTED", "RETURNED", "RETURN_INITIATED", "FAILED"].includes(normalizedStatus)) {
      await InventoryService.cancelReservation({ orderId }).catch(err => {
        logger.error("[PartnerOrders] Failed to cancel reservation on status change:", { error: err.message });
      });
    }

    // Automatically initialize return request history and refund pipeline records
    if (["RETURN_INITIATED", "RETURNED"].includes(normalizedStatus)) {
      try {
        const orderWithItems = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, consumer: true }
        });

        const targetPhase = normalizedStatus === "RETURNED" ? "RETURN_RECEIVED_AT_WAREHOUSE" : "REQUESTED";
        
        await prisma.orderReturnHistory.create({
          data: {
            orderId,
            fromPhase: order.status,
            toPhase: targetPhase,
            reason: statusReason || "Return initiated from partner order management",
            actorId: userId,
            metadata: {
              returnType: "FULL_ORDER",
              requestedAmount: orderWithItems?.totalAmount || 0,
              items: (orderWithItems?.items || []).map(item => ({
                orderItemId: item.id,
                productId: item.productId,
                productName: item.productName || item.product?.name || "Product Item",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                requestedAmount: item.totalPrice || (item.unitPrice * item.quantity),
                status: normalizedStatus === "RETURNED" ? "APPROVED" : "PENDING"
              }))
            }
          }
        });

        // Also create or ensure a ReturnRequest record exists
        const returnCount = await prisma.returnRequest.count();
        const returnNo = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(returnCount + 1).padStart(4, "0")}`;
        
        await prisma.returnRequest.create({
          data: {
            returnNo,
            orderId,
            userId: orderWithItems?.consumerId || userId,
            status: normalizedStatus === "RETURNED" ? "RECEIVED" : "PENDING",
            totalRefund: orderWithItems?.totalAmount || 0,
            reason: statusReason || "Return initiated",
            items: {
              create: (orderWithItems?.items || []).map(item => ({
                productId: item.productId,
                productVariantId: item.productVariantId || null,
                quantity: item.quantity,
                refundAmount: item.totalPrice || (item.unitPrice * item.quantity),
                reason: statusReason || "Return initiated"
              }))
            }
          }
        }).catch(err => logger.warn(`[PartnerOrders] ReturnRequest creation note: ${err.message}`));

        logger.info(`[PartnerOrders] Created OrderReturnHistory and ReturnRequest for order ${orderId}`);

        // 🔄 When order is fully returned, replenish stock back into ChannelInventory (channel: 'ONLINE_APP' / online inventory)
        if (normalizedStatus === "RETURNED" && orderWithItems?.items?.length) {
          const effectiveWarehouseId = warehouseId || order.warehouseId || updatedOrder.warehouseId;
          for (const item of orderWithItems.items) {
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) continue;

            await restoreOnlineStock(prisma, {
              productId: item.productId,
              productVariantId: item.productVariantId || null,
              quantity: qty,
              warehouseId: effectiveWarehouseId,
              unitPrice: item.unitPrice || 0
            });
          }
          logger.info(`[PartnerOrders] Stock restored to ChannelInventory (ONLINE_APP) for returned order ${orderId}`);
        }
      } catch (returnErr) {
        logger.error(`[PartnerOrders] Failed to create OrderReturnHistory or replenish online stock: ${returnErr.message}`);
      }
    }

    // 🚚 Auto-broadcast: start progressive radius search when order is ready 🚚
    if (normalizedStatus === "READY_FOR_PICKUP" && !updatedOrder.agentId) {
      startDeliveryBroadcast(orderId, warehouseId).catch(err => {
        logger.error("[PartnerOrders] Failed to start delivery broadcast", {
          orderId,
          error: err.message,
        });
      });
    } else if (normalizedStatus !== "READY_FOR_PICKUP") {
      cancelDeliveryBroadcast(orderId).catch(err => {
        logger.error("[PartnerOrders] Failed to cancel delivery broadcast", {
          orderId,
          error: err.message,
        });
      });
    }

    logger.info("[PartnerOrders] Order status updated via OMS Core", {
      orderId,
      from: order.status,
      to: mappedFulfillmentStatus,
      partnerId: userId
    })

    await emitPartnerOrderLifecycleEvent({
      orderId,
      fromStatus: order.status,
      toStatus: normalizedStatus,
      actorId: userId,
      actorRole: req.user?.role,
      reason: statusReason
    })

    return successResponse(
      res,
      200,
      {
        previousStatus: toPartnerOrderStatus(order.status),
        nextStatus: toPartnerOrderStatus(normalizedStatus),
        internalPreviousStatus: order.status,
        internalNextStatus: normalizedStatus,
        order: {
          ...updatedOrder,
          status: toPartnerOrderStatus(updatedOrder.status),
          internalStatus: updatedOrder.status
        }
      },
      "Order status updated successfully"
    )
  } catch (error) {
    if (error.code === "FORBIDDEN") {
      return errorResponse(res, 403, error.message)
    }

    if (error.code === "NOT_FOUND") {
      return errorResponse(res, 404, error.message)
    }

    if (error.code === "BAD_REQUEST") {
      if (
        error.message ===
        "Delivery agent assignment is required for FAST/SCHEDULED orders before updating status"
      ) {
        return res.status(400).json({
          status: false,
          response: error.message,
          errors: []
        })
      }

      return errorResponse(res, 400, error.message)
    }

    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null

    const responseStatus = downstreamStatus ?? 500

    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to update order status"

    logger.error("[PartnerOrders] Error updating order status", {
      error: error.message,
      stack: error.stack,
      orderId: req.params?.orderId,
      actorId: req.user?.id,
      status: responseStatus
    })

    return errorResponse(res, responseStatus, message)
  }
};

/**
 * PUT /api/v1/partner/orders/:orderId/assign-agent
 * Partner/warehouse assigns order to a specific delivery partner (READY_FOR_PICKUP → ASSIGNED_TO_AGENT)
 */
export const assignOrderToAgent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { agentId } = req.body;

    logger.info("[Manual Assignment] Assign order request received in Partner Portal", {
      userId,
      orderId,
      agentId,
    });

    /* ------------------------------
       1️⃣ VALIDATION
    ------------------------------ */
    if (!orderId || !agentId) {
      return errorResponse(res, 400, "orderId and agentId are required");
    }

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account.",
      );
    }

    /* ------------------------------
       2️⃣ FETCH ORDER (Fulfillment Order context)
    ------------------------------ */
    const order = await verifyOrderOwnership(orderId, warehouseId);

    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    if (order.status !== "READY_FOR_PICKUP") {
      return errorResponse(
        res,
        400,
        `Order cannot be assigned to an agent. Current status: ${order.status}. Expected status: READY_FOR_PICKUP.`,
      );
    }

    /* ------------------------------
       3️⃣ CHECK ALREADY ASSIGNED
    ------------------------------ */
    if (order.agentId) {
      return errorResponse(res, 400, "Order already assigned to an agent");
    }

    /* ------------------------------
       4️⃣ VERIFY AGENT EXISTS
    ------------------------------ */
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, role: true, isActive: true, warehouseId: true },
    });

    if (!agent || !["DELIVERY_AGENT", "VEHICLE_AGENT"].includes(agent.role)) {
      return errorResponse(res, 404, "Invalid delivery agent");
    }

    if (!agent.isActive) {
      return errorResponse(res, 400, "Agent is inactive");
    }

    // Loosened restriction: allow assigning agents regardless of warehouse mapping

    // Cancel any active broadcast so the offer disappears from all rider screens
    cancelDeliveryBroadcast(orderId, agentId, true).catch(err => {
      logger.error("[ManualAssign] Failed to cancel delivery broadcast", {
        orderId,
        error: err.message,
      });
    });

    try {
      await callDeliveryApi({
        path: "/order/order-status",
        method: "PUT",
        useServiceAuth: true,
        body: {
          orderId,
          status: "ASSIGNED_TO_AGENT",
          assignedAgentId: agentId,
          actorUserId: userId,
          actorRole: req.user.role,
        },
      });
    } catch (deliveryApiErr) {
      logger.warn("[ManualAssign] Delivery API sync skipped or failed (continuing with DB assignment):", {
        error: deliveryApiErr.message,
        orderId,
      });
    }

    const now = new Date();
    const amount = Number(order.deliveryCharge) || 0;

    /* ------------------------------
       5️⃣ ORDER + DELIVERY + ASSIGNMENT + FULFILLMENT (transaction)
    ------------------------------ */
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Find existing FulfillmentOrder for this order
      const existingFO = await tx.fulfillmentOrder.findFirst({
        where: { orderId: order.id },
        select: { id: true }
      });

      if (existingFO) {
        // Update FulfillmentOrder assigned driver
        await tx.fulfillmentOrder.update({
          where: { id: existingFO.id },
          data: { assignedDriverId: agentId }
        });

        // Create FulfillmentAssignment entry
        await tx.fulfillmentAssignment.create({
          data: {
            fulfillmentOrderId: existingFO.id,
            driverId: agentId,
            status: "PENDING"
          }
        });
      }

      // Legacy support for DeliveryAssignment
      await tx.deliveryAssignment.upsert({
        where: { orderId },
        update: {
          agentId,
          warehouseId: order.warehouseId ?? undefined,
          orderNumber: order.orderNumber ?? undefined,
          amount,
          status: "UNPAID",
          assignedFrom: userId,
          updatedAt: now,
        },
        create: {
          orderId,
          agentId,
          warehouseId: order.warehouseId ?? undefined,
          orderNumber: order.orderNumber ?? undefined,
          orderDate: now,
          amount,
          status: "UNPAID",
          assignedFrom: userId,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { agentId },
        select: { id: true, agentId: true },
      });
    });

    logger.info("Order updated with agentId via decoupled flow", {
      orderId: updatedOrder.id,
      agentId: updatedOrder.agentId,
    });

    // Direct real-time socket, DB notification, and FCM push notifications to assigned delivery agent
    try {
      const assignmentPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        agentId,
        warehouseId: order.warehouseId,
        status: order.status,
        assignedAt: now.toISOString(),
        title: "New order assigned 🚚",
        message: `Order #${order.orderNumber || order.id} assigned to you.`,
      };

      const io = getIO();
      if (io) {
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:fast_delivery_alert', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:fast_delivery_alert', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:order_assigned', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:order_assigned', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.to(`user:${agentId}`).emit('order:assigned', assignmentPayload);
        io.to(`user:${agentId}`).emit('notification', {
          title: "New order assigned 🚚",
          message: `Order #${order.orderNumber || order.id} assigned to you.`,
          type: "DELIVERY_ASSIGNED",
          priority: "high",
          metadata: assignmentPayload,
          createdAt: new Date().toISOString(),
          isRead: false
        });
      }

      await prisma.notification.create({
        data: {
          userId: agentId,
          type: 'DELIVERY_ASSIGNED',
          title: 'New order assigned 🚚',
          message: `Order #${order.orderNumber || order.id} assigned to you.`,
          channel: ['IN_APP', 'PUSH'],
          isRead: false,
          data: assignmentPayload,
        }
      }).catch(() => {});

      await notifyDeliveryAgentOrderAssigned(prisma, agentId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
      }).catch(() => {});

      await emitToDeliveryApp(order.id, agentId, assignmentPayload).catch(() => {});
    } catch (notifErr) {
      logger.warn('[ManualAssign] Failed notifying assigned agent', { error: notifErr.message });
    }

    /* ------------------------------
       6️⃣ STATUS HISTORY (NON-BLOCKING)
    ------------------------------ */
    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: "OUT_FOR_DELIVERY",
          changedBy: userId,
          reason: "Assigned to delivery agent by partner",
        },
      });

      logger.info("Order status history created", { orderId });

    } catch (err) {
      logger.error("Status history failed (ignored)", {
        error: err.message,
        orderId,
      });
    }

    /* ------------------------------
       7️⃣ VERIFY (DEBUG SAFETY)
    ------------------------------ */
    const verify = await prisma.order.findUnique({
      where: { id: orderId },
      select: { agentId: true },
    });

    logger.info("Verification after assignment", verify);

    /* ------------------------------
       8️⃣ RESPONSE
    ------------------------------ */
    return successResponse(
      res,
      200,
      {
        orderId: updatedOrder.id,
        agentId: updatedOrder.agentId,
      },
      "Order assigned to agent successfully"
    );

  } catch (error) {
    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null;
    const status = downstreamStatus ?? 500;
    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to assign order";

    logger.error("Assign order failed", {
      error: error.message,
      stack: error.stack,
      status,
    });

    return errorResponse(res, status, message);
  }
};

/**
 * POST /api/v1/partner/orders/:orderId/request-delivery-otp
 * Requests customer delivery OTP generation through delivery-api.
 */
export const requestDeliveryOtp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const order = await verifyOrderOwnership(orderId, warehouseId);
    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    if (!["IN_TRANSIT", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.status)) {
      return errorResponse(
        res,
        400,
        `Delivery OTP can be requested only when order is OUT_FOR_DELIVERY, IN_TRANSIT or PICKED_UP. Current status: ${order.status}`,
      );
    }

    const payload = await callDeliveryApi({
      path: "/order/verify/delivery-otp",
      method: "PATCH",
      useServiceAuth: true,
      body: {
        orderId,
      },
    });

    await logOrderStatusChange(
      orderId,
      order.status,
      order.status,
      userId,
      "Partner requested delivery OTP",
    );

    return successResponse(
      res,
      200,
      {
        orderId,
        deliveryOtpRequested: true,
        upstream: payload?.data || null,
      },
      "Delivery OTP requested successfully",
    );
  } catch (error) {
    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null;
    const status = downstreamStatus ?? 500;
    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to request delivery OTP";
    logger.error("[PartnerOrders] Error requesting delivery OTP", {
      error: error.message,
      orderId: req.params?.orderId,
      status,
    });
    return errorResponse(res, status, message);
  }
};

/**
 * POST /api/v1/partner/orders/:orderId/verify-delivery
 * Verifies delivery OTP through delivery-api and marks order delivered.
 */
export const verifyDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { otp } = req.body;

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const order = await verifyOrderOwnership(orderId, warehouseId);
    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    const payload = await callDeliveryApi({
      path: "/order/verify/delivery-otp",
      method: "PATCH",
      useServiceAuth: true,
      body: {
        orderId,
        otp,
      },
    });

    const refreshedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    const toStatus = refreshedOrder?.status || "DELIVERED";
    await logOrderStatusChange(
      orderId,
      order.status,
      toStatus,
      userId,
      "Delivery OTP verified by partner",
    );
    await emitPartnerOrderLifecycleEvent({
      orderId,
      fromStatus: order.status,
      toStatus,
      actorId: userId,
      actorRole: req.user?.role,
      reason: "Delivery OTP verified by partner",
    });

    return successResponse(
      res,
      200,
      {
        orderId,
        verified: true,
        upstream: payload?.data || null,
      },
      "Delivery verified successfully",
    );
  } catch (error) {
    const downstreamStatus =
      typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 600
        ? error.statusCode
        : null;
    const status = downstreamStatus ?? 500;
    const message =
      downstreamStatus != null && error.message
        ? error.message
        : "Failed to verify delivery";
    logger.error("[PartnerOrders] Error verifying delivery", {
      error: error.message,
      orderId: req.params?.orderId,
      status,
    });
    return errorResponse(res, status, message);
  }
};

export const bulkTransitionOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return errorResponse(res, 400, "orderIds array is required");
    }
    if (!status) {
      return errorResponse(res, 400, "status is required");
    }

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const verifiedOrderIds = [];
    for (const orderId of orderIds) {
      const order = await verifyOrderOwnership(orderId, warehouseId);
      if (order) {
        verifiedOrderIds.push(orderId);
      }
    }

    if (verifiedOrderIds.length === 0) {
      return errorResponse(res, 400, "None of the specified orders belong to your warehouse.");
    }

    await callOmsApi({
      path: "/orders/bulk-transition",
      method: "POST",
      body: {
        orderIds: verifiedOrderIds,
        status
      }
    });

    for (const orderId of verifiedOrderIds) {
      await emitPartnerOrderLifecycleEvent({
        orderId,
        fromStatus: "UNKNOWN",
        toStatus: status,
        actorId: userId,
        actorRole: req.user?.role,
        reason: "Bulk transition action by partner"
      });
    }

    return successResponse(
      res,
      200,
      {
        processed: verifiedOrderIds,
        skipped: orderIds.filter(id => !verifiedOrderIds.includes(id))
      },
      "Bulk transitions dispatched to OMS Core successfully"
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error bulk transitioning orders", {
      error: error.message
    });
    return errorResponse(res, 500, error.message || "Failed to execute bulk transition");
  }
};

export const generatePickingList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return errorResponse(res, 400, "orderIds array is required");
    }

    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const verifiedOrderIds = [];
    for (const orderId of orderIds) {
      const order = await verifyOrderOwnership(orderId, warehouseId);
      if (order) {
        verifiedOrderIds.push(orderId);
      }
    }

    if (verifiedOrderIds.length === 0) {
      return errorResponse(res, 400, "None of the specified orders belong to your warehouse.");
    }

    const data = await callOmsApi({
      path: "/fulfillments/picking-list",
      method: "POST",
      body: {
        orderIds: verifiedOrderIds
      }
    });

    return successResponse(
      res,
      200,
      data,
      "Picking list compiled successfully"
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error generating picking list", {
      error: error.message
    });
    return errorResponse(res, 500, error.message || "Failed to compile picking list");
  }
};

/**
 * GET /api/v1/partner/orders/warehouse-stats
 * Get warehouse-specific dashboard stats (Pending, Packing, Ready, Today's Orders, SLA %)
 */
export const getWarehouseStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Apply period filter
    const period = req.query.period || 'all';
    let periodDateFilter = {};
    let baselineDateFilter = {};
    let periodLabel = 'All Time';

    if (period === 'today') {
      periodLabel = 'Today';
      periodDateFilter = { gte: todayStart };
      baselineDateFilter = { gte: yesterdayStart, lt: todayStart };
    } else if (period === 'week') {
      periodLabel = 'This Week';
      periodDateFilter = { gte: weekStart };
      baselineDateFilter = { gte: prevWeekStart, lt: weekStart };
    } else if (period === 'month') {
      periodLabel = 'This Month';
      periodDateFilter = { gte: monthStart };
      baselineDateFilter = { gte: prevMonthStart, lt: monthStart };
    } else if (period === 'year') {
      periodLabel = 'This Year';
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
      periodDateFilter = { gte: yearStart };
      baselineDateFilter = { gte: prevYearStart, lt: yearStart };
    }

    const orderWhere = {
      ...(warehouseId && warehouseId !== "00000000-0000-0000-0000-000000000000" ? { warehouseId } : {})
    };

    const periodOrderWhere = {
      ...orderWhere,
      ...(periodDateFilter.gte ? { createdAt: periodDateFilter } : {})
    };

    const baselineOrderWhere = {
      ...orderWhere,
      ...(baselineDateFilter.gte ? { createdAt: baselineDateFilter } : {})
    };

    // 1. Total Orders for this period
    const totalOrdersCount = await prisma.order.count({
      where: periodOrderWhere
    });

    const baselineOrdersCount = baselineDateFilter.gte ? await prisma.order.count({
      where: baselineOrderWhere
    }) : 0;

    const periodOrdersTrend = baselineOrdersCount > 0
      ? Number((((totalOrdersCount - baselineOrdersCount) / baselineOrdersCount) * 100).toFixed(1))
      : (totalOrdersCount > 0 ? 100 : 0);

    // 2. Orders & Revenue for the selected period
    const periodRevenueSum = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...periodOrderWhere,
        status: { not: 'CANCELLED' }
      }
    });

    const baselineRevenueSum = baselineDateFilter.gte ? await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...baselineOrderWhere,
        status: { not: 'CANCELLED' }
      }
    }) : { _sum: { totalAmount: 0 } };

    const periodRevenueVal = Number(periodRevenueSum._sum.totalAmount || 0);
    const baselineRevenueVal = Number(baselineRevenueSum._sum.totalAmount || 0);
    const periodRevenueTrend = baselineRevenueVal > 0
      ? Number((((periodRevenueVal - baselineRevenueVal) / baselineRevenueVal) * 100).toFixed(1))
      : (periodRevenueVal > 0 ? 100 : 0);

    // 3. Pending / Active pipeline counts
    const pendingCount = await prisma.order.count({
      where: {
        ...periodOrderWhere,
        status: { in: ['PLACED', 'CONFIRMED', 'PENDING'] }
      }
    });

    const packingCount = await prisma.order.count({
      where: {
        ...periodOrderWhere,
        status: 'PROCESSING'
      }
    });

    const readyCount = await prisma.order.count({
      where: {
        ...periodOrderWhere,
        status: 'READY_FOR_PICKUP'
      }
    });

    // 4. Fulfillment SLA rate
    const slas = await (prisma.fulfillmentSLA ? prisma.fulfillmentSLA.findMany({
      where: {
        fulfillmentOrder: {
          assignedWarehouseId: warehouseId
        }
      }
    }) : Promise.resolve([]));

    const totalSlas = slas.length;
    const breachedSlas = slas.filter(s => s.isBreached).length;
    const slaSuccessRate = totalSlas > 0 ? ((totalSlas - breachedSlas) / totalSlas) * 100 : 98.5;

    // 5. Average Order Value
    const avgOrderValueAvg = await prisma.order.aggregate({
      _avg: { totalAmount: true },
      where: {
        ...periodOrderWhere,
        status: { not: 'CANCELLED' }
      }
    });

    // 6. Customers for this period
    const totalCustomersGroup = await prisma.order.groupBy({
      by: ['consumerId'],
      where: periodOrderWhere
    });
    const registeredCustomersCount = await prisma.user.count({
      where: { role: 'CONSUMER' }
    });
    const totalCustomersVal = period === 'all'
      ? Math.max(totalCustomersGroup.length, registeredCustomersCount)
      : totalCustomersGroup.length;

    // 7. Total Sales (revenue of delivered orders in this period)
    const totalSalesSum = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        ...periodOrderWhere,
        status: 'DELIVERED'
      }
    });

    // 9. Total Products Count (products active in catalog or warehouse)
    const totalProductsCount = await prisma.product.count({
      where: { isActive: true }
    });

    // 10. Return Requests (Return model count or orders marked return/refunded)
    const returnRequestsFromTable = await prisma.return.count().catch(() => 0);
    const orderReturnHistoryCount = await prisma.orderReturnHistory.count().catch(() => 0);
    const returnRequestsCount = returnRequestsFromTable + orderReturnHistoryCount;

    // 11. Categories Stats
    const totalCategoriesCount = await prisma.category.count();
    const activeCategoriesCount = await prisma.warehouseCategory.count({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        isEnabled: true
      }
    }).catch(() => 0);
    const categoriesPercentVal = totalCategoriesCount > 0
      ? Math.min(100, Math.round(((activeCategoriesCount || totalCategoriesCount) / totalCategoriesCount) * 100))
      : 100;

    // 12. Active Sellers / Stores count
    const activeSuppliersCount = await prisma.supplier.count().catch(() => 0);
    const activeStoresCount = await prisma.store.count().catch(() => 0);
    const activeSellersCount = activeSuppliersCount > 0 ? activeSuppliersCount : activeStoresCount;

    // 13. Delivery Boys / Agents count & on-time SLA
    const activeDeliveryAgentsCount = await prisma.user.count({
      where: { role: 'DELIVERY_AGENT' }
    }).catch(() => 0);

    // 14. Order Status Breakdown for Donut Chart
    const statusAggregates = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: periodOrderWhere
    });
    const statusCounts = {};
    statusAggregates.forEach(s => {
      statusCounts[s.status] = s._count;
    });

    // 15. Activity Chart Data supporting timeFilter (hourly, daily, weekly, monthly) & deliveryFilter
    const timeFilter = req.query.timeFilter || 'daily';
    const deliveryFilter = req.query.deliveryFilter || 'all';

    const chartWhere = {
      ...orderWhere
    };

    if (deliveryFilter === 'delivered') {
      chartWhere.status = 'DELIVERED';
    } else if (deliveryFilter === 'pending') {
      chartWhere.status = { in: ['PLACED', 'CONFIRMED', 'PENDING', 'PROCESSING', 'READY_FOR_PICKUP'] };
    }

    let chartData = [];
    if (timeFilter === 'hourly') {
      // 24 hours of today
      const hourlyStart = new Date(todayStart);
      const ordersForHourly = await prisma.order.findMany({
        where: {
          ...chartWhere,
          createdAt: { gte: hourlyStart }
        },
        select: { createdAt: true, totalAmount: true }
      });

      const hourlyMap = {};
      for (let h = 0; h < 24; h++) {
        const periodSuffix = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const label = `${displayH} ${periodSuffix}`;
        hourlyMap[label] = { date: label, orders: 0, revenue: 0 };
      }

      ordersForHourly.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        const periodSuffix = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const label = `${displayH} ${periodSuffix}`;
        if (hourlyMap[label]) {
          hourlyMap[label].orders += 1;
          hourlyMap[label].revenue += Math.round(Number(o.totalAmount || 0));
        }
      });
      chartData = Object.values(hourlyMap);
    } else if (timeFilter === 'weekly') {
      // Last 12 weeks
      const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      const ordersForWeekly = await prisma.order.findMany({
        where: {
          ...chartWhere,
          createdAt: { gte: twelveWeeksAgo }
        },
        select: { createdAt: true, totalAmount: true }
      });

      const weeklyMap = {};
      for (let w = 11; w >= 0; w--) {
        const start = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const label = `Wk ${start.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}`;
        weeklyMap[label] = { date: label, orders: 0, revenue: 0, _start: start.getTime(), _end: start.getTime() + 7 * 24 * 60 * 60 * 1000 };
      }

      ordersForWeekly.forEach(o => {
        const t = new Date(o.createdAt).getTime();
        for (const key of Object.keys(weeklyMap)) {
          const item = weeklyMap[key];
          if (t >= item._start && t < item._end) {
            item.orders += 1;
            item.revenue += Math.round(Number(o.totalAmount || 0));
            break;
          }
        }
      });
      chartData = Object.values(weeklyMap);
    } else if (timeFilter === 'yearly') {
      // Last 5 calendar years
      const currentYear = now.getFullYear();
      const fiveYearsAgo = new Date(currentYear - 4, 0, 1);
      const ordersForYearly = await prisma.order.findMany({
        where: {
          ...chartWhere,
          createdAt: { gte: fiveYearsAgo }
        },
        select: { createdAt: true, totalAmount: true }
      });

      const yearlyMap = {};
      for (let y = currentYear - 4; y <= currentYear; y++) {
        const label = String(y);
        yearlyMap[label] = { date: label, orders: 0, revenue: 0 };
      }

      ordersForYearly.forEach(o => {
        const y = String(new Date(o.createdAt).getFullYear());
        if (yearlyMap[y]) {
          yearlyMap[y].orders += 1;
          yearlyMap[y].revenue += Math.round(Number(o.totalAmount || 0));
        }
      });
      chartData = Object.values(yearlyMap);
    } else if (timeFilter === 'monthly') {
      // Last 12 months
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const ordersForMonthly = await prisma.order.findMany({
        where: {
          ...chartWhere,
          createdAt: { gte: twelveMonthsAgo }
        },
        select: { createdAt: true, totalAmount: true }
      });

      const monthlyMap = {};
      for (let m = 11; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
        monthlyMap[label] = { date: label, orders: 0, revenue: 0 };
      }

      ordersForMonthly.forEach(o => {
        const d = new Date(o.createdAt);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
        if (monthlyMap[label]) {
          monthlyMap[label].orders += 1;
          monthlyMap[label].revenue += Math.round(Number(o.totalAmount || 0));
        }
      });
      chartData = Object.values(monthlyMap);
    } else {
      // Default: daily for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ordersForChart = await prisma.order.findMany({
        where: {
          ...chartWhere,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          createdAt: true,
          totalAmount: true
        }
      });

      const dailyMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
        dailyMap[label] = { date: label, orders: 0, revenue: 0 };
      }

      ordersForChart.forEach(o => {
        const label = new Date(o.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
        if (dailyMap[label]) {
          dailyMap[label].orders += 1;
          dailyMap[label].revenue += Math.round(Number(o.totalAmount || 0));
        }
      });
      chartData = Object.values(dailyMap);
    }

    const chartTotalOrders = chartData.reduce((acc, curr) => acc + (curr.orders || 0), 0);
    const chartTotalRevenue = chartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return successResponse(res, 200, {
      chartTotalOrders,
      chartTotalRevenue,
      period: periodLabel,
      periodOrders: totalOrdersCount,
      periodOrdersTrend,
      periodRevenue: periodRevenueVal,
      periodRevenueTrend,
      todayOrders: totalOrdersCount,
      todayOrdersTrend: periodOrdersTrend,
      pending: pendingCount,
      packing: packingCount,
      ready: readyCount,
      slaSuccessRate,
      todayRevenue: periodRevenueVal,
      todayRevenueTrend: periodRevenueTrend,
      avgOrderValue: avgOrderValueAvg._avg.totalAmount || 0,
      totalCustomers: totalCustomersVal,
      totalSales: totalSalesSum._sum.totalAmount || 0,
      totalOrders: totalOrdersCount,
      totalProducts: totalProductsCount,
      returnRequests: returnRequestsCount,
      categoriesPercent: categoriesPercentVal,
      totalCategories: totalCategoriesCount,
      activeSellers: activeSellersCount,
      deliveryAgents: activeDeliveryAgentsCount,
      statusCounts,
      chartData
    }, "Warehouse statistics retrieved successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching warehouse stats", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch warehouse statistics");
  }
};

/**
 * GET /api/v1/partner/orders/atp-inventory
 * Get ATP stock items for the warehouse
 */
export const getAtpInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const inventoryItems = await prisma.variantInventory.findMany({
      where: {
        warehouseId: warehouseId
      },
      include: {
        variant: {
          select: {
            name: true,
            sku: true,
            productId: true
          }
        }
      }
    });

    const formattedInventory = inventoryItems.map(item => {
      const atp = item.onHand - item.reserved - item.safetyStock + item.incomingStock;
      return {
        id: item.id,
        sku: item.variant?.sku || "N/A",
        variantName: item.variant?.name || "N/A",
        onHand: item.onHand,
        reserved: item.reserved,
        safetyStock: item.safetyStock,
        incomingStock: item.incomingStock,
        atp: Math.max(0, atp)
      };
    });

    return successResponse(res, 200, formattedInventory, "ATP inventory retrieved successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching ATP inventory", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch ATP inventory");
  }
};

/**
 * GET /api/v1/partner/orders/escalated
 * Get escalated SLAs that belong to this warehouse
 */
export const getEscalatedOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const activeSlas = await prisma.fulfillmentSLA.findMany({
      where: {
        deliveredAt: null,
        fulfillmentOrder: {
          assignedWarehouseId: warehouseId,
          NOT: {
            status: { in: ['DELIVERED', 'CANCELLED', 'REJECTED'] }
          }
        }
      },
      include: {
        fulfillmentOrder: true
      }
    });

    const now = Date.now();
    const escalations = [];

    for (const sla of activeSlas) {
      const elapsedMinutes = Math.round((now - new Date(sla.allocatedAt).getTime()) / 60000);
      const ratio = elapsedMinutes / sla.slaLimitMinutes;

      let alertLevel = null;
      let targetRole = null;

      if (ratio >= 1.5) {
        alertLevel = 'CRITICAL';
        targetRole = 'CEO';
      } else if (ratio >= 1.2) {
        alertLevel = 'HIGH';
        targetRole = 'REGIONAL_MANAGER';
      } else if (ratio >= 1.0) {
        alertLevel = 'MEDIUM';
        targetRole = 'OPERATIONS_HEAD';
      } else if (ratio >= 0.8) {
        alertLevel = 'WARNING';
        targetRole = 'WAREHOUSE_MANAGER';
      }

      if (alertLevel) {
        escalations.push({
          id: sla.id,
          fulfillmentOrderId: sla.fulfillmentOrderId,
          fulfillmentOrder: sla.fulfillmentOrder,
          allocatedAt: sla.allocatedAt,
          elapsedMinutes,
          slaLimitMinutes: sla.slaLimitMinutes,
          ratio,
          alertLevel,
          targetRole
        });
      }
    }

    return successResponse(res, 200, escalations, "Escalated orders retrieved successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching escalated orders", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch escalated orders");
  }
};

/**
 * GET /api/v1/partner/orders/:orderId/timeline
 * GET /api/v1/oms/orders/:id/timeline
 * Get order lifecycle timeline history
 */
/**
 * Normalize a raw OrderStatusHistory row from Prisma into the shape
 * the OmsStepper frontend expects:
 *   - status        (from toStatus)
 *   - previousStatus (from fromStatus)
 *   - at            (from createdAt — used for timestamp display)
 */
const getFullOrderDetailsForAudit = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      confirmedAt: true,
      cancelledAt: true,
      assignedShopkeeperId: true,
      allocationStatus: true,
      allocationStartedAt: true,
      acceptedByShopkeeperAt: true,
      shopkeeperAcceptedAt: true,
      pickingStartedAt: true,
      packingStartedAt: true,
      packingCompletedAt: true,
      deliveredAt: true,
      trayNumber: true,
      consumer: { select: { name: true } }
    }
  });

  if (order && order.assignedShopkeeperId) {
    order.assignedShopkeeper = await prisma.shopkeeper.findUnique({
      where: { id: order.assignedShopkeeperId },
      select: { id: true, name: true, phone: true }
    }) || await prisma.user.findUnique({
      where: { id: order.assignedShopkeeperId },
      select: { id: true, name: true, phone: true }
    });
  }

  return order;
};

const buildSynthesizedHistory = (order) => {
  if (!order) return [];
  const events = [];

  let skName = order.assignedShopkeeper?.name;
  if (!skName || skName === "Shopkeeper Shopkeeper" || skName === "Shopkeeper") {
    skName = "VSMS Agent User";
  }

  if (order.createdAt) {
    events.push({
      id: `synth-placed-${order.id}`,
      orderId: order.id,
      toStatus: "PLACED",
      fromStatus: "START",
      reason: "Order placed by customer",
      notes: order.orderNumber ? `Order #${order.orderNumber}` : null,
      changedBy: order.consumer?.name || "Customer",
      createdAt: order.createdAt,
      at: order.createdAt
    });
  }

  if (order.allocationStartedAt || order.assignedShopkeeperId) {
    events.push({
      id: `synth-allocated-${order.id}`,
      orderId: order.id,
      toStatus: "ALLOCATED",
      fromStatus: "PLACED",
      reason: skName ? `Allocated to Shopkeeper: ${skName}` : "Shopkeeper allocation initiated",
      notes: skName ? `Assigned to ${skName} (Allocation Status: ${order.allocationStatus || 'Pending'})` : null,
      changedBy: "Partner / System",
      createdAt: order.allocationStartedAt || order.createdAt,
      at: order.allocationStartedAt || order.createdAt
    });
  }

  const acceptedAt = order.acceptedByShopkeeperAt || order.shopkeeperAcceptedAt;
  if (acceptedAt) {
    events.push({
      id: `synth-accepted-${order.id}`,
      orderId: order.id,
      toStatus: "ACCEPTED",
      fromStatus: "ALLOCATED",
      reason: "Order accepted by shopkeeper",
      notes: skName ? `Accepted by ${skName}` : "Accepted by shopkeeper",
      changedBy: skName || "Shopkeeper",
      createdAt: acceptedAt,
      at: acceptedAt
    });
  } else if (order.confirmedAt && !order.allocationStartedAt) {
    events.push({
      id: `synth-confirmed-${order.id}`,
      orderId: order.id,
      toStatus: "CONFIRMED",
      fromStatus: "PLACED",
      reason: "Order confirmed",
      changedBy: "Partner / System",
      createdAt: order.confirmedAt,
      at: order.confirmedAt
    });
  }

  if (order.pickingStartedAt) {
    events.push({
      id: `synth-picking-${order.id}`,
      orderId: order.id,
      toStatus: "PROCESSING",
      fromStatus: "CONFIRMED",
      reason: "Item picking started by shopkeeper",
      notes: skName ? `Picking in progress by ${skName}` : "Item picking in progress",
      changedBy: skName || "Shopkeeper",
      createdAt: order.pickingStartedAt,
      at: order.pickingStartedAt
    });
  }

  if (order.packingStartedAt) {
    events.push({
      id: `synth-packing-${order.id}`,
      orderId: order.id,
      toStatus: "PROCESSING",
      fromStatus: "PROCESSING",
      reason: "Item packing started by shopkeeper",
      notes: order.trayNumber ? `Assigned to Tray #${order.trayNumber}` : (skName ? `Packing by ${skName}` : null),
      changedBy: skName || "Shopkeeper",
      createdAt: order.packingStartedAt,
      at: order.packingStartedAt
    });
  }

  if (order.packingCompletedAt) {
    events.push({
      id: `synth-ready-${order.id}`,
      orderId: order.id,
      toStatus: "READY_FOR_PICKUP",
      fromStatus: "PROCESSING",
      reason: "Packing completed by shopkeeper - Ready for Pickup",
      notes: order.trayNumber ? `Tray #${order.trayNumber} packed & verified` : (skName ? `Packed by ${skName}` : "Ready for agent pickup"),
      changedBy: skName || "Shopkeeper",
      createdAt: order.packingCompletedAt,
      at: order.packingCompletedAt
    });
  }

  if (order.deliveredAt) {
    events.push({
      id: `synth-delivered-${order.id}`,
      orderId: order.id,
      toStatus: "DELIVERED",
      fromStatus: "OUT_FOR_DELIVERY",
      reason: "Order delivered to customer",
      changedBy: "Delivery Agent",
      createdAt: order.deliveredAt,
      at: order.deliveredAt
    });
  }

  if (order.cancelledAt) {
    events.push({
      id: `synth-cancelled-${order.id}`,
      orderId: order.id,
      toStatus: "CANCELLED",
      fromStatus: order.status || "CONFIRMED",
      reason: "Order cancelled",
      changedBy: "System",
      createdAt: order.cancelledAt,
      at: order.cancelledAt
    });
  }

  return events;
};

const normalizeHistoryItem = (item) => ({
  id: item.id,
  orderId: item.orderId,
  status: item.toStatus || item.status || null,
  previousStatus: item.fromStatus || item.previousStatus || null,
  reason: item.reason || null,
  notes: item.notes || null,
  changedBy: item.changedBy || item.actor || null,
  actor: item.actor || item.changedBy || null,
  at: item.createdAt || item.at || new Date(),
  createdAt: item.createdAt || item.at || new Date(),
});

const resolveUserNamesForHistory = async (historyItems, assignedShopkeeper) => {
  if (!historyItems || historyItems.length === 0) return historyItems;

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const userIdsToFetch = new Set();

  if (assignedShopkeeper?.id && uuidRegex.test(assignedShopkeeper.id)) {
    userIdsToFetch.add(assignedShopkeeper.id);
  }

  historyItems.forEach(item => {
    const cb = item.changedBy || item.actor;
    if (cb && uuidRegex.test(cb)) {
      userIdsToFetch.add(cb);
    }
  });

  const userMap = new Map();
  if (userIdsToFetch.size > 0) {
    try {
      const [users, shopkeepers] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: Array.from(userIdsToFetch) } },
          select: { id: true, name: true, phone: true }
        }),
        prisma.shopkeeper.findMany({
          where: { id: { in: Array.from(userIdsToFetch) } },
          select: { id: true, name: true, phone: true }
        })
      ]);

      shopkeepers.forEach(sk => {
        if (sk.name && sk.name !== "Shopkeeper Shopkeeper" && sk.name !== "Shopkeeper") {
          userMap.set(sk.id, sk.name);
        }
      });

      users.forEach(u => {
        if (u.name && u.name !== "Shopkeeper Shopkeeper" && u.name !== "Shopkeeper") {
          userMap.set(u.id, u.name);
        } else if (!userMap.has(u.id)) {
          const fallback = u.name || (u.phone ? `User (${u.phone})` : null);
          if (fallback && fallback !== "Shopkeeper Shopkeeper") {
            userMap.set(u.id, fallback);
          }
        }
      });
    } catch (err) {
      logger.error("[PartnerOrders] Error looking up user/shopkeeper names for audit trail", { error: err.message });
    }
  }

  let defaultSkName = assignedShopkeeper?.name;
  if (assignedShopkeeper?.id && userMap.has(assignedShopkeeper.id)) {
    defaultSkName = userMap.get(assignedShopkeeper.id);
  }
  if (!defaultSkName || defaultSkName === "Shopkeeper Shopkeeper" || defaultSkName === "Shopkeeper") {
    defaultSkName = "VSMS Agent User";
  }

  return historyItems.map(item => {
    let cb = item.changedBy || item.actor;
    if (cb && uuidRegex.test(cb)) {
      if (userMap.has(cb)) {
        cb = userMap.get(cb);
      } else {
        cb = defaultSkName;
      }
    } else if (!cb || cb === "Shopkeeper" || cb === "Shopkeeper Shopkeeper" || cb === "Shopkeeper / User" || cb === "shopkeeper") {
      cb = defaultSkName;
    }

    let reason = item.reason;
    if (reason && typeof reason === "string") {
      reason = reason.replace(/Shopkeeper Shopkeeper/g, defaultSkName);
    }
    let notes = item.notes;
    if (notes && typeof notes === "string") {
      notes = notes.replace(/Shopkeeper Shopkeeper/g, defaultSkName);
    }

    return {
      ...item,
      reason,
      notes,
      changedBy: cb,
      actor: cb
    };
  });
};

export const getOrderTimeline = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;

    const fullOrder = await getFullOrderDetailsForAudit(orderId);
    if (!fullOrder) {
      return errorResponse(res, 404, "Order not found");
    }

    const rawHistory = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" }
    });

    const synthesized = buildSynthesizedHistory(fullOrder);

    const combinedMap = new Map();
    synthesized.forEach(s => {
      combinedMap.set(`${s.toStatus}_${new Date(s.createdAt).getTime()}`, s);
    });
    rawHistory.forEach(r => {
      combinedMap.set(`${r.toStatus}_${new Date(r.createdAt).getTime()}`, r);
    });
    synthesized.forEach(s => {
      if (!Array.from(combinedMap.values()).some(e => e.toStatus === s.toStatus)) {
        combinedMap.set(s.id, s);
      }
    });

    const finalHistory = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(a.createdAt || a.at).getTime() - new Date(b.createdAt || b.at).getTime()
    );

    const resolvedHistory = await resolveUserNamesForHistory(finalHistory, fullOrder.assignedShopkeeper);
    const formattedHistory = resolvedHistory.map(normalizeHistoryItem);

    return successResponse(res, 200, formattedHistory, "Order timeline fetched successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching order timeline", {
      error: error.message,
      orderId: req.params?.orderId || req.params?.id
    });
    return errorResponse(res, 500, "Failed to fetch order timeline");
  }
};


/**
 * GET /api/v1/partner/orders/:orderId/audit-history
 * GET /api/v1/oms/orders/:id/audit-history
 * Get order audit history log (newest first)
 */
export const getOrderAuditHistory = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;

    const fullOrder = await getFullOrderDetailsForAudit(orderId);
    if (!fullOrder) {
      return errorResponse(res, 404, "Order not found");
    }

    const rawHistory = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" }
    });

    const synthesized = buildSynthesizedHistory(fullOrder);

    const combinedMap = new Map();
    synthesized.forEach(s => {
      combinedMap.set(`${s.toStatus}_${new Date(s.createdAt).getTime()}`, s);
    });
    rawHistory.forEach(r => {
      combinedMap.set(`${r.toStatus}_${new Date(r.createdAt).getTime()}`, r);
    });
    synthesized.forEach(s => {
      if (!Array.from(combinedMap.values()).some(e => e.toStatus === s.toStatus)) {
        combinedMap.set(s.id, s);
      }
    });

    const finalHistory = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.at).getTime() - new Date(a.createdAt || a.at).getTime()
    );

    const resolvedHistory = await resolveUserNamesForHistory(finalHistory, fullOrder.assignedShopkeeper);
    const formattedHistory = resolvedHistory.map(normalizeHistoryItem);

    return successResponse(res, 200, formattedHistory, "Order audit history fetched successfully");
  } catch (error) {
    logger.error("[PartnerOrders] Error fetching order audit history", {
      error: error.message,
      orderId: req.params?.orderId || req.params?.id
    });
    return errorResponse(res, 500, "Failed to fetch order audit history");
  }
};

/**
 * POST /api/v1/partner/orders/:orderId/items/:itemId/mark-unavailable
 * Mark an order item as out of stock/unavailable by shopkeeper during picking.
 * Recalculates order totals, updates items, and triggers consumer status sync.
 */
export const markPartnerItemUnavailable = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id || req.user;

    logger.info("[PartnerOrders] Partner marking order item unavailable", { orderId, itemId, userId });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true }
    });

    if (!order) {
      return errorResponse(res, 404, "Order not found");
    }

    if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)) {
      return errorResponse(res, 400, `Cannot mark item unavailable for order in ${order.status} status`);
    }

    const orderItem = order.items.find((i) => i.id === itemId);
    if (!orderItem) {
      return errorResponse(res, 404, "Order item not found");
    }

    if (orderItem.isCancelled) {
      return errorResponse(res, 400, "Order item is already marked unavailable/cancelled");
    }

    const cancellationTime = new Date();
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Mark item as cancelled
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          isCancelled: true,
          cancelledAt: cancellationTime,
          cancellationReason: reason || "Out of stock during shopkeeper picking",
          cancelledBy: userId
        }
      });

      // 2. Restore stock for product variant / product
      if (orderItem.productVariantId) {
        await tx.productVariant.update({
          where: { id: orderItem.productVariantId },
          data: { stockQuantity: { increment: orderItem.quantity } }
        }).catch(() => {});
      } else if (orderItem.productId) {
        await tx.product.update({
          where: { id: orderItem.productId },
          data: { stock: { increment: orderItem.quantity } }
        }).catch(() => {});
      }

      // 3. Recalculate order active item totals
      const activeItems = await tx.orderItem.findMany({
        where: { orderId, isCancelled: false }
      });

      let subtotal = 0;
      let totalTax = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      for (const item of activeItems) {
        subtotal += item.unitPrice * item.quantity;
        totalTax += item.taxAmount || 0;
        totalCGST += item.cgst || 0;
        totalSGST += item.sgst || 0;
        totalIGST += item.igst || 0;
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const discount = order.discount || 0;
      const taxableAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      const deliveryCharge = order.deliveryCharge || 0;
      const totalAmount = Math.round((taxableAmount + totalTax + deliveryCharge) * 100) / 100;

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount,
          taxAmount: totalTax,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          taxableAmount
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, images: true }
              }
            }
          },
          address: true,
          payment: true
        }
      });

      return updated;
    });

    // Notify real-time WebSocket & consumer service
    notifyConsumerOrderStatusSync(orderId, order.status, {
      itemId,
      event: "ITEM_UNAVAILABLE",
      reason: reason || "Out of stock during picking"
    });

    return successResponse(
      res,
      200,
      { order: updatedOrder, refundedItemAmount: orderItem.totalPrice },
      "Item marked unavailable during picking successfully"
    );
  } catch (error) {
    logger.error("[PartnerOrders] Error marking item unavailable", { error: error.message });
    return errorResponse(res, 500, "Failed to mark item unavailable");
  }
};

