import { prisma } from "../../config/prismaClient.js";
import logger from "../../utils/logger.js";
import { successResponse, errorResponse } from "../../utils/responseHelper.js";

const getAllRatings = async (req, res) => {
  try {
    const {
      search,
      productId,
      userId,
      minRating,
      maxRating,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = {};

    // ---------- FILTERS ----------
    if (productId) where.productId = productId;
    if (userId) where.userId = userId;

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) where.rating.gte = Number(minRating);
      if (maxRating) where.rating.lte = Number(maxRating);
    }

    // ---------- SEARCH ----------
    if (search) {
      const s = search.trim();
      where.OR = [
        { review: { contains: s, mode: "insensitive" } },
        { user: { name: { contains: s, mode: "insensitive" } } },
        { product: { name: { contains: s, mode: "insensitive" } } }
      ];
    }

    // ---------- FETCH RATINGS ----------
    const ratings = await prisma.rating.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, name: true, images: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // ---------- AGGREGATIONS ----------
    const [allRatingCount, avgData, total5StarRatings, total1StarRatings] =
      await Promise.all([
        prisma.rating.count({ where }),
        prisma.rating.aggregate({ where, _avg: { rating: true } }),
        prisma.rating.count({ where: { ...where, rating: 5 } }),
        prisma.rating.count({ where: { ...where, rating: 1 } })
      ]);

    const avgRating = avgData._avg.rating ?? 0;

    logger.info("[RATING] Ratings fetched successfully");

    return successResponse(res, 200, {
      stats: {
        allRatingCount,
        avgRating,
        total5StarRatings,
        total1StarRatings
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(allRatingCount / limitNum)
      },
      ratings
    });

  } catch (error) {
    logger.error("[RATING] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch ratings");
  }
};



const getRatingById = async (req, res) => {
  try {
    const { id } = req.params;

    const rating = await prisma.rating.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, name: true, images: true } }
      }
    });

    if (!rating) {
      return errorResponse(res, 404, "Rating not found");
    }

    logger.info(`[RATING] Rating fetched with ID: ${id}`);

    return successResponse(res, 200, rating);
  } catch (error) {
    logger.error("[RATING] Fetch by ID error", error);
    return errorResponse(res, 500, "Failed to fetch rating");
  }
};


export { getAllRatings, getRatingById };