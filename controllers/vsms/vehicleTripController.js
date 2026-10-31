import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { getEffectiveStoreId } from '../../utils/storeResolution.js';
const logActivity = (details) => logger.info(JSON.stringify(details));
import { format } from 'date-fns';

export const startTrip = async (req, res) => {
  try {
    const { vehicleId, startOdometer, openingCash, shift = 1, date } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    if (!vehicleId || startOdometer === undefined) {
      return res.status(400).json({ message: 'Vehicle and Start Odometer are required' });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const parsedStartOdo = Number(startOdometer);
    const parsedOpeningCash = Number(openingCash || 0);
    const parsedShift = Number(shift || 1);
    const effectiveStoreId = vehicle.storeId || req.user?.storeId || req.user?.warehouseId || null;

    const trip = await prisma.vehicleTrip.upsert({
      where: {
        vehicleId_date_shift: { vehicleId, date: dateString, shift: parsedShift }
      },
      update: {
        startOdometer: parsedStartOdo,
        openingCash: parsedOpeningCash,
        status: 'OPEN',
        userId: req.user.id
      },
      create: {
        tenantId,
        storeId: effectiveStoreId,
        vehicleId,
        userId: req.user.id,
        date: dateString,
        shift: parsedShift,
        startOdometer: parsedStartOdo,
        openingCash: parsedOpeningCash,
        status: 'OPEN'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: trip.storeId,
      action: 'TRIP_STARTED',
      details: `Started trip for vehicle ${vehicle.vehicleNumber}. Start ODO: ${parsedStartOdo}`,
      metadata: { tripId: trip.id, vehicleId }
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Error starting trip', error: error.message });
  }
};

export const endTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { endOdometer, closingCash, totalSales, totalExpenses } = req.body;

    const trip = await prisma.vehicleTrip.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const parsedEndOdo = Number(endOdometer);
    const parsedClosingCash = Number(closingCash || 0);
    const parsedTotalSales = Number(totalSales || 0);
    const parsedTotalExpenses = Number(totalExpenses || 0);

    if (parsedEndOdo < trip.startOdometer) {
      return res.status(400).json({ message: 'End odometer cannot be less than start odometer' });
    }

    const updated = await prisma.vehicleTrip.update({
      where: { id },
      data: {
        endOdometer: parsedEndOdo,
        closingCash: parsedClosingCash,
        totalSales: parsedTotalSales,
        totalExpenses: parsedTotalExpenses,
        status: 'CLOSED'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: trip.tenantId,
      storeId: trip.storeId,
      action: 'TRIP_ENDED',
      details: `Ended trip for vehicle ${trip.vehicle.vehicleNumber}. End ODO: ${parsedEndOdo}, KM: ${parsedEndOdo - trip.startOdometer}`,
      metadata: { tripId: id, vehicleId: trip.vehicleId }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error ending trip', error: error.message });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, startOdometer, endOdometer, openingCash, closingCash, totalSales, totalExpenses, shift, date, status } = req.body;

    const trip = await prisma.vehicleTrip.findUnique({
      where: { id },
      include: { vehicle: true }
    });

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const updateData = {};
    if (vehicleId) updateData.vehicleId = vehicleId;
    if (startOdometer !== undefined) updateData.startOdometer = Number(startOdometer);
    if (endOdometer !== undefined) updateData.endOdometer = endOdometer === '' || endOdometer === null ? null : Number(endOdometer);
    if (openingCash !== undefined) updateData.openingCash = Number(openingCash);
    if (closingCash !== undefined) updateData.closingCash = Number(closingCash);
    if (totalSales !== undefined) updateData.totalSales = Number(totalSales);
    if (totalExpenses !== undefined) updateData.totalExpenses = Number(totalExpenses);
    if (shift !== undefined) updateData.shift = Number(shift);
    if (date) updateData.date = date;
    if (status) updateData.status = status;

    const effectiveStartOdo = updateData.startOdometer !== undefined ? updateData.startOdometer : trip.startOdometer;
    const effectiveEndOdo = updateData.endOdometer !== undefined ? updateData.endOdometer : trip.endOdometer;

    if (effectiveEndOdo !== null && effectiveEndOdo !== undefined && effectiveEndOdo < effectiveStartOdo) {
      return res.status(400).json({ message: 'End odometer cannot be less than start odometer' });
    }

    const updated = await prisma.vehicleTrip.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: { select: { vehicleNumber: true, vehicleName: true } },
        user: { select: { name: true } }
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId: trip.tenantId,
      storeId: trip.storeId,
      action: 'TRIP_UPDATED',
      details: `Updated trip ${id} for vehicle ${updated.vehicle?.vehicleNumber || trip.vehicleId}.`,
      metadata: { tripId: id, updateData }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating trip', error: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await prisma.vehicleTrip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    await prisma.vehicleTrip.delete({ where: { id } });

    logActivity({
      userId: req.user.id,
      tenantId: trip.tenantId,
      storeId: trip.storeId,
      action: 'TRIP_DELETED',
      details: `Deleted trip ${id} for vehicle ${trip.vehicleId}.`,
      metadata: { tripId: id }
    });

    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting trip', error: error.message });
  }
};

export const getTrips = async (req, res) => {
  try {
    const { vehicleId, date } = req.query;
    const tenantId = req.user?.tenantId || 'VK001';
    const where = { tenantId };
    const targetStoreId = getEffectiveStoreId(req);

    if (vehicleId) where.vehicleId = vehicleId;
    if (targetStoreId) where.storeId = targetStoreId;
    if (date) where.date = date;

    const trips = await prisma.vehicleTrip.findMany({
      where,
      include: {
        vehicle: { select: { vehicleNumber: true, vehicleName: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trips', error: error.message });
  }
};
