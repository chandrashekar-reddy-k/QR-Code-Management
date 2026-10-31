import { prisma } from '../../config/prismaClient.js';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';
import { uploadToSupabase } from '../utils/supabaseService.js';
import { recalculateDailySummary } from './cashController.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Add expense entry
// @route   POST /api/expenses
// @access  Private (VGE)
export const addExpense = async (req, res, next) => {
    try {
        const {
            type,
            amount,
            paymentMode,
            description,
            billImage,
            vehicleId,
            paidTo,
            paidDate,
            billDate,
            storeId
        } = req.body;

        const tenantId = req.user?.tenantId || 'VK001';
        const dateString = format(new Date(), 'yyyy-MM-dd');
        const parsedAmount = parseFloat(amount);

        if (!type || !amount || isNaN(parsedAmount) || parsedAmount <= 0 || !paymentMode) {
            return res.status(400).json({ success: false, message: 'Type, valid amount, and payment mode are required' });
        }

        // 1. Resolve Valid User ID (ensure user exists in DB to prevent FK violation)
        let validUserId = req.user?.id || null;
        let userExists = null;
        if (validUserId) {
            userExists = await prisma.user.findUnique({ where: { id: validUserId } });
        }
        if (!userExists) {
            const fallbackUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(req.user?.email ? [{ email: req.user.email }] : []),
                        ...(req.user?.phone ? [{ phone: req.user.phone }] : []),
                        { role: 'ADMIN' },
                        { role: 'SUPER_ADMIN' }
                    ]
                }
            });
            if (fallbackUser) {
                validUserId = fallbackUser.id;
            } else {
                const anyUser = await prisma.user.findFirst();
                if (anyUser) validUserId = anyUser.id;
            }
        }

        if (!validUserId) {
            return res.status(400).json({ success: false, message: 'Valid user account required to log expenses' });
        }

        // 2. Resolve Valid Store/Warehouse ID (Expense.storeId references Warehouse.id)
        let validStoreId = null;
        const candidateStoreId = storeId || req.user?.warehouseId || req.user?.storeId;
        if (candidateStoreId && candidateStoreId !== 'null' && candidateStoreId !== 'undefined' && candidateStoreId !== 'all') {
            const warehouse = await prisma.warehouse.findUnique({ where: { id: candidateStoreId } });
            if (warehouse) {
                validStoreId = warehouse.id;
            } else {
                const store = await prisma.store.findUnique({ where: { id: candidateStoreId } });
                if (store?.warehouseId) {
                    const linkedWarehouse = await prisma.warehouse.findUnique({ where: { id: store.warehouseId } });
                    if (linkedWarehouse) validStoreId = linkedWarehouse.id;
                }
            }
        }

        // 3. Resolve Valid Vehicle ID
        let validVehicleId = null;
        const candidateVehicleId = vehicleId || req.user?.assignedVehicleId;
        if (candidateVehicleId && candidateVehicleId !== 'null' && candidateVehicleId !== 'undefined') {
            const vehicle = await prisma.vehicle.findUnique({ where: { id: candidateVehicleId } });
            if (vehicle) validVehicleId = vehicle.id;
        }



        // 5. Category-level limit check (using ExpenseCategory.limit if defined)
        try {
            const categoryConfig = await prisma.expenseCategory.findFirst({
                where: { tenantId, name: type, status: true }
            });
            if (categoryConfig?.limit && parsedAmount > categoryConfig.limit) {
                return res.status(400).json({
                    success: false,
                    message: `This category (${type}) has a single-transaction limit of ₹${categoryConfig.limit}.`
                });
            }
        } catch (e) {
            if (e.message?.includes('limit')) throw e;
        }

        const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.file || req.files.image));
        let imageUrl = billImage || null;
        if (uploadFileObj) {
            try {
                const buffer = uploadFileObj.data || uploadFileObj.buffer;
                const originalName = uploadFileObj.name || uploadFileObj.originalname || 'bill.jpg';
                const mimetype = uploadFileObj.mimetype || 'image/jpeg';

                if (buffer) {
                    imageUrl = await uploadToSupabase(
                        buffer,
                        originalName,
                        mimetype,
                        'vehicles',
                        'expenses'
                    );
                }
            } catch (upErr) {
                console.warn('[addExpense] Supabase upload error:', upErr?.message);
            }
        }

        let displayId = null;
        try {
            displayId = await generateId({
                entity: 'EXP',
                tenantId,
                storeId: validStoreId
            });
        } catch (genErr) {
            displayId = `VK-EXP-${Date.now().toString().slice(-6)}`;
        }

        const allowedModes = ['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];
        let dbPaymentMode = allowedModes.includes(paymentMode) ? paymentMode : 'CASH';
        let dbDescription = description || '';

        if (paymentMode === 'PERSONAL_CASH') {
            dbPaymentMode = 'CASH';
            dbDescription = '[PERSONAL_CASH] ' + dbDescription;
        }

        // VIRTUAL FIELDS FALLBACK: Store structured data in description to avoid DB schema errors
        const metadata = {
            paidTo: paidTo || null,
            paidDate: paidDate || null,
            billDate: billDate || null,
            virtual: true
        };
        dbDescription = `${dbDescription} [METADATA:${JSON.stringify(metadata)}]`.trim();

        const expense = await prisma.expense.create({
            data: {
                tenantId,
                storeId: validStoreId,
                displayId,
                userId: validUserId,
                vehicleId: validVehicleId,
                type,
                amount: parsedAmount,
                paymentMode: dbPaymentMode,
                description: dbDescription,
                billImage: imageUrl,
                date: billDate || dateString,
                billDate: billDate || dateString,
                paidDate: paidDate || null,
                paidTo: paidTo || null,
                status: 'PENDING'
            }
        });

        try {
            logActivity({
                userId: validUserId,
                tenantId,
                storeId: validStoreId,
                action: 'EXPENSE_SUBMITTED',
                details: `Submitted ${type} expense of ₹${amount} (${paymentMode})`,
                metadata: { expenseId: expense.id, type, amount, paymentMode }
            });
        } catch (actErr) {
            console.warn('[addExpense] logActivity error:', actErr?.message);
        }

        // CASH expenses affect daily cash immediately if attached to a vehicle
        if (dbPaymentMode === 'CASH' && validVehicleId) {
            try {
                await recalculateDailySummary(validVehicleId, dateString, tenantId, validStoreId);
            } catch (cashErr) {
                console.warn('[addExpense] recalculateDailySummary error:', cashErr?.message);
            }
        }

        res.status(201).json(expense);

        // Notify admins asynchronously
        try {
            sendNotification({
                roles: ['ADMIN', 'SUPERVISOR'],
                title: 'New Expense Request',
                message: `${req.user?.name || req.user?.email || 'User'} submitted a ${type} expense of ₹${amount}.`,
                type: 'expense',
                priority: parsedAmount > 5000 ? 'high' : 'medium',
                metadata: { expenseId: expense.id, amount }
            });
        } catch (notifErr) {
            console.warn('[addExpense] sendNotification error:', notifErr?.message);
        }
    } catch (error) {
        console.error('[addExpense] Fatal Error:', error);
        next(error);
    }
};

// @desc    Get user's expenses (VGE)
// @route   GET /api/expenses/my
// @access  Private
export const getMyExpenses = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { date, status } = req.query;

        const expenses = await prisma.expense.findMany({
            where: {
                tenantId: req.user.tenantId,
                userId,
                ...(date && { date }),
                ...(status && { status })
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedExpenses = expenses.map(e => {
            let processed = { ...e };
            if (e.description?.includes('[METADATA:')) {
                try {
                    const metaMatch = e.description.match(/\[METADATA:({.+?})\]/);
                    if (metaMatch) {
                        const meta = JSON.parse(metaMatch[1]);
                        processed = { ...processed, ...meta };
                        processed.description = processed.description.replace(metaMatch[0], '').trim();
                    }
                } catch (err) { }
            }
            if (processed.description?.startsWith('[PERSONAL_CASH] ')) {
                return { ...processed, paymentMode: 'PERSONAL_CASH', description: processed.description.replace('[PERSONAL_CASH] ', '') };
            }
            return processed;
        });

        res.json(mappedExpenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Get all expenses for monitoring
// @route   GET /api/expenses/admin/all
// @access  Admin
export const getAllExpenses = async (req, res, next) => {
    try {
        const { date, startDate, endDate, userId, status, storeId, minAmount, maxAmount, paymentMode } = req.query;
        const tenantId = req.user?.tenantId || 'VK001';

        const where = {
            tenantId,
            ...(userId && { userId }),
            ...(status && { status }),
        };

        if (paymentMode) {
            if (paymentMode === 'PERSONAL_CASH') {
                where.paymentMode = 'CASH';
                where.description = { contains: '[PERSONAL_CASH]' };
            } else if (paymentMode === 'CASH') {
                where.paymentMode = 'CASH';
                where.NOT = {
                    description: { contains: '[PERSONAL_CASH]' }
                };
            } else {
                where.paymentMode = paymentMode;
            }
        }

        if (startDate && endDate) {
            where.date = { gte: startDate, lte: endDate };
        } else if (date) {
            where.date = date;
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            where.amount = {};
            if (minAmount) where.amount.gte = parseFloat(minAmount);
            if (maxAmount) where.amount.lte = parseFloat(maxAmount);
        }

        const userWarehouseId = req.user.warehouseId || req.user.storeId || null;
        const targetStoreId = storeId || userWarehouseId;

        if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
            where.storeId = targetStoreId;
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                user: { select: { name: true, role: true } },
                vehicle: { select: { vehicleNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedExpenses = expenses.map(e => {
            let processed = { ...e };
            if (e.description?.includes('[METADATA:')) {
                try {
                    const metaMatch = e.description.match(/\[METADATA:({.+?})\]/);
                    if (metaMatch) {
                        const meta = JSON.parse(metaMatch[1]);
                        processed = { ...processed, ...meta };
                        processed.description = processed.description.replace(metaMatch[0], '').trim();
                    }
                } catch (err) { }
            }
            if (processed.description?.startsWith('[PERSONAL_CASH] ')) {
                return { ...processed, paymentMode: 'PERSONAL_CASH', description: processed.description.replace('[PERSONAL_CASH] ', '') };
            }
            return processed;
        });

        res.json(mappedExpenses);
    } catch (error) {
        console.error('[getAllExpenses Error]', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database error in getAllExpenses', 
            error: error.message 
        });
    }
};

// @desc    Admin: Approve/Reject/Return/Verify expense
// @route   PUT /api/expenses/admin/:id/status
// @access  Admin
export const updateExpenseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, remarks, utrNumber, approverName } = req.body;

        const effectivePaymentRef = utrNumber;

        // Only statuses that exist in the current DB enum
        const allowedStatuses = ['APPROVED', 'REJECTED', 'PAID', 'PENDING'];
        if (!allowedStatuses.includes(status)) {
            res.status(400);
            throw new Error('Invalid status');
        }

        const currentExpense = await prisma.expense.findUnique({ where: { id } });
        if (!currentExpense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (currentExpense.tenantId !== req.user.tenantId) {
            res.status(403);
            throw new Error('Not authorized to access this expense');
        }

        // Monthly Cutoff: Prevent edits after 5th of next month (unless ADMIN role)
        const expenseDate = new Date(currentExpense.date);
        const today = new Date();
        const cutoffDate = new Date(expenseDate.getFullYear(), expenseDate.getMonth() + 1, 5);
        if (today > cutoffDate && req.user.role !== 'ADMIN' && req.user.role !== 'TENANT_OWNER') {
            res.status(400);
            throw new Error('This period is closed. Expenses from this date can no longer be modified.');
        }



        // Admin manually approves/rejects/pays
        let targetStatus = status;
        
        // AUTO-PAY logic: All expenses (Store & Agent) -> PAID immediately on APPROVED
        if (status === 'APPROVED') {
            targetStatus = 'PAID';
        }

        // Build description with remarks while preserving metadata
        let updatedDescription = currentExpense.description || '';
        let metadataTag = '';
        const metaMatch = updatedDescription.match(/\[METADATA:({.+?})\]/);
        if (metaMatch) {
            metadataTag = metaMatch[0];
            updatedDescription = updatedDescription.replace(metadataTag, '').trim();
        }

        const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
        const userName = dbUser?.name || req.user.email || 'Admin';

        if (remarks) {
            updatedDescription = `${updatedDescription}\n[${format(new Date(), 'dd/MM/yy HH:mm')} - ${userName}]: ${remarks}`;
        }

        const effectiveApprover = (approverName || userName).trim();

        if (targetStatus === 'APPROVED') {
            if (!updatedDescription.includes('[APPROVED_BY:')) {
                updatedDescription = `${updatedDescription} [APPROVED_BY:${effectiveApprover}]`.trim();
            }
        } else if (targetStatus === 'PAID') {
            if (status === 'APPROVED' || !updatedDescription.includes('[APPROVED_BY:')) {
                // If it was already approved, don't duplicate, but if coming from PENDING to PAID directly (cash)
                if (!updatedDescription.includes('[APPROVED_BY:')) {
                    updatedDescription = `${updatedDescription} [APPROVED_BY:${effectiveApprover}]`.trim();
                }
            }
            if (!updatedDescription.includes('[PAID_BY:')) {
                updatedDescription = `${updatedDescription} [PAID_BY:${effectiveApprover}]`.trim();
            }
        }

        const { paymentDetails } = req.body;
        if (paymentDetails) {
            const payStr = `[PAYMENT: ${paymentDetails.type} | Paid: ₹${paymentDetails.paid} | Bal: ₹${paymentDetails.balance}]`;
            if (!updatedDescription.includes(payStr)) {
                updatedDescription = `${updatedDescription} ${payStr}`.trim();
            }
        }

        if (metadataTag) {
            updatedDescription = `${updatedDescription} ${metadataTag}`.trim();
        }

        const updateData = {
            status: targetStatus,
            description: updatedDescription || undefined
        };

        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
            include: { user: true }
        });

        // Recalculate cash if needed
        if (expense.paymentMode === 'CASH') {
            await recalculateDailySummary(expense.vehicleId, expense.date, req.user.tenantId, req.user.storeId);
        }

        res.json(expense);

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: `EXPENSE_${targetStatus}`,
            details: `${targetStatus} ${expense.type} expense of ₹${expense.amount} for ${expense.user?.name}`,
            targetUserId: expense.userId,
            metadata: { expenseId: expense.id, status: targetStatus, amount: expense.amount, agentId: expense.userId }
        });

        sendNotification({
            userIds: [expense.userId],
            title: `Expense ${targetStatus.charAt(0) + targetStatus.slice(1).toLowerCase()}`,
            message: `Your ${expense.type} expense of ₹${expense.amount} has been ${targetStatus.toLowerCase()}.${remarks ? ` Remarks: ${remarks}` : ''}`,
            type: 'expense',
            priority: 'medium',
            metadata: { expenseId: expense.id, status: targetStatus }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Bulk update expense status
// @route   PUT /api/expenses/admin/bulk-status
// @access  Admin
export const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400);
            throw new Error('No IDs provided');
        }

        const allowedStatuses = ['APPROVED', 'REJECTED', 'PAID'];
        if (!allowedStatuses.includes(status)) {
            res.status(400);
            throw new Error('Invalid bulk status');
        }

        const expenses = await prisma.expense.findMany({
            where: { id: { in: ids }, tenantId: req.user.tenantId }
        });

        // Process each expense (CASH auto-pays on approval)
        const updatePromises = expenses.map(exp => {
            let targetStatus = status;

            // AUTO-PAY logic:
            // 1. Store Expenses (vehicleId: null) -> PAID immediately on APPROVED
            if (status === 'APPROVED' && !exp.vehicleId) {
                targetStatus = 'PAID';
            }

            let updatedDescription = exp.description || '';
            if (targetStatus === 'APPROVED' && !updatedDescription.includes('[APPROVED_BY:')) {
                updatedDescription = `${updatedDescription} [APPROVED_BY:${req.user.name}]`.trim();
            }
            if (targetStatus === 'PAID') {
                if (status === 'APPROVED' && !updatedDescription.includes('[APPROVED_BY:')) {
                    updatedDescription = `${updatedDescription} [APPROVED_BY:${req.user.name}]`.trim();
                }
                if (!updatedDescription.includes('[PAID_BY:')) {
                    updatedDescription = `${updatedDescription} [PAID_BY:${req.user.name}]`.trim();
                }
            }

            return prisma.expense.update({
                where: { id: exp.id },
                data: { status: targetStatus, description: updatedDescription || undefined }
            });
        });

        await Promise.all(updatePromises);

        // Recalculate cash summaries for affected CASH expenses
        const cashExpenses = expenses.filter(e => e.paymentMode === 'CASH');
        const pairs = [...new Set(cashExpenses.map(e => `${e.vehicleId}|${e.date}`))];
        for (const pair of pairs) {
            const [vId, date] = pair.split('|');
            if (vId && date) await recalculateDailySummary(vId, date, req.user.tenantId);
        }

        res.json({ message: `Successfully updated ${ids.length} expenses to ${status}` });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_BULK_UPDATE',
            details: `Bulk updated ${ids.length} expenses to ${status}`,
            metadata: { count: ids.length, status, ids }
        });

        // Notify affected users
        const userIds = [...new Set(expenses.map(e => e.userId))];
        sendNotification({
            userIds,
            title: 'Expense Update',
            message: `${ids.length} of your expenses have been ${status.toLowerCase()}.`,
            type: 'expense',
            priority: 'medium'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Agent: Claim an approved expense (Finalize - for PERSONAL_CASH)
// @route   PUT /api/expenses/:id/claim
// @access  Private (VGE)
export const claimExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (expense.userId !== userId) {
            res.status(403);
            throw new Error('Not authorized to claim this expense');
        }

        if (expense.status !== 'APPROVED') {
            res.status(400);
            throw new Error('Only approved expenses can be claimed');
        }

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: { status: 'PAID' }
        });

        if (updatedExpense.paymentMode === 'CASH') {
            await recalculateDailySummary(updatedExpense.vehicleId, updatedExpense.date);
        }

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_CLAIMED',
            details: `Agent claimed ₹${expense.amount} for ${expense.type}`,
            metadata: { expenseId: expense.id }
        });

        res.json(updatedExpense);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a pending expense
// @route   PUT /api/expenses/:id
// @access  Private (Owner only)
export const updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId || 'VK001';
        const userId = req.user?.id;

        const expense = await prisma.expense.findFirst({
            where: {
                id,
                ...(tenantId && { tenantId })
            }
        });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        // Only owner or admin/authorized staff can edit
        const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'TENANT_OWNER', 'PARTNER'].includes(req.user?.role) || !req.user?.id;
        if (expense.userId !== userId && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this expense' });
        }

        // Only PENDING expenses can be edited
        if (expense.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Only PENDING expenses can be edited. Current status is ${expense.status}`
            });
        }

        const {
            type,
            amount,
            paymentMode,
            description,
            paidTo,
            paidDate,
            billDate
        } = req.body;

        const updatedData = {};

        if (type !== undefined) {
            if (!type || !type.trim()) {
                return res.status(400).json({ success: false, message: 'Expense type/category cannot be empty' });
            }
            updatedData.type = type.trim();
        }

        if (amount !== undefined) {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                return res.status(400).json({ success: false, message: 'A valid positive amount is required' });
            }
            // Check category limit if applicable
            const checkType = updatedData.type || expense.type;
            try {
                const categoryConfig = await prisma.expenseCategory.findFirst({
                    where: { tenantId, name: checkType, status: true }
                });
                if (categoryConfig?.limit && parsedAmount > categoryConfig.limit) {
                    return res.status(400).json({
                        success: false,
                        message: `This category (${checkType}) has a single-transaction limit of ₹${categoryConfig.limit}.`
                    });
                }
            } catch (limitErr) {
                if (limitErr.message?.includes('limit')) throw limitErr;
            }
            updatedData.amount = parsedAmount;
        }

        const allowedModes = ['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER'];
        let effectivePaymentMode = paymentMode !== undefined ? paymentMode : expense.paymentMode;
        if (paymentMode !== undefined) {
            if (paymentMode === 'PERSONAL_CASH') {
                updatedData.paymentMode = 'CASH';
            } else if (allowedModes.includes(paymentMode)) {
                updatedData.paymentMode = paymentMode;
            }
        }

        // Handle file upload if present
        const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.file || req.files.image));
        if (uploadFileObj) {
            try {
                const buffer = uploadFileObj.data || uploadFileObj.buffer;
                const originalName = uploadFileObj.name || uploadFileObj.originalname || 'bill.jpg';
                const mimetype = uploadFileObj.mimetype || 'image/jpeg';
                if (buffer) {
                    const imageUrl = await uploadToSupabase(
                        buffer,
                        originalName,
                        mimetype,
                        'vehicles',
                        'expenses'
                    );
                    if (imageUrl) {
                        updatedData.billImage = imageUrl;
                    }
                }
            } catch (upErr) {
                console.warn('[updateExpense] Supabase upload error:', upErr?.message);
            }
        }

        if (billDate !== undefined) {
            updatedData.billDate = billDate;
            updatedData.date = billDate;
        }
        if (paidDate !== undefined) {
            updatedData.paidDate = paidDate;
        }
        if (paidTo !== undefined) {
            updatedData.paidTo = paidTo;
        }

        // Format description with metadata
        if (description !== undefined || paidTo !== undefined || paidDate !== undefined || billDate !== undefined) {
            let baseDesc = description !== undefined ? description : (expense.description || '');
            // Strip out old METADATA
            baseDesc = baseDesc.replace(/\[METADATA:({.+?})\]/g, '').replace(/\[PERSONAL_CASH\]\s*/g, '').trim();

            if (effectivePaymentMode === 'PERSONAL_CASH') {
                baseDesc = `[PERSONAL_CASH] ${baseDesc}`.trim();
            }

            const metadata = {
                paidTo: paidTo !== undefined ? paidTo : expense.paidTo,
                paidDate: paidDate !== undefined ? paidDate : expense.paidDate,
                billDate: billDate !== undefined ? billDate : expense.billDate,
                virtual: true
            };
            updatedData.description = `${baseDesc} [METADATA:${JSON.stringify(metadata)}]`.trim();
        }

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: updatedData
        });

        logActivity({
            userId: req.user?.id || expense.userId,
            tenantId,
            storeId: expense.storeId,
            action: 'EXPENSE_UPDATED',
            details: `Updated expense ${updatedExpense.displayId || updatedExpense.id} (${updatedExpense.type}) to ₹${updatedExpense.amount}`,
            metadata: { expenseId: id, changes: Object.keys(updatedData) }
        });

        // CASH expenses attached to vehicle recalculate daily cash
        if (updatedExpense.paymentMode === 'CASH' && updatedExpense.vehicleId) {
            try {
                await recalculateDailySummary(updatedExpense.vehicleId, updatedExpense.date, tenantId, updatedExpense.storeId);
            } catch (cashErr) {
                console.warn('[updateExpense] recalculateDailySummary error:', cashErr?.message);
            }
        }

        res.json(updatedExpense);
    } catch (error) {
        console.error('[updateExpense] Error:', error);
        next(error);
    }
};

// @desc    Admin: Get expense analytics summary
// @route   GET /api/expenses/admin/analytics
// @access  Admin
export const getExpenseAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        const today = format(new Date(), 'yyyy-MM-dd');
        const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

        const where = {
            tenantId: req.user.tenantId,
            date: { gte: start, lte: end },
            status: { not: 'REJECTED' }
        };

        const userWarehouseId = req.user.warehouseId || req.user.storeId || null;
        const targetStoreId = storeId || userWarehouseId;

        if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
            where.storeId = targetStoreId;
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: { user: { select: { name: true } } }
        });

        // Category breakdown
        const byCategory = {};
        const byAgent = {};
        const byPaymentMode = {};
        const byStatus = {};
        const byDate = {};

        for (const exp of expenses) {
            byCategory[exp.type] = (byCategory[exp.type] || 0) + exp.amount;
            byAgent[exp.user?.name || 'Unknown'] = (byAgent[exp.user?.name || 'Unknown'] || 0) + exp.amount;

            let mode = exp.paymentMode;
            if (exp.description?.includes('[PERSONAL_CASH]')) {
                mode = 'PERSONAL_CASH';
            }
            byPaymentMode[mode] = (byPaymentMode[mode] || 0) + exp.amount;
            byStatus[exp.status] = (byStatus[exp.status] || 0) + 1;
            byDate[exp.date] = (byDate[exp.date] || 0) + exp.amount;
        }

        const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
        const pendingAmount = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0);
        const approvedAmount = expenses.filter(e => ['APPROVED', 'PAID'].includes(e.status)).reduce((s, e) => s + e.amount, 0);

        res.json({
            totalAmount,
            pendingAmount,
            approvedAmount,
            totalCount: expenses.length,
            byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
            byAgent: Object.entries(byAgent).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 10),
            byPaymentMode: Object.entries(byPaymentMode).map(([mode, amount]) => ({ mode, amount })),
            byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
            byDate: Object.entries(byDate).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Expense Category Management - List (Role-Filtered)
// @route   GET /api/expenses/admin/categories
// @access  Private
export const getExpenseCategories = async (req, res, next) => {
    try {
        console.log(`[getExpenseCategories] Called by user: ${req.user.name} (Role: ${req.user.role}, Tenant: ${req.user.tenantId})`);

        const allCategories = await prisma.expenseCategory.findMany({
            where: { status: true, tenantId: req.user.tenantId },
            orderBy: { name: 'asc' }
        });

        // Role-based filtering using naming convention:
        // [AGENT] prefix  → visible to SALES_AGENT, HELPER only
        // [STORE] prefix  → visible to ADMIN, TENANT_OWNER, SUPERVISOR, SUPER_ADMIN only
        // No prefix       → visible to everyone
        const agentRoles = ['SALES_AGENT', 'HELPER'];
        const isAgent = agentRoles.includes(req.user.role);

        const filtered = allCategories
            .filter(cat => {
                const n = cat.name;
                if (n.startsWith('[AGENT]')) return isAgent;
                if (n.startsWith('[STORE]')) return !isAgent;
                return true; // untagged = visible to all
            })
            .map(cat => ({
                ...cat,
                // Strip [AGENT] / [STORE] prefix for clean display
                displayName: cat.name.replace(/^\[(AGENT|STORE)\]\s*/i, '')
            }));

        console.log(`[getExpenseCategories] Returning ${filtered.length} of ${allCategories.length} categories for role: ${req.user.role}`);
        res.json(filtered);
    } catch (error) {
        next(error);
    }
};


// @desc    Expense Category Management - Create
// @route   POST /api/expenses/admin/categories
// @access  Admin
export const createExpenseCategory = async (req, res, next) => {
    try {
        const { name, limit } = req.body;
        const existing = await prisma.expenseCategory.findFirst({
            where: { tenantId: req.user.tenantId, name }
        });

        if (existing) {
            return res.status(400).json({ message: 'Category name already exists' });
        }

        const category = await prisma.expenseCategory.create({
            data: {
                tenantId: req.user.tenantId,
                name,
                limit: limit ? parseFloat(limit) : null
            }
        });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        next(error);
    }
};

// @desc    Expense Category Management - Update
// @route   PUT /api/expenses/admin/categories/:id
// @access  Admin
export const updateExpenseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, limit } = req.body;

        if (name) {
            const existing = await prisma.expenseCategory.findFirst({
                where: {
                    tenantId: req.user.tenantId,
                    name,
                    id: { not: id }
                }
            });
            if (existing) return res.status(400).json({ message: 'Category name already exists' });
        }

        const category = await prisma.expenseCategory.update({
            where: { id, tenantId: req.user.tenantId },
            data: { name, limit: limit ? parseFloat(limit) : null }
        });
        res.json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        next(error);
    }
};

// @desc    Expense Category Management - Delete
// @route   DELETE /api/expenses/admin/categories/:id
// @access  Admin
export const deleteExpenseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.expenseCategory.update({
            where: { id, tenantId: req.user.tenantId },
            data: { status: false }
        });
        res.json({ message: 'Category deactivated' });
    } catch (error) {
        next(error);
    }
};

// @desc    Cash Submission to Chest
// @route   POST /api/expenses/chest-transfer
// @access  Private (VGE)
export const submitToChest = async (req, res, next) => {
    try {
        const { amount, denominations, vehicleId } = req.body;
        const userId = req.user.id;
        const dateString = format(new Date(), 'yyyy-MM-dd');

        const transfer = await prisma.cashTransfer.upsert({
            where: {
                vehicleId_date: {
                    vehicleId: vehicleId || req.user.assignedVehicleId,
                    date: dateString
                }
            },
            update: { amount: parseFloat(amount), denominations, userId },
            create: {
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                userId,
                vehicleId: vehicleId || req.user.assignedVehicleId,
                date: dateString,
                amount: parseFloat(amount),
                denominations
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'CASH_TO_CHEST_SUBMITTED',
            details: `Submitted ₹${amount} to chest`,
            metadata: { transferId: transfer.id, amount, date: dateString }
        });

        await prisma.dailyCashSummary.update({
            where: { vehicleId_date: { vehicleId: transfer.vehicleId, date: dateString } },
            data: { submittedCash: parseFloat(amount) }
        });

        res.status(201).json(transfer);

        sendNotification({
            roles: ['ADMIN'],
            title: 'Cash Submitted to Chest',
            message: `${req.user.name} submitted ₹${amount} to chest.`,
            type: 'cash',
            priority: 'medium',
            metadata: { transferId: transfer.id, amount }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Agent: Raise dispute on a rejected/closed expense
// @route   PUT /api/expenses/:id/dispute
// @access  Private (VGE)
export const raiseDispute = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            res.status(400);
            throw new Error('Dispute reason is required');
        }

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (expense.userId !== req.user.id) {
            res.status(403);
            throw new Error('Not authorized');
        }

        if (!['REJECTED'].includes(expense.status)) {
            res.status(400);
            throw new Error('Only rejected expenses can be disputed');
        }

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                status: 'PENDING',
                description: `${expense.description || ''}\n[DISPUTE ${format(new Date(), 'dd/MM/yy HH:mm')}]: ${reason}`
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_DISPUTED',
            details: `Disputed ${expense.type} expense of ₹${expense.amount}: ${reason}`,
            metadata: { expenseId: expense.id, reason }
        });

        sendNotification({
            roles: ['ADMIN'],
            title: 'Expense Dispute Raised',
            message: `${req.user.name} disputed a ${expense.type} expense of ₹${expense.amount}.`,
            type: 'expense',
            priority: 'high',
            metadata: { expenseId: expense.id }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Reopen a closed/rejected expense for re-evaluation
// @route   PUT /api/expenses/admin/:id/reopen
// @access  Admin
export const reopenExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const expense = await prisma.expense.findUnique({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            res.status(404);
            throw new Error('Expense not found');
        }

        if (!['REJECTED', 'PAID'].includes(expense.status)) {
            res.status(400);
            throw new Error('Only rejected or paid expenses can be reopened');
        }

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                status: 'PENDING',
                description: `${expense.description || ''}\n[REOPENED ${format(new Date(), 'dd/MM/yy HH:mm')} by ${req.user.name}]: ${reason || 'Admin reopened'}`
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'EXPENSE_REOPENED',
            details: `Reopened ${expense.type} expense of ₹${expense.amount}`,
            targetUserId: expense.userId,
            metadata: { expenseId: expense.id, reason }
        });

        sendNotification({
            userIds: [expense.userId],
            title: 'Expense Reopened',
            message: `Your ${expense.type} expense of ₹${expense.amount} has been reopened for re-evaluation.`,
            type: 'expense',
            priority: 'medium',
            metadata: { expenseId: expense.id }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};
