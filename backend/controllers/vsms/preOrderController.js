import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { PriceResolverService } from '../../services/priceResolverService.js';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

const generatePreOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `PRE-${timestamp}-${random}`;
};

/**
 * Helper: Find tomorrow's or target date's vehicle & route assignment for a given village
 */
const findDeliveryVehicleForVillage = async (villageName, deliveryDate, storeId) => {
    if (!villageName || !villageName.trim()) return { vehicleId: null, routeId: null, agentId: null };

    try {
        const targetDate = new Date(deliveryDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[targetDate.getDay()];
        const dayUpper = dayName.toUpperCase();
        const targetVillage = villageName.trim().toLowerCase();

        // Step 1: Find the legitimate Route that contains this village in route.villages
        const allRoutes = await prisma.route.findMany({
            where: { status: true }
        });

        // Exact or strong inclusion match on route.villages
        const matchingRoute = allRoutes.find(r =>
            Array.isArray(r.villages) &&
            r.villages.some(v => {
                const normV = v.trim().toLowerCase();
                return normV === targetVillage || normV.includes(targetVillage) || targetVillage.includes(normV);
            })
        );

        if (matchingRoute) {
            // Find active route assignment for THIS specific route
            const routeAssignments = await prisma.routeAssignment.findMany({
                where: {
                    routeId: matchingRoute.id,
                    status: true
                },
                include: {
                    vehicle: { select: { id: true, vehicleNumber: true } },
                    user: { select: { id: true, name: true } }
                }
            });

            if (routeAssignments.length > 0) {
                // If multiple assignments, pick one that visits target village on this weekday schedule
                const scheduleMatch = routeAssignments.find(a => {
                    if (a.schedule && typeof a.schedule === 'object') {
                        const dayPlan = a.schedule[dayName] || a.schedule[dayUpper];
                        if (dayPlan) {
                            const m = (dayPlan.morning || '').trim().toLowerCase();
                            const e = (dayPlan.evening || '').trim().toLowerCase();
                            return (m && (m === targetVillage || m.includes(targetVillage) || targetVillage.includes(m))) ||
                                   (e && (e === targetVillage || e.includes(targetVillage) || targetVillage.includes(e)));
                        }
                    }
                    return false;
                });

                const chosen = scheduleMatch || routeAssignments[0];
                return {
                    vehicleId: chosen.vehicleId,
                    routeId: matchingRoute.id,
                    agentId: chosen.userId
                };
            }

            return { vehicleId: null, routeId: matchingRoute.id, agentId: null };
        }

        // Step 2: Fallback to RouteCycle
        const routeCycle = await prisma.routeCycle.findFirst({
            where: {
                dayOfWeek: dayUpper,
                villageName: { contains: villageName.trim(), mode: 'insensitive' }
            },
            include: { route: true }
        });

        if (routeCycle?.routeId) {
            const assignment = await prisma.routeAssignment.findFirst({
                where: { routeId: routeCycle.routeId, status: true }
            });
            if (assignment) {
                return {
                    vehicleId: assignment.vehicleId,
                    routeId: routeCycle.routeId,
                    agentId: assignment.userId
                };
            }
            return { vehicleId: null, routeId: routeCycle.routeId, agentId: null };
        }
    } catch (err) {
        logger.error('[findDeliveryVehicleForVillage] Error matching vehicle:', err);
    }

    return { vehicleId: null, routeId: null, agentId: null };
};

/**
 * Helper: Re-evaluate and dynamically sync vehicle & agent allocations for all pending/upcoming pre-orders
 * Call this whenever route assignments, schedules, or vehicle-route links are modified.
 */
export const reevaluatePreOrderAllocations = async (tenantId = 'VK001') => {
    try {
        const pendingOrders = await prisma.preOrder.findMany({
            where: {
                tenantId,
                status: { in: ['RECEIVED', 'CONFIRMED'] }
            }
        });

        for (const order of pendingOrders) {
            if (order.villageName) {
                const match = await findDeliveryVehicleForVillage(order.villageName, order.deliveryDate, order.storeId);
                if (match.vehicleId && (match.vehicleId !== order.assignedVehicleId || match.agentId !== order.assignedAgentId || match.routeId !== order.assignedRouteId)) {
                    await prisma.preOrder.update({
                        where: { id: order.id },
                        data: {
                            assignedVehicleId: match.vehicleId,
                            assignedRouteId: match.routeId || order.assignedRouteId,
                            assignedAgentId: match.agentId || order.assignedAgentId,
                            updatedAt: new Date()
                        }
                    });
                }
            }
        }
    } catch (err) {
        logger.error('[reevaluatePreOrderAllocations] Error syncing allocations:', err);
    }
};

/**
 * @desc    Create a new Pre-Order (Agent or Partner)
 * @route   POST /api/v1/agent/pre-orders OR POST /api/v1/vsms/pre-orders
 * @access  Private
 */
export const createPreOrder = async (req, res, next) => {
    try {
        const {
            customerMobile,
            customerName,
            villageName,
            deliveryAddress,
            landmark,
            deliveryDate,
            deliverySlot,
            catalogItems = [],
            customNotes = '',
            receiptImageUrl = null,
            advanceAmount = 0,
            advancePaymentMode = 'NONE', // CASH, UPI, NONE
            assignedVehicleId,
            assignedRouteId,
            source: reqSource
        } = req.body;

        const tenantId = req.user?.tenantId || 'VK001';
        const isAgent = ["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT"].includes(req.user?.role?.toUpperCase());
        const bookedByAgentId = isAgent ? req.user?.id : null;
        const bookedFromVehicleId = isAgent ? (req.user?.assignedVehicleId || req.user?.assignedVehicle?.id || null) : null;
        const source = reqSource || (isAgent ? 'VEHICLE_AGENT' : 'PARTNER_PORTAL');

        if (!customerMobile || !customerName) {
            return res.status(400).json({
                success: false,
                message: 'Customer mobile and name are required'
            });
        }

        if (!deliveryDate) {
            return res.status(400).json({
                success: false,
                message: 'Delivery date is required'
            });
        }

        const hasCustom = Boolean((customNotes && customNotes.trim().length > 0) || receiptImageUrl);
        const hasCatalog = Array.isArray(catalogItems) && catalogItems.length > 0;

        if (!hasCustom && !hasCatalog) {
            return res.status(400).json({
                success: false,
                message: 'Please add at least one catalog item or a word-of-mouth note/receipt'
            });
        }

        // Store resolution
        let storeId = req.user?.warehouseId || req.user?.storeId || null;
        if (!storeId && bookedFromVehicleId) {
            const v = await prisma.vehicle.findUnique({
                where: { id: bookedFromVehicleId },
                select: { storeId: true }
            });
            storeId = v?.storeId || null;
        }

        // 1. Customer Upsert/Link
        let customer = await prisma.customer.findFirst({
            where: { tenantId, mobile: customerMobile.trim() }
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    tenantId,
                    storeId,
                    name: customerName.trim(),
                    mobile: customerMobile.trim(),
                    address: deliveryAddress || landmark || villageName || null,
                    segment: 'REGULAR'
                }
            });
        } else if (villageName || deliveryAddress) {
            // Update address if provided
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    name: customerName.trim() || customer.name,
                    address: deliveryAddress || customer.address || villageName || null
                }
            });
        }

        // 2. Process catalog items & calculate estimated total
        let subtotal = 0;
        const preOrderItemsData = [];

        if (hasCatalog) {
            const productIds = catalogItems.map(i => i.productId).filter(Boolean);
            const variantIds = catalogItems.map(i => i.productVariantId).filter(Boolean);

            const [products, variants] = await Promise.all([
                productIds.length > 0 ? prisma.product.findMany({ where: { id: { in: productIds } } }) : [],
                variantIds.length > 0 ? prisma.productVariant.findMany({ where: { id: { in: variantIds } } }) : []
            ]);

            const productMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
            const variantMap = variants.reduce((acc, v) => { acc[v.id] = v; return acc; }, {});

            for (const item of catalogItems) {
                const prod = productMap[item.productId];
                const variant = item.productVariantId ? variantMap[item.productVariantId] : null;

                let unitPrice = Number(item.unitPrice || 0);
                if (!unitPrice && prod) {
                    const resolved = await PriceResolverService.resolvePrice({
                        productId: prod.id,
                        productVariantId: variant?.id || null,
                        channel: 'POS',
                        partnerId: req.user.id
                    });
                    unitPrice = Number(resolved.sellingPrice || prod.sellingPrice || prod.price || 0);
                }

                const qty = Number(item.quantity || 1);
                const itemTotal = Number(unitPrice * qty);
                subtotal += itemTotal;

                preOrderItemsData.push({
                    productId: prod?.id || null,
                    productVariantId: variant?.id || null,
                    productName: item.productName || prod?.name || 'Custom Product',
                    productSku: prod?.sku || prod?.skuCode || variant?.sku || null,
                    unit: item.unit || prod?.unit || variant?.unit || null,
                    image: (prod?.images && prod.images[0]) || variant?.primaryImages?.[0] || null,
                    quantity: qty,
                    unitPrice,
                    totalPrice: itemTotal,
                    isCustomItem: false,
                    notes: item.notes || null
                });
            }
        }

        // If manual/custom items have an estimated value from body
        if (req.body.customEstimatedAmount && Number(req.body.customEstimatedAmount) > 0) {
            subtotal += Number(req.body.customEstimatedAmount);
            if (hasCustom && preOrderItemsData.length === 0) {
                preOrderItemsData.push({
                    productName: customNotes ? customNotes.slice(0, 80) : 'Custom Word-of-Mouth Request',
                    quantity: 1,
                    unitPrice: Number(req.body.customEstimatedAmount),
                    totalPrice: Number(req.body.customEstimatedAmount),
                    isCustomItem: true,
                    notes: customNotes || null
                });
            }
        }

        const advance = Number(advanceAmount || 0);
        const balance = Math.max(0, subtotal - advance);
        const paymentStatus = advance >= subtotal && subtotal > 0 
            ? 'PAID' 
            : advance > 0 
                ? 'PARTIAL_ADVANCE' 
                : 'UNPAID';

        // 3. Auto-allocate delivery vehicle if not explicitly supplied
        let targetVehicleId = assignedVehicleId || null;
        let targetRouteId = assignedRouteId || null;
        let targetAgentId = null;

        if (!targetVehicleId && villageName) {
            const autoMatch = await findDeliveryVehicleForVillage(villageName, deliveryDate, storeId);
            targetVehicleId = autoMatch.vehicleId;
            targetRouteId = targetRouteId || autoMatch.routeId;
            targetAgentId = autoMatch.agentId;
        }

        const preOrderNumber = generatePreOrderNumber();

        const newPreOrder = await prisma.preOrder.create({
            data: {
                preOrderNumber,
                tenantId,
                storeId,
                customerId: customer.id,
                customerName: customerName.trim(),
                customerMobile: customerMobile.trim(),
                villageName: villageName?.trim() || null,
                deliveryAddress: deliveryAddress?.trim() || null,
                landmark: landmark?.trim() || null,
                deliveryDate: new Date(deliveryDate),
                deliverySlot: deliverySlot || 'Anytime (8 AM - 7 PM)',
                source,
                bookedByAgentId,
                bookedFromVehicleId,
                assignedVehicleId: targetVehicleId,
                assignedRouteId: targetRouteId,
                assignedAgentId: targetAgentId,
                status: 'RECEIVED',
                customNotes: customNotes?.trim() || null,
                receiptImageUrl: receiptImageUrl || null,
                hasCustomItems: hasCustom,
                estimatedTotal: subtotal,
                advanceAmount: advance,
                advancePaymentMode: advance > 0 ? (advancePaymentMode || 'CASH') : 'NONE',
                balanceAmount: balance,
                paymentStatus,
                items: {
                    create: preOrderItemsData
                }
            },
            include: {
                items: true,
                customer: true,
                bookedByAgent: { select: { id: true, name: true, phone: true } },
                assignedVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                assignedRoute: { select: { id: true, routeName: true } }
            }
        });

        logger.info(`[PreOrder] Created successfully: ${newPreOrder.preOrderNumber} by ${req.user.name || req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Pre-order created successfully',
            preOrder: newPreOrder
        });

    } catch (error) {
        logger.error('[createPreOrder] Error:', error);
        next(error);
    }
};

/**
 * @desc    Get pre-orders for Agent Portal
 *          Returns: 1) deliveries for this vehicle scheduled today/upcoming, 2) bookings created by this agent
 * @route   GET /api/v1/agent/pre-orders
 * @access  Private (Vehicle Agent)
 */
export const getAgentPreOrders = async (req, res, next) => {
    try {
        let agentId = req.user.id;
        let vehicleId = req.user.assignedVehicleId || req.user.assignedVehicle?.id || null;

        if (!vehicleId && agentId) {
            const userRec = await prisma.user.findUnique({
                where: { id: agentId },
                select: { id: true, assignedVehicleId: true }
            });
            if (userRec?.assignedVehicleId) {
                vehicleId = userRec.assignedVehicleId;
            }
        }

        const { tab = 'deliveries', date } = req.query;

        let targetDate = new Date();
        if (date && typeof date === 'string' && date.trim()) {
            const parsed = new Date(date.trim());
            if (!isNaN(parsed.getTime())) targetDate = parsed;
        }
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // 1. Deliveries assigned to this vehicle (either scheduled for today/upcoming or matching specific date filter)
        let vehicleDeliveries = [];
        if (vehicleId) {
            const deliveryDateCondition = date
                ? { gte: dayStart, lte: dayEnd }
                : { gte: dayStart }; // default: today & upcoming active deliveries

            vehicleDeliveries = await prisma.preOrder.findMany({
                where: {
                    assignedVehicleId: vehicleId,
                    deliveryDate: deliveryDateCondition,
                    status: { notIn: ['CANCELLED'] }
                },
                include: {
                    items: true,
                    customer: true,
                    assignedRoute: true,
                    bookedByAgent: { select: { id: true, name: true, phone: true } },
                    bookedFromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
                },
                orderBy: [
                    { deliveryDate: 'asc' },
                    { createdAt: 'desc' }
                ]
            });
        }

        // 2. Pre-orders booked by this agent
        const myBookings = await prisma.preOrder.findMany({
            where: {
                bookedByAgentId: agentId
            },
            include: {
                items: true,
                customer: true,
                assignedVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                assignedRoute: { select: { id: true, routeName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({
            success: true,
            vehicleId,
            date: format(targetDate, 'yyyy-MM-dd'),
            deliveriesToday: vehicleDeliveries,
            myBookings
        });

    } catch (error) {
        logger.error('[getAgentPreOrders] Error:', error);
        next(error);
    }
};

/**
 * @desc    Get Pre-Orders for Partner / Admin Portal with KPIs and filtering
 * @route   GET /api/v1/vsms/pre-orders
 * @access  Private (Partner / Admin)
 */
export const getPartnerPreOrders = async (req, res, next) => {
    try {
        const {
            deliveryDate,
            filterType = 'all', // 'tomorrow', 'today', 'upcoming', 'all'
            status,
            village,
            vehicleId,
            routeId,
            search,
            page = 1,
            limit = 50
        } = req.query;

        const tenantId = req.user?.tenantId || 'VK001';
        // Only apply storeId filter if explicitly provided in query params and not 'all'
        let storeId = (req.query.warehouseId && req.query.warehouseId !== 'all' && req.query.warehouseId !== 'undefined' && req.query.warehouseId !== 'null') ? req.query.warehouseId : null;

        const andConditions = [{ tenantId }];

        if (storeId) {
            andConditions.push({ storeId: storeId });
        }

        const now = new Date();
        if (deliveryDate) {
            const d = new Date(deliveryDate);
            andConditions.push({
                deliveryDate: {
                    gte: startOfDay(d),
                    lte: endOfDay(d)
                }
            });
        } else if (filterType === 'tomorrow') {
            const tomorrow = addDays(now, 1);
            andConditions.push({
                deliveryDate: {
                    gte: startOfDay(tomorrow),
                    lte: endOfDay(tomorrow)
                }
            });
        } else if (filterType === 'today') {
            andConditions.push({
                deliveryDate: {
                    gte: startOfDay(now),
                    lte: endOfDay(now)
                }
            });
        } else if (filterType === 'upcoming') {
            andConditions.push({
                deliveryDate: {
                    gte: startOfDay(now)
                }
            });
        }

        if (status && status !== 'all') {
            andConditions.push({ status: status.toUpperCase() });
        }

        if (village && village !== 'all') {
            andConditions.push({ villageName: { equals: village, mode: 'insensitive' } });
        }

        if (vehicleId && vehicleId !== 'all') {
            andConditions.push({ assignedVehicleId: vehicleId });
        }

        if (routeId && routeId !== 'all') {
            andConditions.push({ assignedRouteId: routeId });
        }

        if (search && search.trim()) {
            const q = search.trim();
            andConditions.push({
                OR: [
                    { preOrderNumber: { contains: q, mode: 'insensitive' } },
                    { customerName: { contains: q, mode: 'insensitive' } },
                    { customerMobile: { contains: q, mode: 'insensitive' } },
                    { villageName: { contains: q, mode: 'insensitive' } },
                    { customNotes: { contains: q, mode: 'insensitive' } }
                ]
            });
        }

        const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

        const skip = (Number(page) - 1) * Number(limit);
        const [totalCount, preOrders] = await Promise.all([
            prisma.preOrder.count({ where }),
            prisma.preOrder.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, name: true, images: true, category: { select: { name: true } } } }
                        }
                    },
                    customer: true,
                    bookedByAgent: { select: { id: true, name: true, phone: true } },
                    bookedFromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                    assignedVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                    assignedRoute: { select: { id: true, routeName: true, villages: true } },
                    assignedAgent: { select: { id: true, name: true, phone: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            })
        ]);

        // Calculate KPI Metrics across all Pre-Orders for this store
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const tomorrowStart = startOfDay(addDays(now, 1));
        const tomorrowEnd = endOfDay(addDays(now, 1));

        const baseKpiWhere = {
            tenantId,
            ...(storeId ? { storeId } : {})
        };

        const [
            totalBookedToday,
            forTomorrow,
            pendingFulfillment,
            outForDelivery,
            deliveredCount,
            financials
        ] = await Promise.all([
            prisma.preOrder.count({
                where: { ...baseKpiWhere, bookedAt: { gte: todayStart, lte: todayEnd } }
            }),
            prisma.preOrder.count({
                where: { ...baseKpiWhere, deliveryDate: { gte: tomorrowStart, lte: tomorrowEnd } }
            }),
            prisma.preOrder.count({
                where: { ...baseKpiWhere, status: { in: ['RECEIVED', 'CONFIRMED'] } }
            }),
            prisma.preOrder.count({
                where: { ...baseKpiWhere, status: { in: ['PACKED', 'LOADED', 'OUT_FOR_DELIVERY'] } }
            }),
            prisma.preOrder.count({
                where: { ...baseKpiWhere, status: 'DELIVERED' }
            }),
            prisma.preOrder.aggregate({
                where: baseKpiWhere,
                _sum: {
                    estimatedTotal: true,
                    advanceAmount: true,
                    finalCollectedAmount: true
                }
            })
        ]);

        // Fetch distinct vehicles & routes for filters
        const [vehicles, routes] = await Promise.all([
            prisma.vehicle.findMany({
                where: { status: true, ...(storeId ? { storeId } : {}) },
                select: { id: true, vehicleNumber: true, vehicleName: true }
            }),
            prisma.route.findMany({
                where: { status: true, ...(storeId ? { storeId } : {}) },
                select: { id: true, routeName: true, villages: true }
            })
        ]);

        res.json({
            success: true,
            kpis: {
                bookedToday: totalBookedToday,
                forTomorrow,
                pendingFulfillment,
                outForDelivery,
                delivered: deliveredCount,
                totalRevenue: financials._sum.estimatedTotal || 0,
                advanceCollected: financials._sum.advanceAmount || 0,
                finalCollected: financials._sum.finalCollectedAmount || 0
            },
            filterOptions: {
                vehicles,
                routes
            },
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(totalCount / Number(limit))
            },
            preOrders
        });

    } catch (error) {
        logger.error('[getPartnerPreOrders] Error:', error);
        next(error);
    }
};

/**
 * @desc    Get Single Pre-Order by ID
 * @route   GET /api/v1/vsms/pre-orders/:id or /api/v1/agent/pre-orders/:id
 * @access  Private
 */
export const getPreOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const preOrder = await prisma.preOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                        productVariant: true
                    }
                },
                customer: true,
                bookedByAgent: { select: { id: true, name: true, phone: true } },
                bookedFromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                assignedVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                assignedRoute: true,
                assignedAgent: { select: { id: true, name: true, phone: true } },
                store: { select: { id: true, name: true, code: true } }
            }
        });

        if (!preOrder) {
            return res.status(404).json({ success: false, message: 'Pre-Order not found' });
        }

        res.json({ success: true, preOrder });
    } catch (error) {
        logger.error('[getPreOrderById] Error:', error);
        next(error);
    }
};

/**
 * @desc    Update Pre-Order Status (Confirmation, Packing, Loading, Delivery, Cancellation)
 * @route   PUT /api/v1/vsms/pre-orders/:id/status OR /api/v1/agent/pre-orders/:id/status
 * @access  Private
 */
export const updatePreOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, cancellationReason, finalPaymentMode, finalCollectedAmount, rescheduledDate } = req.body;

        const validStatuses = ['RECEIVED', 'CONFIRMED', 'PACKED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RESCHEDULED'];
        if (!validStatuses.includes(status?.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Invalid pre-order status' });
        }

        const current = await prisma.preOrder.findUnique({ where: { id } });
        if (!current) {
            return res.status(404).json({ success: false, message: 'Pre-Order not found' });
        }

        const updateData = {
            status: status.toUpperCase(),
            updatedAt: new Date()
        };

        if (status.toUpperCase() === 'DELIVERED') {
            updateData.deliveredAt = new Date();
            updateData.deliveredByAgentId = req.user?.id || null;
            updateData.paymentStatus = 'PAID';
            if (finalPaymentMode) updateData.finalPaymentMode = finalPaymentMode;
            if (finalCollectedAmount !== undefined) {
                updateData.finalCollectedAmount = Number(finalCollectedAmount);
                updateData.balanceAmount = 0;
            } else {
                updateData.finalCollectedAmount = current.balanceAmount;
                updateData.balanceAmount = 0;
            }
        } else if (status.toUpperCase() === 'CANCELLED') {
            updateData.cancellationReason = cancellationReason || 'Cancelled by user';
        } else if (status.toUpperCase() === 'RESCHEDULED' && rescheduledDate) {
            updateData.rescheduledDate = new Date(rescheduledDate);
            updateData.deliveryDate = new Date(rescheduledDate);
        }

        const updated = await prisma.preOrder.update({
            where: { id },
            data: updateData,
            include: {
                items: true,
                customer: true,
                assignedVehicle: true,
                assignedRoute: true
            }
        });

        logger.info(`[PreOrder] Status updated to ${status} for ${updated.preOrderNumber} by ${req.user?.name || req.user?.id || 'System'}`);

        res.json({
            success: true,
            message: `Pre-order updated to ${status}`,
            preOrder: updated
        });

    } catch (error) {
        logger.error('[updatePreOrderStatus] Error:', error);
        next(error);
    }
};

/**
 * @desc    Assign or Reassign Target Delivery Vehicle & Route to Pre-Order
 * @route   PUT /api/v1/vsms/pre-orders/:id/assign-vehicle
 * @access  Private (Partner / Admin)
 */
export const assignPreOrderVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { vehicleId, routeId, agentId } = req.body;

        const updated = await prisma.preOrder.update({
            where: { id },
            data: {
                assignedVehicleId: vehicleId || null,
                assignedRouteId: routeId || null,
                assignedAgentId: agentId || null,
                updatedAt: new Date()
            },
            include: {
                assignedVehicle: true,
                assignedRoute: true,
                assignedAgent: { select: { id: true, name: true, phone: true } }
            }
        });

        res.json({
            success: true,
            message: 'Vehicle assignment updated successfully',
            preOrder: updated
        });
    } catch (error) {
        logger.error('[assignPreOrderVehicle] Error:', error);
        next(error);
    }
};

/**
 * @desc    Consolidated Packing & Loading List for Tomorrow / Selected Date
 *          Groups pre-orders by Vehicle & Village with item aggregates for warehouse packing
 * @route   GET /api/v1/vsms/pre-orders/packing-summary
 * @access  Private (Partner / Admin)
 */
export const getPreOrderPackingSummary = async (req, res, next) => {
    try {
        const { date, warehouseId } = req.query;
        const tenantId = req.user?.tenantId || 'VK001';
        let storeId = (warehouseId && warehouseId !== 'all' && warehouseId !== 'undefined' && warehouseId !== 'null') ? warehouseId : (req.user?.warehouseId || req.user?.storeId || null);
        if (warehouseId === 'all') storeId = null;

        const targetDate = date ? new Date(date) : addDays(new Date(), 1);
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        const preOrders = await prisma.preOrder.findMany({
            where: {
                tenantId,
                ...(storeId ? { storeId } : {}),
                deliveryDate: {
                    gte: dayStart,
                    lte: dayEnd
                },
                status: {
                    notIn: ['CANCELLED', 'DELIVERED']
                }
            },
            include: {
                items: true,
                customer: true,
                assignedVehicle: true,
                assignedRoute: true
            },
            orderBy: [
                { assignedVehicleId: 'asc' },
                { villageName: 'asc' }
            ]
        });

        // Group by Vehicle -> Village -> Orders & Aggregate Product Quantities
        const vehicleGroups = {};
        const unassignedOrders = [];

        preOrders.forEach(po => {
            const vKey = po.assignedVehicle?.id || 'UNASSIGNED';
            const vName = po.assignedVehicle?.vehicleNumber || 'Unassigned Vehicle';

            if (vKey === 'UNASSIGNED') {
                unassignedOrders.push(po);
                return;
            }

            if (!vehicleGroups[vKey]) {
                vehicleGroups[vKey] = {
                    vehicleId: vKey,
                    vehicleNumber: vName,
                    vehicleName: po.assignedVehicle?.vehicleName,
                    routeName: po.assignedRoute?.routeName || 'Unassigned Route',
                    villages: {},
                    productTotals: {},
                    totalOrders: 0,
                    totalValue: 0
                };
            }

            const vg = vehicleGroups[vKey];
            const villageKey = po.villageName || 'Other / Direct';

            if (!vg.villages[villageKey]) {
                vg.villages[villageKey] = {
                    villageName: villageKey,
                    orders: []
                };
            }

            vg.villages[villageKey].orders.push(po);
            vg.totalOrders += 1;
            vg.totalValue += po.estimatedTotal;

            // Aggregate items
            po.items.forEach(item => {
                const prodKey = item.productId || item.productName;
                if (!vg.productTotals[prodKey]) {
                    vg.productTotals[prodKey] = {
                        productName: item.productName,
                        sku: item.productSku,
                        unit: item.unit,
                        quantity: 0,
                        isCustomItem: item.isCustomItem
                    };
                }
                vg.productTotals[prodKey].quantity += item.quantity;
            });
        });

        res.json({
            success: true,
            date: format(targetDate, 'yyyy-MM-dd'),
            totalOrders: preOrders.length,
            vehicles: Object.values(vehicleGroups).map(v => ({
                ...v,
                villages: Object.values(v.villages),
                productTotals: Object.values(v.productTotals)
            })),
            unassigned: unassignedOrders
        });

    } catch (error) {
        logger.error('[getPreOrderPackingSummary] Error:', error);
        next(error);
    }
};

/**
 * @desc    Search Customers by Phone/Name for Fast Pre-Order Booking
 * @route   GET /api/v1/agent/pre-orders/search-customer OR /api/v1/vsms/pre-orders/search-customer
 * @access  Private
 */
export const searchPreOrderCustomers = async (req, res, next) => {
    try {
        const { query } = req.query;
        const tenantId = req.user?.tenantId || 'VK001';

        if (!query || query.trim().length < 2) {
            return res.json({ success: true, customers: [] });
        }

        const q = query.trim();
        const customers = await prisma.customer.findMany({
            where: {
                tenantId,
                OR: [
                    { mobile: { contains: q, mode: 'insensitive' } },
                    { name: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, customers });
    } catch (error) {
        logger.error('[searchPreOrderCustomers] Error:', error);
        next(error);
    }
};
