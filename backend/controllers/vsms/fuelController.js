import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
const logActivity = (details) => logger.info(JSON.stringify(details));
import { uploadFilesToS3 } from '../../utils/aws3.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
import { generateId } from '../../utils/idGenerator.js';

export const addFuelLog = async (req, res) => {
  try {
    const { vehicleId, tripId, date, odometer, liters, rate, totalAmount, paymentMode } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';

    if (!vehicleId || !odometer || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fuel log details' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    let billImage = null;
    const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.bill));
    if (uploadFileObj) {
      billImage = (await uploadFilesToS3(uploadFileObj, 'vsms'))[0].url;
    }

    const effectiveStoreId = vehicle.storeId || req.user?.storeId || req.user?.warehouseId || null;

    const fuelLog = await prisma.fuelLog.create({
      data: {
        tenantId,
        storeId: effectiveStoreId,
        vehicleId,
        tripId: tripId || null,
        date: date || new Date().toISOString().split('T')[0],
        odometer: parseFloat(odometer) || 0,
        liters: parseFloat(liters) || 0,
        rate: parseFloat(rate) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        paymentMode: paymentMode === 'PERSONAL_CASH' ? 'CASH' : paymentMode,
        billImage
      }
    });

    // Automatically create an Expense record
    const expenseDisplayId = await generateId({
      entity: 'EXP',
      tenantId,
      storeId: fuelLog.storeId
    });

    await prisma.expense.create({
      data: {
        tenantId,
        storeId: fuelLog.storeId,
        userId: req.user.id,
        vehicleId,
        type: `Fuel - ${vehicle.vehicleNumber}`,
        amount: parseFloat(totalAmount),
        paymentMode: paymentMode === 'PERSONAL_CASH' ? 'CASH' : paymentMode,
        description: `Automated Fuel Expense: ${liters}L @ ₹${rate}/L. ODO: ${odometer}`,
        billImage,
        date: date || new Date().toISOString().split('T')[0],
        displayId: expenseDisplayId,
        status: 'APPROVED' // Fuel expenses are usually pre-approved or verified by ODO
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: fuelLog.storeId,
      action: 'FUEL_LOGGED',
      details: `Logged ${liters}L fuel for ${vehicle.vehicleNumber} (₹${totalAmount})`,
      metadata: { fuelLogId: fuelLog.id, vehicleId }
    });

    res.status(201).json({ success: true, fuelLog });
  } catch (error) {
    console.error('Fuel Log Error:', error);
    res.status(500).json({ success: false, message: 'Error logging fuel', error: error.message });
  }
};

export const getFuelLogs = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const tenantId = req.user?.tenantId || 'VK001';
    const where = { tenantId };
    const targetStoreId = getEffectiveStoreId(req);

    if (vehicleId) where.vehicleId = vehicleId;
    if (targetStoreId) where.storeId = targetStoreId;

    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching fuel logs', error: error.message });
  }
};

export const updateFuelLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, tripId, date, odometer, liters, rate, totalAmount, paymentMode } = req.body;
    const tenantId = req.user.tenantId;

    const existingLog = await prisma.fuelLog.findFirst({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ success: false, message: 'Fuel log not found' });
    }

    let billImage = existingLog.billImage;
    const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.bill));
    if (uploadFileObj) {
      billImage = (await uploadFilesToS3(uploadFileObj, 'vsms'))[0].url;
    }

    const updatedLog = await prisma.fuelLog.update({
      where: { id },
      data: {
        ...(vehicleId && { vehicleId }),
        tripId: tripId !== undefined ? (tripId || null) : existingLog.tripId,
        date: date || existingLog.date,
        odometer: (odometer !== undefined && odometer !== '' && odometer !== null) ? parseFloat(odometer) : existingLog.odometer,
        liters: (liters !== undefined && liters !== '' && liters !== null) ? parseFloat(liters) : existingLog.liters,
        rate: (rate !== undefined && rate !== '' && rate !== null) ? parseFloat(rate) : existingLog.rate,
        totalAmount: (totalAmount !== undefined && totalAmount !== '' && totalAmount !== null) ? parseFloat(totalAmount) : existingLog.totalAmount,
        paymentMode: paymentMode ? (paymentMode === 'PERSONAL_CASH' ? 'CASH' : paymentMode) : existingLog.paymentMode,
        billImage
      },
      include: { vehicle: { select: { vehicleNumber: true } } }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: updatedLog.storeId,
      action: 'FUEL_UPDATED',
      details: `Updated fuel log #${id} for ${updatedLog.vehicle?.vehicleNumber || 'Vehicle'}`,
      metadata: { fuelLogId: updatedLog.id }
    });

    res.json({ success: true, fuelLog: updatedLog });
  } catch (error) {
    console.error('Update Fuel Log Error:', error);
    res.status(500).json({ success: false, message: 'Error updating fuel log', error: error.message });
  }
};

export const deleteFuelLog = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const existingLog = await prisma.fuelLog.findFirst({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ success: false, message: 'Fuel log not found' });
    }

    await prisma.fuelLog.delete({ where: { id } });

    res.json({ success: true, message: 'Fuel log deleted successfully' });
  } catch (error) {
    console.error('Delete Fuel Log Error:', error);
    res.status(500).json({ success: false, message: 'Error deleting fuel log', error: error.message });
  }
};

