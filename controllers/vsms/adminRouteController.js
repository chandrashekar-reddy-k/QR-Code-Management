import { prisma } from '../../config/prismaClient.js';
import { sendNotification } from '../../services/notificationService.js';
import logger from '../../utils/logger.js';
import { InventoryCache } from '../../utils/cacheHelper.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
import { reevaluatePreOrderAllocations } from './preOrderController.js';
const logActivity = (details) => logger.info(JSON.stringify(details));

// @desc    Create a new route with cycles
// @route   POST /api/admin/routes/create
// @access  Admin
export const createRoute = async (req, res, next) => {
    try {
        const { routeName, villages, cycles } = req.body;
        const tenantId = req.user.tenantId;
        const storeId = getEffectiveStoreId(req);

        if (!routeName || !villages || !cycles) {
            res.status(400);
            throw new Error('All fields are required');
        }

        const route = await prisma.route.create({
            data: {
                routeName,
                villages,
                tenantId,
                storeId,
                cycles: {
                    create: cycles.map(cycle => ({
                        dayOfWeek: cycle.dayOfWeek,
                        villageName: cycle.villageName
                    }))
                }
            },
            include: {
                cycles: true
            }
        });

        await InventoryCache.invalidatePrefix('vsms:routes:');
        res.status(201).json(route);
    } catch (error) {
        next(error);
    }
};

// @desc    Assign a route to a vehicle and executive
// @route   POST /api/admin/routes/assignments
// @access  Admin
export const assignRouteToVehicle = async (req, res, next) => {
    try {
        const { vehicleId, userId, routeId, morningSession, afternoonSession, schedule } = req.body;

        if (!vehicleId || !userId || !routeId) {
            res.status(400);
            throw new Error('Vehicle, User, and Route are required');
        }

        // Deactivate previous active assignment for this vehicle
        await prisma.routeAssignment.updateMany({
            where: {
                vehicleId,
                status: true
            },
            data: {
                status: false
            }
        });

        // Deactivate previous active assignment for this user
        await prisma.routeAssignment.updateMany({
            where: {
                userId,
                status: true
            },
            data: {
                status: false
            }
        });

        // Sync the user's assigned vehicle to match this route assignment
        await prisma.user.updateMany({
            where: { assignedVehicleId: vehicleId },
            data: { assignedVehicleId: null }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { assignedVehicleId: vehicleId }
        });

        const assignment = await prisma.routeAssignment.create({
            data: {
                vehicleId,
                userId,
                routeId,
                status: true,
                morningSession,
                afternoonSession,
                schedule
            },
            include: {
                route: true,
                vehicle: { select: { vehicleNumber: true, vehicleName: true, id: true } },
                user: {
                    select: {
                        name: true,
                        id: true,
                        assignedVehicle: {
                            select: {
                                id: true,
                                vehicleNumber: true,
                                vehicleName: true,
                                storeId: true
                            }
                        }
                    }
                }
            }
        });

        const mappedAssignment = {
            ...assignment,
            vehicle: assignment.user?.assignedVehicle || assignment.vehicle,
            vehicleId: assignment.user?.assignedVehicle?.id || assignment.vehicleId
        };

        // Send notification to the assigned Agent
        sendNotification({
            userIds: [userId],
            title: 'New Route Assigned!',
            message: `You have been assigned to Route: ${assignment.route.routeName} with a specific weekly schedule.`,
            type: 'route',
            priority: 'high',
            metadata: { assignmentId: assignment.id, routeId, vehicleId }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: assignment.vehicle?.storeId || req.user.storeId,
            action: 'ROUTE_ASSIGNED',
            details: `Assigned route "${assignment.route.routeName}" to agent ${assignment.user?.name} with vehicle ${assignment.vehicle?.vehicleNumber}`,
            targetUserId: userId,
            metadata: { routeId, vehicleId, assignmentId: assignment.id }
        });

        // Dynamically re-evaluate pre-order allocations for pending pre-orders matching this route
        reevaluatePreOrderAllocations(req.user.tenantId).catch(err => {
            logger.error('[assignRouteToVehicle] Pre-order re-evaluation error:', err);
        });

        res.status(201).json(mappedAssignment);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a route assignment
// @route   PUT /api/admin/routes/assignments/:id
// @access  Admin
export const updateRouteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, routeId, morningSession, afternoonSession, schedule } = req.body;

        // If userId is updated, we must fetch the new assignedVehicleId for the user
        let vehicleId = req.body.vehicleId;
        if (!vehicleId && userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            vehicleId = user?.assignedVehicleId || undefined;
        }

        // Sync the user's assigned vehicle if both are present
        if (vehicleId && userId) {
            await prisma.user.updateMany({
                where: { assignedVehicleId: vehicleId },
                data: { assignedVehicleId: null }
            });
            await prisma.user.update({
                where: { id: userId },
                data: { assignedVehicleId: vehicleId }
            });
        }

        const assignment = await prisma.routeAssignment.update({
            where: { id },
            data: {
                userId,
                vehicleId,
                routeId,
                morningSession,
                afternoonSession,
                schedule: schedule || undefined
            },
            include: {
                route: true,
                vehicle: { select: { vehicleNumber: true, vehicleName: true, id: true } },
                user: {
                    select: {
                        name: true,
                        id: true,
                        assignedVehicle: {
                            select: {
                                id: true,
                                vehicleNumber: true,
                                vehicleName: true,
                                storeId: true
                            }
                        }
                    }
                }
            }
        });

        const mappedAssignment = {
            ...assignment,
            vehicle: assignment.user?.assignedVehicle || assignment.vehicle,
            vehicleId: assignment.user?.assignedVehicle?.id || assignment.vehicleId
        };

        // Send notification to the updated / existing Agent
        sendNotification({
            userIds: [assignment.userId],
            title: 'Route Assignment Updated',
            message: `Your assignment for Route ${assignment.route.routeName} has been updated with a weekly schedule.`,
            type: 'route',
            priority: 'medium',
            metadata: { assignmentId: assignment.id, routeId: assignment.routeId, vehicleId: assignment.vehicleId }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: assignment.vehicle?.storeId || req.user.storeId,
            action: 'ROUTE_UPDATED',
            details: `Updated route assignment for agent ${assignment.user?.name} on route "${assignment.route.routeName}"`,
            targetUserId: assignment.userId,
            metadata: { assignmentId: assignment.id, routeId: assignment.routeId }
        });

        await InventoryCache.invalidatePrefix('vsms:routes:');

        // Dynamically re-evaluate pre-order allocations for pending pre-orders matching this route
        reevaluatePreOrderAllocations(req.user.tenantId).catch(err => {
            logger.error('[updateRouteAssignment] Pre-order re-evaluation error:', err);
        });

        res.json(mappedAssignment);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all routes
// @route   GET /api/admin/routes
// @access  Admin
export const getAdminRoutes = async (req, res, next) => {
    try {
        const effectiveStoreId = getEffectiveStoreId(req);
        const where = { tenantId: req.user.tenantId };
        
        if (effectiveStoreId) {
            where.storeId = effectiveStoreId;
        }

        const routes = await prisma.route.findMany({
            where,
            include: {
                cycles: true
            }
        });
        res.json(routes);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all active assignments
// @route   GET /api/admin/routes/assignments
// @access  Admin
export const getRouteAssignments = async (req, res, next) => {
    try {
        const effectiveStoreId = getEffectiveStoreId(req);
        const where = { status: true };

        if (effectiveStoreId) {
            where.vehicle = { storeId: effectiveStoreId };
        }

        const assignments = await prisma.routeAssignment.findMany({
            where,
            include: {
                route: true,
                vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true, storeId: true } },
                user: {
                    select: {
                        name: true,
                        assignedVehicle: {
                            select: {
                                id: true,
                                vehicleNumber: true,
                                vehicleName: true,
                                storeId: true
                            }
                        }
                    }
                }
            }
        });

        const mappedAssignments = assignments.map(a => {
            const mappedVehicle = a.user?.assignedVehicle || a.vehicle;
            return {
                ...a,
                vehicle: mappedVehicle,
                vehicleId: mappedVehicle?.id || a.vehicleId
            };
        });
        res.json(mappedAssignments);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a route
// @route   PUT /api/admin/routes/:id
// @access  Admin
export const updateRoute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { routeName, villages, cycles } = req.body;

        // Update route and its cycles (re-create cycles for simplicity in v1.2)
        const updated = await prisma.$transaction(async (tx) => {
            if (cycles) {
                await tx.routeCycle.deleteMany({ where: { routeId: id } });
            }

            return await tx.route.update({
                where: { id },
                data: {
                    routeName,
                    villages,
                    cycles: cycles ? {
                        create: cycles.map(c => ({
                            dayOfWeek: c.dayOfWeek,
                            villageName: c.villageName
                        }))
                    } : undefined
                },
                include: { cycles: true }
            });
        });

        await InventoryCache.invalidatePrefix('vsms:routes:');
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a route
// @route   DELETE /api/admin/routes/:id
// @access  Admin
export const deleteRoute = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        await prisma.$transaction([
            prisma.routeCycle.deleteMany({ where: { routeId: id } }),
            prisma.routeAssignment.deleteMany({ where: { routeId: id } }),
            prisma.route.delete({ where: { id } })
        ]);

        await InventoryCache.invalidatePrefix('vsms:routes:');
        res.json({ message: 'Route deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete/Deactivate assignment
// @route   DELETE /api/admin/routes/assignments/:id
// @access  Admin
export const deleteRouteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await prisma.routeAssignment.findUnique({
            where: { id },
            include: { route: true, user: true }
        });

        await prisma.routeAssignment.delete({ where: { id } });

        if (assignment) {
            logActivity({
                userId: req.user.id,
                tenantId: req.user.tenantId,
                action: 'ROUTE_REMOVED',
                details: `Removed route assignment for agent ${assignment.user?.name} from route "${assignment.route?.routeName}"`,
                targetUserId: assignment.userId,
                metadata: { assignmentId: id }
            });
        }

        await InventoryCache.invalidatePrefix('vsms:routes:');
        res.json({ message: 'Assignment successfully deleted' });
    } catch (error) {
        next(error);
    }
};

const DEFAULT_LOADING_RULES = [
    {
        shiftType: 'MORNING',
        shiftName: 'Morning Slot',
        loadingTime: '07:00',
        cutoffMinutes: 60,
        maxOrders: 50,
        deliveryStartTime: '07:30',
        deliveryEndTime: '12:30',
        isActive: true,
        notes: 'Vehicle loads at 07:00 AM. Customer orders cutoff at 06:00 AM. Limit: 50 orders.'
    },
    {
        shiftType: 'AFTERNOON',
        shiftName: 'Afternoon / Evening Slot',
        loadingTime: '15:00',
        cutoffMinutes: 60,
        maxOrders: 50,
        deliveryStartTime: '16:00',
        deliveryEndTime: '20:00',
        isActive: true,
        notes: 'Vehicle loads at 03:00 PM. Customer orders cutoff at 02:00 PM. Limit: 50 orders.'
    }
];

// @desc    Get shift loading times & 1-hour cutoff rules
// @route   GET /api/vsms/routes/loading-rules
// @access  Admin/Partner
export const getRouteLoadingRules = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId || 'VK001';
        const storeId = getEffectiveStoreId(req);

        const configs = await prisma.shiftConfig.findMany({
            where: {
                tenantId
            },
            orderBy: { createdAt: 'asc' }
        });

        if (configs && configs.length > 0) {
            const rules = configs.map(c => {
                const sess = c.sessions || {};
                return {
                    id: c.id,
                    shiftType: c.shiftType || 'MORNING',
                    shiftName: c.shiftName || (c.shiftType === 'AFTERNOON' ? 'Evening Shift' : 'Morning Shift'),
                    loadingTime: sess.loadingTime || c.startTime || '07:00',
                    cutoffMinutes: Number(sess.cutoffMinutes ?? 60),
                    maxOrders: Number(sess.maxOrders ?? sess.orderLimit ?? 50),
                    deliveryStartTime: sess.deliveryStartTime || c.startTime || '07:30',
                    deliveryEndTime: sess.deliveryEndTime || c.endTime || '12:30',
                    isActive: Boolean(c.isActive),
                    notes: sess.notes || ''
                };
            });
            return res.json({ success: true, rules, storeId });
        }

        return res.json({ success: true, rules: DEFAULT_LOADING_RULES, storeId });
    } catch (error) {
        console.error('[RouteLoadingRules] Error:', error);
        next(error);
    }
};

// @desc    Save/Update shift loading times & cutoff rules
// @route   POST /api/vsms/routes/loading-rules
// @access  Admin
export const saveRouteLoadingRules = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId || 'VK001';
        const { rules } = req.body;

        if (!Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ message: 'Rules array is required' });
        }

        const savedRules = [];
        const incomingIds = rules.map(r => r.id).filter(id => id && !id.startsWith('temp_'));

        // If specific custom shifts were removed in the UI, remove them from the DB
        if (incomingIds.length > 0) {
            await prisma.shiftConfig.deleteMany({
                where: {
                    tenantId,
                    id: { notIn: incomingIds }
                }
            });
        }

        for (const rule of rules) {
            const { id, shiftType, shiftName, loadingTime, cutoffMinutes, maxOrders, orderLimit, deliveryStartTime, deliveryEndTime, isActive } = rule;
            const isShiftActive = typeof isActive === 'boolean' ? isActive : isActive !== 'false' && isActive !== false;

            const payload = {
                tenantId,
                shiftType: shiftType || 'MORNING',
                shiftName: shiftName || (shiftType === 'AFTERNOON' ? 'Evening Shift' : 'Morning Shift'),
                startTime: deliveryStartTime || '07:30',
                endTime: deliveryEndTime || '12:30',
                isActive: isShiftActive,
                sessions: {
                    loadingTime: loadingTime || '07:00',
                    cutoffMinutes: Number(cutoffMinutes ?? 60),
                    maxOrders: Number(maxOrders ?? orderLimit ?? 50),
                    deliveryStartTime: deliveryStartTime || '07:30',
                    deliveryEndTime: deliveryEndTime || '12:30',
                    notes: rule.notes || ''
                }
            };

            if (id && !id.startsWith('temp_')) {
                const updated = await prisma.shiftConfig.update({
                    where: { id },
                    data: payload
                });
                savedRules.push(updated);
            } else {
                const created = await prisma.shiftConfig.create({
                    data: payload
                });
                savedRules.push(created);
            }
        }

        await InventoryCache.invalidatePrefix('vsms:routes:');
        res.json({ success: true, message: 'Loading, cutoff rules, and order limits updated successfully', rules: savedRules });
    } catch (error) {
        console.error('[SaveRouteLoadingRules] Error:', error);
        next(error);
    }
};

// @desc    Get currently open delivery slots based on loading time and cutoff buffer
// @route   GET /api/vsms/routes/available-slots
// @access  Public/Private
export const getAvailableDeliverySlots = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId || 'VK001';
        const dateParam = req.query.date || new Date().toISOString().split('T')[0];

        // Fetch shift configs or default
        const configs = await prisma.shiftConfig.findMany({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'asc' }
        });

        const rules = (configs && configs.length > 0)
            ? configs.map(c => ({
                id: c.id,
                shiftType: c.shiftType,
                shiftName: c.shiftName,
                loadingTime: c.sessions?.loadingTime || '07:00',
                cutoffMinutes: Number(c.sessions?.cutoffMinutes ?? 60),
                deliveryStartTime: c.sessions?.deliveryStartTime || c.startTime || '07:30',
                deliveryEndTime: c.sessions?.deliveryEndTime || c.endTime || '12:30',
                isActive: c.isActive
            }))
            : DEFAULT_LOADING_RULES;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = dateParam === todayStr;

        // Current local hour and minute (assuming IST / local time)
        const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

        const evaluatedSlots = rules.map(r => {
            const [loadHour, loadMin] = (r.loadingTime || '07:00').split(':').map(Number);
            const loadingMinutesOfDay = loadHour * 60 + (loadMin || 0);
            const cutoffMinutesOfDay = loadingMinutesOfDay - (r.cutoffMinutes || 60);

            let isOpen = true;
            let statusMessage = 'Available for booking';
            let minutesRemaining = null;

            if (isToday) {
                if (currentMinutesOfDay >= cutoffMinutesOfDay) {
                    isOpen = false;
                    const cutoffHour = Math.floor(cutoffMinutesOfDay / 60);
                    const cutoffMin = cutoffMinutesOfDay % 60;
                    const formattedCutoff = `${cutoffHour % 12 || 12}:${cutoffMin.toString().padStart(2, '0')} ${cutoffHour >= 12 ? 'PM' : 'AM'}`;
                    statusMessage = `Booking closed for today (Cutoff was ${formattedCutoff} - 1 hr before ${r.loadingTime} vehicle loading)`;
                } else {
                    minutesRemaining = cutoffMinutesOfDay - currentMinutesOfDay;
                    statusMessage = `Booking closes in ${minutesRemaining} mins`;
                }
            }

            return {
                ...r,
                date: dateParam,
                isOpen,
                statusMessage,
                minutesRemaining,
                displayWindow: `${r.deliveryStartTime} - ${r.deliveryEndTime}`
            };
        });

        res.json({
            success: true,
            date: dateParam,
            isToday,
            slots: evaluatedSlots,
            openSlots: evaluatedSlots.filter(s => s.isOpen)
        });
    } catch (error) {
        console.error('[AvailableSlots] Error:', error);
        next(error);
    }
};
