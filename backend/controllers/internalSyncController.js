import { prisma } from '../config/prismaClient.js'
import logger from '../utils/logger.js'
import { errorResponse, successResponse } from '../utils/responseHelper.js'
import { emitTransportEvent } from '../audit/auditLogger.js'
import { TRANSPORT_EVENTS } from '../audit/auditConstants.js'
import { canonicalOrderStatus } from '../services/lifecycle/transitionRegistry.js'
import crypto from 'crypto'
import { cancelDeliveryBroadcast, startDeliveryBroadcast } from '../services/deliveryBroadcastService.js'
import { isUUID } from '../utils/uuidUtils.js'

const INTERNAL_SYNC_KEY = process.env.DELIVERY_API_SYNC_KEY || ''
const INTERNAL_SYNC_MAX_AGE_MS = parseInt(process.env.INTERNAL_SYNC_MAX_AGE_MS || '300000', 10)

function verifyOptionalSyncSignature(req) {
  const ts = req.header('x-sync-ts')
  const sig = req.header('x-sync-signature')
  if (!ts && !sig) return true
  if (!ts || !sig || !INTERNAL_SYNC_KEY) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  if (Math.abs(Date.now() - tsNum) > INTERNAL_SYNC_MAX_AGE_MS) return false

  const payload = JSON.stringify(req.body || {})
  const expected = crypto
    .createHmac('sha256', INTERNAL_SYNC_KEY)
    .update(`${ts}.${payload}`)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

function isAuthorizedInternalSync(req) {
  const key = req.header('x-internal-sync-key')
  return !!INTERNAL_SYNC_KEY && !!key && key === INTERNAL_SYNC_KEY && verifyOptionalSyncSignature(req)
}

export async function syncOrderStatusFromDelivery(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync')
    }

    const {
      eventId,
      orderId,
      status,
      agentId = null,
      deliveredAt = null,
      deliveryStatus = null
    } = req.body || {}
    if (!orderId || !status) {
      return errorResponse(res, 400, 'orderId and status are required')
    }

    const inboundSyncEventId = `INBOUND_SYNC:${eventId || orderId}:${status}`
    const [alreadyAppliedInLog, alreadyQueuedInOutbox] = await Promise.all([
      prisma.auditLog.findFirst({
        where: { service: 'PARTNER', eventName: TRANSPORT_EVENTS.outboxReplayApplied, eventId: inboundSyncEventId },
        select: { id: true }
      }),
      prisma.auditOutbox.findFirst({
        where: { service: 'PARTNER', eventName: TRANSPORT_EVENTS.outboxReplayApplied, eventId: inboundSyncEventId },
        select: { id: true }
      })
    ])
    if (alreadyAppliedInLog || alreadyQueuedInOutbox) {
      return successResponse(res, 200, { orderId, eventId, applied: false }, 'Sync already applied')
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        agentId: true,
        deliveredAt: true,
        vehicleId: true,
        warehouseId: true,
        items: {
          select: {
            productId: true,
            productVariantId: true,
            quantity: true
          }
        }
      }
    })
    if (!existing) {
      return errorResponse(res, 404, 'Order not found')
    }

    const priorStatus = existing.status

    const canonical = canonicalOrderStatus(status)

    // If this sync is an agent assignment, preserve existing store fulfillment status (PLACED, CONFIRMED, PROCESSING)
    // and do NOT prematurely force status to READY_FOR_PICKUP before shopkeeper finishes packing.
    let effectiveStatus = canonical
    if ((deliveryStatus === 'ASSIGNED' || agentId) && canonical === 'READY_FOR_PICKUP') {
      if (['PLACED', 'CONFIRMED', 'PROCESSING', 'PENDING', 'ACCEPTED'].includes(existing.status)) {
        logger.info('[InternalSync] Rider assigned but store fulfillment in progress. Preserving status', {
          orderId,
          existingStatus: existing.status
        })
        effectiveStatus = existing.status
      }
    }

    const sameStatus = existing.status === effectiveStatus
    const sameAgent = (existing.agentId || null) === (agentId || null)
    const sameDeliveredAt = !deliveredAt || !!existing.deliveredAt
    if (sameStatus && sameAgent && sameDeliveredAt) {
      return successResponse(res, 200, { orderId, eventId, applied: false }, 'Sync already applied')
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: effectiveStatus,
          ...(agentId ? { agentId } : {}),
          ...(canonical === 'DELIVERED' || deliveredAt
            ? { deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date() }
            : {})
        }
      })

      const deliveryRowUpdate = {
        ...(agentId ? { agentId } : {}),
        ...(canonical === 'DELIVERED' || deliveredAt
          ? { deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date() }
          : {})
      }
      if (deliveryStatus) {
        deliveryRowUpdate.status = deliveryStatus
      }

      await tx.delivery.upsert({
        where: { orderId },
        update: deliveryRowUpdate,
        create: {
          orderId,
          ...(agentId ? { agentId } : {}),
          status: deliveryStatus || (canonical === 'DELIVERED' ? 'DELIVERED' : 'PENDING'),
          ...(canonical === 'DELIVERED' || deliveredAt
            ? { deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date() }
            : {})
        }
      })

      // Subtract from inventory if status transitioned to DELIVERED now
      if (canonical === 'DELIVERED' && priorStatus !== 'DELIVERED') {
        const tenantId = 'VK001';

        if (existing.vehicleId) {
          // Vehicle-level sale — decrement VehicleStock
          await Promise.all(existing.items.map(async (item) => {
            await tx.vehicleStock.upsert({
              where: {
                vehicleId_productId: {
                  vehicleId: existing.vehicleId,
                  productId: item.productId,
                }
              },
              update: {
                quantity: { decrement: item.quantity },
              },
              create: {
                vehicleId: existing.vehicleId,
                productId: item.productId,
                quantity: -item.quantity,
                tenantId,
              }
            });
          }));
        } else {
          // POS / Store-level sale — decrement Product.stock AND UnifiedInventory
          const storeId = existing.warehouseId;
          let locationId = null;
          if (storeId) {
            let location = await tx.inventoryLocation.findFirst({
              where: { warehouseId: storeId, type: 'WAREHOUSE' }
            });
            if (!location) {
              const warehouse = await tx.warehouse.findUnique({ where: { id: storeId } });
              const warehouseName = warehouse ? warehouse.name : 'Main Warehouse';
              location = await tx.inventoryLocation.create({
                data: {
                  type: 'WAREHOUSE',
                  name: `${warehouseName} Location`,
                  code: `WH-${storeId.slice(0, 8).toUpperCase()}`,
                  warehouseId: storeId,
                  isActive: true
                }
              });
            }
            locationId = location.id;
          }

          await Promise.all(existing.items.map(async (item) => {
            // 1. Decrement main Product.stock
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });

            // 1.5 Decrement Variant stock if variant sale
            if (item.productVariantId) {
              await tx.productVariant.update({
                where: { id: item.productVariantId },
                data: { stockQuantity: { decrement: item.quantity } }
              });
            }

            // 2. Sync with UnifiedInventory if locationId exists
            if (locationId) {
              await tx.unifiedInventory.upsert({
                where: {
                  warehouseId_productId: {
                    warehouseId: storeId,
                    productId: item.productId
                  }
                },
                update: {
                  quantity: { decrement: item.quantity }
                },
                create: {
                  warehouseId: storeId,
                  productId: item.productId,
                  quantity: -item.quantity,
                  locationId
                }
              });
            }
          }));
        }
      }
    })

    const orderMeta = await prisma.order.findUnique({
      where: { id: orderId },
      select: { warehouseId: true, orderNumber: true }
    })
    try {
      const { publishPartnerOrderFanout } = await import('../services/partnerOrderRealtimeService.js')
      await publishPartnerOrderFanout({
        orderId,
        orderNumber: orderMeta?.orderNumber,
        priorStatus,
        status: canonical,
        warehouseId: orderMeta?.warehouseId,
        agentId: agentId || null,
        eventId,
        deliveryStatus: deliveryStatus || null
      })
    } catch (e) {
      logger.warn('[InternalSync] realtime fan-out skipped', { message: e.message })
    }

    logger.info('[InternalSync] Partner order synced from delivery-api', {
      eventId,
      orderId,
      status: canonical,
      deliveryStatus,
      agentId
    })
    await emitTransportEvent({
      eventName: TRANSPORT_EVENTS.outboxReplayApplied,
      eventId: inboundSyncEventId,
      entityType: 'ORDER',
      entityId: orderId,
      action: 'OUTBOX_REPLAY_APPLIED',
      payload: { eventId, orderId, status: canonical, agentId, deliveryStatus }
    })
    return successResponse(res, 200, { orderId, eventId, applied: true }, 'Order sync applied')
  } catch (error) {
    logger.error('[InternalSync] Partner sync failed', {
      error: error.message,
      stack: error.stack
    })
    return errorResponse(res, 500, 'Internal sync failed')
  }
}

export async function cancelBroadcast(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync')
    }
    
    const { orderId, winnerId } = req.body || {}
    if (!orderId) {
      return errorResponse(res, 400, 'orderId is required')
    }

    await cancelDeliveryBroadcast(orderId, winnerId, true)
    
    return successResponse(res, 200, { cancelled: true }, 'Broadcast cancelled')
  } catch (error) {
    logger.error('[InternalSync] Broadcast cancel failed', {
      error: error.message,
      stack: error.stack
    })
    return errorResponse(res, 500, 'Broadcast cancel failed')
  }
}

export async function triggerBroadcasts(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync')
    }

    const orders = await prisma.order.findMany({
      where: { status: 'READY_FOR_PICKUP', agentId: null },
      select: { id: true, orderNumber: true, warehouseId: true }
    })

    const results = []
    for (const order of orders) {
      if (order.warehouseId) {
        await startDeliveryBroadcast(order.id, order.warehouseId)
        results.push(order.orderNumber)
      }
    }

    return successResponse(res, 200, { triggered: results.length, orders: results }, 'Broadcasts triggered')
  } catch (error) {
    logger.error('[InternalSync] Trigger broadcasts failed', { error: error.message })
    return errorResponse(res, 500, 'Trigger broadcasts failed')
  }
}

export async function debugEmit(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync')
    }

    const { agentId, event, payload } = req.body || {}
    if (!agentId || !event) {
      return errorResponse(res, 400, 'agentId and event required')
    }

    const { getIO } = await import('../services/socketService.js')
    const io = getIO()
    const deliveryNs = io.of('/delivery')
    
    // Get connected sockets in the room
    const room = `user:${agentId}`
    const sockets = await deliveryNs.in(room).fetchSockets()
    
    deliveryNs.to(room).emit(event, payload || {})
    
    return successResponse(res, 200, { 
      emitted: true,
      room,
      socketsInRoom: sockets.length,
      socketIds: sockets.map(s => s.id)
    }, 'Debug emit done')
  } catch (error) {
    logger.error('[InternalSync] Debug emit failed', { error: error.message })
    return errorResponse(res, 500, error.message)
  }
}

export async function syncUserFromHrms(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync')
    }

    const {
      id,
      name,
      email,
      phone,
      role,
      warehouseId,
      assignedVehicleId,
      dailyTarget,
      baseSalary,
      shiftId,
      kycStatus,
      attendanceEnabled,
      companyName,
      isActive,
      customRoleId
    } = req.body || {}

    if (!id) {
      return errorResponse(res, 400, 'id (identityUserId) is required')
    }

    console.log(`[USER-SYNC] Syncing user ${email || phone} with role ${role}, customRoleId ${customRoleId}, and warehouse ${warehouseId}`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert User record
      const user = await tx.user.upsert({
        where: { id },
        update: {
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          role: role || undefined,
          warehouseId: warehouseId || undefined,
          assignedVehicleId: assignedVehicleId || undefined,
          dailyTarget: dailyTarget !== undefined ? parseFloat(dailyTarget) : undefined,
          baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : undefined,
          shiftId: shiftId || undefined,
          kycStatus: kycStatus || undefined,
          attendanceEnabled: attendanceEnabled !== undefined ? Boolean(attendanceEnabled) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
          customRoleId: customRoleId || undefined
        },
        create: {
          id,
          name: name || '',
          email: email || null,
          phone: phone || '',
          role: role || 'CONSUMER',
          warehouseId: warehouseId || null,
          assignedVehicleId: assignedVehicleId || null,
          dailyTarget: dailyTarget !== undefined ? parseFloat(dailyTarget) : 10000,
          baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : 12000,
          shiftId: shiftId || null,
          kycStatus: kycStatus || 'PENDING',
          attendanceEnabled: attendanceEnabled !== undefined ? Boolean(attendanceEnabled) : true,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          customRoleId: customRoleId || null,
          tenantId: 'VK001'
        }
      })

      // 2. If companyName is provided, also create/upsert a Supplier record for the Partner
      if (companyName) {
        await tx.supplier.upsert({
          where: { userId: id },
          update: {
            companyName: companyName
          },
          create: {
            userId: id,
            companyName: companyName,
            status: 'ACTIVE',
            businessAddress: 'Not Provided'
          }
        })
      }

      // 3. Sync Shopkeeper record based on User role
      if (user.role === 'SHOPKEEPER') {
        await tx.shopkeeper.upsert({
          where: { id: user.id },
          update: {
            name: user.name || 'Shopkeeper',
            phone: user.phone,
            warehouseId: user.warehouseId || null,
          },
          create: {
            id: user.id,
            name: user.name || 'Shopkeeper',
            phone: user.phone,
            warehouseId: user.warehouseId || null,
            status: 'Available',
            activeOrderCount: 0
          }
        });
      } else {
        // Remove from Shopkeeper table if role is no longer SHOPKEEPER
        await tx.shopkeeper.deleteMany({
          where: { id: user.id }
        });
      }

      return user
    })

    return successResponse(res, 200, result, 'User synced successfully')
  } catch (error) {
    logger.error('[InternalSync] User sync failed', {
      error: error.message,
      stack: error.stack
    })
    return errorResponse(res, 500, `Internal user sync failed: ${error.message}`)
  }
}

export async function getVehicles(req, res) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: { id: true, vehicleNumber: true, vehicleName: true }
    });
    return successResponse(res, 200, vehicles, 'Vehicles retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, `Failed to retrieve vehicles: ${error.message}`);
  }
}

export async function getUserDetailsForAdmin(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        store: true,
        addresses: true,
        agentBank: true,
        agentEducations: true,
        agentExperiences: true,
        deliveryAgentDocuments: true,
        Warehouse: {
          include: {
            warehouseLocations: true,
            warehouseBusiness: true,
            warehouseBusinessDocuments: true,
            warehouseDocumentFiles: true,
          }
        }
      }
    });
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Hydrate store settings/locations flatly for admin web UI compatibility
    if (user.store) {
      const wb = user.Warehouse?.warehouseBusiness?.[0] || {};
      const wbd = user.Warehouse?.warehouseBusinessDocuments?.[0] || {};
      const wl = user.Warehouse?.warehouseLocations?.[0] || {};

      user.store.legalBusinessName = wb.legalBusinessName || '';
      user.store.typeOfBusiness = wb.businessType || '';
      user.store.natureOfBusiness = wb.natureOfBusiness || '';
      user.store.legalEntity = wb.legalEntity || '';
      user.store.yearOfEstablishment = wb.yearOfEstablishment || '';
      user.store.areaOfIncorporation = wb.areaOfIncorporationCity || '';
      user.store.areaOfRegistration = wb.areaOfRegistrationCity || '';
      user.store.totalShopWarehouseArea = wb.totalAreaSqft || '';
      user.store.averageDailyOrders = wb.averageDailyOrders || '';
      user.store.storeOpenTime = wb.storeOpenTime || '';
      user.store.storeCloseTime = wb.storeCloseTime || '';
      user.store.operatingAreas = wb.isOperating || [];

      user.store.gstNumber = wbd.gstNumber || '';
      user.store.udyamRegistrationNumber = wbd.udyamRegistrationNumber || '';
      user.store.fssaiNumber = wbd.fssaiNumber || '';
      user.store.drugLicenseNumber = wbd.drugLicenseNumber || '';
    }

    // Map personal documents array for visual display in ViewPartner
    user.personalDocuments = [];
    if (user.store?.nationalIdUrl) {
      user.personalDocuments.push({
        documentType: "AADHAR_CARD",
        fileUrl: user.store.nationalIdUrl
      });
    }
    if (user.store?.addressProofUrl) {
      user.personalDocuments.push({
        documentType: "PAN_CARD",
        fileUrl: user.store.addressProofUrl
      });
    }
    if (user.store?.logoUrl) {
      user.personalDocuments.push({
        documentType: "PHOTO",
        fileUrl: user.store.logoUrl
      });
    }
    user.warehouseBusinessDocument = user.Warehouse?.warehouseBusinessDocuments?.[0] || null;

    return successResponse(res, 200, user, 'User details retrieved successfully');
  } catch (error) {
    return errorResponse(res, 500, `Failed to fetch user details: ${error.message}`);
  }
}

export async function updateUserDetailsForAdmin(req, res) {
  try {
    const { id } = req.params;
    const {
      name, email, phone, customRoleId, warehouseId, department, store, address, bankInfo,
      dob, gender, alternatePhone, fatherOrSpouseName, maritalStatus, nationality, surname,
      warehouseLocation, warehouseBusiness, warehouseBusinessDocument, approvalStatus, educationQualification,
      permanentAddress, communicationAddress, sameAsPermanent,
      businessDocFiles, canclCheck
    } = req.body;

    const { updateIdentityUser } = await import('../utils/identityService.js');

    // 1. Sync update to Identity service
    try {
      await updateIdentityUser(id, { name, email, phone });
    } catch (identityErr) {
      logger.error("[internalSync] Identity update warning: " + identityErr.message);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Update User core fields
      const user = await tx.user.update({
        where: { id },
        data: {
          name,
          email: email || null,
          phone,
          customRoleId: customRoleId || null,
          warehouseId: warehouseId || null,
          bankInfo: bankInfo || null,
          dob: dob ? new Date(dob) : null,
          gender: gender || null,
          alternatePhone: alternatePhone || null,
          fatherOrSpouseName: fatherOrSpouseName || null,
          maritalStatus: maritalStatus || null,
          nationality: nationality || null,
          surname: surname || null,
          approvalStatus: approvalStatus || undefined,
        }
      });

      // Update Warehouse's approvalStatus, address, and location if user has a warehouseId
      if (user.warehouseId) {
        const warehouseUpdateData = {};
        if (approvalStatus) {
          warehouseUpdateData.approvalStatus = approvalStatus === 'APPROVED' ? 'APPROVED' : 
                                               approvalStatus === 'REJECTED' ? 'REJECTED' : 'PENDING';
        }
        if (surname !== undefined) warehouseUpdateData.sirName = surname || "";
        if (fatherOrSpouseName !== undefined) warehouseUpdateData.fatherOrSpouseName = fatherOrSpouseName || "";
        if (alternatePhone !== undefined) warehouseUpdateData.alternateMobileNumber = alternatePhone || "";
        if (maritalStatus !== undefined) warehouseUpdateData.maritalStatus = maritalStatus || "";
        if (educationQualification !== undefined) warehouseUpdateData.educationQualification = educationQualification || "";
        if (permanentAddress !== undefined) warehouseUpdateData.location = permanentAddress || {};
        if (communicationAddress !== undefined) warehouseUpdateData.communicationAddress = communicationAddress || {};
        if (sameAsPermanent !== undefined) warehouseUpdateData.sameAsPermanent = sameAsPermanent || false;
        if (warehouseLocation) {
          warehouseUpdateData.address = `${warehouseLocation.doorNo || ''} ${warehouseLocation.colonyOrVillage || ''}, ${warehouseLocation.city || ''}`.trim();
          warehouseUpdateData.location = {
            line1: `${warehouseLocation.doorNo || ''} ${warehouseLocation.colonyOrVillage || ''} ${warehouseLocation.roadOrStreet || ''}`.trim(),
            line2: warehouseLocation.landmark || "",
            city: warehouseLocation.city || "",
            state: warehouseLocation.state || "",
            pincode: warehouseLocation.pincode || ""
          };
        }
        if (Object.keys(warehouseUpdateData).length > 0) {
          await tx.warehouse.update({
            where: { id: user.warehouseId },
            data: warehouseUpdateData
          });
        }
      }

      // Upsert WarehouseLocation
      if (warehouseLocation && user.warehouseId) {
        const existingLoc = await tx.warehouseLocation.findFirst({
          where: { warehouseId: user.warehouseId }
        });
        const locData = {
          doorNo: warehouseLocation.doorNo || "",
          colonyOrVillage: warehouseLocation.colonyOrVillage || "",
          landmark: warehouseLocation.landmark || "",
          roadOrStreet: warehouseLocation.roadOrStreet || "",
          district: warehouseLocation.district || "",
          mandalOrTaluk: warehouseLocation.mandalOrTaluk || "",
          city: warehouseLocation.city || "",
          state: warehouseLocation.state || "",
          pincode: warehouseLocation.pincode || "",
          latitude: parseFloat(warehouseLocation.latitude) || null,
          longitude: parseFloat(warehouseLocation.longitude) || null,
          isBackroomAvailable: warehouseLocation.isBackroomAvailable || false,
          fullAddress: warehouseLocation.fullAddress || "",
          geoPolygon: warehouseLocation.geoPolygon || null,
          area: warehouseLocation.area || null,
        };
        if (existingLoc) {
          await tx.warehouseLocation.update({
            where: { id: existingLoc.id },
            data: locData
          });
        } else {
          await tx.warehouseLocation.create({
            data: {
              warehouseId: user.warehouseId,
              ...locData
            }
          });
        }
      }

      // Upsert WarehouseBusiness
      if (warehouseBusiness && user.warehouseId) {
        const existingBiz = await tx.warehouseBusiness.findFirst({
          where: { warehouseId: user.warehouseId }
        });
        const bizData = {
          legalBusinessName: warehouseBusiness.legalBusinessName || "",
          displayName: warehouseBusiness.displayName || "",
          businessType: warehouseBusiness.businessType || "",
          natureOfBusiness: warehouseBusiness.natureOfBusiness || "",
          legalEntity: warehouseBusiness.legalEntity || "",
          yearOfEstablishment: warehouseBusiness.yearOfEstablishment ? new Date(warehouseBusiness.yearOfEstablishment) : new Date(),
          areaOfIncorporationCity: warehouseBusiness.areaOfIncorporationCity || "",
          areaOfRegistrationCity: warehouseBusiness.areaOfRegistrationCity || "",
          totalAreaSqft: warehouseBusiness.totalAreaSqft || "",
          storeOpenTime: warehouseBusiness.storeOpenTime || "",
          storeCloseTime: warehouseBusiness.storeCloseTime || "",
          averageDailyOrders: warehouseBusiness.averageDailyOrders || "",
          isOperating: warehouseBusiness.isOperating || [],
        };
        if (existingBiz) {
          await tx.warehouseBusiness.update({
            where: { id: existingBiz.id },
            data: bizData
          });
        } else {
          await tx.warehouseBusiness.create({
            data: {
              warehouseId: user.warehouseId,
              ...bizData
            }
          });
        }
      }

      // Upsert WarehouseBusinessDocument
      if (warehouseBusinessDocument && user.warehouseId) {
        const existingDoc = await tx.warehouseBusinessDocument.findFirst({
          where: { warehouseId: user.warehouseId }
        });
        const docData = {
          isGstRegistered: warehouseBusinessDocument.isGstRegistered || false,
          gstNumber: warehouseBusinessDocument.gstNumber || null,
          hasPanOfBusiness: warehouseBusinessDocument.hasPanOfBusiness || false,
          panNumber: warehouseBusinessDocument.panNumber || null,
          hasCompanyRegistration: warehouseBusinessDocument.hasCompanyRegistration || false,
          hasShopEstablishment: warehouseBusinessDocument.hasShopEstablishment || false,
          hasUdyamRegistration: warehouseBusinessDocument.hasUdyamRegistration || false,
          udyamRegistrationNumber: warehouseBusinessDocument.udyamRegistrationNumber || null,
          hasFssaiLicense: warehouseBusinessDocument.hasFssaiLicense || false,
          fssaiNumber: warehouseBusinessDocument.fssaiNumber || null,
          hasRentalAgreement: warehouseBusinessDocument.hasRentalAgreement || false,
          hasDrugLicense: warehouseBusinessDocument.hasDrugLicense || false,
          drugLicenseNumber: warehouseBusinessDocument.drugLicenseNumber || null,
          declarationAccepted: warehouseBusinessDocument.declarationAccepted || false,
          termsAccepted: warehouseBusinessDocument.termsAccepted || false,
          kycAuthorizationGiven: warehouseBusinessDocument.kycAuthorizationGiven || false,
        };
        if (existingDoc) {
          await tx.warehouseBusinessDocument.update({
            where: { id: existingDoc.id },
            data: docData
          });
        } else {
          await tx.warehouseBusinessDocument.create({
            data: {
              warehouseId: user.warehouseId,
              ...docData
            }
          });
        }
      }

      // 3. Update Store
      if (store) {
        await tx.store.upsert({
          where: { userId: id },
          update: {
            name: store.name,
            description: store.description || null,
            categoryIds: store.categoryIds || [],
            taxName: store.taxName || 'GST',
            taxNumber: store.taxNumber || null,
            panNumber: store.panNumber || 'PENDING',
            logoUrl: store.logoUrl || null,
            nationalIdUrl: store.nationalIdUrl || null,
            addressProofUrl: store.addressProofUrl || null,
            commission: store.commission || 0,
          },
          create: {
            user: { connect: { id } },
            name: store.name,
            description: store.description || null,
            categoryIds: store.categoryIds || [],
            taxName: store.taxName || 'GST',
            taxNumber: store.taxNumber || null,
            panNumber: store.panNumber || 'PENDING',
            logoUrl: store.logoUrl || null,
            nationalIdUrl: store.nationalIdUrl || null,
            addressProofUrl: store.addressProofUrl || null,
            commission: store.commission || 0,
          }
        });
      }

      // 4. Update Address
      if (address) {
        const existingAddress = await tx.address.findFirst({
          where: { userId: id }
        });
        if (existingAddress) {
          await tx.address.update({
            where: { id: existingAddress.id },
            data: {
              line1: address.line1,
              line2: address.line2 || null,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              location: address.location || null,
            }
          });
        } else {
          await tx.address.create({
            data: {
              user: { connect: { id } },
              label: address.label || "Store Address",
              line1: address.line1,
              line2: address.line2 || null,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              isDefault: true,
              location: address.location || null,
            }
          });
        }
      }

      // 5. Update Supplier companyName
      if (store?.name) {
        await tx.supplier.upsert({
          where: { userId: id },
          update: {
            companyName: store.name,
            gstin: store.taxNumber || null,
            businessAddress: address ? `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}` : undefined,
          },
          create: {
            user: { connect: { id } },
            companyName: store.name,
            gstin: store.taxNumber || null,
            businessAddress: address ? `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}` : "Not Provided",
          }
        });
      }

      if (user.warehouseId) {
        if (businessDocFiles && Array.isArray(businessDocFiles)) {
          await tx.warehouseDocumentFile.deleteMany({
            where: {
              warehouseId: user.warehouseId,
              documentType: { in: ['STORE_FRONT', 'INSIDE_STORE', 'GST_CERTIFICATE', 'BUSINESS_PAN', 'COMPANY_REGISTRATION', 'SHOP_LICENSE', 'UDYAM_CERTIFICATE', 'FSSAI_LICENSE', 'DRUG_LICENSE', 'PROPERTY_PROOF'] }
            }
          });
          for (const file of businessDocFiles) {
            if (file.fileUrl) {
              await tx.warehouseDocumentFile.create({
                data: {
                  warehouseId: user.warehouseId,
                  documentType: file.documentType,
                  fileUrl: file.fileUrl
                }
              });
            }
          }
        }
        if (canclCheck && canclCheck.fileUrl) {
          await tx.warehouseDocumentFile.deleteMany({
            where: {
              warehouseId: user.warehouseId,
              documentType: 'CANCEL_CHECK'
            }
          });
          await tx.warehouseDocumentFile.create({
            data: {
              warehouseId: user.warehouseId,
              documentType: 'CANCEL_CHECK',
              fileUrl: canclCheck.fileUrl
            }
          });
        }
      }

      return user;
    });

    // 6. Sync update to HRMS core DB
    try {
      await syncUserToHRMS({
        userId: result.id,
        name: result.name,
        email: result.email,
        mobile: result.phone,
        role: result.role,
        customRoleId: result.customRoleId,
        department: department,
        status: 'ACTIVE'
      });
    } catch (hrmsErr) {
      logger.error("[internalSync] HRMS sync update warning: " + hrmsErr.message);
    }

    return successResponse(res, 200, result, 'User details updated successfully');
  } catch (error) {
    logger.error("[internalSync] updateUserDetailsForAdmin error: " + error.message);
    return errorResponse(res, 500, `Failed to update user details: ${error.message}`);
  }
}

async function syncUserToHRMS({ userId, name, email, mobile, role, customRoleId, department, status }) {
  try {
    let hrmsBaseUrl = process.env.HRMS_CORE_URL || process.env.HRMS_API_URL || 'https://hrmsapi.villagkart.com/hr/core';
    if (process.env.NODE_ENV === 'production' && hrmsBaseUrl.includes('localhost')) {
      hrmsBaseUrl = 'https://hrmsapi.villagkart.com/hr/core';
    }
    if (hrmsBaseUrl.includes('hrmsapi.villagkart.com') && !hrmsBaseUrl.includes('/hr/core')) {
      hrmsBaseUrl = hrmsBaseUrl.replace(/\/$/, '') + '/hr/core';
    }
    const syncKey = process.env.DELIVERY_API_SYNC_KEY || 'vk_sync_2026_super_secret_key_1234567890';
    const ts = String(Date.now());
    
    let designation = 'Employee';
    if (customRoleId && isUUID(customRoleId)) {
      try {
        const roleRec = await prisma.role.findUnique({
          where: { id: customRoleId },
          select: { name: true }
        });
        if (roleRec?.name) designation = roleRec.name;
      } catch (err) {
        console.error('[syncUserToHRMS] Failed to fetch custom role name:', err.message);
      }
    } else if (role) {
      designation = role;
    }

    const syncBody = {
      userId,
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      personalEmail: email || null,
      mobileNumber: mobile || '',
      designation,
      department: department || 'Operations',
      role: designation || 'EMPLOYEE',
      roleId: customRoleId || null,
      status: status || 'ACTIVE'
    };

    const payloadStr = JSON.stringify(syncBody);
    const signature = crypto.createHmac('sha256', syncKey)
      .update(`${ts}.${payloadStr}`)
      .digest('hex');

    console.log('[DEBUG-BACKEND-SYNC] Calling HRMS Sync (update):', {
      url: `${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`,
      syncBody
    });

    const response = await fetch(`${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-sync-key': syncKey,
        'x-sync-ts': ts,
        'x-sync-signature': signature
      },
      body: payloadStr
    });
    console.log('[DEBUG-BACKEND-SYNC] HRMS Sync (update) response status:', response.status);
    const data = await response.json();
    console.log('[DEBUG-BACKEND-SYNC] HRMS Sync (update) response body:', data);
  } catch (err) {
    logger.error('[internalSync] syncUserToHRMS error: ' + err.message);
  }
}

export async function deleteUserDetailsForAdmin(req, res) {
  try {
    const { id } = req.params;

    // 1. Delete from Identity service first
    const { deleteIdentityUser } = await import('../utils/identityService.js');
    try {
      await deleteIdentityUser(id);
    } catch (identityErr) {
      logger.error("[internalSync] Identity delete warning: " + identityErr.message);
    }

    // 2. Perform transactional delete in Partner service DB
    const result = await prisma.$transaction(async (tx) => {
      // Find user by ID or by email if ID lookup fails
      let user = await tx.user.findUnique({
        where: { id },
        include: { store: true }
      });

      if (!user) {
        // Try finding by ID from req param as email if param looks like an email or fallback lookup
        user = await tx.user.findFirst({
          where: {
            OR: [
              { id },
              { email: id }
            ]
          },
          include: { store: true }
        });
      }

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const targetId = user.id;

      // Delete addresses linked to user
      await tx.address.deleteMany({ where: { userId: targetId } });

      // Delete DeviceMetadata and DeviceToken
      await tx.deviceMetadata.deleteMany({ where: { userId: targetId } });
      await tx.deviceToken.deleteMany({ where: { userId: targetId } });

      const tablesToDeleteFrom = [
        'session', 'wishlist', 'cart', 'supplier', 'vendorSetting',
        'deliveryAgentBank', 'deliveryAgentDocument', 'deliveryAgentEducation', 'deliveryAgentExperience',
        'notification', 'orderRating', 'rating', 'userCoupon', 'userDocument',
        'vehicleInfo', 'vehiclePhysicalDamage', 'vehicleTrip', 'vgeDailyPerformance',
        'vgeMonthlySummary', 'villageActivity', 'agentTransferApproval',
        'closingCash', 'openingCash', 'order', 'return', 'returnRequest',
        'routeAssignment', 'routeExecution', 'routeSchedule', 'safeTransaction',
        'savedPaymentMethod', 'shiftLog', 'socketSession', 'stockAdjust',
        'stockAudit', 'stockTransaction', 'stockTransfer', 'storeCashRegister',
        'storeDeposit', 'delivery', 'deliveryAssignment', 'agentCashCollection', 'agentWithdrawal', 'attendance'
      ];

      // Define map of custom user foreign key fields for specific tables
      const customUserKeyMap = {
        vehicleInfo: 'agentId',
        vehiclePhysicalDamage: 'reportedById',
        order: 'consumerId',
        routeExecution: 'driverId',
        routeSchedule: 'assignedUserId',
        stockAdjust: 'createdById',
        stockTransfer: 'requestedById',
        storeCashRegister: 'openedById',
        delivery: 'agentId',
        deliveryAssignment: 'agentId',
        agentCashCollection: 'agentId',
        agentWithdrawal: 'agentId'
      };

      // Only attempt deleteMany on models that exist in the Prisma client.
      const validModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_') && k !== 'constructor');

      for (const table of tablesToDeleteFrom) {
        if (!validModels.includes(table)) {
          logger.warn(`[internalSync] Skipping unknown model '${table}' — not in Prisma schema`);
          continue;
        }
        const userKey = customUserKeyMap[table] || 'userId';
        await tx[table].deleteMany({ where: { [userKey]: targetId } });
      }

      // Special handling for ActivityLog and AgentStockTransfer
      if (validModels.includes('activityLog')) {
        await tx.activityLog.deleteMany({
          where: { OR: [{ userId: targetId }, { targetUserId: targetId }] }
        });
      }

      if (validModels.includes('agentStockTransfer')) {
        await tx.agentStockTransfer.deleteMany({
          where: { OR: [{ fromUserId: targetId }, { toUserId: targetId }] }
        });
      }

      // Special handling for OrderRating if deliveryBoyId was set
      if (validModels.includes('orderRating')) {
        await tx.orderRating.deleteMany({
          where: { deliveryBoyId: targetId }
        });
      }

      // Delete store
      if (user.store) {
        await tx.store.delete({ where: { id: user.store.id } });
      }

      // If user has warehouseId, delete warehouse dependencies
      if (user.warehouseId) {
        await tx.warehouseLocation.deleteMany({ where: { warehouseId: user.warehouseId } });
        await tx.warehouseBusiness.deleteMany({ where: { warehouseId: user.warehouseId } });
        await tx.warehouseBusinessDocument.deleteMany({ where: { warehouseId: user.warehouseId } });

        // Warehouse itself: skip if other FK references remain (not a fatal error)
        if (validModels.includes('warehouse')) {
          try {
            await tx.warehouse.delete({ where: { id: user.warehouseId } });
          } catch (whErr) {
            logger.warn("[internalSync] Could not delete warehouse (FK constraint): " + whErr.message);
          }
        }
      }

      // Finally delete the user
      await tx.user.delete({ where: { id: targetId } });

      return { success: true };
    });

    if (result.success) {
      return res.status(200).json({ success: true, message: 'User purged successfully from both cluster nodes' });
    } else {
      return res.status(404).json({ success: false, error: result.message });
    }

  } catch (err) {
    logger.error("[internalSync] Error purging user details: " + err.message);
    if (err.code === 'WAREHOUSE_FK_CONFLICT') {
      return res.status(409).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function syncUnassignedTimeoutFromDelivery(req, res) {
  try {
    if (!isAuthorizedInternalSync(req)) {
      return errorResponse(res, 401, 'Unauthorized internal sync');
    }

    const {
      orderId,
      orderNumber,
      warehouseId,
      deliveryType,
      status,
      totalAmount,
      timeoutSeconds,
      title,
      message,
      timestamp
    } = req.body || {};

    if (!orderId) {
      return errorResponse(res, 400, 'orderId is required');
    }

    logger.warn('[InternalSync] Unassigned delivery timeout received from Delivery API', {
      orderId,
      orderNumber,
      warehouseId
    });

    const { publishUnassignedDeliveryAlertFanout } = await import('../services/partnerOrderRealtimeService.js');
    await publishUnassignedDeliveryAlertFanout({
      orderId,
      orderNumber,
      warehouseId,
      deliveryType,
      status,
      totalAmount,
      timeoutSeconds,
      title,
      message,
      timestamp
    });

    const { cancelDeliveryBroadcast } = await import('../services/deliveryBroadcastService.js');
    await cancelDeliveryBroadcast(orderId, null, true, 'Delivery offer expired without acceptance').catch(() => {});

    return successResponse(res, 200, { received: true, orderId }, 'Unassigned timeout alert broadcasted');
  } catch (error) {
    logger.error('[InternalSync] Failed to process unassigned timeout sync', { error: error.message });
    return errorResponse(res, 500, 'Internal Server Error');
  }
}

