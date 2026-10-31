import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
} from "../utils/responseHelper.js";

const normalizeNullableId = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
};

const getWarehouseIdFromUser = async (req) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new Error("User not authenticated");
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
      return user.warehouseId;
    }
  } catch (err) {
    logger.warn("getWarehouseIdFromUser query failed in campaginController", err);
  }

  // Return a dummy UUID to prevent leaking other warehouses' data
  return "00000000-0000-0000-0000-000000000000";
};

const campaignInclude = {
  coupon: {
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      value: true,
      isActive: true,
    },
  },
  banner: {
    select: {
      id: true,
      title: true,
      imageUrl: true,
      status: true,
    },
  },
};

export const createCampaign = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);

    const {
      name,
      couponId,
      bannerId,
      startDate,
      endDate,
      status,
      isActive,
    } = req.body;

    const finalCouponId = normalizeNullableId(couponId);
    const finalBannerId = normalizeNullableId(bannerId);
    const campaignName = name?.trim();

    logger.info("[CAMPAIGN] Create API called", {
      warehouseId,
      body: req.body,
      name: campaignName,
      couponId: finalCouponId,
      bannerId: finalBannerId,
    });

    if (!campaignName) {
      return errorResponse(res, 400, "Campaign name is required");
    }

    if (!startDate) {
      return errorResponse(res, 400, "startDate is required");
    }

    if (!endDate) {
      return errorResponse(res, 400, "endDate is required");
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime())) {
      return errorResponse(res, 400, "Invalid startDate");
    }

    if (Number.isNaN(parsedEndDate.getTime())) {
      return errorResponse(res, 400, "Invalid endDate");
    }

    if (parsedEndDate < parsedStartDate) {
      logger.warn("[CAMPAIGN] Create failed - invalid date range", {
        warehouseId,
        startDate,
        endDate,
      });

      return errorResponse(
        res,
        400,
        "endDate must be greater than or equal to startDate"
      );
    }

    if (finalCouponId) {
      const couponExists = await prisma.coupon.findFirst({
        where: {
          id: finalCouponId,
          warehouseId,
        },
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      });

      if (!couponExists) {
        logger.warn("[CAMPAIGN] Create failed - coupon not found", {
          warehouseId,
          couponId: finalCouponId,
        });

        return errorResponse(res, 404, "Coupon not found for this warehouse");
      }
    }

    if (finalBannerId) {
      const bannerExists = await prisma.banner.findFirst({
        where: {
          id: finalBannerId,
          warehouseId,
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      if (!bannerExists) {
        logger.warn("[CAMPAIGN] Create failed - banner not found", {
          warehouseId,
          bannerId: finalBannerId,
        });

        return errorResponse(res, 404, "Banner not found for this warehouse");
      }
    }

    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        warehouseId,
        name: {
          equals: campaignName,
          mode: "insensitive",
        },
        couponId: finalCouponId,
        bannerId: finalBannerId,
      },
      select: {
        id: true,
        name: true,
        couponId: true,
        bannerId: true,
      },
    });

    if (existingCampaign) {
      logger.warn("[CAMPAIGN] Create failed - duplicate campaign", {
        warehouseId,
        name: campaignName,
        couponId: finalCouponId,
        bannerId: finalBannerId,
        existingCampaignId: existingCampaign.id,
      });

      return errorResponse(
        res,
        409,
        "Campaign already exists with the same name, coupon and banner for this warehouse"
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        warehouseId,
        name: campaignName,
        couponId: finalCouponId,
        bannerId: finalBannerId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: status || "ACTIVE",
        isActive: isActive !== undefined ? isActive : true,
      },
      include: campaignInclude,
    });

    logger.info("[CAMPAIGN] Created successfully", {
      warehouseId,
      campaignId: campaign.id,
      name: campaign.name,
      couponId: finalCouponId,
      bannerId: finalBannerId,
    });

    return successResponse(
      res,
      201,
      campaign,
      "Campaign created successfully"
    );
  } catch (error) {
    logger.error("[CAMPAIGN] Create failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to create campaign"
    );
  }
};

export const getCampaignList = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);

    let {
      page = 1,
      limit = 10,
      search,
      status,
      isActive,
      couponId,
      bannerId,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!page || page < 1) page = 1;
    if (!limit || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const where = {
      warehouseId,
    };

    if (status) {
      where.status = String(status).toUpperCase();
    }

    if (isActive !== undefined) {
      where.isActive =
        String(isActive).toLowerCase() === "true" ||
        String(isActive) === "1";
    }

    if (couponId) {
      where.couponId = couponId;
    }

    if (bannerId) {
      where.bannerId = bannerId;
    }

    if (search && search.trim()) {
      where.OR = [
        {
          name: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          coupon: {
            code: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          coupon: {
            title: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          banner: {
            title: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [campaigns, total, totalRecords, activeCount, inactiveCount] =
      await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: campaignInclude,
        }),

        prisma.campaign.count({ where }),

        prisma.campaign.count({
          where: {
            warehouseId,
          },
        }),

        prisma.campaign.count({
          where: {
            warehouseId,
            isActive: true,
          },
        }),

        prisma.campaign.count({
          where: {
            warehouseId,
            isActive: false,
          },
        }),
      ]);

    logger.info("[CAMPAIGN] List fetched successfully", {
      warehouseId,
      total,
      page,
      limit,
    });

    return paginatedResponse(
      res,
      200,
      {
        stats: {
          totalRecords,
          active: activeCount,
          inactive: inactiveCount,
        },
        campaigns,
      },
      {
        total,
        page,
        limit,
      },
      "Campaigns fetched successfully"
    );
  } catch (error) {
    logger.error("[CAMPAIGN] List failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to fetch campaigns"
    );
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { campaignId } = req.params;

    logger.info("[CAMPAIGN] Get by id called", {
      campaignId,
      warehouseId,
    });

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        warehouseId,
      },
      include: {
        coupon: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            value: true,
            maxDiscount: true,
            minOrderValue: true,
            startDate: true,
            startTime: true,
            expiryDate: true,
            endTime: true,
            isActive: true,
            scope: true,
          },
        },
        banner: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            status: true,
          },
        },
      },
    });

    if (!campaign) {
      logger.warn("[CAMPAIGN] Not found", {
        campaignId,
        warehouseId,
      });

      return errorResponse(res, 404, "Campaign not found");
    }

    const formattedCampaign = {
      id: campaign.id,
      name: campaign.name,
      warehouseId: campaign.warehouseId,

      couponId: campaign.couponId,
      coupon: campaign.coupon
        ? {
            id: campaign.coupon.id,
            code: campaign.coupon.code,
            title: campaign.coupon.title,
            type: campaign.coupon.type,
            value: campaign.coupon.value,
            maxDiscount: campaign.coupon.maxDiscount,
            minOrderValue: campaign.coupon.minOrderValue,
            startDate: campaign.coupon.startDate,
            startTime: campaign.coupon.startTime,
            expiryDate: campaign.coupon.expiryDate,
            endTime: campaign.coupon.endTime,
            isActive: campaign.coupon.isActive,
            scope: campaign.coupon.scope,
          }
        : null,

      bannerId: campaign.bannerId,
      banner: campaign.banner
        ? {
            id: campaign.banner.id,
            title: campaign.banner.title,
            imageUrl: campaign.banner.imageUrl,
            status: campaign.banner.status,
          }
        : null,

      startDate: campaign.startDate,
      endDate: campaign.endDate,
      status: campaign.status,
      isActive: campaign.isActive,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };

    return successResponse(
      res,
      200,
      formattedCampaign,
      "Campaign fetched successfully"
    );
  } catch (error) {
    logger.error("[CAMPAIGN] Get by id failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to fetch campaign"
    );
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { campaignId } = req.params;
    const data = req.body;

    /*
      ✅ Support both keys:
      couponId    => new key
      promoCodeId => old frontend key, treated as couponId
    */
    const incomingCouponId =
      data.couponId !== undefined
        ? normalizeNullableId(data.couponId)
        : data.promoCodeId !== undefined
          ? normalizeNullableId(data.promoCodeId)
          : undefined;

    const incomingBannerId =
      data.bannerId !== undefined
        ? normalizeNullableId(data.bannerId)
        : undefined;

    logger.info("[CAMPAIGN] Update API called", {
      campaignId,
      warehouseId,
      body: data,
      couponId: incomingCouponId,
      promoCodeId: data.promoCodeId,
      bannerId: incomingBannerId,
    });

    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        warehouseId,
      },
    });

    if (!existingCampaign) {
      logger.warn("[CAMPAIGN] Update failed - not found", {
        campaignId,
        warehouseId,
      });

      return errorResponse(res, 404, "Campaign not found");
    }

    const nextName =
      data.name !== undefined ? data.name.trim() : existingCampaign.name;

    if (!nextName) {
      return errorResponse(res, 400, "Campaign name is required");
    }

    const nextStartDate = data.startDate
      ? new Date(data.startDate)
      : existingCampaign.startDate;

    const nextEndDate = data.endDate
      ? new Date(data.endDate)
      : existingCampaign.endDate;

    if (
      Number.isNaN(nextStartDate.getTime()) ||
      Number.isNaN(nextEndDate.getTime())
    ) {
      return errorResponse(res, 400, "Invalid startDate or endDate");
    }

    if (nextEndDate < nextStartDate) {
      logger.warn("[CAMPAIGN] Update failed - invalid date range", {
        campaignId,
        warehouseId,
      });

      return errorResponse(
        res,
        400,
        "endDate must be greater than or equal to startDate"
      );
    }

    const nextCouponId =
      incomingCouponId !== undefined
        ? incomingCouponId
        : existingCampaign.couponId;

    const nextBannerId =
      incomingBannerId !== undefined
        ? incomingBannerId
        : existingCampaign.bannerId;

    if (nextCouponId) {
      const couponExists = await prisma.coupon.findFirst({
        where: {
          id: nextCouponId,
          warehouseId,
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!couponExists) {
        logger.warn("[CAMPAIGN] Update failed - coupon not found", {
          campaignId,
          warehouseId,
          couponId: nextCouponId,
        });

        return errorResponse(res, 404, "Coupon not found for this warehouse");
      }
    }

    if (nextBannerId) {
      const bannerExists = await prisma.banner.findFirst({
        where: {
          id: nextBannerId,
          warehouseId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!bannerExists) {
        logger.warn("[CAMPAIGN] Update failed - banner not found", {
          campaignId,
          warehouseId,
          bannerId: nextBannerId,
        });

        return errorResponse(res, 404, "Banner not found for this warehouse");
      }
    }

    const duplicateCampaign = await prisma.campaign.findFirst({
      where: {
        warehouseId,
        id: {
          not: campaignId,
        },
        name: {
          equals: nextName,
          mode: "insensitive",
        },
        couponId: nextCouponId,
        bannerId: nextBannerId,
      },
      select: {
        id: true,
      },
    });

    if (duplicateCampaign) {
      logger.warn("[CAMPAIGN] Update failed - duplicate campaign", {
        campaignId,
        warehouseId,
        duplicateCampaignId: duplicateCampaign.id,
        name: nextName,
        couponId: nextCouponId,
        bannerId: nextBannerId,
      });

      return errorResponse(
        res,
        409,
        "Campaign already exists with the same name, coupon and banner for this warehouse"
      );
    }

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        ...(data.name !== undefined && {
          name: nextName,
        }),
        ...(data.startDate !== undefined && {
          startDate: nextStartDate,
        }),
        ...(data.endDate !== undefined && {
          endDate: nextEndDate,
        }),
        ...(data.status !== undefined && {
          status: data.status,
        }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),

        /*
          ✅ Whether frontend sends couponId or promoCodeId,
          we save it into campaign.couponId
        */
        ...(incomingCouponId !== undefined && {
          couponId: incomingCouponId,
        }),

        ...(incomingBannerId !== undefined && {
          bannerId: incomingBannerId,
        }),
      },
      include: campaignInclude,
    });

    logger.info("[CAMPAIGN] Updated successfully", {
      campaignId,
      warehouseId,
      couponId: updatedCampaign.couponId,
      bannerId: updatedCampaign.bannerId,
    });

    return successResponse(
      res,
      200,
      updatedCampaign,
      "Campaign updated successfully"
    );
  } catch (error) {
    logger.error("[CAMPAIGN] Update failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to update campaign"
    );
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { campaignId } = req.params;

    logger.info("[CAMPAIGN] Delete API called", {
      campaignId,
      warehouseId,
    });

    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        warehouseId,
      },
      select: {
        id: true,
      },
    });

    if (!existingCampaign) {
      logger.warn("[CAMPAIGN] Delete failed - not found", {
        campaignId,
        warehouseId,
      });

      return errorResponse(res, 404, "Campaign not found");
    }

    await prisma.campaign.delete({
      where: {
        id: campaignId,
      },
    });

    logger.info("[CAMPAIGN] Deleted successfully", {
      campaignId,
      warehouseId,
    });

    return successResponse(res, 200, null, "Campaign deleted successfully");
  } catch (error) {
    logger.error("[CAMPAIGN] Delete failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to delete campaign"
    );
  }
};

export const toggleCampaignStatus = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req);
    const { campaignId } = req.params;

    logger.info("[CAMPAIGN] Toggle status API called", {
      campaignId,
      warehouseId,
    });

    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        warehouseId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        status: true,
      },
    });

    if (!existingCampaign) {
      logger.warn("[CAMPAIGN] Toggle failed - not found", {
        campaignId,
        warehouseId,
      });

      return errorResponse(res, 404, "Campaign not found");
    }

    const nextIsActive = !existingCampaign.isActive;

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        isActive: nextIsActive,
        status: nextIsActive ? "ACTIVE" : "INACTIVE",
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info("[CAMPAIGN] Toggle successful", {
      campaignId,
      warehouseId,
      newStatus: updatedCampaign.status,
    });

    return successResponse(
      res,
      200,
      updatedCampaign,
      `Campaign ${
        updatedCampaign.isActive ? "activated" : "deactivated"
      } successfully`
    );
  } catch (error) {
    logger.error("[CAMPAIGN] Toggle failed", {
      message: error.message,
      stack: error.stack,
    });

    return errorResponse(
      res,
      500,
      error.message || "Failed to toggle campaign status"
    );
  }
};