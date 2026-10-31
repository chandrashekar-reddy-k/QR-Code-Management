import { prisma } from '../../config/prismaClient.js';
import { uploadFilesToS3 } from '../../utils/aws3.js';
import lateEntryEngine from '../../services/lateEntryEngine.js';
import keys from '../../config/keys.js';

// Helper: get today's date string in YYYY-MM-DD format (IST)
const getTodayIST = () => {
  const now = new Date();
  // Offset for IST (+5:30)
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
};
// Helper: Sync agent punch to HRMS workforce attendance service
async function syncAttendanceToHRMS({ action, userId, photo, lat, lng, locationAddress, email }) {
  try {
    let hrmsBaseUrl = process.env.HRMS_WORKFORCE_URL || process.env.HRMS_API_URL?.replace('/hr/core', '/hr/workforce') || 'https://hrmsapi.villagkart.com/hr/workforce';
    if (process.env.NODE_ENV === 'production' && hrmsBaseUrl.includes('localhost')) {
      hrmsBaseUrl = 'https://hrmsapi.villagkart.com/hr/workforce';
    }
    if (hrmsBaseUrl.includes('hrmsapi.villagkart.com') && !hrmsBaseUrl.includes('/hr/workforce')) {
      hrmsBaseUrl = hrmsBaseUrl.replace(/\/$/, '') + '/hr/workforce';
    }

    const endpoint = action === 'punchIn' ? '/attendance/clock-in' : '/attendance/clock-out';
    const targetUrl = `${hrmsBaseUrl.replace(/\/$/, '')}${endpoint}`;

    const body = {
      employeeId: userId,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      photo: photo || null,
      address: locationAddress || null,
      email: email || null
    };

    console.log(`[VSMS-ATTENDANCE-SYNC] Syncing ${action} to HRMS:`, { targetUrl, employeeId: userId });

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      console.warn(`[VSMS-ATTENDANCE-SYNC] HRMS ${action} sync response:`, data);
    } else {
      console.log(`[VSMS-ATTENDANCE-SYNC] HRMS ${action} synced successfully for user ${userId}`);
    }
  } catch (syncErr) {
    console.warn(`[VSMS-ATTENDANCE-SYNC] Non-fatal HRMS sync error on ${action}:`, syncErr.message);
  }
}

// @desc    Agent punches in for the day (with photo proof)
// @route   POST /api/attendance/punch-in
// @access  Private
export const punchIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const storeId = req.user.storeId || null;
    const { lat, lng, locationAddress } = req.body;
    const date = getTodayIST();

    // Check if already punched in today
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already punched in for today.',
        attendance: existing
      });
    }

    // Upload photo directly to HRMS S3 bucket
    let punchInPhoto = null;
    const uploadedFile = req.file || req.files?.photo || req.files?.file;
    if (uploadedFile) {
      try {
        const hrmsBucket = keys.aws3.hrmsBucketName || 'villagkart-hrms';
        const s3Results = await uploadFilesToS3(
          [uploadedFile],
          `hrms-media/attendance/punch-in/${date}`,
          [`punchin-${userId}-${date}`],
          hrmsBucket
        );
        if (s3Results && s3Results[0]?.url) {
          punchInPhoto = s3Results[0].url;
        }
      } catch (s3Err) {
        console.warn('[Attendance] HRMS S3 upload error (non-fatal):', s3Err.message);
      }
    }

    // Verify storeId exists in Warehouse before attaching to prevent foreign key violation
    let validStoreId = null;
    if (storeId) {
      try {
        const wh = await prisma.warehouse.findUnique({ where: { id: storeId }, select: { id: true } });
        if (wh) validStoreId = wh.id;
      } catch {
        validStoreId = null;
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        tenantId,
        storeId: validStoreId,
        date,
        punchInTime: new Date(),
        punchInLat: lat ? parseFloat(lat) : null,
        punchInLng: lng ? parseFloat(lng) : null,
        punchInLocation: locationAddress || null,
        punchInPhoto,
        status: 'ACTIVE',
      }
    });

    // Run Late Detection Engine safely
    try {
      if (lateEntryEngine?.detectAndRecord) {
        await lateEntryEngine.detectAndRecord(userId, new Date(), date);
      }
    } catch (leError) {
      console.error('Late Detection Engine Error (non-fatal):', leError);
    }

    // Auto-sync punch-in to HRMS workforce attendance (non-blocking)
    syncAttendanceToHRMS({
      action: 'punchIn',
      userId,
      photo: punchInPhoto,
      lat,
      lng,
      locationAddress,
      email: req.user?.email
    });

    res.status(201).json({
      success: true,
      message: 'Punched in successfully!',
      attendance
    });
  } catch (error) {
    console.error('PunchIn error:', error);
    next(error);
  }
};

// @desc    Agent punches out
// @route   POST /api/attendance/punch-out
// @access  Private
export const punchOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { lat, lng, locationAddress } = req.body;
    const date = getTodayIST();

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (!existing) {
      return res.status(400).json({
        success: false,
        message: 'No active attendance found for today. Please punch in first.'
      });
    }

    if (existing.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'You have already punched out for today.',
        attendance: existing
      });
    }

    // Upload punch-out photo directly to HRMS S3 bucket
    let punchOutPhoto = null;
    const uploadedOutFile = req.file || req.files?.photo || req.files?.file;
    if (uploadedOutFile) {
      try {
        const hrmsBucket = keys.aws3.hrmsBucketName || 'villagkart-hrms';
        const s3Results = await uploadFilesToS3(
          [uploadedOutFile],
          `hrms-media/attendance/punch-out/${date}`,
          [`punchout-${userId}-${date}`],
          hrmsBucket
        );
        if (s3Results && s3Results[0]?.url) {
          punchOutPhoto = s3Results[0].url;
        }
      } catch (s3Err) {
        console.warn('[Attendance] HRMS S3 punch-out upload error (non-fatal):', s3Err.message);
      }
    }

    // Calculate total hours
    const punchInTime = new Date(existing.punchInTime);
    const punchOutTime = new Date();
    const diffMs = punchOutTime - punchInTime;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const attendance = await prisma.attendance.update({
      where: { userId_date: { userId, date } },
      data: {
        punchOutTime,
        punchOutLat: lat ? parseFloat(lat) : null,
        punchOutLng: lng ? parseFloat(lng) : null,
        punchOutLocation: locationAddress || null,
        punchOutPhoto,
        totalHours,
        status: 'COMPLETED',
      }
    });

    // Auto-sync punch-out to HRMS workforce attendance (non-blocking)
    syncAttendanceToHRMS({
      action: 'punchOut',
      userId,
      photo: punchOutPhoto,
      lat,
      lng,
      locationAddress,
      email: req.user?.email
    });

    res.json({
      success: true,
      message: 'Punched out successfully!',
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's attendance for logged-in user
// @route   GET /api/attendance/today
// @access  Private
export const getToday = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const date = getTodayIST();

    // 1. Primary Source: Query HRMS workforce attendance directly
    try {
      const hrmsBaseUrl = (process.env.HRMS_WORKFORCE_URL || 'https://hrmsapi.villagkart.com/hr/workforce').replace(/\/$/, '');
      const hrmsRes = await fetch(`${hrmsBaseUrl}/attendance/today/${userId}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (hrmsRes.ok) {
        const json = await hrmsRes.json();
        const hrmsData = json.data;
        if (hrmsData && hrmsData.status !== 'Not Clocked In') {
          const hasCheckedIn = !!hrmsData.checkIn;
          const hasCheckedOut = !!hrmsData.checkOut;
          const normalizedStatus = hasCheckedOut ? 'COMPLETED' : (hasCheckedIn ? 'ACTIVE' : hrmsData.status);

          return res.json({
            success: true,
            punchedIn: hasCheckedIn,
            source: 'HRMS',
            attendance: {
              date: hrmsData.date || date,
              punchInTime: hrmsData.checkIn || null,
              punchOutTime: hrmsData.checkOut || null,
              status: normalizedStatus,
              isLate: hrmsData.isLate || false,
              lateMinutes: hrmsData.lateMinutes || 0,
              lateEntryStatus: hrmsData.lateEntryStatus || null,
              penaltyApplied: hrmsData.penaltyApplied || null,
              punchInPhoto: hrmsData.clockInPhoto || null,
              punchOutPhoto: hrmsData.clockOutPhoto || null,
              shift: hrmsData.shift || null
            }
          });
        }
      }
    } catch (hrmsErr) {
      console.warn('[Attendance] HRMS getTodayStatus failed/skipped, using local fallback:', hrmsErr.message);
    }

    // 2. Secondary Fallback: Local Partner DB
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    res.json({
      success: true,
      punchedIn: !!attendance,
      source: 'LOCAL',
      attendance: attendance || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get agent's own attendance history
// @route   GET /api/attendance/my-history
// @access  Private
export const getMyHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    // Default to current month/year IST
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const targetMonth = parseInt(month) || (ist.getMonth() + 1);
    const targetYear = parseInt(year) || ist.getFullYear();

    // Build date range: YYYY-MM-01 to YYYY-MM-31
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`;

    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        lateEntry: {
          include: { exception: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Calculate summary
    const totalDays = records.length;
    const completedDays = records.filter(r => r.status === 'COMPLETED').length;
    const totalHoursWorked = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = completedDays > 0 ? parseFloat((totalHoursWorked / completedDays).toFixed(2)) : 0;

    res.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      summary: {
        totalDays,
        completedDays,
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        avgHours
      },
      records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get all agents' attendance
// @route   GET /api/attendance/all
// @access  Private (Admin)
export const getAllAttendance = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { date, userId: filterUserId, startDate, endDate, storeId: queryStoreId } = req.query;

    const today = getTodayIST();
    const targetDate = date || today;

    // Build where clause
    const where = { tenantId };

    // Store filter logic
    if (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') {
      where.storeId = queryStoreId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    if (filterUserId) where.userId = filterUserId;

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else {
      where.date = targetDate;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
            role: true,
            assignedVehicleId: true,
            assignedVehicle: { select: { vehicleNumber: true, vehicleName: true } }
          }
        }
      },
      orderBy: { punchInTime: 'asc' }
    });

    // Get total agent count for context
    const agentWhere = {
      tenantId,
      role: { in: ['SALES_AGENT', 'VEHICLE_AGENT'] },
      isActive: true
    };
    if (where.storeId) agentWhere.storeId = where.storeId;

    const totalAgents = await prisma.user.count({ where: agentWhere });
    const presentToday = records.length;
    const completedToday = records.filter(r => r.status === 'COMPLETED').length;
    const activeNow = records.filter(r => r.status === 'ACTIVE').length;
    const avgHours = completedToday > 0
      ? parseFloat((records.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + (r.totalHours || 0), 0) / completedToday).toFixed(2))
      : 0;

    res.json({
      success: true,
      date: targetDate,
      summary: {
        totalAgents,
        presentToday,
        absentToday: totalAgents - presentToday,
        activeNow,
        completedToday,
        avgHours
      },
      records
    });
  } catch (error) {
    next(error);
  }
};
