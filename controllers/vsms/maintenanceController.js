import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
const logActivity = (details) => logger.info(JSON.stringify(details));
import { uploadFilesToS3 } from '../../utils/aws3.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
import { generateId } from '../../utils/idGenerator.js';

export const addMaintenanceLog = async (req, res) => {
  try {
    const { vehicleId, tripId, date, odometer, serviceType, details, amount, mechanicName } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';

    if (!vehicleId || !serviceType || !amount) {
      return res.status(400).json({ message: 'Missing required maintenance details' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    let billImage = null;
    const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.bill));
    if (uploadFileObj) {
      billImage = (await uploadFilesToS3(uploadFileObj, 'vsms'))[0].url;
    }

    const effectiveStoreId = vehicle.storeId || req.user?.storeId || req.user?.warehouseId || null;

    const maintenanceLog = await prisma.maintenanceLog.create({
      data: {
        tenantId,
        storeId: effectiveStoreId,
        vehicleId,
        tripId: tripId || null,
        date: date || new Date().toISOString().split('T')[0],
        odometer: parseFloat(odometer) || 0,
        serviceType,
        details,
        amount: parseFloat(amount),
        mechanicName,
        billImage
      }
    });

    // Automatically create an Expense record
    const expenseDisplayId = await generateId({
      entity: 'EXP',
      tenantId,
      storeId: maintenanceLog.storeId
    });

    await prisma.expense.create({
      data: {
        tenantId,
        storeId: maintenanceLog.storeId,
        userId: req.user.id,
        vehicleId,
        type: `Maintenance - ${vehicle.vehicleNumber} (${serviceType})`,
        amount: parseFloat(amount),
        paymentMode: 'CASH', // Default for maintenance unless specified
        description: `Automated Maintenance Expense: ${serviceType}. ${details || ''}. Mechanic: ${mechanicName || 'N/A'}. ODO: ${odometer || 'N/A'}`,
        billImage,
        date: date || new Date().toISOString().split('T')[0],
        displayId: expenseDisplayId,
        status: 'PENDING' // Maintenance usually needs review
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: maintenanceLog.storeId,
      action: 'MAINTENANCE_LOGGED',
      details: `Logged ${serviceType} for ${vehicle.vehicleNumber} (₹${amount})`,
      metadata: { maintenanceId: maintenanceLog.id, vehicleId }
    });

    res.status(201).json({ success: true, maintenanceLog });
  } catch (error) {
    console.error('Maintenance Log Error:', error);
    res.status(500).json({ success: false, message: 'Error logging maintenance', error: error.message });
  }
};

export const getMaintenanceLogs = async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const tenantId = req.user?.tenantId || 'VK001';
    const where = { tenantId };
    const targetStoreId = getEffectiveStoreId(req);

    if (vehicleId) where.vehicleId = vehicleId;
    if (targetStoreId) where.storeId = targetStoreId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching maintenance logs', error: error.message });
  }
};

export const updateMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, tripId, date, odometer, serviceType, details, amount, mechanicName } = req.body;
    const tenantId = req.user.tenantId;

    const existingLog = await prisma.maintenanceLog.findFirst({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    }

    let billImage = existingLog.billImage;
    const uploadFileObj = req.file || (req.files && (req.files.billImage || req.files.bill));
    if (uploadFileObj) {
      billImage = (await uploadFilesToS3(uploadFileObj, 'vsms'))[0].url;
    }

    const updatedLog = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        ...(vehicleId && { vehicleId }),
        tripId: tripId !== undefined ? (tripId || null) : existingLog.tripId,
        date: date || existingLog.date,
        odometer: (odometer !== undefined && odometer !== '' && odometer !== null) ? parseFloat(odometer) : existingLog.odometer,
        serviceType: serviceType || existingLog.serviceType,
        details: details !== undefined ? details : existingLog.details,
        amount: (amount !== undefined && amount !== '' && amount !== null) ? parseFloat(amount) : existingLog.amount,
        mechanicName: mechanicName !== undefined ? mechanicName : existingLog.mechanicName,
        billImage
      },
      include: { vehicle: { select: { vehicleNumber: true } } }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: updatedLog.storeId,
      action: 'MAINTENANCE_UPDATED',
      details: `Updated maintenance log #${id} for ${updatedLog.vehicle?.vehicleNumber || 'Vehicle'}`,
      metadata: { maintenanceId: updatedLog.id }
    });

    res.json({ success: true, maintenanceLog: updatedLog });
  } catch (error) {
    console.error('Update Maintenance Log Error:', error);
    res.status(500).json({ success: false, message: 'Error updating maintenance log', error: error.message });
  }
};

export const deleteMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const existingLog = await prisma.maintenanceLog.findFirst({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    }

    await prisma.maintenanceLog.delete({ where: { id } });

    res.json({ success: true, message: 'Maintenance log deleted successfully' });
  } catch (error) {
    console.error('Delete Maintenance Log Error:', error);
    res.status(500).json({ success: false, message: 'Error deleting maintenance log', error: error.message });
  }
};

