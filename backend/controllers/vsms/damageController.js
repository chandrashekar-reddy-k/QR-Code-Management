import { prisma } from '../../config/prismaClient.js';
import { uploadFilesToS3 } from '../../utils/aws3.js';
import logger from '../../utils/logger.js';

const logActivity = (details) => logger.info(JSON.stringify(details));

const generateId = async ({ entity }) => `${entity}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

const mapDamageProduct = (entry) => {
  if (!entry) return entry;
  if (entry.product) {
    entry.product.image = entry.product.images?.[0] || null;
  }
  return entry;
};

// 1. Report Damage (Agent)
export const reportDamage = async (req, res) => {
  try {
    const { productId, quantity, damageType, selfResponsibility, reason, vehicleId, geoLatitude, geoLongitude } = req.body;

    if (!productId || !quantity || !damageType || !reason) {
      return res.status(400).json({ message: 'Product ID, quantity, damage type, and reason are required' });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenantId || 'VK001';

    // Find agent user to get warehouseId (storeId)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true }
    });

    // Find product to fetch purchase cost
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { purchasePrice: true, price: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const purchaseCost = product.purchasePrice || product.price || 0;
    const totalLoss = purchaseCost * parseInt(quantity);

    // Handle evidence images if present
    let imageUrls = [];
    if (req.files && req.files.images) {
      const uploads = await uploadFilesToS3(req.files.images, 'vsms/damages');
      imageUrls = uploads.map(u => u.url);
    }

    const displayId = await generateId({ entity: 'DMG' });

    const damageEntry = await prisma.damageEntry.create({
      data: {
        tenantId,
        displayId,
        storeId: user?.warehouseId || null,
        vehicleId: vehicleId || null,
        reportedById: userId,
        productId,
        quantity: parseInt(quantity),
        damageType,
        selfResponsibility: selfResponsibility || 'UNKNOWN',
        reason,
        images: imageUrls,
        geoLatitude: geoLatitude ? parseFloat(geoLatitude) : null,
        geoLongitude: geoLongitude ? parseFloat(geoLongitude) : null,
        purchaseCost,
        totalLoss,
        status: 'PENDING'
      },
      include: {
        product: { select: { id: true, name: true, images: true } }
      }
    });

    logActivity({
      userId,
      tenantId,
      action: 'STOCK_DAMAGE_REPORTED',
      details: `Reported ${quantity} units of ${damageType} damage on product ID ${productId}: "${reason}"`,
      metadata: { damageId: damageEntry.id }
    });

    res.status(201).json(mapDamageProduct(damageEntry));
  } catch (error) {
    console.error('reportDamage error:', error);
    res.status(500).json({ message: 'Error reporting damage', error: error.message });
  }
};

// 2. Get My Damage Reports (Agent)
export const getMyDamageReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const reports = await prisma.damageEntry.findMany({
      where: {
        reportedById: userId,
        tenantId: req.user.tenantId || 'VK001'
      },
      include: {
        product: { select: { id: true, name: true, images: true } },
        deduction: { select: { id: true, deductionAmount: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reports.map(mapDamageProduct));
  } catch (error) {
    console.error('getMyDamageReports error:', error);
    res.status(500).json({ message: 'Error fetching your damage reports', error: error.message });
  }
};

// 3. Get Damage Entries (Admin)
export const getDamageEntries = async (req, res) => {
  try {
    const { status, type, search, storeId } = req.query;
    const where = { tenantId: req.user.tenantId || 'VK001' };

    const userWarehouseId = req.user.warehouseId || null;
    const targetStoreId = storeId || userWarehouseId;

    if (status) where.status = status;
    if (type) where.damageType = type;
    if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
      where.storeId = targetStoreId;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { reportedBy: { name: { contains: search, mode: 'insensitive' } } },
        { displayId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const entries = await prisma.damageEntry.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, images: true } },
        reportedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, vehicleNumber: true } },
        deduction: { select: { id: true, deductionAmount: true, status: true, mode: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    console.error('getDamageEntries error:', error);
    res.status(500).json({ message: 'Error fetching damage entries', error: error.message });
  }
};

// 4. Get Damage Entry By ID (Admin)
export const getDamageEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await prisma.damageEntry.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, images: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, vehicleNumber: true } },
        deduction: { select: { id: true, deductionAmount: true, status: true } },
        store: { select: { id: true, name: true } }
      }
    });

    if (!entry) return res.status(404).json({ message: 'Damage entry not found' });

    res.json(mapDamageProduct(entry));
  } catch (error) {
    console.error('getDamageEntryById error:', error);
    res.status(500).json({ message: 'Error fetching damage entry details', error: error.message });
  }
};

// 5. Review Damage (Admin)
export const reviewDamage = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponsibility, adminRemarks, purchaseCost, totalLoss } = req.body;

    const existing = await prisma.damageEntry.findUnique({
      where: { id }
    });

    if (!existing) return res.status(404).json({ message: 'Damage entry not found' });

    const updateData = {
      status,
      adminRemarks: adminRemarks || null,
      reviewedById: req.user.id,
      reviewedAt: new Date()
    };

    if (adminResponsibility) updateData.adminResponsibility = adminResponsibility;
    if (purchaseCost !== undefined) updateData.purchaseCost = parseFloat(purchaseCost);
    if (totalLoss !== undefined) updateData.totalLoss = parseFloat(totalLoss);

    // If APPROVED and it wasn't approved before, reduce stock on vehicle if vehicleId is present
    if (status === 'APPROVED' && existing.status !== 'APPROVED' && existing.vehicleId) {
      await prisma.vehicleStock.updateMany({
        where: {
          vehicleId: existing.vehicleId,
          productId: existing.productId,
          tenantId: existing.tenantId
        },
        data: {
          quantity: { decrement: existing.quantity }
        }
      });
    }

    const updated = await prisma.damageEntry.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, images: true } },
        reportedBy: { select: { id: true, name: true } }
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: existing.tenantId,
      action: 'STOCK_DAMAGE_REVIEWED',
      details: `Reviewed damage entry ${existing.displayId || existing.id} as ${status}. Responsibility: ${adminResponsibility || 'NONE'}`,
      metadata: { damageId: id }
    });

    res.json(mapDamageProduct(updated));
  } catch (error) {
    console.error('reviewDamage error:', error);
    res.status(500).json({ message: 'Error reviewing damage entry', error: error.message });
  }
};

// 6. Apply Deduction (Admin)
export const applyDeduction = async (req, res) => {
  try {
    const { damageEntryId, userId, mode, percentage, deductionAmount, month, remarks } = req.body;

    if (!damageEntryId || !userId || !deductionAmount || !month) {
      return res.status(400).json({ message: 'Damage entry ID, user ID, deduction amount, and month are required' });
    }

    const tenantId = req.user.tenantId || 'VK001';

    // Find agent user to get warehouseId (storeId)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true }
    });

    const deduction = await prisma.damageDeduction.create({
      data: {
        tenantId,
        storeId: user?.warehouseId || null,
        damageEntryId,
        userId,
        mode: mode || 'FULL',
        percentage: percentage !== undefined ? parseFloat(percentage) : 100,
        deductionAmount: parseFloat(deductionAmount),
        month,
        remarks: remarks || null,
        status: 'PENDING',
        appliedById: req.user.id,
        appliedAt: new Date()
      }
    });

    res.status(201).json(deduction);
  } catch (error) {
    console.error('applyDeduction error:', error);
    res.status(500).json({ message: 'Error applying deduction', error: error.message });
  }
};

// 7. Get Deductions (Admin)
export const getDeductions = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId || 'VK001' };

    const userWarehouseId = req.user.warehouseId || null;
    const targetStoreId = storeId || userWarehouseId;

    if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
      where.storeId = targetStoreId;
    }

    const deductions = await prisma.damageDeduction.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, baseSalary: true } },
        damageEntry: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(deductions);
  } catch (error) {
    console.error('getDeductions error:', error);
    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
  }
};

// 8. Update Deduction Status (Admin)
export const updateDeductionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.damageDeduction.update({
      where: { id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    console.error('updateDeductionStatus error:', error);
    res.status(500).json({ message: 'Error updating deduction status', error: error.message });
  }
};

// 9. Get Damage Reports & Analytics (Admin)
export const getDamageReports = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = { tenantId: req.user.tenantId || 'VK001' };

    const userWarehouseId = req.user.warehouseId || null;
    const targetStoreId = storeId || userWarehouseId;

    if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
      where.storeId = targetStoreId;
    }

    const allEntries = await prisma.damageEntry.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } }
      }
    });

    const total = allEntries.length;
    const totalLoss = allEntries.reduce((sum, e) => sum + (e.totalLoss || 0), 0);

    const deductionWhere = { tenantId: req.user.tenantId || 'VK001' };
    if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
      deductionWhere.storeId = targetStoreId;
    }

    const deductions = await prisma.damageDeduction.findMany({
      where: deductionWhere,
      include: {
        user: { select: { id: true, name: true, baseSalary: true } }
      }
    });

    const totalDeductions = deductions.reduce((sum, d) => sum + (d.deductionAmount || 0), 0);
    const appliedDeductions = deductions
      .filter(d => d.status === 'APPLIED')
      .reduce((sum, d) => sum + (d.deductionAmount || 0), 0);

    // Group loss by damage type
    const lossByType = {
      DAMAGED: { loss: 0, count: 0 },
      EXPIRED: { loss: 0, count: 0 },
      LEAKAGE: { loss: 0, count: 0 },
      LOST: { loss: 0, count: 0 }
    };
    allEntries.forEach(e => {
      if (lossByType[e.damageType]) {
        lossByType[e.damageType].loss += (e.totalLoss || 0);
        lossByType[e.damageType].count += 1;
      }
    });

    // Top damaged products
    const productLossMap = {};
    allEntries.forEach(e => {
      const pId = e.productId;
      const pName = e.product?.name || 'Unknown Product';
      if (!productLossMap[pId]) {
        productLossMap[pId] = { name: pName, loss: 0, qty: 0 };
      }
      productLossMap[pId].loss += (e.totalLoss || 0);
      productLossMap[pId].qty += (e.quantity || 0);
    });
    const topProducts = Object.values(productLossMap)
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 5);

    // VGE/Agent accountability report
    const vgeMap = {};
    allEntries.forEach(e => {
      const uId = e.reportedById;
      const uName = e.reportedBy?.name || 'Unknown User';
      if (!vgeMap[uId]) {
        vgeMap[uId] = { name: uName, count: 0, totalDamage: 0, totalLoss: 0 };
      }
      vgeMap[uId].count += 1;
      vgeMap[uId].totalDamage += (e.quantity || 0);
      vgeMap[uId].totalLoss += (e.totalLoss || 0);
    });
    const vgeReport = Object.values(vgeMap);

    // Payroll deduction report
    const payrollMap = {};
    deductions.forEach(d => {
      const uId = d.userId;
      const uName = d.user?.name || 'Unknown User';
      const uSalary = d.user?.baseSalary || 12000;
      if (!payrollMap[uId]) {
        payrollMap[uId] = { name: uName, baseSalary: uSalary, totalDeduction: 0 };
      }
      if (d.status !== 'CANCELLED') {
        payrollMap[uId].totalDeduction += (d.deductionAmount || 0);
      }
    });
    const payrollReport = Object.values(payrollMap).map(p => ({
      ...p,
      netSalary: Math.max(0, p.baseSalary - p.totalDeduction)
    }));

    res.json({
      summary: { total, totalLoss, totalDeductions, appliedDeductions },
      lossByType,
      topProducts,
      vgeReport,
      payrollReport
    });
  } catch (error) {
    console.error('getDamageReports error:', error);
    res.status(500).json({ message: 'Error calculating damage reports', error: error.message });
  }
};
