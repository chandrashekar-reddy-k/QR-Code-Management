import { prisma } from '../../config/prismaClient.js';
import { reverseGeocode } from '../../utils/geoUtils.js';
import { getIO } from '../services/socketService.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
import { evaluateVehicleArrivalForAgent } from '../../services/vehicleArrivalService.js';

/**
 * @desc    Log current location (Breadcrumb)
 * @route   POST /api/location/log
 * @access  Private
 */
export const logLocation = async (req, res, next) => {
  try {
    const rawLat = req.body?.lat ?? req.body?.latitude;
    const rawLon = req.body?.lon ?? req.body?.lng ?? req.body?.longitude;
    const { accuracy } = req.body || {};
    const userId = req.user.id;

    if (rawLat === undefined || rawLat === null || rawLon === undefined || rawLon === null) {
      return res.status(400).json({ status: 'error', message: 'Missing coordinate parameters (lat/latitude and lon/lng/longitude required)' });
    }

    const parsedLat = parseFloat(rawLat);
    const parsedLon = parseFloat(rawLon);

    if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      return res.status(400).json({ status: 'error', message: 'Invalid or out-of-range coordinates' });
    }

    const rawAcc = parseFloat(accuracy);
    const parsedAccuracy = isNaN(rawAcc) ? 50 : rawAcc;

    if (parsedAccuracy > 5000) {
      return res.status(200).json({ status: 'ignored', message: 'Accuracy threshold exceeded' });
    }

    // Run reverseGeocode with timeout to avoid blocking location logging
    let subLocation = 'Current Location';
    try {
      subLocation = (await Promise.race([
        reverseGeocode(parsedLat, parsedLon),
        new Promise(resolve => setTimeout(() => resolve('Current Location'), 1000))
      ])) || 'Current Location';
    } catch (_) {
      subLocation = 'Current Location';
    }

    const now = new Date();
    
    // Check if user exists in the local database to avoid foreign key violation
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existingUser) {
      console.warn(`[Location] User ID ${userId} does not exist in local database. Ignoring log.`);
      return res.status(200).json({ status: 'ignored', message: 'User not synchronized with database' });
    }

    const log = await prisma.locationLog.create({
      data: {
        userId,
        tenantId: req.user.tenantId || 'VK001',
        lat: parsedLat,
        long: parsedLon,
        subLocation,
        timestamp: now
      }
    });

    // Update agent's isOnline status and last active timestamp in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: true,
        lastActive: now,
        currentLocation: { lat: parsedLat, lon: parsedLon, subLocation }
      }
    }).catch(err => console.warn('[Location] Could not update user.isOnline:', err.message));

    // Real-time broadcast to sockets
    try {
      const io = getIO();
      if (io) {
        const payload = {
          userId,
          lat: parsedLat,
          long: parsedLon,
          subLocation,
          timestamp: now
        };
        io.emit('location:update', payload);
        io.to('admin_room').emit('location:update', payload);
      }
    } catch (socketErr) {
      console.warn('[Location] Socket emit skipped:', socketErr.message);
    }

    // Automatic Vehicle Arrival Geofence Detection (asynchronous, non-blocking, isolated)
    evaluateVehicleArrivalForAgent({
      agentId: userId,
      latitude: parsedLat,
      longitude: parsedLon,
      accuracy: parsedAccuracy,
      timestamp: now
    }).catch(arrivalErr => {
      console.warn('[Location] Vehicle arrival evaluation skipped:', arrivalErr.message);
    });

    res.json({ status: 'success', log });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest locations for all active agents (Admin)
 * @route   GET /api/location/live
 * @access  Admin
 */
export const getLiveLocations = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    const targetStoreId = getEffectiveStoreId(req);

    // 1. Get all agents who have an ACTIVE shift today
    const today = new Date().toISOString().split('T')[0];
    const shiftWhere = {
      date: today,
      status: 'STARTED'
    };
    if (tenantId) shiftWhere.tenantId = tenantId;
    if (targetStoreId) shiftWhere.storeId = targetStoreId;

    const activeShifts = await prisma.shiftLog.findMany({
      where: shiftWhere,
      include: {
        user: {
          select: { id: true, name: true, phone: true, vgeType: true, warehouseId: true }
        }
      }
    });

    const activeUserIds = activeShifts.map(s => s.userId);

    // 2. Get the latest location log for all agents
    const logWhere = {};
    if (tenantId) logWhere.tenantId = tenantId;

    const latestLogs = await prisma.locationLog.findMany({
      where: logWhere,
      distinct: ['userId'],
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, phone: true, role: true, vgeType: true, warehouseId: true }
        }
      }
    });

    const agentRoles = ['VSMS_AGENT', 'SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'AGENT', 'FIELD_AGENT'];
    const isAgent = (user) => {
      if (!user || !user.role) return false;
      const r = user.role.trim().toUpperCase();
      return agentRoles.includes(r) || r.endsWith('_AGENT') || r === 'AGENT';
    };

    // Filter by store and agent role
    const filteredLogs = latestLogs.filter(l => {
      if (!l.user || !isAgent(l.user)) return false;
      if (targetStoreId && l.user.warehouseId !== targetStoreId) return false;
      return true;
    });

    // 3. Fetch all VSMS/Vehicle Agents registered in system
    const allUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(targetStoreId ? { warehouseId: targetStoreId } : {})
      },
      select: { id: true, name: true, phone: true, role: true, vgeType: true, warehouseId: true, isOnline: true, lastActive: true, currentLocation: true }
    });

    const allAgents = allUsers.filter(u => isAgent(u));

    // 4. Merge: Combine allAgents, activeShifts and recent logs
    const mergedMap = new Map();

    // First, populate all known agents with database isOnline state
    allAgents.forEach(ag => {
      const loc = ag.currentLocation && typeof ag.currentLocation === 'object' ? ag.currentLocation : {};
      const agentLat = loc.lat ?? loc.latitude ?? null;
      const agentLon = loc.lon ?? loc.lng ?? loc.longitude ?? null;
      mergedMap.set(ag.id, {
        userId: ag.id,
        user: ag,
        lat: agentLat !== null && !isNaN(parseFloat(agentLat)) ? parseFloat(agentLat) : null,
        long: agentLon !== null && !isNaN(parseFloat(agentLon)) ? parseFloat(agentLon) : null,
        timestamp: ag.lastActive || null,
        subLocation: loc.subLocation || 'No Location Reported',
        isOnDuty: ag.isOnline || false,
        isPendingFirstPing: false
      });
    });

    // Second, populate active shifts
    activeShifts.forEach(shift => {
      const log = filteredLogs.find(l => l.userId === shift.userId);
      if (log) {
        mergedMap.set(shift.userId, { ...log, isOnDuty: true });
      } else {
        mergedMap.set(shift.userId, {
          userId: shift.userId,
          user: shift.user,
          lat: shift.startLat,
          long: shift.startLong,
          timestamp: shift.startTime,
          subLocation: 'Just Started (Shift Location)',
          isOnDuty: true,
          isPendingFirstPing: true
        });
      }
    });

    // Third, include any agent who has recorded a location log today
    filteredLogs.forEach(log => {
      const existing = mergedMap.get(log.userId);
      mergedMap.set(log.userId, {
        ...(existing || {}),
        ...log,
        user: log.user || existing?.user,
        isOnDuty: existing?.isOnDuty ?? true
      });
    });

    // Fetch active route assignments with vehicle & route details for agents
    const agentIds = Array.from(mergedMap.keys());
    const activeRouteAssignments = await prisma.routeAssignment.findMany({
      where: {
        userId: { in: agentIds },
        status: true
      },
      include: {
        route: true,
        vehicle: true
      }
    });

    const routeMap = new Map();
    activeRouteAssignments.forEach(ra => {
      routeMap.set(ra.userId, ra);
    });

    const mergedResults = Array.from(mergedMap.values());

    // Map phone to mobile and attach route assignment for backward compatibility
    const mappedResults = mergedResults.map(item => {
      const assignment = routeMap.get(item.userId);
      if (item.user) {
        item.user.mobile = item.user.phone;
        item.user.storeId = item.user.warehouseId;
      }
      return {
        ...item,
        routeAssignment: assignment || null,
        route: assignment?.route || null,
        vehicle: assignment?.vehicle || null
      };
    });

    res.json(mappedResults);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get location history for current day (Breadcrumbs)
 * @route   GET /api/location/history
 * @access  Admin
 */
export const getLocationHistory = async (req, res, next) => {
  try {
    const { date, userId } = req.query;
    const tenantId = req.user?.tenantId;
    const targetStoreId = getEffectiveStoreId(req);

    // Default to today IST
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const historyWhere = {
      timestamp: {
        gte: start,
        lte: end
      }
    };
    if (userId) historyWhere.userId = userId;
    if (tenantId) historyWhere.tenantId = tenantId;
    if (targetStoreId) historyWhere.user = { warehouseId: targetStoreId };

    const logs = await prisma.locationLog.findMany({
      where: historyWhere,
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, warehouseId: true }
        }
      }
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};
