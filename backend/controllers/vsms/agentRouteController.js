import { prisma } from '../../config/prismaClient.js';
import { format, addDays } from 'date-fns';
const reverseGeocode = async () => 'VSMS Location';
import { getShiftsConfig } from './shiftController.js';

// Helper: get all active vehicle assignments (used by cron)
export const getAllActiveAssignments = async () => {
    return await prisma.routeAssignment.findMany({
        where: { status: true },
        include: {
            route: true,
            vehicle: { select: { id: true, vehicleNumber: true } },
            user: { select: { id: true, name: true, mobile: true } }
        }
    });
};

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to get plan for a specific date and vehicle
export const fetchPlanForVehicle = async (vehicleId, targetDate = new Date()) => {
    if (!vehicleId) return null;

    // 1. Fetch active route assignment for vehicle
    const assignment = await prisma.routeAssignment.findFirst({
        where: {
            vehicleId,
            status: true
        },
        include: {
            route: true
        }
    });

    if (!assignment) return null;

    // 2. Exclude Sundays as no-plan days
    const dayName = days[targetDate.getDay()];
    if (dayName === 'Sunday') {
        return { routeId: assignment.routeId, routeName: assignment.route.routeName, noVillage: true };
    }

    // 3. Extract sessions from schedule (JSON) or legacy session fields
    let morning = "";
    let evening = "";
    const hasWeeklySchedule = assignment.schedule && typeof assignment.schedule === 'object' && Object.keys(assignment.schedule).length > 0;

    if (hasWeeklySchedule) {
        const todaySchedule = assignment.schedule[dayName];
        morning = todaySchedule?.morning || "";
        evening = todaySchedule?.evening || "";
    } else {
        // Fallback only if no weekly schedule exists at all
        morning = assignment.morningSession || "";
        evening = assignment.afternoonSession || "";
        const routeVillages = Array.isArray(assignment.route?.villages) ? assignment.route.villages : [];
        if (!morning && !evening && routeVillages.length > 0) {
            morning = routeVillages[0] || "";
            evening = routeVillages[1] || routeVillages[0] || "";
        }
    }

    const routeVillages = Array.isArray(assignment.route?.villages) ? assignment.route.villages : [];
    const isNoVillage = !morning && !evening;

    // 5. Resolve village names to objects with IDs for the agent app
    const villageNames = [morning, evening].filter(v => v && v !== 'No Task');
    // Also fetch all route villages for the checklist
    const allVillageNames = [...new Set([...villageNames, ...routeVillages])].filter(Boolean);
    const villageObjects = await prisma.village.findMany({
        where: {
            name: { in: allVillageNames.length > 0 ? allVillageNames : villageNames },
            tenantId: assignment.tenantId
        },
        select: { id: true, name: true, latitude: true, longitude: true }
    });

    const villageNameStr = isNoVillage
        ? "No Task"
        : (morning === evening ? morning : (morning && evening ? `${morning} / ${evening}` : (morning || evening)));

    // Build a village checklist from all route villages
    const villageChecklist = routeVillages.map(name => {
        const obj = villageObjects.find(v => v.name === name);
        return { name, id: obj?.id, lat: obj?.latitude, lon: obj?.longitude, visited: false };
    });

    return {
        routeId: assignment.routeId,
        villageId: villageObjects.find(v => v.name === (morning || evening))?.id, // Primary village ID
        villageName: villageNameStr,
        routeName: assignment.route?.routeName || '',
        villages: routeVillages,
        villageChecklist,
        morning: morning || "No Task",
        morningId: villageObjects.find(v => v.name === morning)?.id,
        evening: evening || "No Task",
        eveningId: villageObjects.find(v => v.name === evening)?.id,
        noVillage: isNoVillage,
        schedule: assignment.schedule || null
    };
};

// @desc    Get Today's Plan for a vehicle
// @route   GET /api/routes/today-plan
// @access  Private
export const getTodayPlan = async (req, res, next) => {
    try {
        const vehicleId = req.query.vehicleId || req?.user?.assignedVehicleId;
        if (!vehicleId) {
            return res.json({ message: 'No Vehicle Assigned', noVillage: true, vehicleAssigned: false });
        }

        const plan = await fetchPlanForVehicle(vehicleId);
        if (!plan) return res.json({ message: "No Plan Available" });

        res.json(plan);
    } catch (error) {
        console.error('[TodayPlan] CRASH:', error);
        next(error);
    }
};

// @desc    Get Tomorrow's Plan for a vehicle
// @route   GET /api/routes/tomorrow-plan
// @access  Private
export const getTomorrowPlan = async (req, res, next) => {
    try {
        const vehicleId = req.query.vehicleId || req?.user?.assignedVehicleId;
        if (!vehicleId) {
            return res.json({ message: 'No Vehicle Assigned', noVillage: true, vehicleAssigned: false });
        }

        const tomorrow = addDays(new Date(), 1);
        const plan = await fetchPlanForVehicle(vehicleId, tomorrow);
        if (!plan) return res.json({ message: "No Plan Available" });

        res.json(plan);
    } catch (error) {
        console.error('[TomorrowPlan] CRASH:', error);
        next(error);
    }
};

// Utility for coverage type determination
// Helper: Get shifts configuration for the current store/tenant
// (Moved to shiftController.js)

export const getCoverageType = (date = new Date()) => {
    const hours = date.getHours();
    return hours < 14 ? 'MORNING' : 'EVENING'; // Legacy split
};

// @desc    Mark morning/evening coverage as done for a vehicle
// @route   POST /api/routes/mark-coverage
// @access  Private
export const markCoverage = async (req, res, next) => {
    try {
        const { slot, shiftId, shiftName } = req.body; // Support both legacy slot and new shiftId/Name
        const vehicleId = req.user.assignedVehicleId;
        const tenantId = req.user.tenantId;
        const storeId = req.user.storeId;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId) {
            res.status(400);
            throw new Error('No vehicle assigned to this user');
        }

        // Get current plan for today
        const plan = await fetchPlanForVehicle(vehicleId);
        if (!plan || plan.noVillage) {
            res.status(400);
            throw new Error('No active plan for today');
        }

        // Fetch shifts to validate and map
        const shifts = await getShiftsConfig(tenantId, storeId);
        const activeShift = shifts.find(s => s.id === shiftId || s.name === shiftName || s.name.toUpperCase() === slot);

        const effectiveShiftName = activeShift ? activeShift.name : slot;

        if (!effectiveShiftName || typeof effectiveShiftName !== 'string') {
            console.error('[MarkCoverage] Invalid Shift Name:', { effectiveShiftName, slot, shiftId, shiftName });
            res.status(400);
            throw new Error('Valid shift name or slot is required');
        }

        // Upsert DailyCoverage record
        const existing = await prisma.dailyCoverage.findUnique({
            where: { vehicleId_date: { vehicleId, date: dateString } }
        });

        let shiftStatus = existing?.shiftStatus || {};
        if (typeof shiftStatus !== 'object') shiftStatus = {};

        // Mark the specific shift as done
        shiftStatus[effectiveShiftName] = true;

        // Map back to legacy morning/evening if applicable for compatibility
        const morningDone = effectiveShiftName.toUpperCase() === 'MORNING' || !!shiftStatus['Morning'];
        const eveningDone = effectiveShiftName.toUpperCase() === 'EVENING' || !!shiftStatus['Evening'];

        // Calculate overall status
        const allDone = shifts && shifts.length > 0 ? shifts.every(s => shiftStatus[s.name]) : true;
        const coverageStatus = allDone ? 'BOTH_DONE' : (Object.keys(shiftStatus).length > 0 ? 'PARTIAL' : 'PENDING');

        const coverage = await prisma.dailyCoverage.upsert({
            where: { vehicleId_date: { vehicleId, date: dateString } },
            update: {
                status: coverageStatus,
                shiftStatus: shiftStatus,
                morningDone,
                eveningDone,
                villageName: plan.villageName,
                routeId: plan.routeId,
            },
            create: {
                vehicleId,
                date: dateString,
                villageName: plan.villageName,
                routeId: plan.routeId,
                status: coverageStatus,
                shiftStatus: shiftStatus,
                morningDone,
                eveningDone,
            }
        });

        res.json({ success: true, coverage });
    } catch (error) {
        console.error('markCoverage error:', error);
        next(error);
    }
};

// @desc    Get today's coverage status for a vehicle
// @route   GET /api/routes/coverage-status
// @access  Private
export const getCoverageStatus = async (req, res, next) => {
    try {
        let vehicleId = req.user.assignedVehicleId;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const storeId = req.user.storeId;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        if (!vehicleId) {
            const activeAssignment = await prisma.routeAssignment.findFirst({
                where: { userId, status: true },
                select: { vehicleId: true }
            });
            if (activeAssignment) {
                vehicleId = activeAssignment.vehicleId;
            }
        }

        if (!vehicleId) return res.json({ vehicleAssigned: false });

        const [coverage, checkIn, shifts, vehicle] = await Promise.all([
            prisma.dailyCoverage.findUnique({
                where: { vehicleId_date: { vehicleId, date: dateString } }
            }),
            prisma.locationCheckIn.findFirst({
                where: { userId, date: dateString },
                orderBy: { createdAt: 'desc' }
            }),
            getShiftsConfig(tenantId, storeId),
            prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: { id: true, vehicleNumber: true, vehicleName: true }
            })
        ]);

        const plan = await fetchPlanForVehicle(vehicleId);

        // Find next working day with a plan
        let nextPlan = null;
        let nextPlanDate = null;
        for (let i = 1; i <= 6; i++) {
            const futureDate = addDays(new Date(), i);
            const result = await fetchPlanForVehicle(vehicleId, futureDate);
            if (result && !result.noVillage && !result.message) {
                nextPlan = result;
                nextPlanDate = format(futureDate, 'EEEE, MMM d');
                break;
            }
        }

        res.json({
            vehicleAssigned: true,
            vehicleId,
            vehicleNumber: vehicle?.vehicleNumber || null,
            vehicleName: vehicle?.vehicleName || null,
            today: plan,
            tomorrow: nextPlan,
            tomorrowLabel: nextPlanDate || 'Tomorrow',
            schedule: plan?.schedule || null,
            coverage: coverage || { morningDone: false, eveningDone: false, shiftStatus: {}, status: 'PENDING' },
            shifts: shifts, // Include dynamic shifts in response
            checkIn: checkIn || null
        });

    } catch (error) {
        console.error('getCoverageStatus error:', error);
        next(error);
    }
};

// @desc    Get user notifications
// @route   GET /api/routes/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.notification.count({
                where: { userId, isRead: false }
            }),
            prisma.notification.count({
                where: { userId }
            })
        ]);

        res.json({ notifications, unreadCount, total, page, limit });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   POST /api/routes/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all notifications as read
// @route   POST /api/routes/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
// @desc    Check-in location when reaching target
// @route   POST /api/routes/location-check-in
// @access  Private
export const locationCheckIn = async (req, res, next) => {
    try {
        const { latitude, longitude, villageName } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenantId || "VK001";
        const dateString = format(new Date(), 'yyyy-MM-dd');
        const now = new Date();
        const currentTimeStr = format(now, 'HH:mm');

        // Dynamic Status Calculation based on Shift
        let status = "LATE";

        // 1. Find active shift
        const activeShift = await prisma.shiftLog.findFirst({
            where: { userId, date: dateString, status: 'STARTED' }
        });

        if (activeShift) {
            const shifts = await getShiftsConfig(tenantId, req.user.storeId);
            const shiftConfig = shifts.find((s, idx) =>
                s.id === activeShift.shift ||
                s.id === `shift_${activeShift.shift}` ||
                (idx + 1) === activeShift.shift
            );

            if (shiftConfig && shiftConfig.startTime) {
                // threshold = start time + 60 minutes (1 hour grace period)
                const [sHour, sMin] = shiftConfig.startTime.split(':').map(Number);
                const thresholdTime = new Date(now);
                thresholdTime.setHours(sHour, sMin, 0, 0);
                thresholdTime.setMinutes(thresholdTime.getMinutes() + 60); // + 60 minutes

                if (now <= thresholdTime) {
                    status = "ON_TIME";
                }
            }
        } else {
            // Legacy fallback: within 1 hour of typical 8:00 AM start
            const hour = now.getHours();
            status = (hour >= 6 && hour <= 9) ? "ON_TIME" : "LATE";
        }

        // Validate location match (Fuzzy)
        let isLocationMatched = true;
        let village = await prisma.village.findFirst({
            where: { name: villageName, tenantId }
        });

        if (!village) {
            // Fallback: Try a slightly looser match
            village = await prisma.village.findFirst({
                where: {
                    name: { contains: (villageName || '').split(/[\s&/]+/)[0], mode: 'insensitive' },
                    tenantId
                }
            });
        }

        if (village && village.latitude && village.longitude) {
            const distance = getDistance(latitude, longitude, village.latitude, village.longitude);
            if (distance > 5000) { // 5km threshold (covers the whole village area)
                isLocationMatched = false;
            }
        }

        const subLocation = await reverseGeocode(latitude, longitude);

        let checkIn;
        try {
            checkIn = await prisma.locationCheckIn.create({
                data: {
                    tenantId,
                    userId,
                    date: dateString,
                    latitude,
                    longitude,
                    villageName,
                    subLocation,
                    status,
                    isLocationMatched,
                    time: now
                }
            });
        } catch (prismaError) {
            if (prismaError.message.includes('Unknown argument') && prismaError.message.includes('subLocation')) {
                console.warn('[RouteControl] subLocation missing in DB, retrying without it.');
                checkIn = await prisma.locationCheckIn.create({
                    data: {
                        tenantId,
                        userId,
                        date: dateString,
                        latitude,
                        longitude,
                        villageName,
                        status,
                        isLocationMatched,
                        time: now
                    }
                });
            } else {
                throw prismaError;
            }
        }

        res.json({ success: true, checkIn });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all location check-ins for admin
// @route   GET /api/routes/all-location-check-ins
// @access  Private/Admin
export const getAllLocationCheckIns = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId || "VK001";
        let checkIns;
        try {
            checkIns = await prisma.locationCheckIn.findMany({
                where: { tenantId },
                include: { user: { select: { name: true, email: true, storeId: true } } },
                orderBy: { createdAt: 'desc' }
            });
        } catch (prismaError) {
            if (prismaError.message.includes('column') && prismaError.message.includes('subLocation')) {
                console.warn('[RouteControl] subLocation missing in DB, falling back.');
                checkIns = await prisma.locationCheckIn.findMany({
                    where: { tenantId },
                    include: { user: { select: { name: true, email: true, storeId: true } } },
                    orderBy: { createdAt: 'desc' }
                });
            } else {
                throw prismaError;
            }
        }
        res.json(checkIns);
    } catch (error) {
        next(error);
    }
};

// Helper: calculate distance between two points in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

// @desc    Get Scheduled Deliveries for assigned route
// @route   GET /api/v1/agent/routes/scheduled-deliveries
// @access  Private
export const getScheduledDeliveries = async (req, res, next) => {
    try {
        const isAgent = ["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT"].includes(req.user.role?.toUpperCase());

        if (!isAgent) {
            // Priority: 1. query parameter, 2. user's assigned warehouse
            let warehouseId = req.query.warehouseId || req.user.warehouseId || null;
            if (req.query.warehouseId === 'all') {
                warehouseId = null;
            }

            console.log('[DEBUG] getScheduledDeliveries Admin/Partner mode. User ID:', req.user.id, 'Role:', req.user.role, 'Target WarehouseId:', warehouseId);

            // Fetch active route assignments
            const assignments = await prisma.routeAssignment.findMany({
                where: {
                    status: true,
                    ...(warehouseId ? {
                        route: {
                            storeId: warehouseId
                        }
                    } : {})
                },
                include: {
                    route: true,
                    vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                    user: { select: { id: true, name: true, phone: true } }
                }
            });

            // Fetch scheduled orders
            const orders = await prisma.order.findMany({
                where: {
                    ...(warehouseId ? { warehouseId } : {}), // only this warehouse if selected
                    OR: [
                        { deliverySlot: { not: null } },
                        { routeId: { not: null } },
                        { vehicleId: { not: null } },
                        { agentId: { not: null } }
                    ],
                    status: {
                        in: ['PACKED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED']
                    }
                },
                include: {
                    address: true,
                    route: true,
                    consumer: { select: { id: true, name: true, phone: true } },
                    customer: { select: { id: true, name: true, mobile: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, images: true } }
                        }
                    }
                },
                orderBy: {
                    deliveryDate: 'asc'
                }
            });

            // Fetch all warehouses for the dropdown in Admin panel
            const warehouses = await prisma.warehouse.findMany({
                select: {
                    id: true,
                    name: true
                }
            });

            return res.json({
                success: true,
                isAdmin: true,
                warehouseId,
                warehouses,
                assignments: assignments.map(a => ({
                    id: a.id,
                    route: a.route,
                    vehicle: a.vehicle,
                    agent: a.user
                })),
                deliveries: orders
            });
        }

        const userId = req.user.id;

        // 1. Fetch active route assignment for the logged-in agent
        const assignment = await prisma.routeAssignment.findFirst({
            where: {
                userId,
                status: true
            },
            include: {
                route: true,
                vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
            }
        });

        if (!assignment) {
            return res.json({
                success: true,
                message: 'No active route assignment found for this agent.',
                deliveries: []
            });
        }

        // 2. Fetch packed/scheduled customer orders matching assigned route, vehicle, or agent
        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { vehicleId: assignment.vehicleId },
                    { agentId: userId },
                    { routeId: assignment.routeId }
                ],
                status: {
                    in: ['PACKED', 'READY_FOR_PICKUP', 'CONFIRMED', 'PROCESSING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED']
                }
            },
            include: {
                address: true,
                consumer: { select: { id: true, name: true, phone: true } },
                customer: { select: { id: true, name: true, mobile: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, images: true } }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            route: {
                id: assignment.route.id,
                routeName: assignment.route.routeName,
                description: assignment.route.description
            },
            vehicle: assignment.vehicle,
            deliveries: orders
        });

    } catch (error) {
        console.error('[AgentScheduledDeliveries] Error:', error);
        next(error);
    }
};

// @route   PUT /api/v1/vsms/agent-routes/scheduled-deliveries/:orderId/status
// @access  Private
export const updateScheduledDeliveryStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const validStatuses = ['DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'];
        if (!validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid status update for scheduled delivery' });
        }

        const updateData = {
            status: status.toUpperCase()
        };

        if (status.toUpperCase() === 'DELIVERED') {
            updateData.deliveredAt = new Date();
            updateData.paymentStatus = 'PAID'; // Assumes delivery implies payment completion if not COD
        } else if (status.toUpperCase() === 'CANCELLED') {
            updateData.cancelledAt = new Date();
            updateData.cancellationReason = reason || 'Cancelled by agent';
        } else if (status.toUpperCase() === 'FAILED') {
            updateData.failureReason = reason || 'Delivery attempt failed';
        }

        const order = await prisma.order.update({
            where: { id: orderId },
            data: updateData
        });

        res.json({
            success: true,
            message: `Order status updated to ${status} successfully.`,
            order
        });

    } catch (error) {
        console.error('[UpdateScheduledDeliveryStatus] Error:', error);
        next(error);
    }
};


