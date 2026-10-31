import { prisma } from "../config/prismaClient.js"
import logger from "../utils/logger.js"
import {
  errorResponse,
  successResponse,
  paginatedResponse
} from "../utils/responseHelper.js"

const normalizeNullableString = (value) => {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  return typeof value === "string" ? value.trim() : value
}

const normalizeCode = (value) => {
  if (!value || typeof value !== "string") return null
  return value.trim().toUpperCase()
}

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? null : numberValue
}

const toIntOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return null
  return parseInt(numberValue, 10)
}

const parseMaxUsesPerUser = (value) => {
  if (value === undefined || value === null || value === "") return null
  const upper = String(value).trim().toUpperCase()
  if (upper === "ONE" || upper === "1") return 1
  if (upper === "MULTIPLE") return null
  return toIntOrNull(value)
}

const toBooleanFromStatus = (status, fallback = true) => {
  if (status === undefined || status === null || status === "") return fallback

  if (typeof status === "boolean") return status

  const value = String(status).trim().toUpperCase()

  if (value === "ACTIVE" || value === "TRUE" || value === "1") return true
  if (value === "INACTIVE" || value === "FALSE" || value === "0") return false

  return fallback
}

const getWarehouseIdFromUser = async (req) => {
  const userId = req.user?.id;

  if (req.user?.warehouseId) {
    return req.user.warehouseId;
  }

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          warehouseId: true,
          phone: true,
          email: true,
        }
      });

      if (user?.warehouseId) {
        return user.warehouseId;
      }

      // Check shopkeeper table if user has no warehouseId on user record
      const sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: userId },
            ...(user?.phone ? [{ phone: user.phone }] : []),
            ...(req.user?.phone ? [{ phone: req.user.phone }] : [])
          ]
        },
        select: { warehouseId: true }
      });

      if (sk?.warehouseId) {
        return sk.warehouseId;
      }
    } catch (err) {
      logger.warn("getWarehouseIdFromUser query failed in promocodesController", err);
    }
  }

  // Fallback to first warehouse or default Phirangipuram warehouse ID
  const defaultWarehouse = await prisma.warehouse.findFirst({ select: { id: true } });
  return defaultWarehouse?.id || "9f337243-9b4c-4fb1-9ce5-05ed5a2acfb8";
};

const normalizeDiscountType = (value) => {
  if (!value) return null

  const type = String(value).trim().toUpperCase()

  if (type === "PERCENTAGE") return "PERCENTAGE"

  if (
    type === "RUPEES" ||
    type === "RUPEE" ||
    type === "AMOUNT" ||
    type === "FIXED" ||
    type === "FLAT"
  ) {
    return "RUPEES"
  }

  return null
}

const getCouponValueFromBody = (body, type) => {
  if (body.value !== undefined) return toNumberOrNull(body.value)

  if (type === "PERCENTAGE") {
    return toNumberOrNull(body.percentageOff ?? body.discount)
  }

  if (type === "RUPEES") {
    return toNumberOrNull(body.discount)
  }

  return null
}

const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null

  const datePart = new Date(dateValue)

  if (Number.isNaN(datePart.getTime())) return null

  if (!timeValue) {
    datePart.setHours(0, 0, 0, 0)
    return datePart
  }

  const [hours = "0", minutes = "0"] = String(timeValue).split(":")

  datePart.setHours(Number(hours), Number(minutes), 0, 0)

  return datePart
}

const validateCouponPayload = ({
  code,
  type,
  value,
  maxDiscount,
  minOrderValue,
  startDate,
  startTime,
  expiryDate,
  endTime,
  isCreate = true
}) => {
  if (isCreate && !code) {
    return "Code is required"
  }

  if (isCreate && !type) {
    return "Discount type is required"
  }

  if (type && !["PERCENTAGE", "RUPEES"].includes(type)) {
    return "Invalid discount type. Allowed values are PERCENTAGE and RUPEES"
  }

  if (isCreate && (value === null || value === undefined)) {
    return "Discount value is required"
  }

  if (value !== null && value !== undefined && value <= 0) {
    return "Discount value must be greater than 0"
  }

  if (type === "PERCENTAGE" && value > 100) {
    return "Percentage discount cannot be greater than 100"
  }

  if (maxDiscount !== null && maxDiscount !== undefined && maxDiscount < 0) {
    return "Max discount cannot be negative"
  }

  if (minOrderValue !== null && minOrderValue !== undefined && minOrderValue < 0) {
    return "Minimum order value cannot be negative"
  }

  if (isCreate && !startDate) {
    return "Start date is required"
  }

  if (isCreate && !expiryDate) {
    return "End date is required"
  }

  const startDateTime = combineDateAndTime(startDate, startTime)
  const endDateTime = combineDateAndTime(expiryDate, endTime)

  if (startDate && !startDateTime) {
    return "Invalid start date"
  }

  if (expiryDate && !endDateTime) {
    return "Invalid end date"
  }

  if (startDateTime && endDateTime && endDateTime < startDateTime) {
    return "End date/time must be greater than or equal to start date/time"
  }

  return null
}

const mapCouponResponse = (coupon) => {
  if (!coupon) return null

  return {
    id: coupon.id,
    code: coupon.code,
    promoCode: coupon.code,
    title: coupon.title,
    description: coupon.description,
    type: coupon.type,
    discountType: coupon.type,
    value: coupon.value,
    discount: coupon.type === "RUPEES" ? coupon.value : null,
    percentageOff: coupon.type === "PERCENTAGE" ? coupon.value : null,
    maxDiscount: coupon.maxDiscount,
    maxDiscountAmount: coupon.maxDiscount,
    minOrderValue: coupon.minOrderValue,
    minimumOrderAmount: coupon.minOrderValue,
    startDate: coupon.startDate,
    startTime: coupon.startTime,
    expiryDate: coupon.expiryDate,
    endDate: coupon.expiryDate,
    endTime: coupon.endTime,
    isActive: coupon.isActive,
    status: coupon.isActive ? "ACTIVE" : "INACTIVE",
    scope: coupon.scope,
    appicableOn: coupon.scope,
    applicablePincodes: coupon.applicablePincodes,
    newUserOnly: coupon.newUserOnly,
    firstOrderOnly: coupon.firstOrderOnly,
    maxUsesPerUser: coupon.maxUsesPerUser,
    repeatUsage: coupon.maxUsesPerUser === 1 ? "ONE" : "MULTIPLE",
    maxTotalUses: coupon.maxTotalUses,
    noOfUsers: coupon.maxTotalUses,
    totalUses: coupon.totalUses,
    termsUrl: coupon.termsUrl,
    warehouseId: coupon.warehouseId,
    products: coupon.products ? coupon.products.map(cp => {
      const prod = cp.product ? { ...cp.product } : { ...cp };
      if (cp.offerPrice !== undefined && cp.offerPrice !== null) {
        prod.offerPrice = cp.offerPrice;
      }
      return prod;
    }) : [],
    productIds: coupon.products ? coupon.products.map(cp => cp.productId) : [],
    mappedProductOffers: coupon.products ? coupon.products.reduce((acc, cp) => {
      if (cp.productId) {
        acc[cp.productId] = cp.offerPrice !== undefined && cp.offerPrice !== null ? cp.offerPrice : null;
      }
      return acc;
    }, {}) : {},
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt
  }
}


export const createPromoCode = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)
    const body = req.body

    const code = normalizeCode(body.code || body.couponCode || body.promoCode)
    const type = normalizeDiscountType(body.type || body.discountType)

    const value = getCouponValueFromBody(body, type)

    const maxDiscount = toNumberOrNull(
      body.maxDiscount ?? body.maxDiscountAmount
    )

    const minOrderValue = toNumberOrNull(
      body.minOrderValue ?? body.minimumOrderAmount
    )

    const startDate = body.startDate
    const expiryDate = body.expiryDate || body.endDate

    const startTime = normalizeNullableString(body.startTime)
    const endTime = normalizeNullableString(body.endTime)

    logger.info("[COUPON] Create API called", {
      warehouseId,
      code,
      type,
      body
    })

    const validationError = validateCouponPayload({
      code,
      type,
      value,
      maxDiscount,
      minOrderValue,
      startDate,
      startTime,
      expiryDate,
      endTime,
      isCreate: true
    })

    if (validationError) {
      logger.warn("[COUPON] Create failed - validation error", {
        warehouseId,
        code,
        validationError
      })

      return errorResponse(res, 400, validationError)
    }

    /* -------------------------------------------------------
       1️⃣ Get warehouse service pincodes
    ------------------------------------------------------- */

    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId
      },
      select: {
        id: true,
        servicePincodes: true
      }
    })

    if (!warehouse) {
      logger.warn("[COUPON] Create failed - warehouse not found", {
        warehouseId
      })

      return errorResponse(res, 404, "Warehouse not found")
    }

    const warehouseServicePincodes = Array.isArray(warehouse.servicePincodes)
      ? warehouse.servicePincodes
      : []

    /* -------------------------------------------------------
       2️⃣ Duplicate check by code + warehouse
    ------------------------------------------------------- */

    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        warehouseId,
        code
      },
      select: {
        id: true,
        code: true
      }
    })

    if (existingCoupon) {
      logger.warn("[COUPON] Create failed - duplicate code", {
        warehouseId,
        code,
        existingCouponId: existingCoupon.id
      })

      return errorResponse(res, 409, "Coupon code already exists for this warehouse")
    }

    /* -------------------------------------------------------
       3️⃣ Create coupon
    ------------------------------------------------------- */

    const productOffers = body.productOffers || body.mappedProductOffers || {};
    const rawProductIds = Array.isArray(body.productIds)
      ? body.productIds
      : (Array.isArray(body.mappedProducts) ? body.mappedProducts.map(p => p.productId || p.id) : (body.productId ? [body.productId] : []));

    const createdCoupon = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({
        data: {
          code,
          title: normalizeNullableString(body.title || body.message || code),
          description: normalizeNullableString(body.description || body.message),

          type,
          value,
          maxDiscount,
          minOrderValue,

          startDate: new Date(startDate),
          startTime,

          expiryDate: new Date(expiryDate),
          endTime,

          isActive: body.approvalStatus === "APPROVED" ? true : false,

          scope: normalizeNullableString(
            body.scope || body.applicableOn || body.appicableOn
          ),

          /*
            Store warehouse servicePincodes automatically.
            We are not taking applicablePincodes from request body.
          */
          applicablePincodes: warehouseServicePincodes,

          newUserOnly: body.newUserOnly === true,
          firstOrderOnly: body.firstOrderOnly === true,

          maxUsesPerUser: parseMaxUsesPerUser(body.maxUsesPerUser ?? body.repeatUsage ?? body.usageLimit),

          maxTotalUses: toIntOrNull(
            body.maxTotalUses ?? body.noOfUsers
          ),

          termsUrl: normalizeNullableString(body.termsUrl),

          warehouseId
        }
      });

      if (rawProductIds.length > 0) {
        await tx.couponProduct.createMany({
          data: rawProductIds.map((pid) => {
            const offer = productOffers[pid] ?? (Array.isArray(body.mappedProducts) ? body.mappedProducts.find(p => String(p.productId || p.id) === String(pid))?.offerPrice : null);
            return {
              couponId: coupon.id,
              productId: String(pid),
              offerPrice: offer !== undefined && offer !== null && offer !== '' ? parseFloat(offer) : null
            };
          }),
          skipDuplicates: true,
        });
      }

      return tx.coupon.findUnique({
        where: { id: coupon.id },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  mrp: true,
                  images: true,
                  sku: true,
                },
              },
            },
          },
        },
      });
    });

    logger.info("[COUPON] Created successfully", {
      couponId: createdCoupon.id,
      warehouseId,
      code,
      productCount: rawProductIds.length,
      applicablePincodes: warehouseServicePincodes
    })


    return successResponse(
      res,
      201,
      mapCouponResponse(createdCoupon),
      "Coupon code created successfully"
    )
  } catch (error) {
    logger.error("[COUPON] Create failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(
      res,
      500,
      error.message || "Failed to create coupon code"
    )
  }
}

export const getPromoCodeList = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)

    let {
      page = 1,
      limit = 10,
      search,
      status,
      isActive,
      discountType,
      type,
      scope,
      showAll,
      isAdmin
    } = req.query;

    page = Number(page)
    limit = Number(limit)

    if (!page || page < 1) page = 1
    if (!limit || limit < 1) limit = 100

    const skip = (page - 1) * limit

    const where = {
      ...(showAll !== "true" && isAdmin !== "true" && { warehouseId })
    }

    if (status) {
      where.isActive = String(status).toUpperCase() === "ACTIVE"
    }

    if (isActive !== undefined) {
      where.isActive =
        String(isActive).toLowerCase() === "true" ||
        String(isActive) === "1"
    }

    const normalizedType = normalizeDiscountType(type || discountType)

    if (normalizedType) {
      where.type = normalizedType
    }

    if (scope) {
      where.scope = scope
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { scope: { contains: search, mode: "insensitive" } }
      ]
    }

    const [coupons, total, totalRecords, activeCount, inactiveCount] =
      await Promise.all([
        prisma.coupon.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            products: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    mrp: true,
                    images: true,
                    sku: true,
                  },
                },
              },
            },
          },
        }),

        prisma.coupon.count({ where }),

        prisma.coupon.count({
          where: showAll === "true" || isAdmin === "true" ? {} : { warehouseId }
        }),

        prisma.coupon.count({
          where: {
            ...(showAll !== "true" && isAdmin !== "true" && { warehouseId }),
            isActive: true
          }
        }),

        prisma.coupon.count({
          where: {
            ...(showAll !== "true" && isAdmin !== "true" && { warehouseId }),
            isActive: false
          }
        })
      ])

    logger.info("[COUPON] List fetched", {
      warehouseId,
      total,
      page,
      limit
    })

   return paginatedResponse(
  res,
  200,
  {
    stats: {
      totalRecords,
      active: activeCount,
      inactive: inactiveCount
    },
    coupons: coupons.map(mapCouponResponse)
  },
  {
    total,
    page,
    limit
  },
  "Coupon codes fetched successfully"
)
  } catch (error) {
    logger.error("[COUPON] List failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message || "Failed to fetch coupon codes")
  }
}

export const getPromoCodeById = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)
    const { promoCodeId, couponId } = req.params

    const id = couponId || promoCodeId

    logger.info("[COUPON] Get by id called", {
      couponId: id,
      warehouseId
    })

    let coupon = await prisma.coupon.findFirst({
      where: {
        id,
        warehouseId
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                mrp: true,
                images: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    if (!coupon) {
      coupon = await prisma.coupon.findFirst({
        where: { id },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  mrp: true,
                  images: true,
                  sku: true,
                },
              },
            },
          },
        },
      })
    }


    if (!coupon) {
      logger.warn("[COUPON] Not found", {
        couponId: id,
        warehouseId
      })

      return errorResponse(res, 404, "Coupon code not found")
    }

    return successResponse(
      res,
      200,
      mapCouponResponse(coupon),
      "Coupon code fetched successfully"
    )
  } catch (error) {
    logger.error("[COUPON] Get by id failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message || "Failed to fetch coupon code")
  }
}

export const updatePromoCode = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)
    const { promoCodeId, couponId } = req.params
    const id = couponId || promoCodeId

    const body = req.body

    logger.info("[COUPON] Update API called", {
      couponId: id,
      warehouseId,
      body
    })

    /* -------------------------------------------------------
       ✅ Find coupon using warehouse relation, not warehouseId
    ------------------------------------------------------- */
    let existingCoupon = await prisma.coupon.findFirst({
      where: {
        id,
        warehouse: {
          id: warehouseId
        }
      }
    })

    if (!existingCoupon) {
      existingCoupon = await prisma.coupon.findFirst({
        where: { id }
      })
    }

    if (!existingCoupon) {
      existingCoupon = await prisma.coupon.findFirst({
        where: { code: id }
      })
    }

    if (!existingCoupon) {
      logger.warn("[COUPON] Update failed - not found", {
        couponId: id,
        warehouseId
      })

      return errorResponse(res, 404, "Coupon code not found")
    }

    let code = existingCoupon.code

    /* -------------------------------------------------------
       ✅ Duplicate check using warehouse relation
    ------------------------------------------------------- */
    if (body.code !== undefined || body.promoCode !== undefined) {
      code = normalizeCode(body.code || body.promoCode)

      if (!code) {
        return errorResponse(res, 400, "Code is required")
      }

      const duplicateCoupon = await prisma.coupon.findFirst({
        where: {
          code,
          warehouse: {
            id: warehouseId
          },
          NOT: {
            id
          }
        },
        select: {
          id: true
        }
      })

      if (duplicateCoupon) {
        logger.warn("[COUPON] Update failed - duplicate code", {
          couponId: id,
          warehouseId,
          code
        })

        return errorResponse(res, 409, "Coupon code already exists")
      }
    }

    const nextType =
      body.type !== undefined || body.discountType !== undefined
        ? normalizeDiscountType(body.type || body.discountType)
        : existingCoupon.type

    const nextValue =
      body.value !== undefined ||
      body.discount !== undefined ||
      body.percentageOff !== undefined
        ? getCouponValueFromBody(body, nextType)
        : existingCoupon.value

    const nextMaxDiscount =
      body.maxDiscount !== undefined || body.maxDiscountAmount !== undefined
        ? toNumberOrNull(body.maxDiscount ?? body.maxDiscountAmount)
        : existingCoupon.maxDiscount

    const nextMinOrderValue =
      body.minOrderValue !== undefined || body.minimumOrderAmount !== undefined
        ? toNumberOrNull(body.minOrderValue ?? body.minimumOrderAmount)
        : existingCoupon.minOrderValue

    const nextStartDate =
      body.startDate !== undefined
        ? body.startDate
        : existingCoupon.startDate

    const nextExpiryDate =
      body.expiryDate !== undefined || body.endDate !== undefined
        ? body.expiryDate || body.endDate
        : existingCoupon.expiryDate

    const nextStartTime =
      body.startTime !== undefined
        ? normalizeNullableString(body.startTime)
        : existingCoupon.startTime

    const nextEndTime =
      body.endTime !== undefined
        ? normalizeNullableString(body.endTime)
        : existingCoupon.endTime

    const validationError = validateCouponPayload({
      code,
      type: nextType,
      value: nextValue,
      maxDiscount: nextMaxDiscount,
      minOrderValue: nextMinOrderValue,
      startDate: nextStartDate,
      startTime: nextStartTime,
      expiryDate: nextExpiryDate,
      endTime: nextEndTime,
      isCreate: false
    })

    if (validationError) {
      logger.warn("[COUPON] Update failed - validation error", {
        couponId: id,
        warehouseId,
        validationError
      })

      return errorResponse(res, 400, validationError)
    }

    const updateData = {}

    if (body.code !== undefined || body.promoCode !== undefined) {
      updateData.code = code
    }

    if (body.title !== undefined || body.message !== undefined) {
      updateData.title = normalizeNullableString(body.title || body.message)
    }

    if (body.description !== undefined || body.message !== undefined) {
      updateData.description = normalizeNullableString(
        body.description || body.message
      )
    }

    if (body.type !== undefined || body.discountType !== undefined) {
      updateData.type = nextType
    }

    if (
      body.value !== undefined ||
      body.discount !== undefined ||
      body.percentageOff !== undefined
    ) {
      updateData.value = nextValue
    }

    if (body.maxDiscount !== undefined || body.maxDiscountAmount !== undefined) {
      updateData.maxDiscount = nextMaxDiscount
    }

    if (
      body.minOrderValue !== undefined ||
      body.minimumOrderAmount !== undefined
    ) {
      updateData.minOrderValue = nextMinOrderValue
    }

    if (body.startDate !== undefined) {
      updateData.startDate = new Date(body.startDate)
    }

    if (body.startTime !== undefined) {
      updateData.startTime = normalizeNullableString(body.startTime)
    }

    if (body.expiryDate !== undefined || body.endDate !== undefined) {
      updateData.expiryDate = new Date(body.expiryDate || body.endDate)
    }

    if (body.endTime !== undefined) {
      updateData.endTime = normalizeNullableString(body.endTime)
    }

    if (body.approvalStatus !== undefined) {
      const appStatus = String(body.approvalStatus).toUpperCase()
      if (appStatus === 'APPROVED') {
        updateData.isActive = true
      } else if (appStatus === 'REJECTED') {
        updateData.isActive = false
      }
    }

    if (body.status !== undefined || body.isActive !== undefined) {
      updateData.isActive =
        body.isActive !== undefined
          ? toBooleanFromStatus(body.isActive)
          : toBooleanFromStatus(body.status)
    }

    if (
      body.scope !== undefined ||
      body.applicableOn !== undefined ||
      body.appicableOn !== undefined
    ) {
      updateData.scope = normalizeNullableString(
        body.scope || body.applicableOn || body.appicableOn
      )
    }

    if (body.applicablePincodes !== undefined) {
      updateData.applicablePincodes = Array.isArray(body.applicablePincodes)
        ? body.applicablePincodes
        : []
    }

    if (body.newUserOnly !== undefined) {
      updateData.newUserOnly = body.newUserOnly === true
    }

    if (body.firstOrderOnly !== undefined) {
      updateData.firstOrderOnly = body.firstOrderOnly === true
    }

    if (
      body.maxUsesPerUser !== undefined ||
      body.repeatUsage !== undefined ||
      body.usageLimit !== undefined
    ) {
      updateData.maxUsesPerUser = parseMaxUsesPerUser(
        body.maxUsesPerUser ?? body.repeatUsage ?? body.usageLimit
      )
    }

    if (
      body.maxTotalUses !== undefined ||
      body.noOfUsers !== undefined
    ) {
      updateData.maxTotalUses = toIntOrNull(
        body.maxTotalUses ?? body.noOfUsers
      )
    }

    if (body.termsUrl !== undefined) {
      updateData.termsUrl = normalizeNullableString(body.termsUrl)
    }

    /*
      ✅ Do not update warehouseId directly.
      Coupon belongs to the logged-in user's warehouse already.
    */
    const rawProductIds = Array.isArray(body.productIds)
      ? body.productIds
      : (body.productId ? [body.productId] : (body.productIds === null ? [] : undefined));

    const updatedCoupon = await prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id },
        data: updateData,
      });

      if (rawProductIds !== undefined) {
        await tx.couponProduct.deleteMany({
          where: { couponId: id },
        });

        if (rawProductIds.length > 0) {
          const productOffers = body.productOffers || body.mappedProductOffers || {};
          await tx.couponProduct.createMany({
            data: rawProductIds.map((pid) => {
              const offer = productOffers[pid] ?? (Array.isArray(body.mappedProducts) ? body.mappedProducts.find(p => String(p.productId || p.id) === String(pid))?.offerPrice : null);
              return {
                couponId: id,
                productId: String(pid),
                offerPrice: offer !== undefined && offer !== null && offer !== '' ? parseFloat(offer) : null
              };
            }),
            skipDuplicates: true,
          });
        }
      }

      return tx.coupon.findUnique({
        where: { id },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  mrp: true,
                  images: true,
                  sku: true,
                },
              },
            },
          },
        },
      });
    });

    logger.info("[COUPON] Updated successfully", {
      couponId: id,
      warehouseId
    })


    return successResponse(
      res,
      200,
      mapCouponResponse(updatedCoupon),
      "Coupon code updated successfully"
    )
  } catch (error) {
    logger.error("[COUPON] Update failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(
      res,
      500,
      error.message || "Failed to update coupon code"
    )
  }
}

export const deletePromoCode = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)
    const { promoCodeId, couponId } = req.params
    const id = couponId || promoCodeId

    logger.info("[COUPON] Delete API called", {
      couponId: id,
      warehouseId
    })

    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        id,
        warehouseId
      },
      select: {
        id: true,
        code: true,
        _count: {
          select: {
            cartApplications: true,
            redemptions: true,
            orders: true,
            userAssignments: true
          }
        }
      }
    })

    if (!existingCoupon) {
      logger.warn("[COUPON] Delete failed - not found", {
        couponId: id,
        warehouseId
      })

      return errorResponse(res, 404, "Coupon code not found")
    }

    const linkedCount =
      existingCoupon._count.cartApplications +
      existingCoupon._count.redemptions +
      existingCoupon._count.orders +
      existingCoupon._count.userAssignments

    if (linkedCount > 0) {
      logger.warn("[COUPON] Delete failed - coupon already linked/used", {
        couponId: id,
        warehouseId,
        linkedCount
      })

      return errorResponse(
        res,
        400,
        "Coupon code is already linked or used and cannot be deleted. You can deactivate it instead."
      )
    }

    await prisma.coupon.delete({
      where: { id }
    })

    logger.info("[COUPON] Deleted successfully", {
      couponId: id,
      warehouseId
    })

    return successResponse(res, 200, null, "Coupon code deleted successfully")
  } catch (error) {
    logger.error("[COUPON] Delete failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message || "Failed to delete coupon code")
  }
}

export const togglePromoCodeStatus = async (req, res) => {
  try {
    const warehouseId = await getWarehouseIdFromUser(req)
    const { promoCodeId, couponId } = req.params
    const id = couponId || promoCodeId

    logger.info("[COUPON] Toggle status API called", {
      couponId: id,
      warehouseId
    })

    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        id,
        warehouseId
      },
      select: {
        id: true,
        code: true,
        isActive: true
      }
    })

    if (!existingCoupon) {
      logger.warn("[COUPON] Toggle failed - not found", {
        couponId: id,
        warehouseId
      })

      return errorResponse(res, 404, "Coupon code not found")
    }

    const nextIsActive = !existingCoupon.isActive

    if (warehouseId && nextIsActive) {
      return errorResponse(res, 403, "Activating a promo code requires Admin approval")
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        isActive: nextIsActive
      }
    })

    logger.info("[COUPON] Toggle successful", {
      couponId: id,
      warehouseId,
      isActive: nextIsActive
    })

    return successResponse(
      res,
      200,
      mapCouponResponse(updatedCoupon),
      `Coupon code ${nextIsActive ? "activated" : "deactivated"} successfully`
    )
  } catch (error) {
    logger.error("[COUPON] Toggle failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message || "Failed to toggle coupon code status")
  }
}