/**
 * services/deliveryBroadcastService.js
 *
 * Progressive radius-based delivery-request broadcasting.
 *
 * When an order reaches READY_FOR_PICKUP the partner-api calls
 * `startDeliveryBroadcast(orderId, warehouseId)`.
 *
 * Stages: 1 km → 3 km → 5 km, each waiting
 * DELIVERY_RADIUS_TIMEOUT_SECONDS (default 20 s) before expanding.
 *
 * Only newly-in-range agents are notified at each stage; agents that already
 * received the offer at a prior stage are skipped (dedup via notifiedSet).
 *
 * Once an agent accepts, the caller must invoke `cancelDeliveryBroadcast(orderId)`
 * to stop the timer and notify all other pending riders.
 *
 * Environment variables (all optional with safe defaults):
 *   DELIVERY_RADIUS_STAGES_KM   – comma-separated, default "1,3,5"
 *   DELIVERY_RADIUS_TIMEOUT_SECONDS – per-stage wait, default "20"
 *   MAX_ACTIVE_ORDERS            – per-agent cap, default "5"
 */

import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { sendNotification } from './notificationService.js';

// ─── Configuration ─────────────────────────────────────────────────────────

function parseStages() {
  // As per user request, removing staging logic for now. Use a single large radius to broadcast to all agents.
  return [1000];
}

function getTimeoutMs() {
  return (parseInt(process.env.DELIVERY_RADIUS_TIMEOUT_SECONDS || '20', 10)) * 1000;
}

function getMaxActiveOrders() {
  return parseInt(process.env.MAX_ACTIVE_ORDERS || '5', 10);
}

// ─── Haversine distance (km) ────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── In-memory broadcast registry ──────────────────────────────────────────
//
// Key:   orderId
// Value: { timer, stageIndex, notifiedSet, warehouseId, orderData }

export const activeBroadcasts = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract lat/lng from the JSON `location` field stored on a Warehouse row.
 * The field may be `{ lat, lng }`, `{ latitude, longitude }`, or a GeoJSON
 * Point `{ type: "Point", coordinates: [lng, lat] }`.
 */
function extractWarehouseCoords(locationJson) {
  if (!locationJson) return null;
  const loc = typeof locationJson === 'string' ? JSON.parse(locationJson) : locationJson;
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return { lat: loc.lat, lng: loc.lng };
  }
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return { lat: loc.latitude, lng: loc.longitude };
  }
  if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
    const [lng, lat] = loc.coordinates;
    return { lat, lng };
  }
  return null;
}

/**
 * Extract lat/lng from an agent's `currentLocation` JSON field.
 * Same flexible parsing as warehouse coords.
 */
function extractAgentCoords(currentLocation) {
  if (!currentLocation) return null;
  const loc =
    typeof currentLocation === 'string' ? JSON.parse(currentLocation) : currentLocation;
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return { lat: loc.lat, lng: loc.lng };
  }
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return { lat: loc.latitude, lng: loc.longitude };
  }
  if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
    const [lng, lat] = loc.coordinates;
    return { lat, lng };
  }
  return null;
}

// ─── Core: fetch eligible agents within a radius ────────────────────────────

/**
 * Fetch all agents belonging to the same warehouse that satisfy the
 * eligibility criteria, then filter by Haversine distance from the
 * warehouse coords to the agent's currentLocation.
 *
 * @param {string} warehouseId
 * @param {{ lat: number, lng: number }} warehouseCoords
 * @param {number} radiusKm  – maximum distance in km
 * @param {Set<string>} excludeIds – agent IDs already notified
 */
async function fetchAgentsInRadius(warehouseId, warehouseCoords, radiusKm, excludeIds) {
  const maxActiveOrders = getMaxActiveOrders();

  const candidates = await prisma.user.findMany({
    where: {
      warehouseId,
      role: 'DELIVERY_AGENT',
      isActive: true,
      approvalStatus: 'APPROVED',
      isOnline: true,
      id: excludeIds.size > 0 ? { notIn: [...excludeIds] } : undefined,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      vehicleType: true,
      currentLocation: true,
      _count: {
        select: {
          agentOrders: {
            where: {
              status: {
                in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
              },
            },
          },
        },
      },
    },
  });

  const eligible = [];
  logger.info(`[Broadcast] Found ${candidates.length} online agents before checking active order count.`);

  for (const agent of candidates) {
    if (agent._count.agentOrders >= maxActiveOrders) {
      logger.info(`[Broadcast] Skipping agent ${agent.id} due to active order count (${agent._count.agentOrders} >= ${maxActiveOrders})`);
      continue;
    }

    // Agent is eligible regardless of location
    eligible.push({ ...agent, distanceKm: 0 }); // distanceKm is set to 0 as it's no longer used
  }

  logger.info(`[Broadcast] Total eligible agents after filtering: ${eligible.length}`);
  return eligible;
}

// ─── Socket.IO emit helpers ─────────────────────────────────────────────────

import { getIO } from './socketService.js';

function emitOfferToAgent(agentId, payload) {
  try {
    const io = getIO();
    if (io) {
      io.of('/delivery').to(`user:${agentId}`).emit('delivery:request_offer', payload);
    }
  } catch (err) {
    logger.error('[Broadcast] Failed to emit offer socket', { agentId, error: err.message });
  }

  // Push Notification & In-App Notification fallback
  sendNotification({
    userIds: [agentId],
    title: 'New Delivery Request 🚚',
    message: `New delivery request available for order #${payload.orderNumber || payload.orderId}`,
    type: 'DELIVERY_OFFER',
    priority: 'high',
    metadata: payload
  }).catch((err) => {
    logger.warn('[Broadcast] Failed to send push/notification fallback', { agentId, error: err.message });
  });
}

function removeOfferFromAgent(agentId, orderId) {
  try {
    const io = getIO();
    if (io) {
      io.of('/delivery').to(`user:${agentId}`).emit('delivery:offer_cancelled', { orderId });
    }
  } catch (err) {
    logger.error('[Broadcast] Failed to remove offer', { agentId, error: err.message });
  }
}

/**
 * Emit offer-cancelled to a set of agent IDs.
 * Used when another agent has accepted or the broadcast is cancelled.
 */
function emitCancelToAgents(agentIds, payload) {
  try {
    const io = getIO();
    if (!io) return;
    for (const id of agentIds) {
      io.of('/delivery').to(`user:${id}`).emit('delivery:offer_cancelled', payload);
    }
  } catch (err) {
    logger.error('[Broadcast] Failed to emit cancel to agents', { error: err.message });
  }
}

/**
 * Notify the partner/warehouse room that a rider has been auto-assigned.
 */
function emitPartnerRiderAssigned(warehouseId, payload) {
  try {
    const io = getIO();
    if (io) {
      const partnerNs = io.of('/partner');
      partnerNs.to(`warehouse:${warehouseId}`).emit('partner:delivery_assigned', payload);
      io.to(`store:${warehouseId}`).emit('order:status', payload);
    }
  } catch {
    // ignore if socket not ready
  }
}

// ─── Broadcast state machine ────────────────────────────────────────────────

/**
 * Run one stage of the broadcast:
 *  1. Fetch agents within current radius that haven't been notified yet.
 *  2. Emit `delivery:request_offer` to each of them.
 *  3. Add them to the notifiedSet.
 *  4. If more stages remain, schedule the next expansion.
 */
async function runStage(orderId) {
  const state = activeBroadcasts.get(orderId);
  if (!state) return; // cancelled externally

  const stages = parseStages();
  const { stageIndex, notifiedSet, warehouseId, warehouseCoords, orderData } = state;

  if (stageIndex >= stages.length) {
    // All stages exhausted with no acceptance → leave order for manual assignment
    logger.info('[Broadcast] All radius stages exhausted, no acceptance. Leaving for manual.', {
      orderId,
    });
    activeBroadcasts.delete(orderId);
    return;
  }

  const radiusKm = stages[stageIndex];
  logger.info(`[Broadcast] Stage ${stageIndex + 1}/${stages.length}: broadcasting within ${radiusKm} km`, {
    orderId,
    warehouseId,
    alreadyNotified: notifiedSet.size,
  });

  let newAgents = [];
  try {
    newAgents = await fetchAgentsInRadius(warehouseId, warehouseCoords, radiusKm, notifiedSet);
  } catch (err) {
    logger.error('[Broadcast] Failed to fetch agents in radius', {
      orderId,
      radiusKm,
      error: err.message,
    });
  }

  const offerPayload = {
    orderId: orderData.id,
    orderNumber: orderData.orderNumber,
    warehouseId,
    pickupAddress: orderData.warehouseAddress,
    dropAddress: orderData.dropAddress,
    deliveryCharge: orderData.deliveryCharge,
    radiusKm,
    broadcastedAt: new Date().toISOString(),
  };

  for (const agent of newAgents) {
    notifiedSet.add(agent.id);
    emitOfferToAgent(agent.id, {
      ...offerPayload,
      distanceKm: agent.distanceKm,
    });
    logger.info(`[Broadcast] Offer sent to agent ${agent.id} (${agent.name}) at ${agent.distanceKm} km`, {
      orderId,
      radiusKm,
    });
  }

  if (newAgents.length === 0) {
    logger.info(`[Broadcast] No new agents found at ${radiusKm} km, advancing stage`, {
      orderId,
    });
  }

  // Advance stage index (no longer used, but kept for consistency with state object)
  state.stageIndex += 1;

  // Broadcast stays active indefinitely until accepted or cancelled
  logger.info('[Broadcast] Broadcast sent. Keeping broadcast active indefinitely.', { orderId });
  activeBroadcasts.set(orderId, state);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Start the progressive radius broadcast for an order.
 *
 * Called from `partnerOrderController.updateOrderStatus` after the order
 * successfully transitions to READY_FOR_PICKUP.
 *
 * Safe to call multiple times for the same orderId — a running broadcast is
 * cancelled first before a new one begins.
 *
 * @param {string} orderId
 * @param {string} warehouseId
 */
export async function startDeliveryBroadcast(orderId, warehouseId) {
  try {
    // Cancel any previous broadcast for this order
    await cancelDeliveryBroadcast(orderId, null, false);

    // Fetch order with warehouse + delivery address
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        deliveryCharge: true,
        deliveryDistance: true,
        status: true,
        agentId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            address: true,
            location: true,
          },
        },
        address: {
          select: {
            line1: true,
            line2: true,
            city: true,
            pincode: true,
          },
        },
        consumer: {
          select: {
            name: true,
            phone: true,
          }
        }
      },
    });

    if (!order) {
      logger.warn('[Broadcast] Order not found, skipping broadcast', { orderId });
      return;
    }

    if (order.status !== 'READY_FOR_PICKUP') {
      logger.warn('[Broadcast] Order not READY_FOR_PICKUP, skipping broadcast', {
        orderId,
        status: order.status,
      });
      return;
    }

    if (order.agentId) {
      logger.info('[Broadcast] Order already has an agent, skipping broadcast', {
        orderId,
        agentId: order.agentId,
      });
      return;
    }

    let warehouseCoords = extractWarehouseCoords(order.warehouse?.location);
    if (!warehouseCoords) {
      logger.info('[Broadcast] Warehouse has no valid coordinates. Proceeding anyway since radius checks are disabled.', { orderId, warehouseId });
      warehouseCoords = { lat: 0, lng: 0 }; // Dummy coordinates
    }

    const dropAddress = order.address
      ? [order.address.line1, order.address.line2, order.address.city, order.address.pincode]
          .filter(Boolean)
          .join(', ')
      : 'Customer address';

    const orderData = {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryCharge: order.deliveryCharge ?? 0,
      deliveryDistance: order.deliveryDistance ?? null,
      warehouseAddress: order.warehouse?.address || order.warehouse?.name || 'Warehouse',
      dropAddress,
      customerName: order.consumer?.name || 'Customer',
      customerPhone: order.consumer?.phone || 'N/A',
    };

    activeBroadcasts.set(orderId, {
      timer: null,
      unassignedTimer: null,
      stageIndex: 0,
      notifiedSet: new Set(),
      warehouseId,
      warehouseCoords,
      orderData,
    });

    // Schedule 120-second unassigned alert SLA
    const unassignedTimeoutSeconds = parseInt(process.env.DELIVERY_UNASSIGNED_TIMEOUT_SECONDS || '120', 10);
    const dueAt = new Date(Date.now() + unassignedTimeoutSeconds * 1000);
    await prisma.order.update({
      where: { id: orderId },
      data: { assignmentDueAt: dueAt },
    }).catch(() => {});

    const unassignedTimer = setTimeout(async () => {
      try {
        const latest = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, orderNumber: true, agentId: true, status: true, warehouseId: true, totalAmount: true, deliveryType: true }
        });
        if (latest && !latest.agentId && latest.status === 'READY_FOR_PICKUP') {
          logger.warn(`[Broadcast] 🚨 ${unassignedTimeoutSeconds}s SLA expired with no rider assigned for order ${latest.orderNumber}. Dispatching alert.`);
          const { publishUnassignedDeliveryAlertFanout } = await import('./partnerOrderRealtimeService.js');
          await publishUnassignedDeliveryAlertFanout({
            orderId: latest.id,
            orderNumber: latest.orderNumber,
            warehouseId: latest.warehouseId,
            deliveryType: latest.deliveryType || 'STANDARD',
            status: latest.status,
            totalAmount: Number(latest.totalAmount || 0),
            timeoutSeconds: unassignedTimeoutSeconds,
            title: 'Delivery Partner Not Assigned',
            message: `This order has not been accepted by any delivery partner within ${unassignedTimeoutSeconds} seconds. Please check the order and arrange delivery.`,
            timestamp: new Date().toISOString()
          });

          // Cancel broadcast to delivery agents so the expired offer is removed from their portals
          await cancelDeliveryBroadcast(latest.id, null, true, 'Delivery offer expired without acceptance');
        }
      } catch (err) {
        logger.error('[Broadcast] Error triggering unassigned timeout alert', { error: err.message });
      }
    }, unassignedTimeoutSeconds * 1000);

    const currentState = activeBroadcasts.get(orderId);
    if (currentState) {
      currentState.unassignedTimer = unassignedTimer;
    }

    logger.info('[Broadcast] Starting progressive radius broadcast', {
      orderId,
      warehouseId,
      stages: parseStages(),
      timeoutSeconds: parseInt(process.env.DELIVERY_RADIUS_TIMEOUT_SECONDS || '30', 10),
    });

    // Kick off stage 0 immediately
    await runStage(orderId);
  } catch (err) {
    logger.error('[Broadcast] startDeliveryBroadcast failed', {
      orderId,
      error: err.message,
    });
  }
}

/**
 * Cancel an active broadcast for an order.
 *
 * Called when:
 *  - An agent accepts (pass winnerId to skip notifying them)
 *  - The order is manually assigned via the dropdown
 *  - The order is cancelled or leaves READY_FOR_PICKUP
 *  - 120s unassigned timeout expires without acceptance
 *
 * @param {string} orderId
 * @param {string|null} winnerId  – agent that accepted (excluded from cancel event)
 * @param {boolean} [notifyOthers=true] – emit offer_cancelled to all other notified agents
 * @param {string} [reason='Order has been assigned to another rider']
 */
export async function cancelDeliveryBroadcast(orderId, winnerId = null, notifyOthers = true, reason = 'Order has been assigned to another rider') {
  const state = activeBroadcasts.get(orderId);
  if (!state) return;

  // Stop expansion timer
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }

  // Stop 90s unassigned SLA timer
  if (state.unassignedTimer) {
    clearTimeout(state.unassignedTimer);
    state.unassignedTimer = null;
  }

  if (notifyOthers && state.notifiedSet.size > 0) {
    const cancelPayload = { orderId, reason };
    const idsToCancel = winnerId
      ? [...state.notifiedSet].filter((id) => id !== winnerId)
      : [...state.notifiedSet];
    emitCancelToAgents(idsToCancel, cancelPayload);
    logger.info(`[Broadcast] Sent offer_cancelled to ${idsToCancel.length} agent(s)`, {
      orderId,
      winnerId,
      reason,
    });
  }

  activeBroadcasts.delete(orderId);
}

/**
 * Called by the `acceptOffer` handler in delivery-apis after successful
 * atomic claim. Cancels the broadcast and notifies partner of assignment.
 *
 * @param {string} orderId
 * @param {string} agentId   – winner who accepted
 * @param {string} warehouseId
 * @param {object} assignmentPayload  – data to push to partner socket
 */
export async function onOfferAccepted(orderId, agentId, warehouseId, assignmentPayload) {
  await cancelDeliveryBroadcast(orderId, agentId, true);
  emitPartnerRiderAssigned(warehouseId, {
    ...assignmentPayload,
    autoAssigned: true,
    assignedAt: new Date().toISOString(),
  });
  logger.info('[Broadcast] Offer accepted, broadcast cancelled and partner notified', {
    orderId,
    agentId,
    warehouseId,
  });
}

/**
 * Returns true if there is an active broadcast for the given orderId.
 * Useful for the accept-offer handler to call cancelDeliveryBroadcast via
 * a POST to the partner-api internal endpoint.
 */
export function hasBroadcast(orderId) {
  return activeBroadcasts.has(orderId);
}

/**
 * Get all active broadcasts that a specific agent is eligible for (has been notified about).
 * @param {string} agentId 
 * @returns {Array} Array of offer payloads
 */
export async function getActiveBroadcastsForAgent(agentId) {
  const offers = [];

  // fetch agent to check eligibility for broadcasts they missed
  const { prisma } = await import('../config/prismaClient.js');
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { warehouseId: true, isOnline: true }
  });

  if (!agent || !agent.isOnline || !agent.warehouseId) return offers;

  // Revive any missed READY_FOR_PICKUP broadcasts for this warehouse (excluding already timed-out/sentinel orders)
  try {
    const now = new Date();
    const missedOrders = await prisma.order.findMany({
      where: {
        warehouseId: agent.warehouseId,
        status: 'READY_FOR_PICKUP',
        agentId: null,
        OR: [
          { assignmentDueAt: null },
          { assignmentDueAt: { gt: now } }
        ],
        NOT: {
          assignmentDueAt: { lte: new Date(1000) }
        }
      },
      select: { id: true }
    });

    for (const missed of missedOrders) {
      if (!activeBroadcasts.has(missed.id)) {
        logger.info(`[Broadcast] Reviving missed broadcast for order ${missed.id}`);
        startDeliveryBroadcast(missed.id, agent.warehouseId).catch(err => {
          logger.error(`[Broadcast] Failed to revive broadcast for order ${missed.id}`, { error: err.message });
        });
      }
    }
  } catch (err) {
    logger.error('[Broadcast] Failed to revive missed broadcasts', { error: err.message });
  }

  if (activeBroadcasts.size > 0) {
    for (const [orderId, state] of activeBroadcasts.entries()) {
      let isEligible = state.notifiedSet.has(agentId);

      if (!isEligible && state.warehouseId === agent.warehouseId) {
        // Agent is online and belongs to warehouse. No distance checks needed now.
        isEligible = true;
        state.notifiedSet.add(agentId);
        logger.info(`[Broadcast] Added agent ${agentId} to notified set dynamically for order ${orderId}`);
      }

      if (isEligible) {
        offers.push({
          ...state.orderData,
          radiusKm: 1000,
          broadcastedAt: new Date().toISOString()
        });
      }
    }
  }

  // Also include active assigned orders specifically assigned to this agent (e.g. manually assigned or reassigned by shopkeeper/partner)
  try {
    const assignedOrders = await prisma.order.findMany({
      where: {
        agentId: agentId,
        status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
      },
      include: {
        warehouse: { select: { address: true, name: true } },
        address: { select: { line1: true, line2: true, city: true, pincode: true } },
        consumer: { select: { name: true, phone: true } }
      }
    });

    for (const ord of assignedOrders) {
      // Don't duplicate if already in offers
      if (offers.some(o => o.orderId === ord.id || o.id === ord.id)) continue;

      const dropAddr = ord.address
        ? [ord.address.line1, ord.address.line2, ord.address.city, ord.address.pincode].filter(Boolean).join(', ')
        : 'Customer address';
      const pickupAddr = ord.warehouse?.address || ord.warehouse?.name || 'Warehouse';

      offers.push({
        id: ord.id,
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        deliveryCharge: ord.deliveryCharge ?? 0,
        totalAmount: ord.totalAmount ?? 0,
        warehouseAddress: pickupAddr,
        pickupAddress: pickupAddr,
        dropAddress: dropAddr,
        customerName: ord.consumer?.name || 'Customer',
        customerPhone: ord.consumer?.phone || 'N/A',
        radiusKm: 1000,
        broadcastedAt: ord.assignedAt ? ord.assignedAt.toISOString() : new Date().toISOString(),
        assignedAt: ord.assignedAt ? ord.assignedAt.toISOString() : new Date().toISOString(),
        assigned: true,
        isDirectAssignment: true,
        assignedToMe: true,
      });
    }
  } catch (assignedErr) {
    logger.warn('[Broadcast] Error fetching assigned orders for agent in getActiveBroadcastsForAgent', { error: assignedErr.message });
  }

  return offers;
}
