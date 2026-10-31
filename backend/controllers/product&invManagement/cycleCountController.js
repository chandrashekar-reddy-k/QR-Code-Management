import {prisma} from "../../config/prismaClient.js";
import logger from "../../utils/logger.js";
import { successResponse, errorResponse } from "../../utils/responseHelper.js";

/**
 * Start Cycle Count
 */
const createCycleCount = async (req, res) => {
  try {
    const { locationId, scope, assignedToId } = req.body;

    const cycleCount = await prisma.cycleCount.create({
      data: {
        locationId,
        scope,
        assignedToId,
      },
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    logger.info("[CycleCount] Created", { id: cycleCount.id });

    return successResponse(res, 201, cycleCount, "Cycle count started");
  } catch (err) {
    logger.error("[CycleCount] Create failed", err);
    return errorResponse(res, 500, "Failed to start cycle count");
  }
};

/**
 * Get All Cycle Counts (with filters)
 */
const getCycleCounts = async (req, res) => {
  try {
    const {
      locationId,
      status,
      assignedToId,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    const total = await prisma.cycleCount.count({ where });

    const data = await prisma.cycleCount.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return successResponse(res, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      cycleCounts: data,
    });
  } catch (err) {
    logger.error("[CycleCount] Fetch failed", err);
    return errorResponse(res, 500, "Failed to fetch cycle counts");
  }
};

/**
 * Get Cycle Count By ID
 */
const getCycleCountById = async (req, res) => {
  try {
    const { id } = req.params;

    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id },
      include: {
  location: true,
  assignedTo: {
    select: {
      id: true,
      name: true, 
      phone: true,
      email: true,
    }
  }
}

    });

    if (!cycleCount) {
      return errorResponse(res, 404, "Cycle count not found");
    }

    return successResponse(res, 200, cycleCount);
  } catch (err) {
    logger.error("[CycleCount] Get by ID failed", err);
    return errorResponse(res, 500, "Failed to fetch cycle count");
  }
};

const updateCycleCountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // OPEN | IN_PROGRESS | COMPLETED

    // Fetch existing cycle count
    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id },
    });

    if (!cycleCount) {
      return errorResponse(res, 404, "Cycle count not found");
    }

    // ❌ Prevent invalid transitions
    if (cycleCount.status === "COMPLETED") {
      return errorResponse(
        res,
        400,
        "Completed cycle count cannot be updated"
      );
    }

    if (
      cycleCount.status === "OPEN" &&
      status === "COMPLETED"
    ) {
      return errorResponse(
        res,
        400,
        "Cycle count must be IN_PROGRESS before completing"
      );
    }

    const updateData = { status };

    // Auto-set completedAt
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.cycleCount.update({
      where: { id },
      data: updateData,
    });

    logger.info("[CycleCount] Status updated", {
      cycleCountId: id,
      oldStatus: cycleCount.status,
      newStatus: status,
    });

    return successResponse(
      res,
      200,
      updated,
      `Cycle count status updated to ${status}`
    );
  } catch (error) {
    logger.error("[CycleCount] Status update failed", {
      error: error.message,
    });
    return errorResponse(res, 500, "Failed to update cycle count status");
  }
};


export {
  createCycleCount,
  getCycleCounts,
  getCycleCountById,
  updateCycleCountStatus,
};