import prisma from '../../utils/prisma.js';
import { sendNotification } from '../../services/notificationService.js';
import { logActivity } from '../../utils/activityLogger.js';
import { getEffectiveStoreId } from '../../../utils/storeResolution.js';
import { reevaluatePreOrderAllocations } from '../preOrderController.js';

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
            console.error('[assignRouteToVehicle] Pre-order re-evaluation error:', err);
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

        // Dynamically re-evaluate pre-order allocations for pending pre-orders matching this route
        reevaluatePreOrderAllocations(req.user.tenantId).catch(err => {
            console.error('[updateRouteAssignment] Pre-order re-evaluation error:', err);
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

        res.json({ message: 'Assignment removed' });
    } catch (error) {
        next(error);
    }
};
