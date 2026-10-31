import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/responseHelper.js';

// =============== CREATE ===================
export const uploadMedia = async (req, res) => {
  try {
    logger.info("[Media] Upload request received", { body: req.body });

    const media = await prisma.media.create({ data: req.body });

    logger.info("[Media] Uploaded successfully", { id: media.id });
    return successResponse(res, 201, media, "Media uploaded successfully");
  } catch (err) {
    logger.error("[Media] Upload failed", err);
    return errorResponse(res, 500, "Failed to upload media");
  }
};

// =============== GET LIST ===================
export const getMediaList = async (req, res) => {
  try {
    const { search, fileType, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * Number(limit);

    const where = {
      isDeleted: false,
      ...(fileType && { fileType }),
      ...(search && { fileName: { contains: search, mode: "insensitive" } })
    };

    logger.info("[Media] Fetch list", where);

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      prisma.media.count({ where })
    ]);

    return successResponse(res, 200, {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      media
    });
  } catch (err) {
    logger.error("[Media] Fetch list failed", err);
    return errorResponse(res, 500, "Failed to fetch media list");
  }
};

// =============== VIEW ===================
export const getMediaDetails = async (req, res) => {
  try {
    logger.info("[Media] Fetch details", { id: req.params.id });

    const media = await prisma.media.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { 
        user: { select: { id: true, name: true, email: true }} 
      }
    });

    if (!media) return errorResponse(res, 404, "Media not found");
    return successResponse(res, 200, media);
  } catch (err) {
    logger.error("[Media] Details fetch failed", err);
    return errorResponse(res, 500, "Failed to get media details");
  }
};

// =============== UPDATE ===================
export const updateMedia = async (req, res) => {
  try {
    logger.info("[Media] Update request", { id: req.params.id, body: req.body });

    const media = await prisma.media.update({
      where: { id: req.params.id },
      data: req.body
    });

    logger.info("[Media] Updated successfully", { id: media.id });
    return successResponse(res, 200, media, "Media updated successfully");
  } catch (err) {
    logger.error("[Media] Update failed", err);
    return errorResponse(res, 500, "Failed to update media");
  }
};

// =============== SOFT DELETE ===================
export const deleteMedia = async (req, res) => {
  try {
    logger.info("[Media] Soft delete request", { id: req.params.id });

    const media = await prisma.media.update({
      where: { id: req.params.id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    logger.info("[Media] Soft deleted", { id: media.id });
    return successResponse(res, 200, null, "Media moved to trash (soft deleted)");
  } catch (err) {
    logger.error("[Media] Delete failed", err);
    return errorResponse(res, 404, "Media not found");
  }
};
