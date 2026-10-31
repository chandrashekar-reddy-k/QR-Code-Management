import { prisma } from '../../config/prismaClient.js';
import { format } from 'date-fns';
import { sendNotification } from '../../services/notificationService.js';
import logger from '../../utils/logger.js';
const logActivity = (details) => logger.info(JSON.stringify(details));
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
import { getIO } from '../../services/socketService.js';

export const broadcastCashUpdate = (storeId, date, actionType, extraData = {}) => {
    try {
        const io = getIO();
        if (!io) return;

        const payload = {
            action: actionType,
            date,
            storeId,
            timestamp: new Date().toISOString(),
            ...extraData
        };

        io.emit('cash:update', payload);
        io.of('/admin').emit('cash:update', payload);
        io.of('/partner').emit('cash:update', payload);
        if (storeId) {
            io.to(`store:${storeId}`).emit('cash:update', payload);
            io.emit(`cash:store:${storeId}`, payload);
        }
    } catch (err) {
        console.warn('[CashSocket] Broadcast skipped:', err.message);
    }
};

// getEffectiveStoreId is now imported from ../utils/storeResolution.js

// @desc    Submit opening cash for a vehicle (agent — kept for backward compat but agents are blocked on frontend)
// @route   POST /api/cash/opening
// @access  Private
export const submitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash, shift = 1 } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        let resolvedVehicleId = vehicleId || req.user.assignedVehicleId;
        if (!resolvedVehicleId) {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { assignedVehicleId: true }
            });
            resolvedVehicleId = dbUser?.assignedVehicleId;
        }

        if (!resolvedVehicleId || !denominations || totalOpeningCash === undefined) {
            res.status(400);
            throw new Error('Vehicle ID, denominations, and total are required');
        }

        const openingCash = await prisma.openingCash.upsert({
            where: {
                vehicleId_date_shift: {
                    vehicleId: resolvedVehicleId,
                    date: dateString,
                    shift,
                },
            },
            update: {
                denominations,
                totalOpeningCash,
                userId,
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId: resolvedVehicleId,
                userId,
                date: dateString,
                shift,
                denominations,
                totalOpeningCash,
            },
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: getEffectiveStoreId(req),
            action: 'OPENING_CASH_SUBMITTED',
            details: `Submitted opening cash of ₹${totalOpeningCash} for Shift ${shift}`,
            metadata: { vehicleId, amount: totalOpeningCash, shift, date: dateString }
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, dateString, req.user.tenantId, getEffectiveStoreId(req));

        res.status(201).json(openingCash);

        sendNotification({
            roles: ['ADMIN'],
            title: 'Opening Cash Submitted',
            message: `Opening cash of ₹${totalOpeningCash} submitted for Shift ${shift}.`,
            type: 'cash',
            priority: 'low',
            metadata: { vehicleId, amount: totalOpeningCash, shift }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Submit opening cash for any vehicle/agent (for a specific shift)
// @route   POST /api/cash/admin/opening
// @access  Admin
export const adminSubmitOpeningCash = async (req, res, next) => {
    try {
        const { vehicleId, denominations, totalOpeningCash, openingCash: bodyOpeningCash, userId, agentId, shift = 1, isNoService = false, date, storeId: bodyStoreId } = req.body;
        const dateString = date || format(new Date(), 'yyyy-MM-dd');

        // Accept either userId or agentId from frontend
        const effectiveUserId = userId || agentId;
        const resolvedOpeningCash = totalOpeningCash !== undefined ? Number(totalOpeningCash) : (bodyOpeningCash !== undefined ? Number(bodyOpeningCash) : undefined);

        if (!effectiveUserId || (resolvedOpeningCash === undefined && !isNoService)) {
            res.status(400);
            throw new Error('User ID and total cash are required');
        }

        // Resolve storeId: body → effective store → vehicle → agent warehouseId
        let storeId = getEffectiveStoreId(req);

        if (!storeId && vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: { storeId: true }
            });
            storeId = vehicle?.storeId;
        }

        if (!storeId) {
            // Fallback: use the agent's warehouseId as storeId
            const agent = await prisma.user.findUnique({
                where: { id: effectiveUserId },
                select: { warehouseId: true }
            });
            storeId = agent?.warehouseId;
        }

        if (!storeId) {
            res.status(400);
            throw new Error('Could not resolve a store for this assignment. Please assign the agent to a warehouse or vehicle first.');
        }

        // Resolve vehicleId: if not provided, find the first vehicle in this store
        let resolvedVehicleId = vehicleId;
        if (!resolvedVehicleId) {
            const storeVehicle = await prisma.vehicle.findFirst({
                where: { storeId, status: true },
                select: { id: true }
            });
            if (!storeVehicle) {
                res.status(400);
                throw new Error('No vehicle found for this store. Please add a vehicle to the store in Fleet Management first.');
            }
            resolvedVehicleId = storeVehicle.id;
        }

        // Check if the store cash register is open for dateString — auto-create if missing
        let storeRegister = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date: dateString } }
        });

        if (!storeRegister) {
            // Auto-initialize a register for today so float can be assigned without a separate "open store" step
            storeRegister = await prisma.storeCashRegister.create({
                data: {
                    storeId,
                    date: dateString,
                    openingCash: 0,
                    openingDenominations: {},
                    status: 'OPEN',
                    tenantId: req.user.tenantId,
                    openedById: req.user.id
                }
            });
            logger.info(`[CashMgmt] Auto-created store register for store ${storeId} on ${dateString}`);
        }

        if (storeRegister.status === 'CLOSED') {
            res.status(400);
            throw new Error('Store Cash Register is already closed for today. Please re-open it first.');
        }

        // Find existing assignment if any
        const existingOpening = await prisma.openingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift } }
        });
        const existingAmount = existingOpening?.totalOpeningCash || 0;

        // Calculate total assigned out for this store today
        const allOpeningAgg = await prisma.openingCash.aggregate({
            where: { storeId, date: dateString },
            _sum: { totalOpeningCash: true }
        });
        const assignedOutExcludingSelf = (allOpeningAgg._sum.totalOpeningCash || 0) - existingAmount;

        const allDeposits = await prisma.storeDeposit.aggregate({
            where: { storeId, date: dateString },
            _sum: { amount: true }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: { storeId, date: { lte: dateString } },
            _sum: { amount: true }
        });

        const allSafeDeposits = await prisma.safeTransaction.aggregate({
            where: { storeId, date: { lte: dateString }, type: 'DEPOSIT' },
            _sum: { amount: true }
        });

        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({
            where: { storeId, date: { lte: dateString }, type: 'WITHDRAW' },
            _sum: { amount: true }
        });

        const approvedAgentClosingSum = await prisma.closingCash.aggregate({
            where: { storeId, date: dateString, status: 'APPROVED' },
            _sum: { actualCash: true }
        });

        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;

        const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
        const bankTransferred = allBankDeposits._sum.amount || 0;

        const allStoreSales = await prisma.order.findMany({
            where: {
                warehouseId: storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${dateString}T00:00:00.000Z`),
                    lte: new Date(`${dateString}T23:59:59.999Z`)
                },
                status: { in: ['DELIVERED', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true }
        });

        const allStoreExpenses = await prisma.expense.findMany({
            where: {
                storeId,
                status: { in: ['APPROVED', 'PAID'] },
                paymentMode: 'CASH',
                date: dateString,
                vehicleId: null
            },
            select: { amount: true }
        });

        const totalStoreExpensesCash = allStoreExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const totalStoreSalesCash = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH') return sum + o.totalAmount;
            if (o.paymentMode === 'CASH_UPI') return sum + (o.cashAmount || 0);
            return sum;
        }, 0);

        const totalStoreCash = storeRegister.openingCash - assignedOutExcludingSelf + receivedIn + totalStoreSalesCash - bankTransferred - totalStoreExpensesCash;
        const safeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;
        const availableCash = totalStoreCash - safeBalance;

        if (!isNoService && resolvedOpeningCash > availableCash) {
            res.status(400);
            throw new Error(`Action rejected: Insufficient funds in the cash counter. The available counter balance is ₹${availableCash.toFixed(2)}, which is less than the requested float assignment of ₹${resolvedOpeningCash.toFixed(2)}.`);
        }

        // Validation: Prevent Shift 2 assignment if Shift 1 is not closed
        if (shift === 2) {
            const shift1Closing = await prisma.closingCash.findUnique({
                where: {
                    vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift: 1 }
                }
            });
            if (!shift1Closing) {
                res.status(400);
                throw new Error('Cannot assign Shift 2 until Shift 1 has been closed by the agent.');
            }
        }

        // Admin: Allow upserting (updating) an assignment if it already exists, 
        // which prevents "Duplicate assignment" errors on retries or corrections.

        const openingCash = await prisma.openingCash.upsert({
            where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift } },
            update: {
                denominations: isNoService ? {} : (denominations || {}),
                totalOpeningCash: isNoService ? 0 : resolvedOpeningCash,
                userId: effectiveUserId,
                isNoService
            },
            create: {
                tenantId: req.user.tenantId,
                storeId,
                vehicleId: resolvedVehicleId,
                userId: effectiveUserId,
                date: dateString,
                shift,
                denominations: isNoService ? {} : (denominations || {}),
                totalOpeningCash: isNoService ? 0 : resolvedOpeningCash,
                isNoService
            },
        });

        // If it's No Service, automatically create a finalized closing record
        if (isNoService) {
            await prisma.closingCash.upsert({
                where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift } },
                update: {
                    userId: effectiveUserId, openingCash: 0, cashSales: 0, expenses: 0, expectedCash: 0,
                    actualCash: 0, difference: 0, denominations: {},
                    status: 'SUBMITTED', isNoService: true, remark: 'Marked as No Service by Admin'
                },
                create: {
                    tenantId: req.user.tenantId,
                    storeId,
                    vehicleId: resolvedVehicleId,
                    userId: effectiveUserId, date: dateString, shift,
                    openingCash: 0, cashSales: 0, expenses: 0, expectedCash: 0,
                    actualCash: 0, difference: 0, denominations: {},
                    status: 'SUBMITTED', isNoService: true, remark: 'Marked as No Service by Admin'
                }
            });
        }

        // Recalculate daily summary
        await recalculateDailySummary(resolvedVehicleId, dateString, req.user.tenantId, storeId);

        res.status(201).json(openingCash);

        broadcastCashUpdate(storeId, dateString, 'ADMIN_OPENING_CASH_SUBMITTED');

        sendNotification({
            userIds: [effectiveUserId],
            roles: ['ADMIN'],
            title: isNoService ? `Shift ${shift} - No Service` : `Shift ${shift} Float Assigned`,
            message: isNoService ? `Shift ${shift} marked as No Service for today.` : `₹${totalOpeningCash} opening cash assigned for Shift ${shift}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId: resolvedVehicleId, amount: isNoService ? 0 : totalOpeningCash, shift }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Delete reconciliation and associated records
// @route   DELETE /api/cash/admin/reconciliation/:vehicleId/:date
// @access  Admin
export const deleteReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date } = req.params;

        await prisma.$transaction([
            prisma.openingCash.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
            prisma.closingCash.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
            prisma.dailyCashSummary.deleteMany({ where: { vehicleId, date, tenantId: req.user.tenantId } }),
        ]);

        res.json({ message: 'Reconciliation data removed' });

        sendNotification({
            vehicleIds: [vehicleId],
            roles: ['ADMIN'],
            title: 'Reconciliation Deleted',
            message: `Cash reconciliation records for ${date} have been removed for vehicle ${vehicleId}.`,
            type: 'cash',
            priority: 'high',
            metadata: { vehicleId, date, action: 'DELETE' }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit closing cash for a vehicle (agent submits for a specific shift)
// @route   POST /api/cash/closing
// @access  Private
export const submitClosingCash = async (req, res, next) => {
    console.log('[DEBUG] submitClosingCash Request Body:', req.body);
    try {
        const { vehicleId, actualCash, denominations, remark, shift = 1, isNoService = false } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        let resolvedVehicleId = vehicleId || req.user.assignedVehicleId;
        if (!resolvedVehicleId) {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { assignedVehicleId: true }
            });
            resolvedVehicleId = dbUser?.assignedVehicleId;
        }

        if (!resolvedVehicleId) {
            res.status(400);
            throw new Error('Vehicle ID is required and could not be resolved from user profile.');
        }

        if (![1, 2].includes(shift)) {
            res.status(400);
            throw new Error('Shift must be 1 (Morning) or 2 (Afternoon)');
        }

        // Get the opening cash for THIS shift only
        console.log(`[DEBUG] Querying shiftOpening: vehicleId=${resolvedVehicleId}, date=${dateString}, shift=${shift}`);
        const shiftOpening = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift }
            }
        });

        if (!shiftOpening && !isNoService) {
            console.error('[DEBUG] shiftOpening NOT FOUND for this vehicle/date/shift');
            res.status(400);
            throw new Error(`Shift ${shift} must have an opening float assigned before closing.`);
        }

        // For Shift 2: determine the correct sales window start so that cash orders
        // placed in any gap between Shift 1 closing and Shift 2 opening are included.
        //
        //  • closing1 exists  → use closing1.createdAt (orders placed after Shift 1
        //                        was closed but before Shift 2 opened are "orphaned"
        //                        and physically held by the agent).
        //  • no closing1, but opening1 exists → widen all the way to Shift 1 opening
        //                        so every unreconciled order is counted.
        //  • no opening1 at all → fall back to this shift's own opening time.
        let salesWindowStart = shiftOpening?.createdAt;
        if (shift === 2 && shiftOpening) {
            const closing1 = await prisma.closingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift: 1 } }
            });
            if (closing1) {
                // Shift 1 was already closed — start Shift 2 window from when Shift 1 closed
                // so any "gap" orders are included in Shift 2's expected cash.
                salesWindowStart = closing1.createdAt;
                console.log(`[DEBUG] Shift 2 – Shift 1 closed at ${closing1.createdAt}; using that as sales window start (captures gap orders)`);
            } else {
                // No Shift 1 closing — widen all the way back to Shift 1 opening
                const opening1 = await prisma.openingCash.findUnique({
                    where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift: 1 } }
                });
                if (opening1) {
                    salesWindowStart = opening1.createdAt;
                    console.log(`[DEBUG] Shift 2 – no Shift 1 closing found; widening sales window to Shift 1 opening (${opening1.createdAt})`);
                }
            }
        }

        // Calculate Shift-specific Sales (from salesWindowStart until now)
        const orderSalesRes = shiftOpening ? await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                vehicleId: resolvedVehicleId,
                status: { in: ['DELIVERED', 'COMPLETED'] },
                createdAt: { gte: salesWindowStart },
            },
        }) : [];

        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const shiftCashSales = pureCash + splitCash;

        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const shiftUpiSales = pureUpi + splitUpi;

        const shiftCardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        // Calculate Shift-specific Expenses (claimed only, since salesWindowStart)
        const expensesResult = shiftOpening ? await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                vehicleId: resolvedVehicleId,
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['PENDING', 'APPROVED', 'PAID'] },
                createdAt: { gte: salesWindowStart }
            }
        }) : { _sum: { amount: 0 } };
        const shiftExpenses = expensesResult._sum.amount || 0;

        const openingAmount = shiftOpening?.totalOpeningCash || 0;
        const finalExpected = isNoService ? openingAmount : (openingAmount + shiftCashSales - shiftExpenses);
        const finalActual = isNoService ? openingAmount : (actualCash || 0);
        const finalSales = isNoService ? 0 : shiftCashSales;
        const finalUpi = isNoService ? 0 : shiftUpiSales;
        const finalCard = isNoService ? 0 : shiftCardSales;
        const finalExpenses = isNoService ? 0 : shiftExpenses;
        const difference = finalActual - finalExpected;
        console.log(`[DEBUG] Reconciliation: Actual=${finalActual}, Expected=${finalExpected}, Difference=${difference}`);

        // Use a small epsilon to handle floating point precision
        if (Math.abs(difference) > 0.01 && !remark && !isNoService) {
            res.status(400);
            throw new Error('Remark is required if there is a difference');
        }

        const closingCash = await prisma.closingCash.upsert({
            where: { vehicleId_date_shift: { vehicleId: resolvedVehicleId, date: dateString, shift } },
            update: {
                openingCash: openingAmount,
                cashSales: finalSales,
                upiSales: finalUpi,
                cardSales: finalCard,
                expenses: finalExpenses,
                expectedCash: finalExpected,
                actualCash: finalActual,
                difference,
                denominations: denominations || {},
                remark: isNoService ? `No Service: ${remark}` : remark,
                userId,
                isNoService,
                status: 'PENDING' // Changed to PENDING for admin review
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId: resolvedVehicleId,
                userId,
                date: dateString,
                shift,
                openingCash: openingAmount,
                cashSales: finalSales,
                upiSales: finalUpi,
                cardSales: finalCard,
                expenses: finalExpenses,
                expectedCash: finalExpected,
                actualCash: finalActual,
                difference,
                denominations: denominations || {},
                remark: isNoService ? `No Service: ${remark}` : remark,
                isNoService,
                status: 'PENDING' // Changed to PENDING for admin review
            },
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: getEffectiveStoreId(req),
            action: 'CLOSING_CASH_SUBMITTED',
            details: isNoService ? `Reported No Service for Shift ${shift}` : `Submitted closing cash for Shift ${shift}. Difference: ₹${difference}`,
            metadata: {
                vehicleId: resolvedVehicleId,
                shift,
                actualCash: finalActual,
                expectedCash: finalExpected,
                difference,
                isNoService
            }
        });

        // Recalculate daily summary
        await recalculateDailySummary(resolvedVehicleId, dateString, req.user.tenantId, getEffectiveStoreId(req));

        res.status(201).json(closingCash);

        sendNotification({
            userIds: [],
            roles: ['ADMIN', 'SUPERVISOR'],
            title: isNoService ? `Shift ${shift} - No Service Reported` : `Shift ${shift} Closed`,
            message: isNoService
                ? `Agent reported No Service for Shift ${shift}. Reason: ${remark}`
                : `Shift ${shift} closing submitted by ${req.user.name}.`,
            type: 'cash',
            priority: isNoService ? 'high' : 'medium',
            metadata: { vehicleId, shift, isNoService }
        });

        if (difference !== 0) {
            sendNotification({
                userIds: [userId],
                roles: ['ADMIN', 'SUPERVISOR'],
                title: Math.abs(difference) >= 1000 ? 'CRITICAL: Large Cash Mismatch' : 'Cash Mismatch Detected',
                message: `Shift ${shift} closing mismatch of ₹${difference}.`,
                type: 'cash',
                priority: Math.abs(difference) >= 1000 ? 'high' : 'medium',
                metadata: { vehicleId, difference, actualCash: finalActual, expectedCash: finalExpected, shift }
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get current cash status for the logged-in agent's vehicle (both shifts)
// @route   GET /api/cash/status
// @access  Private
export const getCashStatus = async (req, res, next) => {
    try {
        const vehicleId = req.user.assignedVehicleId;
        if (!vehicleId) {
            return res.json({ vehicleAssigned: false });
        }

        const dateString = format(new Date(), 'yyyy-MM-dd');

        // Fetch both shifts
        const opening1 = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
            },
        });
        const opening2 = await prisma.openingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 }
            },
        });
        const closing1 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 1 }
            },
        });
        const closing2 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date: dateString, shift: 2 }
            },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const orderSalesRes = await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                vehicleId,
                status: { in: ['DELIVERED', 'COMPLETED'] },
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        });

        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const totalCashSales = pureCash + splitCash;

        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const totalUpiSales = pureUpi + splitUpi;

        const totalCardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        const vehicleExpenses = await prisma.expense.findMany({
            where: {
                tenantId: req.user.tenantId,
                vehicleId,
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['PENDING', 'APPROVED', 'PAID'] }
            },
            select: { amount: true, description: true }
        });

        let totalExpenses = 0;
        vehicleExpenses.forEach(exp => {
            const payMatch = exp.description?.match(/\[PAYMENT:.*?Paid: ₹([\d.]+)\]/);
            if (payMatch && payMatch[1]) {
                totalExpenses += parseFloat(payMatch[1]);
            } else {
                totalExpenses += exp.amount;
            }
        });

        // Per-shift sales/expenses split
        // For Shift 1: if not yet closed, attribute all of today's sales to it (live view)
        const s1CashSales = opening1 ? (closing1?.cashSales || (opening2 ? 0 : totalCashSales)) : 0;
        const s1UpiSales = opening1 ? (closing1?.upiSales || (opening2 ? 0 : totalUpiSales)) : 0;
        const s1CardSales = opening1 ? (closing1?.cardSales || (opening2 ? 0 : totalCardSales)) : 0;
        const s1Expenses = opening1 ? (closing1?.expenses || (opening2 ? 0 : totalExpenses)) : 0;

        // For Shift 2: mirror the same window logic used in submitClosingCash.
        // When closing1 exists, query orders placed AFTER closing1.createdAt so "gap"
        // orders (placed after Shift 1 closed but before Shift 2 opened) are included.
        // When closing1 doesn't exist, use totalCashSales (all unreconciled cash).
        let s2LiveCashSales = 0, s2LiveUpiSales = 0, s2LiveCardSales = 0, s2LiveExpenses = 0;
        if (opening2 && !closing2) {
            if (closing1) {
                // Query orders after closing1 was submitted (same window as submitClosingCash)
                const s2OrdersRes = await prisma.order.groupBy({
                    by: ['paymentMode'],
                    _sum: { totalAmount: true, cashAmount: true, upiAmount: true },
                    where: {
                        vehicleId,
                        status: { in: ['DELIVERED', 'COMPLETED'] },
                        createdAt: { gte: closing1.createdAt }
                    }
                });
                s2LiveCashSales = (s2OrdersRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0)
                                + (s2OrdersRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0);
                s2LiveUpiSales  = (s2OrdersRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0)
                                + (s2OrdersRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0);
                s2LiveCardSales = s2OrdersRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;
                // Expenses after closing1
                const s2ExpRes = await prisma.expense.aggregate({
                    _sum: { amount: true },
                    where: {
                        tenantId: req.user.tenantId,
                        vehicleId,
                        date: dateString,
                        paymentMode: 'CASH',
                        status: { in: ['APPROVED', 'PAID'] },
                        createdAt: { gte: closing1.createdAt }
                    }
                });
                s2LiveExpenses = s2ExpRes._sum.amount || 0;
            } else {
                // No Shift 1 closing — all of today's unreconciled cash belongs to Shift 2
                s2LiveCashSales = totalCashSales;
                s2LiveUpiSales  = totalUpiSales;
                s2LiveCardSales = totalCardSales;
                s2LiveExpenses  = totalExpenses;
            }
        }

        const s2CashSales = opening2 ? (closing2?.cashSales || s2LiveCashSales) : 0;
        const s2UpiSales  = opening2 ? (closing2?.upiSales  || s2LiveUpiSales)  : 0;
        const s2CardSales = opening2 ? (closing2?.cardSales  || s2LiveCardSales) : 0;
        const s2Expenses  = opening2 ? (closing2?.expenses   || s2LiveExpenses)  : 0;

        const totalOpening = (opening1?.totalOpeningCash || 0) + (opening2?.totalOpeningCash || 0);

        res.json({
            vehicleAssigned: true,
            // Aggregated values (backward compat)
            openingSubmitted: !!opening1,
            closingSubmitted: !!closing2 || !!closing1,
            openingCash: totalOpening,
            cashSales: totalCashSales,
            upiSales: totalUpiSales,
            cardSales: totalCardSales,
            expenses: totalExpenses,
            // Per-shift detail
            shifts: {
                shift1: {
                    openingAssigned: !!opening1,
                    openingCash: opening1?.totalOpeningCash || 0,
                    openingDenominations: opening1?.denominations || null,
                    closingSubmitted: !!closing1,
                    reviewStatus: closing1?.status || null,
                    closingDenominations: closing1?.denominations || null,
                    closingActual: closing1?.actualCash || 0,
                    closingDifference: closing1?.difference || 0,
                    cashSales: s1CashSales,
                    upiSales: s1UpiSales,
                    cardSales: s1CardSales,
                    expenses: s1Expenses,
                },
                shift2: {
                    openingAssigned: !!opening2,
                    openingCash: opening2?.totalOpeningCash || 0,
                    openingDenominations: opening2?.denominations || null,
                    closingSubmitted: !!closing2,
                    reviewStatus: closing2?.status || null,
                    closingDenominations: closing2?.denominations || null,
                    closingActual: closing2?.actualCash || 0,
                    closingDifference: closing2?.difference || 0,
                    cashSales: s2CashSales,
                    upiSales: s2UpiSales,
                    cardSales: s2CardSales,
                    expenses: s2Expenses,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all daily cash summaries for admin reconciliation
// @route   GET /api/cash/admin/reconciliation
// @access  Admin
export const getAdminCashSummary = async (req, res, next) => {
    try {
        const { date } = req.query;
        const dateString = date || format(new Date(), 'yyyy-MM-dd');

        const storeId = getEffectiveStoreId(req);

        const storeScope = (storeId && storeId !== 'undefined' && storeId !== 'null' && storeId !== 'all') ? { storeId } : {};

        // Find vehicles that either have active status OR had activity on this date
        // (float assigned, closing submitted, or daily cash summary recorded)
        const [activeOpening, activeClosing, activeSummaries] = await Promise.all([
            prisma.openingCash.findMany({
                where: { date: dateString, tenantId: req.user.tenantId, ...storeScope },
                select: { vehicleId: true }
            }),
            prisma.closingCash.findMany({
                where: { date: dateString, tenantId: req.user.tenantId, ...storeScope },
                select: { vehicleId: true }
            }),
            prisma.dailyCashSummary.findMany({
                where: { date: dateString, tenantId: req.user.tenantId, ...storeScope },
                select: { vehicleId: true }
            })
        ]);

        const activeVehicleIds = Array.from(new Set([
            ...activeOpening.map(o => o.vehicleId),
            ...activeClosing.map(c => c.vehicleId),
            ...activeSummaries.map(s => s.vehicleId)
        ].filter(Boolean)));

        const vehicleFilter = {
            OR: [
                { status: true, ...storeScope },
                ...(activeVehicleIds.length > 0 ? [{ id: { in: activeVehicleIds } }] : [])
            ]
        };

        const vehicles = await prisma.vehicle.findMany({
            where: vehicleFilter,
            include: {
                assignedUsers: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        const summaries = await prisma.dailyCashSummary.findMany({
            where: {
                date: dateString,
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) }
            }
        });

        // BULK FETCH: Get all related data in one go to prevent connection pool exhaustion
        const openingCashRecords = await prisma.openingCash.findMany({
            where: { date: dateString, tenantId: req.user.tenantId, vehicleId: { in: vehicles.map(v => v.id) } },
            include: {
                user: {
                    select: { id: true, name: true, role: true }
                }
            }
        });
        const closingCashRecords = await prisma.closingCash.findMany({
            where: { date: dateString, tenantId: req.user.tenantId, vehicleId: { in: vehicles.map(v => v.id) } }
        });

        const routeAssignments = await prisma.routeAssignment.findMany({
            where: {
                tenantId: req.user.tenantId,
                vehicleId: { in: vehicles.map(v => v.id) },
                status: true
            },
            include: {
                route: {
                    include: { cycles: true }
                },
                user: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        const dayName = format(new Date(dateString), 'EEEE').toUpperCase(); // e.g., 'MONDAY'

        const startOfDayDate = new Date(`${dateString}T00:00:00`);
        const endOfDayDate = new Date(`${dateString}T23:59:59.999`);

        const orderAggregates = await prisma.order.groupBy({
            by: ['vehicleId', 'paymentMode'],
            _sum: { totalAmount: true, cashAmount: true, upiAmount: true },
            where: {
                status: { in: ['DELIVERED', 'COMPLETED'] },
                createdAt: { gte: startOfDayDate, lte: endOfDayDate },
                ...(storeId && storeId !== 'undefined' && storeId !== 'null' ? { warehouseId: storeId } : {})
            }
        });

        const expenseAggregates = await prisma.expense.groupBy({
            by: ['vehicleId'],
            _sum: { amount: true },
            where: {
                tenantId: req.user.tenantId,
                date: dateString,
                paymentMode: 'CASH',
                status: { in: ['APPROVED', 'PAID'] },
                ...(storeId && storeId !== 'undefined' && storeId !== 'null' ? { storeId } : {})
            }
        });

        const results = vehicles.map((v) => {
            const s = summaries.find(sum => sum.vehicleId === v.id);
            const openings = openingCashRecords.filter(o => o.vehicleId === v.id);
            const closings = closingCashRecords.filter(c => c.vehicleId === v.id);
            const orders = orderAggregates.filter(o => o.vehicleId === v.id);
            const expenses = expenseAggregates.filter(e => e.vehicleId === v.id);
            const ra = routeAssignments.find(ra => ra.vehicleId === v.id);
            const todayCycle = ra?.route?.cycles?.find(c => c.dayOfWeek === dayName);
            const villageName = todayCycle?.villageName || ra?.route?.routeName || 'Unspecified';

            const vehicleCopy = { ...v };
            if ((!vehicleCopy.assignedUsers || vehicleCopy.assignedUsers.length === 0) && ra?.user) {
                vehicleCopy.assignedUsers = [ra.user];
            }

            const totalRealtimeCashSales = orders.reduce((sum, o) => {
                if (o.paymentMode === 'CASH') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.cashAmount || 0);
                return sum;
            }, 0);

            const totalRealtimeUpiSales = orders.reduce((sum, o) => {
                if (o.paymentMode === 'UPI') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.upiAmount || 0);
                return sum;
            }, 0);

            const totalRealtimeCardSales = orders.filter(o => o.paymentMode === 'CARD').reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
            const totalRealtimeExpenses = expenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

            const o1 = openings.find(o => o.shift === 1);
            const o2 = openings.find(o => o.shift === 2);
            const c1 = closings.find(c => c.shift === 1);
            const c2 = closings.find(c => c.shift === 2);

            let s1Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };
            let s2Live = { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 };

            // Shift 1: If closed, we keep the expectation that was stored in c1.expectedCash
            // Note: Currently we don't have totalRealtimeSplit, so we rely on c1's records for expectations
            if (c1) {
                s1Live.cashSales = c1.cashSales;
                s1Live.upiSales = c1.upiSales;
                s1Live.cardSales = c1.cardSales;
                s1Live.expenses = c1.expenses;
                s1Live.expected = c1.expectedCash;
                // We add a specific field for original system expectations if we had them
            } else {
                s1Live.cashSales = totalRealtimeCashSales;
                s1Live.upiSales = totalRealtimeUpiSales;
                s1Live.cardSales = totalRealtimeCardSales;
                s1Live.expenses = totalRealtimeExpenses;
                s1Live.expected = o1 ? (o1.totalOpeningCash + s1Live.cashSales - s1Live.expenses) : 0;
            }

            // Shift 2: 
            if (c2) {
                s2Live.cashSales = c2.cashSales;
                s2Live.upiSales = c2.upiSales;
                s2Live.cardSales = c2.cardSales;
                s2Live.expenses = c2.expenses;
                s2Live.expected = c2.expectedCash;
            } else if (o2) {
                const s1AccountedSales = c1?.cashSales || 0;
                const s1AccountedUpi = c1?.upiSales || 0;
                const s1AccountedCard = c1?.cardSales || 0;
                const s1AccountedExpenses = c1?.expenses || 0;

                s2Live.cashSales = Math.max(0, totalRealtimeCashSales - s1AccountedSales);
                s2Live.upiSales = Math.max(0, totalRealtimeUpiSales - s1AccountedUpi);
                s2Live.cardSales = Math.max(0, totalRealtimeCardSales - s1AccountedCard);
                s2Live.expenses = Math.max(0, totalRealtimeExpenses - s1AccountedExpenses);
                s2Live.expected = o2.totalOpeningCash + s2Live.cashSales - s2Live.expenses;
            }

            return {
                id: s ? s.id : `temp-${v.id}`,
                vehicleId: v.id,
                date: dateString,
                tenantId: req.user.tenantId,
                storeId: v.storeId,
                villageName: villageName,
                openingCash: s ? s.openingCash : 0,
                cashSales: s ? s.cashSales : 0,
                upiSales: s ? s.upiSales : 0,
                cardSales: s ? s.cardSales : 0,
                expenses: s ? s.expenses : 0,
                expectedCash: s ? s.expectedCash : 0,
                actualCash: s ? s.actualCash : 0,
                difference: s ? s.difference : 0,
                status: s ? s.status : 'PENDING',
                vehicle: vehicleCopy,
                dailySales: {
                    totalCash: s ? s.cashSales : totalRealtimeCashSales,
                    totalUpi: s ? s.upiSales : totalRealtimeUpiSales,
                    totalCard: s ? s.cardSales : totalRealtimeCardSales,
                    grandTotal: s ? (s.cashSales + s.upiSales + s.cardSales) : (totalRealtimeCashSales + totalRealtimeUpiSales + totalRealtimeCardSales)
                },
                openingDenominations: o1?.denominations || {},
                shiftDetails: {
                    shift1: { opening: o1 || null, closing: c1 || null, live: s1Live },
                    shift2: { opening: o2 || null, closing: c2 || null, live: s2Live }
                }
            };
        });

        // Add Store-level sales (where vehicleId is null) as a virtual record
        // Disabled: do not show POS related sales in daily reconciliation
        /*
        const storeOrders = orderAggregates.filter(o => o.vehicleId === null);
        const storeExpenses = expenseAggregates.filter(e => e.vehicleId === null);

        if (storeOrders.length > 0 || storeExpenses.length > 0) {
            const totalStoreCash = storeOrders.reduce((sum, o) => {
                if (o.paymentMode === 'CASH') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.cashAmount || 0);
                return sum;
            }, 0);
            const totalStoreUpi = storeOrders.reduce((sum, o) => {
                if (o.paymentMode === 'UPI') return sum + (o._sum.totalAmount || 0);
                if (o.paymentMode === 'CASH_UPI') return sum + (o._sum.upiAmount || 0);
                return sum;
            }, 0);
            const totalStoreCard = storeOrders.reduce((sum, o) => {
                if (o.paymentMode === 'CARD') return sum + (o._sum.totalAmount || 0);
                return sum;
            }, 0);
            
            const totalStoreExpenses = storeExpenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

            results.push({
                id: 'STORE_POS',
                vehicle: { vehicleNumber: 'STORE', vehicleName: 'Direct POS Sales', assignedUsers: [], storeId: storeId },
                dailySales: {
                    totalCash: totalStoreCash,
                    totalUpi: totalStoreUpi,
                    totalCard: totalStoreCard,
                    grandTotal: totalStoreCash + totalStoreUpi + totalStoreCard
                },
                shiftDetails: {
                    shift1: { opening: null, closing: null, live: { cashSales: totalStoreCash, upiSales: totalStoreUpi, cardSales: totalStoreCard, expenses: totalStoreExpenses, expected: 0 } },
                    shift2: { opening: null, closing: null, live: { cashSales: 0, upiSales: 0, cardSales: 0, expenses: 0, expected: 0 } }
                }
            });
        }
        */

        // Filter: Show vehicles that have been assigned a float today OR have sales activity OR have a recorded daily summary
        const assignedResults = results.filter(r =>
            (r.shiftDetails?.shift1?.opening !== null && r.shiftDetails?.shift1?.opening !== undefined) ||
            (r.shiftDetails?.shift2?.opening !== null && r.shiftDetails?.shift2?.opening !== undefined) ||
            (r.dailySales?.grandTotal > 0) ||
            (r.id && !r.id.startsWith('temp-'))
        );

        res.json(assignedResults);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Update opening cash for a vehicle (recalculates expected, difference, status)
// @route   PUT /api/cash/admin/reconciliation
// @access  Admin
export const adminUpdateReconciliation = async (req, res, next) => {
    try {
        const { vehicleId, date, openingCash, denominations, remark, shift = 1, isNoService = false } = req.body;

        if (!vehicleId || !date || (!isNoService && openingCash === undefined)) {
            res.status(400);
            throw new Error('Vehicle ID, Date, and Opening Cash are required');
        }

        if (!isNoService) {
            // Validate against Store Safe
            const storeId = getEffectiveStoreId(req);
            if (!storeId) {
                res.status(400);
                throw new Error('Admin must belong to a Store to manage cash.');
            }

            const storeRegister = await prisma.storeCashRegister.findUnique({
                where: { storeId_date: { storeId, date } }
            });

            if (!storeRegister) {
                res.status(400);
                throw new Error('Please initialize the Store Cash Safe for today before assigning floats.');
            }

            // Calculate live available
            const allOpening = await prisma.openingCash.aggregate({
                where: { storeId, date },
                _sum: { totalOpeningCash: true }
            });

            const allDeposits = await prisma.storeDeposit.aggregate({
                where: { storeId, date },
                _sum: { amount: true }
            });

            const approvedAgentClosingSum = await prisma.closingCash.aggregate({
                where: { storeId, date, status: 'APPROVED' },
                _sum: { actualCash: true }
            });

            const assignedOut = allOpening._sum.totalOpeningCash || 0;
            const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
            const liveAvailable = storeRegister.openingCash - assignedOut + receivedIn;

            // Existing float for this shift
            const existing = await prisma.openingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date, shift } }
            });
            const existingFloat = existing ? existing.totalOpeningCash : 0;
            const additionalNeeded = openingCash - existingFloat;

            if (additionalNeeded > liveAvailable) {
                res.status(400);
                throw new Error(`Insufficient Store Cash. Available: ₹${liveAvailable.toFixed(2)}`);
            }
        }

        // Update the specific shift's OpeningCash record
        await prisma.openingCash.upsert({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift }
            },
            update: {
                totalOpeningCash: isNoService ? 0 : openingCash,
                denominations: isNoService ? {} : (denominations || {}),
                isNoService
            },
            create: {
                tenantId: req.user.tenantId,
                storeId: getEffectiveStoreId(req),
                vehicleId,
                date,
                shift,
                userId: req.user.id,
                totalOpeningCash: isNoService ? 0 : openingCash,
                denominations: isNoService ? {} : (denominations || {}),
                isNoService
            },
        });

        if (isNoService) {
            // Also need to set or update closing cash?
            // If it's No Service, automatically create a finalized closing record
            await prisma.closingCash.upsert({
                where: { vehicleId_date_shift: { vehicleId, date, shift } },
                update: {
                    userId: req.user.id,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                },
                create: {
                    tenantId: req.user.tenantId,
                    storeId: getEffectiveStoreId(req),
                    vehicleId,
                    userId: req.user.id,
                    date,
                    shift,
                    openingCash: 0,
                    cashSales: 0,
                    expenses: 0,
                    expectedCash: 0,
                    actualCash: 0,
                    difference: 0,
                    denominations: {},
                    status: 'SUBMITTED',
                    isNoService: true,
                    remark: 'Marked as No Service by Admin'
                }
            });
        } else {
            // If it was changed from No Service -> Regular, delete the auto-generated ClosingCash if it was No Service.
            const existingClosing = await prisma.closingCash.findUnique({
                where: { vehicleId_date_shift: { vehicleId, date, shift } }
            });
            if (existingClosing && existingClosing.isNoService) {
                await prisma.closingCash.delete({
                    where: { vehicleId_date_shift: { vehicleId, date, shift } }
                });
            }
        }

        // Recalculate daily summary
        const updatedSummary = await recalculateDailySummary(vehicleId, date, req.user.tenantId, getEffectiveStoreId(req));

        // SYNC: Update the Store Deposit if it already exists for this shift
        const storeId = getEffectiveStoreId(req);
        const deposit = await prisma.storeDeposit.findUnique({
            where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } }
        });

        if (deposit) {
            const allClosings = await prisma.closingCash.findMany({
                where: {
                    date,
                    shift: parseInt(shift),
                    vehicle: { storeId: storeId }
                }
            });

            const totalAmount = allClosings.reduce((sum, c) => sum + (c.actualCash || 0), 0);
            const totalDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };

            allClosings.forEach(c => {
                if (c.denominations) {
                    Object.entries(c.denominations).forEach(([denom, count]) => {
                        totalDenominations[denom] = (totalDenominations[denom] || 0) + (parseInt(count) || 0);
                    });
                }
            });

            await prisma.storeDeposit.update({
                where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } },
                data: {
                    amount: totalAmount,
                    denominations: totalDenominations,
                    description: `Auto-synced: Consolidated Deposit for Shift ${shift} (${allClosings.length} Agents)`
                }
            });
        }

        const finalSummary = await prisma.dailyCashSummary.findUnique({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            include: {
                vehicle: {
                    select: { vehicleNumber: true, vehicleName: true }
                }
            }
        });

        res.json(finalSummary);

        sendNotification({
            userIds: [finalSummary?.userId],
            roles: ['ADMIN'],
            title: `Shift ${shift} Cash Updated`,
            message: `Admin updated Shift ${shift} opening cash for ${date}.`,
            type: 'cash',
            priority: 'medium',
            metadata: { vehicleId, date, shift, openingCash }
        });
    } catch (error) {
        next(error);
    }
};

// Shared utility to recalculate daily summary (aggregates BOTH shifts)
export async function recalculateDailySummary(vehicleId, date, tenantId, storeId) {
    console.log('[DEBUG] recalculateDailySummary:', { vehicleId, date, tenantId, storeId });
    if (!vehicleId || !date || !tenantId) return;
    try {

        // 1. Get Opening Cash from BOTH shifts
        const openings = await prisma.openingCash.findMany({
            where: { vehicleId, date, tenantId }
        });
        const totalOpeningCash = openings.reduce((sum, o) => sum + o.totalOpeningCash, 0);
        const primaryUserId = openings[0]?.userId || null;

        // Fallback storeId from vehicle if not provided
        let effectiveStoreId = storeId;
        if (!effectiveStoreId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: { storeId: true }
            });
            effectiveStoreId = vehicle?.storeId;
        }

        // 2. Calculate Cash Sales from Orders
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const orderSalesRes = await prisma.order.groupBy({
            by: ['paymentMode'],
            _sum: {
                totalAmount: true,
                cashAmount: true,
                upiAmount: true
            },
            where: {
                vehicleId,
                status: { in: ['DELIVERED', 'COMPLETED'] },
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        // Calculate Cash Sales: Sum of pure CASH orders + cash portions of split orders
        const pureCash = orderSalesRes.find(o => o.paymentMode === 'CASH')?._sum.totalAmount || 0;
        const splitCash = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.cashAmount || 0;
        const cashSales = pureCash + splitCash;

        // Calculate UPI Sales: Sum of pure UPI orders + UPI portions of split orders
        const pureUpi = orderSalesRes.find(o => o.paymentMode === 'UPI')?._sum.totalAmount || 0;
        const splitUpi = orderSalesRes.find(o => o.paymentMode === 'CASH_UPI')?._sum.upiAmount || 0;
        const upiSales = pureUpi + splitUpi;

        const cardSales = orderSalesRes.find(o => o.paymentMode === 'CARD')?._sum.totalAmount || 0;

        // 3. Calculate Approved/Pending Cash Expenses (Smart sum for Partial Payments)
        const cashExpenses = await prisma.expense.findMany({
            where: {
                tenantId,
                vehicleId,
                date,
                paymentMode: 'CASH',
                status: { in: ['PENDING', 'APPROVED', 'PAID'] }
            },
            select: { amount: true, description: true }
        });

        let expenses = 0;
        cashExpenses.forEach(exp => {
            const payMatch = exp.description?.match(/\[PAYMENT:.*?Paid: ₹([\d.]+)\]/);
            if (payMatch && payMatch[1]) {
                expenses += parseFloat(payMatch[1]);
            } else {
                expenses += exp.amount;
            }
        });

        // 4. Get Actual Cash from the LATEST closing (Shift 2 takes priority, fallback to Shift 1)
        const closing2 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift: 2 }
            }
        });
        const closing1 = await prisma.closingCash.findUnique({
            where: {
                vehicleId_date_shift: { vehicleId, date, shift: 1 }
            }
        });

        const latestClosing = closing2 || closing1;
        const actualCash = (closing1?.actualCash || 0) + (closing2?.actualCash || 0);

        // 5. Calculate Expected and Difference
        const expectedCash = totalOpeningCash + cashSales - expenses;
        const difference = actualCash - expectedCash;

        // Determine overall status based on reconciliation and review state
        let finalStatus = 'PENDING';
        if (latestClosing) {
            if (closing1?.status === 'PENDING' || closing2?.status === 'PENDING') {
                finalStatus = 'AWAITING_REVIEW'; // Admin needs to approve
            } else if (closing1?.status === 'REJECTED' || closing2?.status === 'REJECTED') {
                finalStatus = 'REJECTED';
            } else {
                finalStatus = (difference === 0) ? 'MATCHED' : 'MISMATCHED';
            }
        }

        // 6. Upsert Daily Summary
        const summary = await prisma.dailyCashSummary.upsert({
            where: {
                vehicleId_date: { vehicleId, date }
            },
            update: {
                openingCash: totalOpeningCash,
                cashSales,
                upiSales,
                cardSales,
                expenses,
                expectedCash,
                actualCash,
                difference,
                status: finalStatus
            },
            create: {
                tenantId,
                storeId: effectiveStoreId,
                vehicleId,
                userId: primaryUserId,
                date,
                openingCash: totalOpeningCash,
                cashSales,
                upiSales,
                cardSales,
                expenses,
                expectedCash,
                actualCash,
                difference,
                status: finalStatus
            }
        });
        broadcastCashUpdate(effectiveStoreId, date, 'daily_summary_updated', { vehicleId });
        return summary;
    } catch (error) {
        console.error('[RecalculateSummary Error]:', error);
        throw error;
    }
}

// @desc    Admin: Get finance reports (aggregated cash, expenses, profitability)
// @route   GET /api/cash/admin/finance/reports
// @access  Admin
export const getFinanceReports = async (req, res, next) => {
    try {
        const { date, startDate, endDate, storeId } = req.query;
        const targetDate = date || format(new Date(), 'yyyy-MM-dd');
        const tenantId = req.user.tenantId;

        const baseFilter = {
            tenantId,
            ...(date ? { date: targetDate } : {
                date: {
                    gte: startDate,
                    lte: endDate || targetDate
                }
            })
        };

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            baseFilter.storeId = storeId;
        } else {
            // For restricted roles, always lock to their store
            const isRestricted = req.user?.role === 'SALES_AGENT' || req.user?.role === 'MECHANIC';
            const isGlobal =
                req.user?.role === 'TENANT_OWNER' ||
                req.user?.role === 'SUPER_ADMIN' ||
                (req.user?.role === 'ADMIN' && !req.user?.customRoleId) ||
                req.user?.portalType === 'ADMIN';

            if (isRestricted) {
                baseFilter.storeId = req.user.storeId;
            } else if (!isGlobal && req.user.storeId) {
                // If not global and has a storeId (e.g. Branch Manager), lock to it
                baseFilter.storeId = req.user.storeId;
            }
            // If global and no storeId requested, we leave it out of filter to get all stores
        }

        // 1. Daily Summary (Daily Cash Sheet)
        const summaries = await prisma.dailyCashSummary.findMany({
            where: baseFilter,
            include: {
                vehicle: {
                    select: { id: true, vehicleNumber: true }
                },
                user: {
                    select: { name: true }
                }
            }
        });

        // Enrich with route info (similar to getAdminCashSummary)
        const dayName = format(new Date(targetDate), 'EEEE').toUpperCase();
        const dailySummaries = await Promise.all(summaries.map(async (s) => {
            const ra = await prisma.routeAssignment.findFirst({
                where: { vehicleId: s.vehicleId, status: true },
                include: { route: { include: { cycles: true } } }
            });
            const todayCycle = ra?.route?.cycles?.find(c => c.dayOfWeek === dayName);
            const villageName = todayCycle?.villageName || ra?.route?.routeName || 'Unspecified';
            return { ...s, villageName };
        }));

        // 2. Expense Category Breakdown
        const expenseFilter = {
            tenantId,
            status: 'APPROVED',
            ...(date ? { date: targetDate } : {
                date: {
                    gte: startDate,
                    lte: endDate || targetDate
                }
            })
        };
        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            expenseFilter.storeId = storeId;
        } else {
            const isRestricted = req.user?.role === 'SALES_AGENT' || req.user?.role === 'MECHANIC';
            const isGlobal =
                req.user?.role === 'TENANT_OWNER' ||
                req.user?.role === 'SUPER_ADMIN' ||
                (req.user?.role === 'ADMIN' && !req.user?.customRoleId) ||
                req.user?.portalType === 'ADMIN';

            if (isRestricted) {
                expenseFilter.storeId = req.user.storeId;
            } else if (!isGlobal && req.user.storeId) {
                expenseFilter.storeId = req.user.storeId;
            }
        }

        const expenses = await prisma.expense.groupBy({
            by: ['type'],
            _sum: { amount: true },
            where: expenseFilter
        });

        // 3. Profitability (Simplified: Sales - approved expenses)
        const salesByVehicle = await prisma.dailyCashSummary.groupBy({
            by: ['vehicleId'],
            _sum: { cashSales: true, expenses: true },
            where: baseFilter
        });

        // Enforce vehicle names for profitability
        const profitability = await Promise.all(salesByVehicle.map(async (v) => {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: v.vehicleId },
                select: { vehicleNumber: true }
            });
            return {
                vehicleId: v.vehicleId,
                vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                totalSales: v._sum.cashSales || 0,
                totalExpenses: v._sum.expenses || 0,
                profit: (v._sum.cashSales || 0) - (v._sum.expenses || 0)
            };
        }));

        // 4. Branch-wise Shift Statistics
        const [openingsByStore, closingsByStore, pendingByStore] = await Promise.all([
            prisma.openingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId },
                _count: { id: true }
            }),
            prisma.closingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId },
                _count: { id: true }
            }),
            prisma.closingCash.groupBy({
                by: ['storeId'],
                where: { date: targetDate, tenantId, status: 'SUBMITTED' },
                _count: { id: true }
            })
        ]);

        const storeStats = {};
        openingsByStore.forEach(o => {
            const sid = o.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].active += o._count.id;
        });
        closingsByStore.forEach(c => {
            const sid = c.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].active -= c._count.id; // Active = Opened - Closed
        });
        pendingByStore.forEach(p => {
            const sid = p.storeId || 'none';
            if (!storeStats[sid]) storeStats[sid] = { active: 0, pending: 0 };
            storeStats[sid].pending = p._count.id;
        });

        res.json({
            dailySheet: dailySummaries,
            expenseBreakdown: expenses,
            profitability,
            branchStats: storeStats
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Review (Approve/Reject/Edit) closing cash for a vehicle
// @route   PUT /api/cash/admin/closing/review
// @access  Admin
export const adminReviewClosingCash = async (req, res, next) => {
    console.log('[DEBUG] adminReviewClosingCash body:', req.body);
    try {
        const { vehicleId, date, shift, status, actualCash, upiSales, cardSales, denominations, remark } = req.body;

        if (!vehicleId || !date || !shift || !status) {
            res.status(400);
            throw new Error('Vehicle ID, Date, Shift, and Status are required');
        }

        const existingClosing = await prisma.closingCash.findUnique({
            where: { vehicleId_date_shift: { vehicleId, date, shift: parseInt(shift) } }
        });

        if (!existingClosing) {
            res.status(404);
            throw new Error('Closing record not found');
        }

        const updateData = { status };

        // 1. Determine new values against existing
        const newActualCash = actualCash !== undefined ? actualCash : existingClosing.actualCash;
        const newUpiSales = upiSales !== undefined ? upiSales : existingClosing.upiSales;
        const newCardSales = cardSales !== undefined ? cardSales : existingClosing.cardSales;

        // 2. Calculate the variance from what the system originally recorded
        const upiVariance = newUpiSales - existingClosing.upiSales;
        const cardVariance = newCardSales - existingClosing.cardSales;

        // 3. Adjust expectedCash based ONLY on the variance. 
        // If they add 500 to UPI, it means they swapped 500 of physical cash expectation for UPI.
        const newExpectedCash = existingClosing.expectedCash - upiVariance - cardVariance;

        // 4. Calculate new difference
        const newDifference = newActualCash - newExpectedCash;

        if (actualCash !== undefined) updateData.actualCash = newActualCash;
        if (upiSales !== undefined) updateData.upiSales = newUpiSales;
        if (cardSales !== undefined) updateData.cardSales = newCardSales;

        // Notice we do NOT change cashSales. We only shift the expectation to match the modified payment modes.
        updateData.expectedCash = newExpectedCash;
        updateData.difference = newDifference;
        if (denominations) updateData.denominations = denominations;
        if (remark) updateData.remark = remark;

        const closingCash = await prisma.closingCash.update({
            where: { vehicleId_date_shift: { vehicleId, date, shift: parseInt(shift) } },
            data: updateData
        });

        // Recalculate daily summary
        await recalculateDailySummary(vehicleId, date, req.user.tenantId, getEffectiveStoreId(req));

        // SYNC: Update the Store Deposit if it already exists for this shift
        const storeId = getEffectiveStoreId(req);
        const deposit = await prisma.storeDeposit.findUnique({
            where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } }
        });

        if (deposit) {
            const allClosings = await prisma.closingCash.findMany({
                where: {
                    date,
                    shift: parseInt(shift),
                    vehicle: { storeId: storeId } // More robust: link via vehicle's store
                }
            });

            const totalAmount = allClosings.reduce((sum, c) => sum + (c.actualCash || 0), 0);
            const totalDenominations = { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 };

            allClosings.forEach(c => {
                if (c.denominations) {
                    Object.entries(c.denominations).forEach(([denom, count]) => {
                        totalDenominations[denom] = (totalDenominations[denom] || 0) + (parseInt(count) || 0);
                    });
                }
            });

            await prisma.storeDeposit.update({
                where: { storeId_date_shift: { storeId, date, shift: parseInt(shift) } },
                data: {
                    amount: totalAmount,
                    denominations: totalDenominations,
                    description: `Auto-synced: Consolidated Deposit for Shift ${shift} (${allClosings.length} Agents)`
                }
            });
        }

        broadcastCashUpdate(storeId, date, 'CLOSING_CASH_REVIEWED');
        res.json(closingCash);

        // Notify the agent who submitted the cash
        sendNotification({
            userIds: [existingClosing.userId],
            title: `Shift ${shift} Reconciliation ${status}`,
            message: `Your Shift ${shift} closing has been ${status.toLowerCase()} by administration.${status === 'REJECTED' ? ' Please re-submit.' : ''}`,
            type: 'cash',
            priority: status === 'REJECTED' ? 'high' : 'medium',
            metadata: { vehicleId, date, shift, status }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the current day's Store Cash Register summary with live bounds
// @route   GET /api/cash/store-register/:date
// @access  Admin
export const getStoreCashRegister = async (req, res, next) => {
    try {
        const { date } = req.params;
        let inputStoreId = getEffectiveStoreId(req);

        if (inputStoreId === 'all') inputStoreId = null;

        // Resolve storeId to associated warehouseId or store IDs
        let storeIdsToMatch = [];
        if (inputStoreId) {
            storeIdsToMatch.push(inputStoreId);
            const storeRecord = await prisma.store.findUnique({
                where: { id: inputStoreId },
                select: { warehouseId: true }
            });
            if (storeRecord && storeRecord.warehouseId) {
                storeIdsToMatch.push(storeRecord.warehouseId);
            } else {
                const associatedStores = await prisma.store.findMany({
                    where: { warehouseId: inputStoreId },
                    select: { id: true }
                });
                associatedStores.forEach(s => storeIdsToMatch.push(s.id));
            }
        }
        storeIdsToMatch = Array.from(new Set(storeIdsToMatch.filter(Boolean)));

        let storeRegister = null;
        if (storeIdsToMatch.length > 0) {
            storeRegister = await prisma.storeCashRegister.findFirst({
                where: {
                    storeId: { in: storeIdsToMatch },
                    date
                },
                include: {
                    openedBy: { select: { name: true } },
                    closedBy: { select: { name: true } }
                }
            });
        } else {
            storeRegister = await prisma.storeCashRegister.findFirst({
                where: { date },
                include: {
                    openedBy: { select: { name: true } },
                    closedBy: { select: { name: true } }
                }
            });
        }

        let previousRegister = null;
        const previousWhere = storeIdsToMatch.length > 0 ? { storeId: { in: storeIdsToMatch }, date: { lt: date } } : { date: { lt: date } };
        const rawPreviousRegister = await prisma.storeCashRegister.findFirst({
            where: previousWhere,
            orderBy: { date: 'desc' },
            include: {
                closedBy: { select: { name: true } }
            }
        });

        if (rawPreviousRegister) {
            previousRegister = {
                ...rawPreviousRegister,
                actualClosingCash: rawPreviousRegister.actualClosingCash !== null && rawPreviousRegister.actualClosingCash !== undefined
                    ? rawPreviousRegister.actualClosingCash
                    : rawPreviousRegister.openingCash,
                closingDenominations: rawPreviousRegister.closingDenominations !== null && rawPreviousRegister.closingDenominations !== undefined
                    ? rawPreviousRegister.closingDenominations
                    : rawPreviousRegister.openingDenominations
            };
        }

        const baseWhere = storeIdsToMatch.length > 0 ? { storeId: { in: storeIdsToMatch }, date } : { date };

        const allOpening = await prisma.openingCash.aggregate({
            where: baseWhere,
            _sum: { totalOpeningCash: true }
        });

        const allDeposits = await prisma.storeDeposit.aggregate({
            where: baseWhere,
            _sum: { amount: true }
        });

        const allDepositsRecords = await prisma.storeDeposit.findMany({
            where: baseWhere,
            orderBy: { shift: 'asc' }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: baseWhere,
            _sum: { amount: true }
        });

        const allBankDepositsRecords = await prisma.bankDeposit.findMany({
            where: baseWhere,
            include: { admin: { select: { name: true, phone: true } } }
        });

        const cumulativeSafeWhere = storeIdsToMatch.length > 0
            ? { storeId: { in: storeIdsToMatch }, date: { lte: date } }
            : { date: { lte: date } };

        const allSafeDeposits = await prisma.safeTransaction.aggregate({
            where: { ...cumulativeSafeWhere, type: 'DEPOSIT' },
            _sum: { amount: true }
        });

        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({
            where: { ...cumulativeSafeWhere, type: 'WITHDRAW' },
            _sum: { amount: true }
        });

        const cumulativeBankDeposits = await prisma.bankDeposit.aggregate({
            where: cumulativeSafeWhere,
            _sum: { amount: true }
        });

        const approvedAgentClosingSum = await prisma.closingCash.aggregate({
            where: { ...baseWhere, status: 'APPROVED' },
            _sum: { actualCash: true }
        });

        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;
        const cumulativeBankTransferred = cumulativeBankDeposits._sum.amount || 0;

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
        const bankTransferred = allBankDeposits._sum.amount || 0;

        const startOfDay = new Date(`${date}T00:00:00.000+05:30`);
        const endOfDay = new Date(`${date}T23:59:59.999+05:30`);

        const posWhereClause = {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['DELIVERED', 'COMPLETED', 'PAID', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP', 'PARTIALLY_RETURNED', 'RETURNED'] },
            OR: [
                { orderType: 'POS' },
                { fulfillmentType: 'STORE_PICKUP' },
                { AND: [{ vehicleId: null }, { orderType: { not: 'ONLINE' } }, { fulfillmentType: { not: 'HOME_DELIVERY' } }] }
            ]
        };

        if (storeIdsToMatch.length > 0) {
            posWhereClause.AND = [
                {
                    OR: [
                        { warehouseId: { in: storeIdsToMatch } },
                        { allocatedWarehouseId: { in: storeIdsToMatch } },
                        { pickupStoreId: { in: storeIdsToMatch } },
                        { allocatedStoreId: { in: storeIdsToMatch } }
                    ]
                }
            ];
        }

        const allStoreSales = await prisma.order.findMany({
            where: posWhereClause,
            select: { id: true, paymentMode: true, totalAmount: true, cashAmount: true, upiAmount: true }
        });

        // Fetch candidate returns for this date
        const candidateReturns = await prisma.orderReturn.findMany({
            where: { createdAt: { gte: startOfDay, lte: endOfDay } }
        });

        const candidateOrderIds = [...new Set(candidateReturns.map(r => r.orderId))];
        const returnOrders = candidateOrderIds.length > 0 ? await prisma.order.findMany({
            where: { id: { in: candidateOrderIds } },
            select: {
                id: true,
                orderNumber: true,
                paymentMode: true,
                warehouseId: true,
                allocatedWarehouseId: true,
                pickupStoreId: true,
                allocatedStoreId: true
            }
        }) : [];

        const returnOrderMap = returnOrders.reduce((acc, o) => { acc[o.id] = o; return acc; }, {});

        const matchedReturns = candidateReturns.filter(r => {
            if (storeIdsToMatch.length === 0) return true;
            if (r.storeId && storeIdsToMatch.includes(r.storeId)) return true;
            const ord = returnOrderMap[r.orderId];
            if (ord) {
                if (ord.warehouseId && storeIdsToMatch.includes(ord.warehouseId)) return true;
                if (ord.allocatedWarehouseId && storeIdsToMatch.includes(ord.allocatedWarehouseId)) return true;
                if (ord.pickupStoreId && storeIdsToMatch.includes(ord.pickupStoreId)) return true;
                if (ord.allocatedStoreId && storeIdsToMatch.includes(ord.allocatedStoreId)) return true;
            }
            return false;
        });

        const totalStoreReturnsCash = matchedReturns.reduce((sum, r) => sum + (r.returnAmount || 0), 0);

        const expenseWhere = {
            status: { in: ['APPROVED', 'PAID'] },
            paymentMode: 'CASH',
            date: date,
            vehicleId: null
        };
        if (storeIdsToMatch.length > 0) expenseWhere.storeId = { in: storeIdsToMatch };

        const allStoreExpenses = await prisma.expense.findMany({
            where: expenseWhere,
            select: { amount: true }
        });

        const totalStoreExpensesCash = allStoreExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const totalStoreSalesCash = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH' || !o.paymentMode) {
                const returnsForOrder = matchedReturns.filter(r => r.orderId === o.id).reduce((s, r) => s + (r.returnAmount || 0), 0);
                return sum + (o.totalAmount || 0) + returnsForOrder;
            }
            if (o.paymentMode === 'CASH_UPI') {
                return sum + (o.cashAmount || 0);
            }
            return sum;
        }, 0);

        const totalStoreSalesUPI = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'UPI') return sum + (o.totalAmount || 0);
            if (o.paymentMode === 'CASH_UPI') return sum + (o.upiAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesCard = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CARD') return sum + (o.totalAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesCredit = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CREDIT') return sum + (o.totalAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesHybrid = allStoreSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH_UPI') return sum + (o.totalAmount || 0);
            return sum;
        }, 0);

        const totalStoreSalesGrandTotal = allStoreSales.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const totalStoreSalesCount = {
            CASH: allStoreSales.filter(o => o.paymentMode === 'CASH').length,
            UPI: allStoreSales.filter(o => o.paymentMode === 'UPI').length,
            CARD: allStoreSales.filter(o => o.paymentMode === 'CARD').length,
            CREDIT: allStoreSales.filter(o => o.paymentMode === 'CREDIT').length,
            HYBRID: allStoreSales.filter(o => o.paymentMode === 'CASH_UPI').length,
        };

        const onlineWhereClause = {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['DELIVERED', 'COMPLETED'] },
            OR: [
                { orderType: 'ONLINE' },
                { fulfillmentType: 'HOME_DELIVERY' }
            ]
        };

        if (storeIdsToMatch.length > 0) {
            onlineWhereClause.AND = [
                {
                    OR: [
                        { warehouseId: { in: storeIdsToMatch } },
                        { allocatedWarehouseId: { in: storeIdsToMatch } },
                        { pickupStoreId: { in: storeIdsToMatch } },
                        { allocatedStoreId: { in: storeIdsToMatch } }
                    ]
                }
            ];
        }

        const allOnlineSales = await prisma.order.findMany({
            where: onlineWhereClause,
            select: { paymentMode: true, totalAmount: true, cashAmount: true, upiAmount: true }
        });

        const totalOnlineSalesUPI = allOnlineSales.reduce((sum, o) => {
            if (o.paymentMode === 'UPI' || o.paymentMode === 'ONLINE') return sum + (o.totalAmount || 0);
            if (o.paymentMode === 'CASH_UPI') return sum + (o.upiAmount || 0);
            return sum;
        }, 0);

        const totalOnlineSalesCash = allOnlineSales.reduce((sum, o) => {
            if (o.paymentMode === 'CASH' || !o.paymentMode) return sum + (o.totalAmount || 0);
            if (o.paymentMode === 'CASH_UPI') return sum + (o.cashAmount || 0);
            return sum;
        }, 0);

        const totalOnlineSalesCard = allOnlineSales.reduce((sum, o) => {
            if (o.paymentMode === 'CARD') return sum + (o.totalAmount || 0);
            return sum;
        }, 0);

        const totalOnlineSalesCredit = allOnlineSales.reduce((sum, o) => {
            if (o.paymentMode === 'CREDIT') return sum + (o.totalAmount || 0);
            return sum;
        }, 0);

        const totalOnlineGrandTotal = allOnlineSales.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        let totalStoreCash = (storeRegister ? storeRegister.openingCash : 0) - assignedOut + receivedIn + totalStoreSalesCash - totalStoreReturnsCash - bankTransferred - totalStoreExpensesCash;
        let safeBalance = movedToSafe - withdrawnFromSafe - cumulativeBankTransferred;
        let availableCash = totalStoreCash - (movedToSafe - withdrawnFromSafe - bankTransferred);

        const shiftCollectionsVal = await prisma.closingCash.groupBy({
            by: ['shift'],
            where: {
                date,
                ...(storeIdsToMatch.length > 0 ? { vehicle: { storeId: { in: storeIdsToMatch } } } : {})
            },
            _sum: { actualCash: true }
        });

        res.json({
            storeRegister,
            previousRegister,
            storeDeposits: allDepositsRecords,
            bankDeposits: allBankDepositsRecords,
            shiftCollections: shiftCollectionsVal,
            liveMetrics: {
                assignedOut,
                receivedIn,
                bankTransferred,
                totalStoreSalesCash,
                totalStoreSalesUPI,
                totalStoreSalesCard,
                totalStoreSalesCredit,
                totalStoreSalesHybrid,
                totalStoreSalesGrandTotal,
                totalStoreSalesCount,
                totalOnlineSalesUPI,
                totalOnlineSalesCash,
                totalOnlineSalesCard,
                totalOnlineSalesCredit,
                totalOnlineGrandTotal,
                totalStoreReturnsCash: parseFloat(totalStoreReturnsCash.toFixed(2)),
                totalStoreExpensesCash: parseFloat(totalStoreExpensesCash.toFixed(2)),
                totalStoreCash: parseFloat(totalStoreCash.toFixed(2)),
                safeBalance: parseFloat(safeBalance.toFixed(2)),
                availableCash: parseFloat(availableCash.toFixed(2)),
                liveExpected: parseFloat(totalStoreCash.toFixed(2))
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get computed audit ledger for store cash register
// @route   GET /api/cash/store-register/:date/ledger
// @access  Admin
export const getStoreCashLedger = async (req, res, next) => {
    try {
        const { date } = req.params;
        let inputStoreId = getEffectiveStoreId(req);
        if (inputStoreId === 'all') inputStoreId = null;

        // Resolve storeId to associated warehouseId or store IDs
        let storeIdsToMatch = [];
        if (inputStoreId) {
            storeIdsToMatch.push(inputStoreId);
            const storeRecord = await prisma.store.findUnique({
                where: { id: inputStoreId },
                select: { warehouseId: true }
            });
            if (storeRecord && storeRecord.warehouseId) {
                storeIdsToMatch.push(storeRecord.warehouseId);
            } else {
                const associatedStores = await prisma.store.findMany({
                    where: { warehouseId: inputStoreId },
                    select: { id: true }
                });
                associatedStores.forEach(s => storeIdsToMatch.push(s.id));
            }
        }
        storeIdsToMatch = Array.from(new Set(storeIdsToMatch.filter(Boolean)));

        let storeRegister = null;
        if (storeIdsToMatch.length > 0) {
            storeRegister = await prisma.storeCashRegister.findFirst({
                where: {
                    storeId: { in: storeIdsToMatch },
                    date
                },
                include: {
                    openedBy: { select: { name: true } },
                    closedBy: { select: { name: true } }
                }
            });
        } else {
            storeRegister = await prisma.storeCashRegister.findFirst({
                where: { date },
                include: {
                    openedBy: { select: { name: true } },
                    closedBy: { select: { name: true } }
                }
            });
        }

        // We continue even if storeRegister is missing so already logged expenses/sales show up
        const isInitialized = !!storeRegister;
        const openingCash = storeRegister?.openingCash || 0;
        let runningBalance = 0;

        const baseWhere = storeIdsToMatch.length > 0 ? { storeId: { in: storeIdsToMatch }, date } : { date };

        // Fetch all related records for this store & date
        const agentOutflows = await prisma.openingCash.findMany({
            where: baseWhere,
            include: {
                vehicle: {
                    select: {
                        vehicleNumber: true,
                        vehicleName: true,
                        assignedUsers: { select: { name: true, role: true } }
                    }
                },
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const agentInflows = await prisma.storeDeposit.findMany({
            where: baseWhere,
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const bankTransfers = await prisma.bankDeposit.findMany({
            where: baseWhere,
            include: { admin: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const safeMovements = await prisma.safeTransaction.findMany({
            where: baseWhere,
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });

        const startOfDay = new Date(`${date}T00:00:00.000+05:30`);
        const endOfDay = new Date(`${date}T23:59:59.999+05:30`);

        const posSalesWhere = {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['DELIVERED', 'COMPLETED', 'PAID', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP', 'PARTIALLY_RETURNED', 'RETURNED'] },
            OR: [
                { orderType: 'POS' },
                { fulfillmentType: 'STORE_PICKUP' },
                { AND: [{ vehicleId: null }, { orderType: { not: 'ONLINE' } }, { fulfillmentType: { not: 'HOME_DELIVERY' } }] }
            ]
        };

        if (storeIdsToMatch.length > 0) {
            posSalesWhere.AND = [
                {
                    OR: [
                        { warehouseId: { in: storeIdsToMatch } },
                        { allocatedWarehouseId: { in: storeIdsToMatch } },
                        { pickupStoreId: { in: storeIdsToMatch } },
                        { allocatedStoreId: { in: storeIdsToMatch } }
                    ]
                }
            ];
        }

        const storeSales = await prisma.order.findMany({
            where: posSalesWhere,
            include: {
                consumer: { select: { name: true, phone: true } },
                items: { include: { product: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // 🆕 Fetch Store Returns
        const candidateReturns = await prisma.orderReturn.findMany({
            where: { createdAt: { gte: startOfDay, lte: endOfDay } },
            orderBy: { createdAt: 'asc' }
        });

        const returnOrderIds = [...new Set(candidateReturns.map(r => r.orderId))];
        const returnProductIds = [...new Set(candidateReturns.map(r => r.productId))];

        const [returnOrders, returnProducts] = await Promise.all([
            returnOrderIds.length > 0 ? prisma.order.findMany({
                where: { id: { in: returnOrderIds } },
                select: {
                    id: true,
                    orderNumber: true,
                    paymentMode: true,
                    totalAmount: true,
                    warehouseId: true,
                    allocatedWarehouseId: true,
                    pickupStoreId: true,
                    allocatedStoreId: true,
                    consumer: { select: { name: true, phone: true } }
                }
            }) : [],
            returnProductIds.length > 0 ? prisma.product.findMany({
                where: { id: { in: returnProductIds } },
                select: { id: true, name: true }
            }) : []
        ]);

        const returnOrderMap = returnOrders.reduce((acc, o) => { acc[o.id] = o; return acc; }, {});
        const returnProductMap = returnProducts.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

        const storeReturns = candidateReturns.filter(r => {
            if (storeIdsToMatch.length === 0) return true;
            if (r.storeId && storeIdsToMatch.includes(r.storeId)) return true;
            const ord = returnOrderMap[r.orderId];
            if (ord) {
                if (ord.warehouseId && storeIdsToMatch.includes(ord.warehouseId)) return true;
                if (ord.allocatedWarehouseId && storeIdsToMatch.includes(ord.allocatedWarehouseId)) return true;
                if (ord.pickupStoreId && storeIdsToMatch.includes(ord.pickupStoreId)) return true;
                if (ord.allocatedStoreId && storeIdsToMatch.includes(ord.allocatedStoreId)) return true;
            }
            return false;
        });

        const expenseWhere = {
            status: { in: ['APPROVED', 'PAID'] },
            date: date
        };
        if (storeIdsToMatch.length > 0) expenseWhere.storeId = { in: storeIdsToMatch };

        const storeExpenses = await prisma.expense.findMany({
            where: expenseWhere,
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                status: true,
                paymentMode: true,
                vehicleId: true,
                createdAt: true,
                displayId: true,
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Build ledger entries
        const entries = [];

        // 1. Opening entry (only if initialized)
        if (isInitialized) {
            entries.push({
                id: storeRegister.id,
                type: 'OPENING',
                label: 'Opening Balance',
                amount: openingCash,
                direction: 'IN',
                timestamp: new Date(`${date}T00:00:00.000+05:30`),
                userName: storeRegister.openedBy?.name || 'Admin',
                reference: null,
                referenceName: 'Daily Opening Cash',
                metadata: { denominations: storeRegister.openingDenominations }
            });
        }

        // 2. Agent outflows (float given to agents)
        agentOutflows.forEach(o => {
            if (o.totalOpeningCash <= 0 && !o.isNoService) return;
            const agentName = o.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT')?.name || 'Unknown Agent';
            entries.push({
                id: o.id,
                type: 'AGENT_OUTFLOW',
                label: `Float Assigned → ${agentName}`,
                amount: o.totalOpeningCash,
                direction: 'OUT',
                timestamp: o.createdAt,
                userName: o.user?.name || 'Admin',
                reference: o.vehicleId,
                referenceName: `${agentName} • ${o.vehicle?.vehicleNumber || ''} • Shift ${o.shift}`,
                metadata: { shift: o.shift, denominations: o.denominations, vehicleNumber: o.vehicle?.vehicleNumber, isNoService: o.isNoService }
            });
        });

        // 3. Agent inflows (shift cash deposited into safe)
        agentInflows.forEach(d => {
            entries.push({
                id: d.id,
                type: 'AGENT_INFLOW',
                label: `Cash Deposited ← ${d.user?.name || 'Agent'}`,
                amount: d.amount,
                direction: 'IN',
                timestamp: d.createdAt,
                userName: d.user?.name || 'Agent',
                reference: d.id,
                referenceName: `Shift ${d.shift} Cash`,
                metadata: { shift: d.shift, denominations: d.denominations, date: d.date }
            });
        });

        // 4. Store Expenses Outflows
        storeExpenses.forEach(e => {
            let displayAmount = e.amount;
            let isPartial = false;

            // Extract actual paid amount from metadata if it's a partial payment
            if (e.description && e.description.includes('[PAYMENT:')) {
                const paidMatch = e.description.match(/Paid:\s*₹?(\d+(\.\d+)?)/i);
                if (paidMatch && paidMatch[1]) {
                    displayAmount = parseFloat(paidMatch[1]);
                    if (e.description.includes('PARTIAL')) {
                        isPartial = true;
                    }
                }
            }

            entries.push({
                id: e.id,
                type: 'EXPENSE_OUTFLOW',
                label: `Expense: ${e.type}${isPartial ? ' (PARTIAL)' : ''}`,
                amount: displayAmount,
                direction: 'OUT',
                timestamp: e.createdAt,
                userName: e.user?.name || 'Staff',
                reference: e.id,
                referenceName: `${e.displayId || 'EXP'} • ${e.type}${isPartial ? ' [Partial]' : ''}`,
                metadata: {
                    description: e.description,
                    status: e.status,
                    paymentMode: e.paymentMode,
                    vehicleId: e.vehicleId,
                    fullAmount: e.amount,
                    isPartial: isPartial,
                    displayId: e.displayId
                }
            });
        });

        // 5. Bank transfers (cash moved from safe to bank)
        bankTransfers.forEach(b => {
            entries.push({
                id: b.id,
                type: 'BANK_TRANSFER',
                label: `Bank Transfer → ${b.branchName}`,
                amount: b.amount,
                direction: 'OUT',
                timestamp: b.createdAt || b.dateTime,
                userName: b.admin?.name || b.depositedBy,
                reference: b.id,
                referenceName: `${b.branchName} • ${b.depositedBy}`,
                metadata: { branchName: b.branchName, receiptImage: b.receiptImage, remark: b.remark }
            });
        });

        // 6. Safe movements (Available <-> Safe)
        safeMovements.forEach(s => {
            entries.push({
                id: s.id,
                type: 'SAFE_MOVEMENT',
                label: s.type === 'DEPOSIT' ? 'Moved to Safe' : 'Moved to Available',
                amount: s.amount,
                direction: s.type === 'DEPOSIT' ? 'OUT_TO_SAFE' : 'IN_FROM_SAFE',
                timestamp: s.createdAt,
                userName: s.user?.name || 'Admin',
                reference: s.id,
                referenceName: s.description || (s.type === 'DEPOSIT' ? 'Counter → Safe' : 'Safe → Counter'),
                metadata: { type: s.type, denominations: s.denominations, description: s.description }
            });
        });

        // 7. Direct POS Sales (Admin POS)
        storeSales.forEach(o => {
            const returnsForOrder = storeReturns.filter(r => r.orderId === o.id).reduce((sum, r) => sum + (r.returnAmount || 0), 0);
            const originalTotal = (o.totalAmount || 0) + returnsForOrder;
            const saleCash = o.paymentMode === 'CASH' ? originalTotal : (o.cashAmount ? (o.cashAmount + returnsForOrder) : 0);
            entries.push({
                id: o.id,
                type: 'STORE_SALE',
                label: `POS Sale • ${o.paymentMode || 'CASH'} • ${o.orderNumber}`,
                amount: originalTotal,           // Total original amount
                cashImpact: saleCash,           // Actual cash added to register
                direction: 'IN',
                timestamp: o.createdAt,
                userName: o.consumer?.name || 'Admin',
                reference: o.id,
                referenceName: `${o.consumer?.name || 'Walk-in'} • ${o.consumer?.phone || 'No Mobile'}`,
                metadata: {
                    orderNumber: o.orderNumber,
                    paymentMode: o.paymentMode,
                    items: o.items.map(i => ({ name: i.product?.name, qty: i.quantity, price: i.price }))
                }
            });
        });

        // 8. Store Returns Outflows — store returns are paid out of counter cash
        storeReturns.forEach(r => {
            const ord = returnOrderMap[r.orderId];
            const prod = returnProductMap[r.productId];
            entries.push({
                id: r.id,
                type: 'RETURN_OUTFLOW',
                label: `Return Refund • ${prod?.name || 'Item'} (x${r.returnQty})`,
                amount: r.returnAmount,
                cashImpact: r.returnAmount,
                direction: 'OUT',
                timestamp: r.createdAt,
                userName: 'Store Cashier',
                reference: r.orderId,
                referenceName: `Order #${ord?.orderNumber || r.orderId.slice(-6)} • Refund`,
                metadata: {
                    orderId: r.orderId,
                    orderNumber: ord?.orderNumber,
                    reason: r.reason,
                    returnQty: r.returnQty,
                    productName: prod?.name,
                    paymentMode: ord?.paymentMode || 'CASH'
                }
            });
        });

        entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Compute running balance — tracks Total Store Cash (Available + Safe)
        const ledger = entries.map(entry => {
            const before = runningBalance;

            if (entry.type === 'STORE_SALE') {
                // Only the cash portion of a POS sale enters the store's physical cash
                runningBalance += (entry.cashImpact || 0);
            } else if (entry.direction === 'IN') {
                runningBalance += entry.amount;
            } else if (entry.direction === 'OUT') {
                // Determine if this outflow should deduct from physical store balance
                if (entry.type === 'RETURN_OUTFLOW') {
                    if (entry.cashImpact) {
                        runningBalance -= entry.cashImpact;
                    }
                } else if (entry.type === 'EXPENSE_OUTFLOW') {
                    const isStoreCash = entry.metadata?.paymentMode === 'CASH' && !entry.metadata?.vehicleId;
                    const isReimbursement = entry.metadata?.paymentMode === 'PERSONAL_CASH';
                    if (isStoreCash || isReimbursement) {
                        runningBalance -= entry.amount;
                    }
                } else {
                    // Agent Outflows (Float) and Bank Transfers ALWAYS deduct from store cash
                    runningBalance -= entry.amount;
                }
            } else if (entry.type === 'SAFE_MOVEMENT') {
                // Internal movements (Counter <-> Safe) do not change the TOTAL store balance
                // runningBalance += 0;
            }

            return {
                ...entry,
                balanceBefore: parseFloat(before.toFixed(2)),
                balanceAfter: parseFloat(runningBalance.toFixed(2))
            };
        });

        // Closing entry if store is closed
        if (isInitialized && storeRegister.status === 'CLOSED' && storeRegister.actualClosingCash !== null) {
            ledger.push({
                id: `${storeRegister.id}-closing`,
                type: 'CLOSING',
                label: 'Store Safe Closed',
                amount: storeRegister.actualClosingCash,
                direction: 'NEUTRAL',
                timestamp: storeRegister.updatedAt,
                userName: storeRegister.closedBy?.name || 'Admin',
                reference: null,
                referenceName: `Physical: ₹${storeRegister.actualClosingCash?.toFixed(2)} | Variance: ₹${storeRegister.closingDifference?.toFixed(2)}`,
                metadata: {
                    expectedClosingCash: storeRegister.expectedClosingCash,
                    actualClosingCash: storeRegister.actualClosingCash,
                    closingDifference: storeRegister.closingDifference,
                    denominations: storeRegister.closingDenominations,
                    closingRemarks: storeRegister.closingRemarks
                },
                balanceBefore: parseFloat(runningBalance.toFixed(2)),
                balanceAfter: parseFloat(runningBalance.toFixed(2))
            });
        }

        const totalOutflow = entries.filter(e => e.type === 'AGENT_OUTFLOW').reduce((s, e) => s + e.amount, 0);
        const totalInflow = entries.filter(e => e.type === 'AGENT_INFLOW').reduce((s, e) => s + e.amount, 0);
        const totalBank = entries.filter(e => e.type === 'BANK_TRANSFER').reduce((s, e) => s + e.amount, 0);

        // Calculate Safe Cash specifically (Persistent across all days up to this date)
        const cumulativeSafeWhere = storeIdsToMatch.length > 0 ? { storeId: { in: storeIdsToMatch }, date: { lte: date } } : { date: { lte: date } };
        const [cumSafeDep, cumSafeWith, cumBankDep] = await Promise.all([
            prisma.safeTransaction.aggregate({ where: { ...cumulativeSafeWhere, type: 'DEPOSIT' }, _sum: { amount: true } }),
            prisma.safeTransaction.aggregate({ where: { ...cumulativeSafeWhere, type: 'WITHDRAW' }, _sum: { amount: true } }),
            prisma.bankDeposit.aggregate({ where: cumulativeSafeWhere, _sum: { amount: true } })
        ]);
        const safeBalance = (cumSafeDep._sum.amount || 0) - (cumSafeWith._sum.amount || 0) - (cumBankDep._sum.amount || 0);

        const totalMovedToSafe = safeMovements.filter(s => s.type === 'DEPOSIT').reduce((s, e) => s + e.amount, 0);
        const totalWithdrawnFromSafe = safeMovements.filter(s => s.type === 'WITHDRAW').reduce((s, e) => s + e.amount, 0);

        const totalStoreCash = parseFloat(runningBalance.toFixed(2));
        const availableCash = totalStoreCash - (totalMovedToSafe - totalWithdrawnFromSafe - totalBank);

        const totalReturns = entries.filter(e => e.type === 'RETURN_OUTFLOW').reduce((s, e) => s + (e.cashImpact || 0), 0);

        res.json({
            ledger: ledger.reverse(),
            summary: {
                openingCash: openingCash,
                totalOutflow: parseFloat(totalOutflow.toFixed(2)),
                totalInflow: parseFloat(totalInflow.toFixed(2)),
                totalBankTransfer: parseFloat(totalBank.toFixed(2)),
                totalStoreReturnsCash: parseFloat(totalReturns.toFixed(2)),
                totalStoreCash,
                safeBalance: parseFloat(safeBalance.toFixed(2)),
                availableCash: parseFloat(availableCash.toFixed(2)),
                currentBalance: totalStoreCash, // Keeping for backward compatibility
                status: storeRegister?.status || 'NOT_INITIALIZED',
                entryCount: ledger.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add movement between Available Cash and Safe Cash
// @route   POST /api/cash/safe-movement
// @access  Admin
export const createSafeTransaction = async (req, res, next) => {
    try {
        const { date, amount, type, denominations, description } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || !amount || !type) {
            res.status(400);
            throw new Error('Store ID, Date, Amount, and Type are required');
        }

        // Normalize movement type ('DEPOSIT_TO_SAFE' -> 'DEPOSIT', 'WITHDRAW_TO_COUNTER' -> 'WITHDRAW')
        const normalizedType = (type === 'DEPOSIT_TO_SAFE' || type === 'DEPOSIT') ? 'DEPOSIT' : 'WITHDRAW';

        // 🆕 Strict bounds checking on backend
        const allOpening = await prisma.openingCash.aggregate({ where: { storeId, date }, _sum: { totalOpeningCash: true } });
        const allDeposits = await prisma.storeDeposit.aggregate({ where: { storeId, date }, _sum: { amount: true } });
        const allBankDeposits = await prisma.bankDeposit.aggregate({ where: { storeId, date }, _sum: { amount: true } });
        const allSafeDeposits = await prisma.safeTransaction.aggregate({ where: { storeId, date, type: 'DEPOSIT' }, _sum: { amount: true } });
        const allSafeWithdrawals = await prisma.safeTransaction.aggregate({ where: { storeId, date, type: 'WITHDRAW' }, _sum: { amount: true } });
        const approvedAgentClosingSum = await prisma.closingCash.aggregate({
            where: { storeId, date, status: 'APPROVED' },
            _sum: { actualCash: true }
        });
        const storeRegister = await prisma.storeCashRegister.findUnique({ where: { storeId_date: { storeId, date } } });

        if (!storeRegister) {
            res.status(400);
            throw new Error('Store Register not found for this date. Initialize safe first.');
        }

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
        const bankTransferred = allBankDeposits._sum.amount || 0;
        // Cumulative safe aggregations (Safe is persistent across days)
        const [cumSafeDep, cumSafeWith, cumBankDep] = await Promise.all([
            prisma.safeTransaction.aggregate({ where: { storeId, date: { lte: date }, type: 'DEPOSIT' }, _sum: { amount: true } }),
            prisma.safeTransaction.aggregate({ where: { storeId, date: { lte: date }, type: 'WITHDRAW' }, _sum: { amount: true } }),
            prisma.bankDeposit.aggregate({ where: { storeId, date: { lte: date } }, _sum: { amount: true } })
        ]);

        const movedToSafeToday = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafeToday = allSafeWithdrawals._sum.amount || 0;

        // Add POS Sales (CASH part — in-store only)
        const storeSales = await prisma.order.findMany({
            where: {
                warehouseId: storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['DELIVERED', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true }
        });

        const totalPOSCash = storeSales.reduce((sum, o) => {
            const cash = o.paymentMode === 'CASH' ? o.totalAmount : (o.cashAmount || 0);
            return sum + cash;
        }, 0);

        // Standard Calculation
        const totalStoreCash = storeRegister.openingCash + totalPOSCash + receivedIn - assignedOut - bankTransferred;
        const persistentSafeBalance = (cumSafeDep._sum.amount || 0) - (cumSafeWith._sum.amount || 0) - (cumBankDep._sum.amount || 0);
        const availableCash = totalStoreCash - (movedToSafeToday - withdrawnFromSafeToday - bankTransferred);

        if (normalizedType === 'DEPOSIT' && amount > (availableCash + 0.01)) {
            res.status(400);
            throw new Error(`Limit Exceeded: The movement amount exceeds the available cash on hand (Current Max: ₹${Math.max(0, availableCash).toFixed(2)})`);
        }
        if (normalizedType === 'WITHDRAW' && amount > persistentSafeBalance) {
            res.status(400);
            throw new Error(`Limit Exceeded: The requested withdrawal exceeds the currently available safe balance (Current Max: ₹${Math.max(0, persistentSafeBalance).toFixed(2)})`);
        }

        const movement = await prisma.safeTransaction.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                amount,
                type: normalizedType, // DEPOSIT or WITHDRAW
                denominations,
                description,
                userId: req.user.id
            }
        });

        broadcastCashUpdate(storeId, date, 'safe_transaction_created', { movementId: movement.id });
        res.json(movement);
    } catch (error) {
        next(error);
    }
};

// @desc    Open the Store Cash Register for the day
// @route   POST /api/cash/store-register/open
// @access  Admin
export const openStoreCashRegister = async (req, res, next) => {
    const { date, openingCash, denominations, openingRemarks } = req.body;
    let storeId;
    try {
        storeId = getEffectiveStoreId(req);

        if (!storeId || !date || openingCash === undefined || !denominations) {
            res.status(400);
            throw new Error('Store ID, Date, Opening Cash, and Denominations are required');
        }

        const newRegister = await prisma.storeCashRegister.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                openingCash,
                openingDenominations: denominations,
                openingRemarks: openingRemarks || null,
                openedById: req.user.id,
                status: 'OPEN'
            }
        });

        broadcastCashUpdate(storeId, date, 'store_register_opened');
        res.json(newRegister);
    } catch (error) {
        if (error.code === 'P2002') {
            // Idempotent: If already open, just return the existing one
            const existing = await prisma.storeCashRegister.findUnique({
                where: { storeId_date: { storeId, date } }
            });
            if (existing) {
                if (existing.status === 'CLOSED') {
                    const reopened = await prisma.storeCashRegister.update({
                        where: { id: existing.id },
                        data: {
                            status: 'OPEN',
                            openingCash,
                            openingDenominations: denominations,
                            openingRemarks: openingRemarks || null,
                            openedById: req.user.id,
                            // Preserve the last closing cash before wiping — used for mismatch comparison in UI
                            lastClosingCash: existing.actualClosingCash,
                            expectedClosingCash: null,
                            actualClosingCash: null,
                            closingDifference: null,
                            closingDenominations: null,
                            closedById: null,
                            closingRemarks: null
                        }
                    });
                    broadcastCashUpdate(storeId, date, 'store_register_reopened');
                    return res.json(reopened);
                }
                return res.json(existing);
            }

            res.status(400);
            return next(new Error('Store Cash Register is already open for this date'));
        }
        next(error);
    }
};

// @desc    Close the Store Cash Register for the day
// @route   POST /api/cash/store-register/close
// @access  Admin
export const closeStoreCashRegister = async (req, res, next) => {
    try {
        const { date, actualClosingCash, denominations, remarks } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || actualClosingCash === undefined || !denominations) {
            res.status(400);
            throw new Error('Store ID, Date, Closing Cash, and Denominations are required');
        }

        // Calculate live expected physically first
        const storeRegister = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } }
        });

        if (!storeRegister) {
            res.status(404);
            throw new Error('Store Cash Register not found for this date');
        }

        if (storeRegister.status === 'CLOSED') {
            res.status(400);
            throw new Error('Store Cash Register is already closed for this date');
        }

        // Accumulate all factors for Available Cash (Counter Cash)
        const allOpening = await prisma.openingCash.aggregate({
            where: { storeId, date },
            _sum: { totalOpeningCash: true }
        });

        const allDeposits = await prisma.storeDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        const allBankDeposits = await prisma.bankDeposit.aggregate({
            where: { storeId, date },
            _sum: { amount: true }
        });

        const approvedAgentClosingSum = await prisma.closingCash.aggregate({
            where: { storeId, date, status: 'APPROVED' },
            _sum: { actualCash: true }
        });

        // POS Cash Sales (in-store only)
        const storeSales = await prisma.order.findMany({
            where: {
                warehouseId: storeId,
                vehicleId: null,
                createdAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`)
                },
                status: { in: ['DELIVERED', 'COMPLETED'] }
            },
            select: { paymentMode: true, totalAmount: true, cashAmount: true }
        });

        const totalPOSCash = storeSales.reduce((sum, o) => {
            const cash = o.paymentMode === 'CASH' ? o.totalAmount : (o.cashAmount || 0);
            return sum + cash;
        }, 0);

        const assignedOut = allOpening._sum.totalOpeningCash || 0;
        const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
        const bankTransferred = allBankDeposits._sum.amount || 0;

        // Expected Available Cash = Opening + POS_Cash + Agent_Deposits - Agent_Deployments - Bank_Transfers
        const liveExpected = storeRegister.openingCash + totalPOSCash + receivedIn - assignedOut - bankTransferred;

        const closingDifference = actualClosingCash - liveExpected;

        const closedRegister = await prisma.storeCashRegister.update({
            where: { storeId_date: { storeId, date } },
            data: {
                expectedClosingCash: liveExpected,
                actualClosingCash,
                closingDifference,
                closingDenominations: denominations,
                closingRemarks: remarks,
                closedById: req.user.id,
                status: 'CLOSED'
            }
        });

        broadcastCashUpdate(storeId, date, 'store_register_closed');
        res.json(closedRegister);
    } catch (error) {
        next(error);
    }
};

// @desc    RESET Store Cash Register for testing
// @route   DELETE /api/cash/store-register/:date/reset
// @access  Admin
export const resetStoreCashRegister = async (req, res, next) => {
    try {
        const { date } = req.params;
        const storeId = getEffectiveStoreId(req);

        await prisma.storeCashRegister.delete({
            where: { storeId_date: { storeId, date } }
        });

        broadcastCashUpdate(storeId, date, 'store_register_reset');
        res.json({ message: 'Register reset successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Create a store deposit per shift
// @route   POST /api/cash/store-register/deposit
// @access  Admin
export const createStoreDeposit = async (req, res, next) => {
    try {
        const { date, shift, amount, denominations, description } = req.body;
        const storeId = getEffectiveStoreId(req);

        const parsedAmount = Number(amount);
        const parsedShift = parseInt(shift);

        if (!storeId || !date || isNaN(parsedShift) || isNaN(parsedAmount)) {
            res.status(400);
            throw new Error('All fields are required (date, shift, amount, denominations, description)');
        }

        const effectiveDescription = (description && String(description).trim()) 
            ? String(description).trim() 
            : `Shift ${parsedShift} Safe Deposit`;
        const effectiveDenominations = (denominations && typeof denominations === 'object') ? denominations : {};

        const deposit = await prisma.storeDeposit.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                shift: parsedShift,
                amount: parsedAmount,
                denominations: effectiveDenominations,
                description: effectiveDescription,
                userId: req.user.id
            }
        });

        broadcastCashUpdate(storeId, date, 'store_deposit_created');
        res.json(deposit);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error(`A deposit for shift ${req.body.shift} has already been submitted for this date.`));
        }
        next(error);
    }
};

// @desc    Admin: Update Store Cash Register (Opening Cash or reset status)
// @route   PATCH /api/cash/store-register/update
// @access  Admin
export const updateStoreCashRegister = async (req, res, next) => {
    try {
        const { date, openingCash, denominations, status, actualClosingCash, isClosingUpdate } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date) {
            res.status(400);
            throw new Error('Store ID and Date are required');
        }

        const existing = await prisma.storeCashRegister.findUnique({
            where: { storeId_date: { storeId, date } }
        });

        if (!existing) {
            res.status(404);
            throw new Error('Store Register not found');
        }

        const updateData = {};
        if (openingCash !== undefined) updateData.openingCash = openingCash;
        if (denominations) updateData.openingDenominations = denominations;
        if (status) updateData.status = status;

        if (isClosingUpdate && actualClosingCash !== undefined) {
            updateData.actualClosingCash = actualClosingCash;
            updateData.closingDenominations = denominations; // reuse denominations field if provided
            updateData.closingDifference = actualClosingCash - existing.expectedClosingCash;
        }

        const updated = await prisma.storeCashRegister.update({
            where: { storeId_date: { storeId, date } },
            data: updateData
        });

        broadcastCashUpdate(storeId, date, 'store_register_updated');
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Update a specific Store Deposit
// @route   PATCH /api/cash/store-register/deposit/:id
// @access  Admin
export const updateStoreDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, denominations, description } = req.body;
        const tenantId = req.user.tenantId;

        if (!id) {
            res.status(400);
            throw new Error('Deposit ID is required');
        }

        const updated = await prisma.storeDeposit.update({
            where: { id, tenantId },
            data: {
                amount: parseFloat(amount),
                denominations: denominations || {},
                description
            }
        });

        broadcastCashUpdate(updated.storeId, updated.date, 'store_deposit_updated');
        res.json(updated);
    } catch (error) {
        console.error('[updateStoreDeposit Error]:', error);
        next(error);
    }
};

// @desc    Admin: Delete a specific Store Deposit
// @route   DELETE /api/cash/store-register/deposit/:id
// @access  Admin
export const deleteStoreDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deleted = await prisma.storeDeposit.delete({
            where: { id }
        });

        broadcastCashUpdate(deleted.storeId, deleted.date, 'store_deposit_deleted');
        res.json({ message: 'Deposit deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// @desc    Admin: Add a Bank Deposit
// @route   POST /api/cash/store-register/bank-deposit
// @access  Admin
export const adminAddBankDeposit = async (req, res, next) => {
    try {
        const { date, amount, branchName, receiptImage, depositedBy, adminId, remark } = req.body;
        const storeId = getEffectiveStoreId(req);

        if (!storeId || !date || !amount || !branchName || !depositedBy) {
            res.status(400);
            throw new Error('All mandatory fields are required (Amount, Branch, Deposited By)');
        }

        // 🆕 Validate against current safe balance - Must be from safe ONLY and cannot go negative (Persistent across days)
        const [allSafeDeposits, allSafeWithdrawals, allBankDeposits] = await Promise.all([
            prisma.safeTransaction.aggregate({
                where: { storeId, date: { lte: date }, type: 'DEPOSIT' },
                _sum: { amount: true }
            }),
            prisma.safeTransaction.aggregate({
                where: { storeId, date: { lte: date }, type: 'WITHDRAW' },
                _sum: { amount: true }
            }),
            prisma.bankDeposit.aggregate({
                where: { storeId, date: { lte: date } },
                _sum: { amount: true }
            })
        ]);

        const movedToSafe = allSafeDeposits._sum.amount || 0;
        const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;
        const bankTransferred = allBankDeposits._sum.amount || 0;

        const currentSafeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;

        if (amount > currentSafeBalance) {
            res.status(400);
            throw new Error(`Insufficient funds in Safe! Available: ₹${currentSafeBalance.toFixed(2)}, Requested: ₹${amount.toFixed(2)}`);
        }

        const bankDeposit = await prisma.bankDeposit.create({
            data: {
                tenantId: req.user.tenantId,
                storeId,
                date,
                amount,
                branchName,
                receiptImage,
                depositedBy,
                adminId,
                remark
            }
        });

        broadcastCashUpdate(storeId, date, 'bank_deposit_added');
        res.json(bankDeposit);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Delete a Bank Deposit
// @route   DELETE /api/cash/store-register/bank-deposit/:id
// @access  Admin
export const deleteBankDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await prisma.bankDeposit.delete({ where: { id } });
        broadcastCashUpdate(deleted.storeId, deleted.date, 'bank_deposit_deleted');
        res.json({ message: 'Bank deposit deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get POS-only Daily sales reports (vehicleId IS NULL — direct store POS)
// @route   GET /api/vsms/reports/pos-daily
export const getPOSDailyReport = async (req, res, next) => {
    try {
        const { storeId, startDate, endDate } = req.query;
        const tenantId = req.user.tenantId;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const effectiveStart = startDate || format(thirtyDaysAgo, 'yyyy-MM-dd');
        const effectiveEnd = endDate || format(new Date(), 'yyyy-MM-dd');

        const startOfDay = new Date(`${effectiveStart}T00:00:00.000+05:30`);
        const endOfDay = new Date(`${effectiveEnd}T23:59:59.999+05:30`);

        const orderFilter = {
            status: { in: ['DELIVERED', 'COMPLETED', 'PAID', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP'] },
            createdAt: { gte: startOfDay, lte: endOfDay },
            OR: [
                { orderType: 'POS' },
                { fulfillmentType: 'STORE_PICKUP' },
                { vehicleId: null }
            ]
        };

        let targetWarehouseId = storeId && storeId !== 'undefined' && storeId !== 'null' && storeId !== 'all' ? storeId : null;
        
        if (targetWarehouseId) {
            const store = await prisma.store.findUnique({
                where: { id: targetWarehouseId },
                select: { warehouseId: true }
            });
            if (store && store.warehouseId) {
                targetWarehouseId = store.warehouseId;
            }
            orderFilter.AND = [
                {
                    OR: [
                        { warehouseId: targetWarehouseId },
                        { allocatedWarehouseId: targetWarehouseId },
                        { pickupStoreId: targetWarehouseId },
                        { allocatedStoreId: targetWarehouseId }
                    ]
                }
            ];
        }

        const orders = await prisma.order.findMany({
            where: orderFilter,
            select: {
                id: true,
                paymentMode: true,
                totalAmount: true,
                cashAmount: true,
                upiAmount: true,
                createdAt: true,
                orderNumber: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by date (local date from createdAt)
        const dailyGroups = {};
        orders.forEach(o => {
            const d = format(new Date(o.createdAt), 'yyyy-MM-dd');
            if (!dailyGroups[d]) {
                dailyGroups[d] = { date: d, totalCash: 0, totalUpi: 0, totalCard: 0, grandTotal: 0, remark: 'All clear' };
            }
            const cash = o.paymentMode === 'CASH' ? o.totalAmount : (o.paymentMode === 'CASH_UPI' ? (o.cashAmount || 0) : 0);
            const upi  = o.paymentMode === 'UPI'  ? o.totalAmount : (o.paymentMode === 'CASH_UPI' ? (o.upiAmount  || 0) : 0);
            const card = o.paymentMode === 'CARD' ? o.totalAmount : 0;

            dailyGroups[d].totalCash  += cash;
            dailyGroups[d].totalUpi   += upi;
            dailyGroups[d].totalCard  += card;
            dailyGroups[d].grandTotal += o.totalAmount;
        });

        const dataArray = Object.values(dailyGroups).sort((a, b) => b.date.localeCompare(a.date));

        // Today's aggregate for summary stats
        const today = effectiveEnd;
        const todayOrders = orders.filter(o => format(new Date(o.createdAt), 'yyyy-MM-dd') === today);
        const todayCash  = todayOrders.reduce((s, o) => s + (o.paymentMode === 'CASH' ? o.totalAmount : (o.paymentMode === 'CASH_UPI' ? (o.cashAmount || 0) : 0)), 0);
        const todayUpi   = todayOrders.reduce((s, o) => s + (o.paymentMode === 'UPI'  ? o.totalAmount : (o.paymentMode === 'CASH_UPI' ? (o.upiAmount  || 0) : 0)), 0);
        const todayCard  = todayOrders.reduce((s, o) => s + (o.paymentMode === 'CARD' ? o.totalAmount : 0), 0);

        return res.json({
            success: true,
            data: dataArray,
            today: { cash: todayCash, upi: todayUpi, card: todayCard, grandTotal: todayCash + todayUpi + todayCard }
        });
    } catch (error) {
        console.error('[getPOSDailyReport Error]:', error);
        next(error);
    }
};

// @desc    Admin: Get Daily sales reports
// @route   GET /api/vsms/reports/daily
export const getDailyReport = async (req, res, next) => {
    try {
        const { storeId, startDate, endDate } = req.query;
        const tenantId = req.user.tenantId;

        const filter = {
            tenantId,
        };

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            filter.storeId = storeId;
        }

        if (startDate && endDate) {
            filter.date = {
                gte: startDate,
                lte: endDate
            };
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            filter.date = {
                gte: format(thirtyDaysAgo, 'yyyy-MM-dd'),
                lte: format(new Date(), 'yyyy-MM-dd')
            };
        }

        const summaries = await prisma.dailyCashSummary.findMany({
            where: filter,
            orderBy: { date: 'desc' }
        });

        const dailyGroups = {};
        let grandTotalSales = 0;
        let totalCashSales = 0;
        let totalUpiSales = 0;
        let totalCardSales = 0;

        summaries.forEach(s => {
            const d = s.date;
            if (!dailyGroups[d]) {
                dailyGroups[d] = {
                    date: d,
                    totalCash: 0,
                    totalUpi: 0,
                    totalCard: 0,
                    grandTotal: 0,
                    remark: 'All clear'
                };
            }
            dailyGroups[d].totalCash += s.cashSales || 0;
            dailyGroups[d].totalUpi += s.upiSales || 0;
            dailyGroups[d].totalCard += s.cardSales || 0;
            const rowTotal = (s.cashSales || 0) + (s.upiSales || 0) + (s.cardSales || 0);
            dailyGroups[d].grandTotal += rowTotal;

            totalCashSales += s.cashSales || 0;
            totalUpiSales += s.upiSales || 0;
            totalCardSales += s.cardSales || 0;
            grandTotalSales += rowTotal;
        });

        const dataArray = Object.values(dailyGroups).sort((a, b) => b.date.localeCompare(a.date));

        const orderFilter = {
            tenantId,
            status: { in: ['DELIVERED', 'COMPLETED'] }
        };
        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            orderFilter.warehouseId = storeId;
        }
        if (startDate && endDate) {
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            orderFilter.createdAt = { gte: startOfDay, lte: endOfDay };
        } else {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            orderFilter.createdAt = { gte: startOfDay, lte: endOfDay };
        }

        const totalOrders = await prisma.order.count({ where: orderFilter });
        const totalExpenses = summaries.reduce((sum, s) => sum + (s.expenses || 0), 0);
        const totalProfit = Math.max(0, grandTotalSales - totalExpenses);

        return res.json({
            success: true,
            data: dataArray,
            totalSales: grandTotalSales,
            totalProfit: totalProfit,
            totalOrders: totalOrders
        });
    } catch (error) {
        console.error('[getDailyReport Error]:', error);
        next(error);
    }
};

// @desc    Admin: Get Sales Trends Report
// @route   GET /api/vsms/reports/trends
export const getTrendsReport = async (req, res, next) => {
    try {
        const { storeId, days = 7 } = req.query;
        const tenantId = req.user.tenantId;

        const limitDays = parseInt(days, 10) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - limitDays);

        const filter = {
            tenantId,
            date: {
                gte: format(startDate, 'yyyy-MM-dd'),
                lte: format(new Date(), 'yyyy-MM-dd')
            }
        };

        if (storeId && storeId !== 'undefined' && storeId !== 'null') {
            filter.storeId = storeId;
        }

        const summaries = await prisma.dailyCashSummary.findMany({
            where: filter,
            orderBy: { date: 'asc' }
        });

        const dailyTrends = {};
        for (let i = limitDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = format(d, 'yyyy-MM-dd');
            dailyTrends[dateStr] = {
                date: format(d, 'dd MMM'),
                revenue: 0,
                profit: 0
            };
        }

        summaries.forEach(s => {
            const d = new Date(s.date);
            const dateKey = s.date;
            const displayDate = format(d, 'dd MMM');

            const revenue = (s.cashSales || 0) + (s.upiSales || 0) + (s.cardSales || 0);
            const profit = Math.max(0, revenue - (s.expenses || 0));

            if (dailyTrends[dateKey]) {
                dailyTrends[dateKey].revenue += revenue;
                dailyTrends[dateKey].profit += profit;
            } else {
                dailyTrends[dateKey] = {
                    date: displayDate,
                    revenue,
                    profit
                };
            }
        });

        const sortedTrends = Object.keys(dailyTrends)
            .sort()
            .map(k => dailyTrends[k]);

        return res.json(sortedTrends);
    } catch (error) {
        console.error('[getTrendsReport Error]:', error);
        next(error);
    }
};

// @desc    Admin: Get Top Selling Products Report
// @route   GET /api/vsms/reports/top-products
export const getTopProducts = async (req, res, next) => {
    try {
        const { storeId } = req.query;
        const tenantId = req.user.tenantId;

        const filter = {
            order: {
                tenantId,
                status: { in: ['DELIVERED', 'COMPLETED'] },
                ...(storeId && storeId !== 'undefined' && storeId !== 'null' ? { warehouseId: storeId } : {})
            },
            isCancelled: false
        };

        const items = await prisma.orderItem.findMany({
            where: filter,
            include: {
                product: {
                    select: {
                        name: true,
                        images: true
                    }
                }
            }
        });

        const productMap = {};
        items.forEach(item => {
            const pId = item.productId;
            const name = item.productName || item.product?.name || 'Unknown Product';
            let image = item.productImage || '';
            if (!image && item.product?.images && item.product.images.length > 0) {
                image = Array.isArray(item.product.images) ? item.product.images[0] : item.product.images;
            }

            if (!productMap[pId]) {
                productMap[pId] = {
                    name,
                    image,
                    totalQty: 0,
                    totalRevenue: 0,
                    totalProfit: 0
                };
            }

            productMap[pId].totalQty += item.quantity || 0;
            productMap[pId].totalRevenue += item.totalPrice || 0;
            productMap[pId].totalProfit += (item.totalPrice || 0) * 0.15;
        });

        const top5 = Object.values(productMap)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 5);

        return res.json(top5);
    } catch (error) {
        console.error('[getTopProducts Error]:', error);
        next(error);
    }
};
