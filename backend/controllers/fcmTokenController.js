import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

/**
 * POST /api/v1/partner/fcm-token
 * Register or update FCM token for the active partner/shopkeeper session
 */
export async function updateFcmToken(req, res) {
  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.user?.id;

    if (!fcmToken) {
      return errorResponse(res, 400, "fcmToken is required");
    }

    if (!userId) {
      return errorResponse(res, 401, "User unauthorized");
    }

    // 1. Update Session table for active user
    const updatedSessions = await prisma.session.updateMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      data: {
        fcmToken,
        ...(deviceId ? { deviceId } : {}),
      },
    });

    if (fcmToken) {
      try {
        await prisma.deviceToken.upsert({
          where: { fcmToken },
          update: {
            userId,
            updatedAt: new Date(),
          },
          create: {
            userId,
            deviceToken: fcmToken,
            fcmToken,
            platform: "WEB",
          },
        });
      } catch (err) {
        logger.warn("[FCM] DeviceToken upsert warning:", err.message);
      }
    }

    logger.info("[FCM] Partner FCM token saved successfully", {
      userId,
      fcmTokenSnippet: `${fcmToken.substring(0, 15)}...`,
      updatedSessions: updatedSessions.count,
    });

    return successResponse(res, 200, { fcmToken }, "FCM token saved successfully");
  } catch (error) {
    logger.error("[FCM] Failed to update FCM token:", error.message);
    return errorResponse(res, 500, "Failed to update FCM token");
  }
}
