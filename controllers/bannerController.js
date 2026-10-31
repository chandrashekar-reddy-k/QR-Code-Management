import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
} from "../utils/responseHelper.js";

const normalizeNullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value.trim() : value;
};
const getWarehouseIdFromUser = async (req) => {
  const userId = req.user?.id;

  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        warehouseId: true,
      },
    });

    if (user?.warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: user.warehouseId },
        select: { id: true },
      });
      if (wh) return user.warehouseId;
    }
  } catch (err) {
    logger.warn("getWarehouseIdFromUser query failed in bannerController", err);
  }

  return null;
};

export const createBanner = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);

    const {
      title,
      bannerType,
      subtitle,
      imageUrl,
      redirectUrl,
      position,
      isActive,
      status,
      startAt,
      endAt,
    } = req.body;

    logger.info("[BANNER] Create API called", {
      body: req.body,
      warehouseId,
    });

    const parsedStartAt = startAt ? new Date(startAt) : null;
    const parsedEndAt = endAt ? new Date(endAt) : null;

    if (parsedStartAt && parsedEndAt && parsedEndAt < parsedStartAt) {
      logger.warn("[BANNER] Create failed - invalid date range", {
        warehouseId,
        startAt,
        endAt,
      });
      return errorResponse(res, 400, "endAt must be greater than or equal to startAt");
    }

    const whereClause = {
      title: title.trim(),
    };
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const existingBanner = await prisma.banner.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (existingBanner) {
      logger.warn("[BANNER] Create failed - duplicate banner", {
        warehouseId,
        title,
        imageUrl,
      });
      return errorResponse(res, 409, "Banner with same title already exists");
    }

    const isBannerActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : true;
    const bannerStatus = req.body.status
      ? (String(req.body.status).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE")
      : (isBannerActive ? "ACTIVE" : "INACTIVE");

    const banner = await prisma.banner.create({
      data: {
        warehouseId: warehouseId || null,
        title: title.trim(),
        bannerType: normalizeNullableString(bannerType) ?? null,
        subtitle: normalizeNullableString(subtitle) ?? null,
        imageUrl: imageUrl.trim(),
        redirectUrl: normalizeNullableString(redirectUrl) ?? null,
        position: position ? Number(position) : 1,
        isActive: isBannerActive,
        status: bannerStatus,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
      },
    });

    logger.info("[BANNER] Created successfully", {
      bannerId: banner.id,
      warehouseId,
    });

    return successResponse(res, 201, banner, "Banner created successfully");
  } catch (error) {
    logger.error("[BANNER] Create failed", { message: error.message, stack: error.stack });
    return errorResponse(res, 500, error.message || "Failed to create banner");
  }
};

export const getBannerList = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { showAll, isAdmin } = req.query;

    let { page = 1, limit = 100, search, status, isActive, bannerType } = req.query;

    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const where = {
      ...(showAll !== "true" && isAdmin !== "true" && warehouseId ? { warehouseId } : {}),
      ...(status && { status }),
      ...(isActive !== undefined && { isActive: isActive === "true" }),
      ...(bannerType && { bannerType }),
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subtitle: { contains: search, mode: "insensitive" } },
        { bannerType: { contains: search, mode: "insensitive" } },
        { imageUrl: { contains: search, mode: "insensitive" } },
        { redirectUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    const baseCountWhere = (showAll === "true" || isAdmin === "true" || !warehouseId) ? {} : { warehouseId };

    const [banners, total, totalRecords, activeCount, inactiveCount] =
      await Promise.all([
        prisma.banner.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ createdAt: "desc" }],
        }),
        prisma.banner.count({ where }),
        prisma.banner.count({ where: baseCountWhere }),
        prisma.banner.count({ where: { ...baseCountWhere, isActive: true } }),
        prisma.banner.count({ where: { ...baseCountWhere, isActive: false } }),
      ]);

    logger.info("[BANNER] List fetched", {
      warehouseId,
      total,
      page,
      limit,
    });

    return paginatedResponse(
      res,
      200,
      {
        banners,
        stats: {
          totalRecords,
          active: activeCount,
          inactive: inactiveCount,
        },
      },
      { total, page, limit },
      "Banners fetched successfully"
    );
  } catch (error) {
    logger.error("[BANNER] List failed", { message: error.message });
    return errorResponse(res, 500, error.message || "Failed to fetch banners");
  }
};

export const getBannerById = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { bannerId } = req.params;

    logger.info("[BANNER] Get by id API called", { bannerId, warehouseId });

    let banner = null;
    if (warehouseId) {
      banner = await prisma.banner.findFirst({
        where: {
          id: bannerId,
          warehouseId,
        },
      });
    }

    if (!banner) {
      banner = await prisma.banner.findFirst({
        where: { id: bannerId },
      });
    }

    if (!banner) {
      logger.warn("[BANNER] Not found", { bannerId, warehouseId });
      return errorResponse(res, 404, "Banner not found");
    }

    return successResponse(res, 200, banner, "Banner fetched successfully");
  } catch (error) {
    logger.error("[BANNER] Get by id failed", { message: error.message });
    return errorResponse(res, 500, error.message || "Failed to fetch banner");
  }
};

export const updateBanner = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { bannerId } = req.params;
    const data = req.body;

    logger.info("[BANNER] Update API called", {
      bannerId,
      warehouseId,
      body: data,
    });

    let existingBanner = await prisma.banner.findFirst({
      where: {
        id: bannerId,
        warehouseId,
      },
    });

    if (!existingBanner) {
      existingBanner = await prisma.banner.findFirst({
        where: { id: bannerId },
      });
    }

    if (!existingBanner) {
      logger.warn("[BANNER] Update failed - not found", { bannerId, warehouseId });
      return errorResponse(res, 404, "Banner not found");
    }

    const nextStartAt = data.startAt ? new Date(data.startAt) : existingBanner.startAt;
    const nextEndAt = data.endAt ? new Date(data.endAt) : existingBanner.endAt;

    if (nextStartAt && nextEndAt && nextEndAt < nextStartAt) {
      logger.warn("[BANNER] Update failed - invalid date range", {
        bannerId,
        warehouseId,
      });
      return errorResponse(res, 400, "endAt must be greater than or equal to startAt");
    }

    const updatedBanner = await prisma.banner.update({
      where: { id: bannerId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.bannerType !== undefined && {
          bannerType: normalizeNullableString(data.bannerType),
        }),
        ...(data.subtitle !== undefined && {
          subtitle: normalizeNullableString(data.subtitle),
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl.trim() }),
        ...(data.redirectUrl !== undefined && {
          redirectUrl: normalizeNullableString(data.redirectUrl),
        }),
        ...(data.position !== undefined && { position: Number(data.position) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.approvalStatus !== undefined && {
          ...(String(data.approvalStatus).toUpperCase() === 'APPROVED' && { isActive: true, status: 'ACTIVE' }),
          ...(String(data.approvalStatus).toUpperCase() === 'REJECTED' && { isActive: false, status: 'INACTIVE' })
        }),
        ...(data.startAt !== undefined && {
          startAt: data.startAt ? new Date(data.startAt) : null,
        }),
        ...(data.endAt !== undefined && {
          endAt: data.endAt ? new Date(data.endAt) : null,
        }),
      },
    });

    logger.info("[BANNER] Updated successfully", {
      bannerId,
      warehouseId,
    });

    return successResponse(res, 200, updatedBanner, "Banner updated successfully");
  } catch (error) {
    logger.error("[BANNER] Update failed", { message: error.message });
    return errorResponse(res, 500, error.message || "Failed to update banner");
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { bannerId } = req.params;

    logger.info("[BANNER] Delete API called", { bannerId, warehouseId });

    let existingBanner = null;
    if (warehouseId) {
      existingBanner = await prisma.banner.findFirst({
        where: {
          id: bannerId,
          warehouseId,
        },
        select: {
          id: true,
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
      });
    }

    if (!existingBanner) {
      existingBanner = await prisma.banner.findFirst({
        where: {
          id: bannerId,
        },
        select: {
          id: true,
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
      });
    }

    if (!existingBanner) {
      logger.warn("[BANNER] Delete failed - not found", { bannerId, warehouseId });
      return errorResponse(res, 404, "Banner not found");
    }

    if (existingBanner._count.campaigns > 0) {
      logger.warn("[BANNER] Delete failed - linked with campaigns", {
        bannerId,
        warehouseId,
      });
      return errorResponse(
        res,
        400,
        "Banner is linked with campaigns and cannot be deleted"
      );
    }

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    logger.info("[BANNER] Deleted successfully", { bannerId, warehouseId });

    return successResponse(res, 200, null, "Banner deleted successfully");
  } catch (error) {
    logger.error("[BANNER] Delete failed", { message: error.message });
    return errorResponse(res, 500, error.message || "Failed to delete banner");
  }
};

export const toggleBannerStatus = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { bannerId } = req.params;

    logger.info("[BANNER] Toggle status API called", { bannerId, warehouseId });

    let existingBanner = null;
    if (warehouseId) {
      existingBanner = await prisma.banner.findFirst({
        where: {
          id: bannerId,
          warehouseId,
        },
        select: {
          id: true,
          title: true,
          isActive: true,
        },
      });
    }

    if (!existingBanner) {
      existingBanner = await prisma.banner.findFirst({
        where: {
          id: bannerId,
        },
        select: {
          id: true,
          title: true,
          isActive: true,
        },
      });
    }

    if (!existingBanner) {
      logger.warn("[BANNER] Toggle failed - not found", { bannerId, warehouseId });
      return errorResponse(res, 404, "Banner not found");
    }

    const nextIsActive = !existingBanner.isActive;

    const updatedBanner = await prisma.banner.update({
      where: { id: bannerId },
      data: {
        isActive: nextIsActive,
        status: nextIsActive ? "ACTIVE" : "INACTIVE",
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info("[BANNER] Toggle successful", {
      bannerId,
      warehouseId,
      newStatus: updatedBanner.isActive,
    });

    return successResponse(
      res,
      200,
      updatedBanner,
      `Banner ${updatedBanner.isActive ? "activated" : "deactivated"} successfully`
    );
  } catch (error) {
    logger.error("[BANNER] Toggle failed", { message: error.message });
    return errorResponse(res, 500, error.message || "Failed to toggle banner status");
  }
};