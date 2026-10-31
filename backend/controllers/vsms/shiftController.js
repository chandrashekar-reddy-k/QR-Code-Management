import { prisma } from '../../config/prismaClient.js';
import { isWithinRadius } from '../../utils/geoUtils.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';

export const getShiftsConfig = async (tenantId, storeId) => {
  const currentTenantId = tenantId || "VK001";

  // 1. Primary Source: Fetch live shifts directly from HRMS
  try {
    const hrmsBaseUrl = (process.env.HRMS_WORKFORCE_URL || 'https://hrmsapi.villagkart.com/hr/workforce').replace(/\/$/, '');
    const res = await fetch(`${hrmsBaseUrl}/attendance/shifts`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = await res.json();
      const hrmsShifts = json.data || json.shifts || (Array.isArray(json) ? json : []);
      if (Array.isArray(hrmsShifts) && hrmsShifts.length > 0) {
        return hrmsShifts.map(s => ({
          id: s.id || s.code,
          code: s.code,
          name: s.name || s.code,
          shiftName: s.name || s.code,
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '18:00',
          gracePeriod: s.gracePeriod || 15
        }));
      }
    }
  } catch (hrmsErr) {
    console.warn('[ShiftController] HRMS shifts fetch skipped/failed, using local fallback:', hrmsErr.message);
  }

  // 2. Secondary Fallback: Dedicated ShiftConfig table
  try {
    const shiftConfigs = await prisma.shiftConfig.findMany({
      where: {
        tenantId: currentTenantId,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (shiftConfigs && shiftConfigs.length > 0) {
      return shiftConfigs.map((sc, idx) => ({
        id: sc.id || `shift_${idx + 1}`,
        name: sc.shiftName,
        shiftName: sc.shiftName,
        shiftType: sc.shiftType,
        type: sc.shiftType,
        startTime: sc.startTime || (sc.sessions?.[0]?.startTime) || '08:00',
        endTime: sc.endTime || (sc.sessions?.[sc.sessions?.length - 1]?.endTime) || '18:00',
        sessions: sc.sessions || [{ startTime: sc.startTime || '08:00', endTime: sc.endTime || '18:00' }]
      }));
    }
  } catch (err) {
    console.warn('[ShiftController] Error querying shiftConfig table, falling back to businessSettings:', err.message);
  }

  // 3. Fallback: BusinessSettings table
  let settings = await prisma.businessSettings.findFirst({
    where: {
      tenantId: currentTenantId,
      storeId: storeId || null
    }
  });

  if (!settings && storeId) {
    settings = await prisma.businessSettings.findFirst({
      where: {
        tenantId: currentTenantId,
        storeId: null
      }
    });
  }

  if (settings && settings.shifts && Array.isArray(settings.shifts) && settings.shifts.length > 0) {
    return settings.shifts;
  }

  // 4. Default shifts if none configured
  return [
    { id: 'shift_1', name: 'Morning', startTime: '08:00', endTime: '14:00' },
    { id: 'shift_2', name: 'Evening', startTime: '14:00', endTime: '20:00' }
  ];
};

/**
 * @desc    Start a new shift
 * @route   POST /api/shifts/start
 * @access  Private
 */
export const startShift = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, facePhoto, shiftType } = req.body;
    const userId = req.user.id;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy
      });
    }

    // 2. Prevent Double Actions (Concurrency Check)
    const existingShift = await prisma.shiftLog.findFirst({
      where: {
        userId,
        date: dateStr,
        shift: shiftType,
        status: 'STARTED'
      }
    });

    if (existingShift) {
      return res.status(400).json({ message: 'Shift already started for this period.' });
    }

    // 3. Geo-Validation against HUB (Store)
    const store = await prisma.store.findUnique({
      where: { id: req.user.storeId }
    });

    if (!store || !store.latitude || !store.longitude) {
      return res.status(400).json({ message: 'Store (HUB) location not configured.' });
    }

    const nearHub = isWithinRadius(lat, lon, store.latitude, store.longitude, 500000); // Relaxed to 500km for development testing
    if (!nearHub) {
      return res.status(400).json({
        message: 'Shift must be started near the HUB (within 200m).',
        distanceError: true,
        currentLocation: { lat, lon },
        hubLocation: { lat: store.latitude, lon: store.longitude }
      });
    }

    // 4. Create Shift Log
    const shiftLog = await prisma.shiftLog.create({
      data: {
        tenantId: req.user.tenantId,
        storeId: req.user.storeId,
        userId,
        vehicleId: req.user.assignedVehicleId,
        date: dateStr,
        shift: shiftType,
        startTime: new Date(),
        startLat: lat,
        startLong: lon,
        startFacePhoto: facePhoto,
        status: 'STARTED'
      }
    });

    // Update User isOnline status to true in database
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastActive: new Date() }
    });

    // 5. Late Start Notification Check
    const shifts = await getShiftsConfig(req.user.tenantId, req.user.storeId);

    // Find config by ID (string) or by 1-based index (Int)
    const activeShiftConfig = shifts.find((s, idx) =>
      s.id === shiftType ||
      s.id === `shift_${shiftType}` ||
      (idx + 1) === shiftType ||
      s.name.toUpperCase() === (shiftType === 1 ? 'MORNING' : 'EVENING')
    );

    const shiftTime = new Date();
    const currentTimeStr = format(shiftTime, 'HH:mm');
    let isLate = false;
    let expectedTime = '';
    const shiftName = activeShiftConfig ? activeShiftConfig.name : (shiftType === 1 ? 'MORNING' : 'EVENING');

    if (activeShiftConfig && activeShiftConfig.startTime) {
      if (currentTimeStr > activeShiftConfig.startTime) {
        isLate = true;
        expectedTime = activeShiftConfig.startTime;
      }
    } else {
      // Fallback to legacy hardcoded times
      const hours = shiftTime.getHours();
      const minutes = shiftTime.getMinutes();
      if (shiftType === 1 && (hours > 5 || (hours === 5 && minutes > 45))) {
        isLate = true;
        expectedTime = '05:45 AM';
      } else if (shiftType === 2 && (hours > 15 || (hours === 15 && minutes > 30))) {
        isLate = true;
        expectedTime = '03:30 PM';
      }
    }

    if (isLate) {
      await sendNotification({
        userIds: [userId],
        title: 'Late Shift Start',
        message: `You started your ${shiftName} shift at ${format(shiftTime, 'hh:mm a')}. Expected start was ${expectedTime}.`,
        type: 'alert',
        priority: 'high'
      });
    }

    res.status(201).json({ message: 'Shift Started ✅', shiftLog });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End an active shift
 * @route   POST /api/shifts/end
 * @access  Private
 */
export const endShift = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, shiftLogId, remarks } = req.body;
    const userId = req.user.id;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy
      });
    }

    // 2. Find Active Shift
    const shiftLog = await prisma.shiftLog.findUnique({
      where: { id: shiftLogId }
    });

    if (!shiftLog || shiftLog.userId !== userId || shiftLog.status !== 'STARTED') {
      return res.status(400).json({ message: 'No active shift found to end.' });
    }

    // 3. Geo-Validation against HUB (Store)
    const store = await prisma.store.findUnique({
      where: { id: req.user.storeId }
    });

    if (!store || !store.latitude || !store.longitude) {
      return res.status(400).json({ message: 'Store (HUB) location not configured.' });
    }

    const nearHub = isWithinRadius(lat, lon, store.latitude, store.longitude, 500000);
    if (!nearHub) {
      return res.status(400).json({ message: 'Shift must be ended near the HUB (within 200m).' });
    }

    // 4. Update Shift Log and DailyCoverage
    const updatedShift = await prisma.$transaction(async (tx) => {
        const updated = await tx.shiftLog.update({
            where: { id: shiftLogId },
            data: {
                endTime: new Date(),
                endLat: lat,
                endLong: lon,
                status: 'COMPLETED'
            }
        });

        await tx.user.update({
            where: { id: userId },
            data: { isOnline: false, lastActive: new Date() }
        });

        // Store remarks/justification in shiftStatus JSON if provided
        if (remarks && req.user.assignedVehicleId) {
            const existingCoverage = await tx.dailyCoverage.findUnique({
                where: { 
                    vehicleId_date: { 
                        vehicleId: req.user.assignedVehicleId, 
                        date: dateStr 
                    } 
                }
            });

            const currentStatus = existingCoverage?.shiftStatus || {};
            const updatedStatus = { 
                ... (typeof currentStatus === 'object' ? currentStatus : {}), 
                closureRemarks: remarks 
            };

            await tx.dailyCoverage.upsert({
                where: { 
                    vehicleId_date: { 
                        vehicleId: req.user.assignedVehicleId, 
                        date: dateStr 
                    } 
                },
                update: { shiftStatus: updatedStatus },
                create: {
                    vehicleId: req.user.assignedVehicleId,
                    date: dateStr,
                    villageName: 'N/A',
                    shiftStatus: updatedStatus
                }
            });
        }

        return updated;
    });

    res.json({ message: 'Shift Ended ✅', updatedShift });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active shift status
 * @route   GET /api/shifts/status
 * @access  Private
 */
export const getShiftStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    const [activeShift, attendance, shifts] = await Promise.all([
      prisma.shiftLog.findFirst({
        where: {
          userId,
          date: dateStr,
          status: 'STARTED'
        },
        orderBy: { startTime: 'desc' },
        include: {
          activities: {
            orderBy: { startTime: 'desc' },
            take: 1
          }
        }
      }),
      prisma.attendance.findUnique({
        where: { userId_date: { userId, date: dateStr } }
      }),
      getShiftsConfig(req.user.tenantId, req.user.storeId)
    ]);

    res.json({
      activeShift,
      attendance: attendance ? {
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes,
        punchInTime: attendance.punchInTime
      } : null,
      shifts
    });
  } catch (error) {
    console.error('getShiftStatus error:', error);
    next(error);
  }
};

// CRUD for ShiftConfig model
export const listShiftConfigs = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || 'VK001';
    const configs = await prisma.shiftConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
};

export const createShiftConfig = async (req, res, next) => {
  try {
    const { shiftType, shiftName, startTime, endTime, sessions, isActive } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';

    if (!shiftName) return res.status(400).json({ message: 'Shift name is required' });

    const newConfig = await prisma.shiftConfig.create({
      data: {
        tenantId,
        shiftType: shiftType || 'STANDARD',
        shiftName,
        startTime: startTime || null,
        endTime: endTime || null,
        sessions: sessions || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json({ success: true, message: 'Shift configuration created', data: newConfig });
  } catch (error) {
    next(error);
  }
};

export const updateShiftConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shiftType, shiftName, startTime, endTime, sessions, isActive } = req.body;

    const existing = await prisma.shiftConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Shift config not found' });

    const updated = await prisma.shiftConfig.update({
      where: { id },
      data: {
        ...(shiftType !== undefined && { shiftType }),
        ...(shiftName !== undefined && { shiftName }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(sessions !== undefined && { sessions }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({ success: true, message: 'Shift configuration updated', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteShiftConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.shiftConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Shift config not found' });

    await prisma.shiftConfig.delete({ where: { id } });
    res.json({ success: true, message: 'Shift configuration deleted' });
  } catch (error) {
    next(error);
  }
};

