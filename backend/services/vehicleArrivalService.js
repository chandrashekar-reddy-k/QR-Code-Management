// services/vehicleArrivalService.js
import { prisma } from '../config/prismaClient.js'
import logger from '../utils/logger.js'
import { admin, firebaseInitialized } from '../config/firebase.js'

export const DEFAULT_GEOFENCE_RADIUS_METERS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '500', 10)
export const MAX_GPS_FRESHNESS_MS = 15 * 60 * 1000
export const GEOFENCE_EXIT_HYSTERESIS_FACTOR = 1.1

const geofenceStateMap = new Map()

export function getGeofenceState(vehicleId) {
  return geofenceStateMap.get(vehicleId) || null
}

export function clearGeofenceState(vehicleId = null) {
  if (vehicleId) {
    geofenceStateMap.delete(vehicleId)
  } else {
    geofenceStateMap.clear()
  }
}

export function setGeofenceState(vehicleId, state) {
  geofenceStateMap.set(vehicleId, state)
}

/**
 * Restore persistent geofence state from PostgreSQL (NotificationDispatchLog)
 * across server restarts and multiple running instances.
 */
export async function resolvePersistentGeofenceState(vehicleId, todayKey) {
  const memoryState = geofenceStateMap.get(vehicleId)
  if (memoryState && memoryState.dateKey === todayKey) {
    return memoryState
  }

  try {
    const todayStart = new Date(`${todayKey}T00:00:00.000Z`)
    const latestLog = await prisma.notificationDispatchLog.findFirst({
      where: {
        type: { in: ['GEOFENCE_VISIT', 'GEOFENCE_EXIT', 'VEHICLE_ARRIVAL'] },
        idempotencyKey: { contains: `:${vehicleId}:` },
        createdAt: { gte: todayStart }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (latestLog && latestLog.payload && typeof latestLog.payload === 'object') {
      const p = latestLog.payload
      const isExit = latestLog.type === 'GEOFENCE_EXIT'
      const recoveredState = {
        status: isExit ? 'OUTSIDE' : 'INSIDE',
        stopId: p.stopId || null,
        villageId: p.villageId || null,
        villageName: p.villageName || null,
        visitIndex: parseInt(p.visitIndex, 10) || 1,
        entryTimestamp: new Date(latestLog.createdAt).getTime(),
        lastPingTimestamp: new Date(latestLog.createdAt).getTime(),
        dateKey: todayKey,
        isRecoveredFromDb: true
      }
      geofenceStateMap.set(vehicleId, recoveredState)
      logger.info('[VehicleArrival] Recovered persistent geofence state from database', {
        vehicleId,
        villageName: recoveredState.villageName,
        status: recoveredState.status,
        visitIndex: recoveredState.visitIndex
      })
      return recoveredState
    }
  } catch (err) {
    logger.warn('[VehicleArrival] Could not query database for geofence state recovery', {
      error: err.message
    })
  }

  return null
}

export function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const pLat1 = parseFloat(lat1)
  const pLon1 = parseFloat(lon1)
  const pLat2 = parseFloat(lat2)
  const pLon2 = parseFloat(lon2)

  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) {
    return NaN
  }

  const R = 6371000
  const dLat = (pLat2 - pLat1) * (Math.PI / 180)
  const dLon = (pLon2 - pLon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pLat1 * (Math.PI / 180)) *
      Math.cos(pLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function validateCoordinates(lat, lon) {
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    return { valid: false, reason: 'MISSING_COORDINATES' }
  }
  const parsedLat = parseFloat(lat)
  const parsedLon = parseFloat(lon)

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    return { valid: false, reason: 'NON_NUMERIC_COORDINATES' }
  }
  if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
    return { valid: false, reason: 'OUT_OF_RANGE_COORDINATES' }
  }
  return { valid: true, parsedLat, parsedLon }
}

export async function evaluateVehicleArrival({
  vehicleId,
  latitude,
  longitude,
  accuracy = 50,
  timestamp = new Date(),
  source = 'PARTNER_GPS_PING',
  pushSender = null
}) {
  const diagnostics = []

  const coordValidation = validateCoordinates(latitude, longitude)
  if (!coordValidation.valid) {
    return { status: 'SKIPPED', reason: coordValidation.reason, diagnostics }
  }
  const { parsedLat, parsedLon } = coordValidation

  const pingDate = timestamp ? new Date(timestamp) : new Date()
  const nowMs = Date.now()
  if (isNaN(pingDate.getTime())) {
    return { status: 'SKIPPED', reason: 'INVALID_TIMESTAMP', diagnostics }
  }
  if (nowMs - pingDate.getTime() > MAX_GPS_FRESHNESS_MS) {
    return { status: 'SKIPPED', reason: 'STALE_GPS_DATA', diagnostics }
  }

  if (!vehicleId) {
    return { status: 'SKIPPED', reason: 'MISSING_VEHICLE_ID', diagnostics }
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      vehicleName: true,
      vehicleNumber: true,
      status: true,
      routeExecutions: {
        where: { status: 'IN_PROGRESS' },
        take: 1,
        include: {
          route: {
            include: {
              stops: {
                orderBy: { stopOrder: 'asc' },
                include: { village: true }
              }
            }
          }
        }
      },
      routeAssignments: {
        where: { status: true },
        orderBy: { startDate: 'desc' },
        take: 1,
        include: {
          route: {
            include: {
              stops: {
                orderBy: { stopOrder: 'asc' },
                include: { village: true }
              }
            }
          }
        }
      }
    }
  })

  if (!vehicle) {
    return { status: 'SKIPPED', reason: 'VEHICLE_NOT_FOUND', diagnostics }
  }

  if (vehicle.status !== true && vehicle.status !== 'ACTIVE') {
    return { status: 'SKIPPED', reason: 'VEHICLE_INACTIVE', diagnostics }
  }

  const activeRoute =
    vehicle.routeExecutions?.[0]?.route ||
    vehicle.routeAssignments?.[0]?.route ||
    null

  if (!activeRoute) {
    return { status: 'SKIPPED', reason: 'NO_ACTIVE_ROUTE', diagnostics }
  }

  const stops = activeRoute.stops || []
  if (stops.length === 0) {
    return { status: 'SKIPPED', reason: 'NO_ROUTE_STOPS', diagnostics }
  }

  let matchedStop = null
  let minDistanceMeters = Infinity
  const todayKey = new Date().toISOString().split('T')[0]

  // Retrieve persistent geofence state (memory or DB recovery)
  const previousState = await resolvePersistentGeofenceState(vehicleId, todayKey)

  for (const stop of stops) {
    const village = stop.village
    if (!village || village.latitude == null || village.longitude == null) {
      diagnostics.push(`Stop ${stop.id}: Missing coordinates`)
      continue
    }

    const stopLat = parseFloat(village.latitude)
    const stopLon = parseFloat(village.longitude)
    if (isNaN(stopLat) || isNaN(stopLon)) {
      diagnostics.push(`Stop ${stop.id}: Invalid coordinates`)
      continue
    }

    const radiusMeters =
      typeof village.radius === 'number' && village.radius > 0
        ? village.radius
        : DEFAULT_GEOFENCE_RADIUS_METERS

    const distance = calculateHaversineDistanceMeters(parsedLat, parsedLon, stopLat, stopLon)

    if (!isNaN(distance) && distance <= radiusMeters) {
      if (distance < minDistanceMeters) {
        minDistanceMeters = distance
        matchedStop = {
          stopId: stop.id,
          stopOrder: stop.stopOrder,
          villageId: village.id,
          villageName: village.name,
          stopLat,
          stopLon,
          radiusMeters,
          distanceMeters: distance
        }
      }
    }
  }

  if (!matchedStop) {
    if (previousState && previousState.status === 'INSIDE') {
      geofenceStateMap.set(vehicleId, {
        ...previousState,
        status: 'OUTSIDE',
        exitTimestamp: nowMs,
        lastPingTimestamp: nowMs
      })

      // Persist exit log for restart durability
      try {
        await prisma.notificationDispatchLog.create({
          data: {
            idempotencyKey: `geofence_exit:${vehicleId}:${previousState.villageId}:${todayKey}:visit-${previousState.visitIndex}:${nowMs}`,
            type: 'GEOFENCE_EXIT',
            status: 'COMPLETED',
            sourceService: source || 'PARTNER_VEHICLE_ARRIVAL_SERVICE',
            payload: {
              vehicleId,
              villageId: previousState.villageId,
              villageName: previousState.villageName,
              visitIndex: previousState.visitIndex,
              exitTimestamp: nowMs
            }
          }
        })
      } catch (_) {}
    }
    return { status: 'OUTSIDE_GEOFENCE', reason: 'NOT_INSIDE_ANY_STOP_GEOFENCE', diagnostics }
  }

  const isSameStopAsPrevious =
    previousState &&
    previousState.villageId === matchedStop.villageId &&
    previousState.status === 'INSIDE' &&
    previousState.dateKey === todayKey

  if (isSameStopAsPrevious) {
    geofenceStateMap.set(vehicleId, {
      ...previousState,
      lastPingTimestamp: nowMs,
      distanceMeters: matchedStop.distanceMeters
    })
    return {
      status: 'SUPPRESSED',
      reason: 'ALREADY_INSIDE_GEOFENCE',
      matchedStop: { ...matchedStop, visitIndex: previousState.visitIndex },
      diagnostics
    }
  }

  const nextVisitIndex =
    previousState &&
    previousState.villageId === matchedStop.villageId &&
    previousState.dateKey === todayKey
      ? (previousState.visitIndex || 1) + 1
      : 1

  geofenceStateMap.set(vehicleId, {
    status: 'INSIDE',
    stopId: matchedStop.stopId,
    villageId: matchedStop.villageId,
    villageName: matchedStop.villageName,
    visitIndex: nextVisitIndex,
    entryTimestamp: nowMs,
    lastPingTimestamp: nowMs,
    dateKey: todayKey,
    distanceMeters: matchedStop.distanceMeters
  })

  // Durable stop-level visit lock
  const stopVisitLockKey = `geofence_stop_visit:${vehicle.id}:${matchedStop.villageId}:${todayKey}:visit-${nextVisitIndex}`
  try {
    await prisma.notificationDispatchLog.create({
      data: {
        idempotencyKey: stopVisitLockKey,
        type: 'GEOFENCE_VISIT',
        status: 'IN_PROGRESS',
        correlationId: `visit-${nextVisitIndex}`,
        sourceService: source || 'PARTNER_VEHICLE_ARRIVAL_SERVICE',
        payload: {
          vehicleId: vehicle.id,
          villageId: matchedStop.villageId,
          villageName: matchedStop.villageName,
          visitIndex: nextVisitIndex,
          stopId: matchedStop.stopId
        }
      }
    })
  } catch (visitErr) {
    if (
      visitErr.code === 'P2002' ||
      visitErr.message?.includes('Unique constraint') ||
      visitErr.message?.includes('idempotencyKey')
    ) {
      logger.info('[VehicleArrival] Stop visit already initiated by concurrent worker', {
        stopVisitLockKey
      })
    }
  }

  // Find eligible orders
  const activeOrders = await prisma.order.findMany({
    where: {
      vehicleId: vehicle.id,
      fulfillmentType: 'VEHICLE_PICKUP',
      status: {
        in: [
          'CONFIRMED',
          'PROCESSING',
          'PACKED',
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY',
          'ASSIGNED_TO_AGENT'
        ]
      }
    },
    select: {
      id: true,
      orderNumber: true,
      consumerId: true,
      routeId: true,
      address: {
        select: {
          line1: true,
          city: true,
          mandal: true
        }
      }
    }
  })

  const normVillageName = matchedStop.villageName.toLowerCase().trim()
  const eligibleOrders = activeOrders.filter((ord) => {
    if (ord.routeId && ord.routeId === activeRoute.id) return true
    const addr = ord.address
    if (addr) {
      if (addr.mandal && addr.mandal.toLowerCase().includes(normVillageName)) return true
      if (addr.city && addr.city.toLowerCase().includes(normVillageName)) return true
      if (addr.line1 && addr.line1.toLowerCase().includes(normVillageName)) return true
    }
    return true
  })

  if (eligibleOrders.length === 0) {
    return {
      status: 'GEOFENCE_ENTERED',
      matchedStop: { ...matchedStop, visitIndex: nextVisitIndex },
      eligibleCustomersCount: 0,
      alertsDispatched: 0,
      alertsSkipped: 0,
      alertsFailed: 0,
      diagnostics
    }
  }

  let sentCount = 0
  let failedCount = 0
  let skippedCount = 0

  for (const order of eligibleOrders) {
    const customerId = order.consumerId
    const idempotencyKey = `vehicle_arrival:${order.id}:${vehicle.id}:${matchedStop.villageId}:${todayKey}:visit-${nextVisitIndex}`

    // Check device metadata notification preference
    let notificationEnabled = true
    try {
      const deviceMeta = await prisma.deviceMetadata.findFirst({
        where: { userId: customerId },
        select: { notificationEnabled: true }
      })
      if (deviceMeta && deviceMeta.notificationEnabled === false) {
        notificationEnabled = false
      }
    } catch (_) {}

    if (!notificationEnabled) {
      skippedCount++
      continue
    }

    // ATOMIC PRE-FLIGHT RESERVATION:
    let lockAcquired = false
    try {
      await prisma.notificationDispatchLog.create({
        data: {
          idempotencyKey,
          type: 'VEHICLE_ARRIVAL',
          recipientUserId: customerId,
          orderId: order.id,
          status: 'IN_FLIGHT',
          correlationId: `visit-${nextVisitIndex}`,
          sourceService: source || 'PARTNER_VEHICLE_ARRIVAL_SERVICE',
          payload: {
            orderNumber: order.orderNumber,
            vehicleId: vehicle.id,
            villageName: matchedStop.villageName,
            visitIndex: nextVisitIndex
          }
        }
      })
      lockAcquired = true
    } catch (lockErr) {
      if (
        lockErr.code === 'P2002' ||
        lockErr.message?.includes('Unique constraint') ||
        lockErr.message?.includes('idempotencyKey')
      ) {
        skippedCount++
        continue
      }
      logger.warn('[VehicleArrival] Error acquiring dispatch log lock', { error: lockErr.message })
      skippedCount++
      continue
    }

    if (!lockAcquired) continue

    const title = `Vehicle Arrived at ${matchedStop.villageName}`
    const body = `Vehicle ${vehicle.vehicleName || vehicle.vehicleNumber} has arrived at ${matchedStop.villageName}. Your order ${order.orderNumber} is ready for pickup!`
    const payload = {
      type: 'VEHICLE_ARRIVAL',
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber || '',
      villageId: matchedStop.villageId,
      villageName: matchedStop.villageName,
      visitIndex: String(nextVisitIndex),
      source
    }

    // Create in-app Notification row in DB
    try {
      await prisma.notification.create({
        data: {
          userId: customerId,
          type: 'ORDER_READY',
          title,
          message: body,
          data: payload,
          channel: ['in_app']
        }
      })
    } catch (notifErr) {
      logger.warn('[VehicleArrival] Notification DB insert error:', notifErr.message)
    }

    // Check device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId: customerId },
      select: { deviceToken: true, fcmToken: true }
    })

    const targetTokens = deviceTokens
      .map(d => d.fcmToken || d.deviceToken)
      .filter(Boolean)

    let pushSuccess = false
    let lastErr = null
    let fcmMid = null

    if (targetTokens.length > 0) {
      if (pushSender) {
        for (const token of targetTokens) {
          try {
            const resp = await pushSender(token, title, body, payload, customerId)
            if (resp && resp.success) {
              pushSuccess = true
              fcmMid = resp.messageId || 'mock-mid'
            } else {
              lastErr = resp?.error || 'push_failed'
            }
          } catch (err) {
            lastErr = err.message
          }
        }
      } else if (firebaseInitialized && admin?.apps?.length) {
        for (const token of targetTokens) {
          try {
            const resp = await admin.messaging().send({
              token,
              notification: { title, body },
              data: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)]))
            })
            pushSuccess = true
            fcmMid = resp
          } catch (err) {
            lastErr = err.message
          }
        }
      } else {
        lastErr = 'firebase_not_initialized'
      }
    }

    const finalStatus = pushSuccess ? 'SENT' : (targetTokens.length === 0 ? 'SKIPPED' : 'FAILED')
    if (pushSuccess) sentCount++
    else if (targetTokens.length === 0) skippedCount++
    else failedCount++

    try {
      await prisma.notificationDispatchLog.update({
        where: { idempotencyKey },
        data: {
          status: finalStatus,
          fcmMessageId: fcmMid ? String(fcmMid) : null,
          error: pushSuccess ? null : lastErr
        }
      })
    } catch (_) {}
  }

  return {
    status: 'GEOFENCE_ENTERED',
    matchedStop: { ...matchedStop, visitIndex: nextVisitIndex },
    eligibleCustomersCount: eligibleOrders.length,
    alertsDispatched: sentCount,
    alertsFailed: failedCount,
    alertsSkipped: skippedCount,
    diagnostics
  }
}

export async function evaluateVehicleArrivalForAgent({
  agentId,
  latitude,
  longitude,
  accuracy = 50,
  timestamp = new Date()
}) {
  if (!agentId) return { status: 'SKIPPED', reason: 'MISSING_AGENT_ID' }

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, assignedVehicleId: true }
  })

  let vehicleId = agent?.assignedVehicleId
  if (!vehicleId) {
    const assignment = await prisma.routeAssignment.findFirst({
      where: { userId: agentId, status: true },
      orderBy: { startDate: 'desc' },
      select: { vehicleId: true }
    })
    vehicleId = assignment?.vehicleId
  }

  if (!vehicleId) {
    return {
      status: 'SKIPPED',
      reason: 'NO_ASSIGNED_VEHICLE',
      message: `Agent ${agentId} is not assigned to any vehicle`
    }
  }

  return evaluateVehicleArrival({
    vehicleId,
    latitude,
    longitude,
    accuracy,
    timestamp,
    source: 'AGENT_LOCATION_PING'
  })
}
