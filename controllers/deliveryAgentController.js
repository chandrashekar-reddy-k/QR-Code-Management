import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../utils/responseHelper.js';
import { formatToDDMMYYYY } from '../utils/dateUtils.js';
import bcrypt from "bcrypt"
import crypto from "crypto"
import { sendEmail } from "../utils/emailUtils.js"  // adjust path if needed
import { createIdentityUser, updateIdentityUser, updateIdentityUserRole } from '../utils/identityService.js';

const getPartnerWarehouseId = async (userId) => {
  const partner = await prisma.user.findUnique({
    where: { id: userId },
    select: { warehouseId: true }
  });
  return partner?.warehouseId || null;
};

const MANAGED_AGENT_ROLES = ["DELIVERY_AGENT", "VEHICLE_AGENT", "SHOPKEEPER", "PACKING_OPERATOR", "QC_INSPECTOR"];


/* ============================================================
DELIVERY AGENT ONBOARDING
============================================================ */

export const onboardingDeliveryAgent = async (req, res) => {

  try {

    const { step, userId, ...body } = req.body

    logger.info("Delivery Agent Onboarding API called", {
      step,
      userId,
      body
    })

    let finalUserId = userId

    const partnerUserId = req.user.id

    /* ------------------------------
       1️⃣ Get warehouseId (with admin/fallback fallback)
    ------------------------------ */
    const partner = await prisma.user.findUnique({
      where: { id: partnerUserId },
      select: { warehouseId: true, role: true }
    });

    let warehouseId = partner?.warehouseId || req.user?.warehouseId || null;

    if (!warehouseId) {
      // Fallback: assign to default active warehouse for Admins/Tenant Owners
      const defaultWarehouse = await prisma.warehouse.findFirst({
        where: { isActive: true },
        select: { id: true }
      });
      warehouseId = defaultWarehouse?.id || null;
    }

    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    switch (step) {

      /* ===============================================
      STEP 1 PERSONAL INFO
      =============================================== */

      case 1: {

        logger.info("Processing Step 1 - Personal Info", {
          phone: body.phone,
          email: body.email
        });

        // Look up existing user by phone or provided userId so multi-step onboarding updates the existing record
        const existingLocalByPhone = body.phone
          ? await prisma.user.findFirst({ where: { phone: body.phone }, select: { id: true } })
          : null;
        const currentTargetId = userId || existingLocalByPhone?.id || null;

        /* ------------------------------
           CHECK PHONE DUPLICATE
        ------------------------------ */
        const normalizedPhone = body.phone
          ? String(body.phone).replace(/\s+/g, '').replace(/^(?:\+91|91)/, '').replace(/\D/g, '')
          : null;

        if (normalizedPhone) {
          const existingPhone = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: normalizedPhone },
                { phone: `+91${normalizedPhone}` },
                { phone: `91${normalizedPhone}` },
                { phone: body.phone.trim() }
              ],
              ...(currentTargetId ? { NOT: { id: currentTargetId } } : {})
            },
            select: { id: true }
          });

          if (existingPhone) {
            logger.warn("Phone already exists", { phone: body.phone, normalizedPhone });
            return errorResponse(res, 400, "This phone number is already registered with an existing account.");
          }
        }

        const agentEmail = body.email && body.email.trim() ? body.email.trim().toLowerCase() : null;

        /* ------------------------------
           CHECK EMAIL DUPLICATE
        ------------------------------ */
        if (agentEmail) {
          const existingEmail = await prisma.user.findFirst({
            where: {
              email: { equals: agentEmail, mode: 'insensitive' },
              ...(currentTargetId ? { NOT: { id: currentTargetId } } : {})
            },
            select: { id: true }
          });

          if (existingEmail) {
            logger.warn("Email already exists", { email: agentEmail });
            return errorResponse(res, 400, "This email address is already registered with an existing account.");
          }
        }

        /* ------------------------------
           IDENTITY SERVICE SYNC
           Strategy:
           - Look up local user by phone to get the true local id
           - Always call createIdentityUser — if 409 the existing identity id is returned
           - Always update password on the identity record (re-sync)
           - Store identity UUID as local user id for cross-service consistency
        ------------------------------ */
        const rawPassword = body.password || null;
        let initialHashedPassword = null;
        if (rawPassword) {
          initialHashedPassword = await bcrypt.hash(rawPassword, 10);
        }

        logger.info("[Onboarding Step 1] Received onboarding data", {
          phone: body.phone,
          email: agentEmail,
          hasPassword: !!rawPassword,
          userId
        });

        const resolvedLocalId = existingLocalByPhone?.id || userId || null;

        let identityUserId = null;

        try {
          // Always create/reuse in Identity Service by phone.
          // createIdentityUser handles 409 and returns existing id.
          const identityUser = await createIdentityUser({
            name: body.fullName,
            email: agentEmail,
            phone: body.phone || null,
            password: rawPassword || 'Villagkart@123',
            role: body.role || 'VEHICLE_AGENT',
            customRoleId: body.customRoleId || null,
          });
          identityUserId = identityUser.id;

          // Always re-sync the actual provided password so login works immediately
          if (rawPassword) {
            await updateIdentityUser(identityUserId, {
              name: body.fullName,
              email: agentEmail,
              phone: body.phone || null,
              password: rawPassword,
              passwordChangeCompleted: true
            });
          }

          // Sync role in Identity Service
          const roleName = body.role || 'VEHICLE_AGENT';
          if (["DELIVERY_AGENT", "VEHICLE_AGENT", "SHOPKEEPER", "VSMS_AGENT", "PACKING_OPERATOR", "QC_INSPECTOR"].includes(roleName)) {
            await updateIdentityUserRole(identityUserId, roleName);
          }

          logger.info("[Onboarding] Identity user synced successfully", { identityUserId, role: body.role });
        } catch (identityErr) {
          logger.warn("[Onboarding] Identity Service sync failed — proceeding locally", { error: identityErr.message });
          identityUserId = resolvedLocalId;
        }

        /* ------------------------------
           UPSERT LOCAL USER
           - If local user exists with a different id (cuid vs uuid), update by that id
           - Otherwise upsert using identity UUID as the local primary key
        ------------------------------ */
        let user;
        if (resolvedLocalId && resolvedLocalId !== identityUserId) {
          // Local user exists with a different id — update in place
          user = await prisma.user.update({
            where: { id: resolvedLocalId },
            data: {
              name: body.fullName,
              surname: body.surname,
              fatherOrSpouseName: body.fatherOrSpouseName,
              phone: body.phone,
              alternatePhone: body.alternatePhone,
              email: agentEmail,
              ...(initialHashedPassword ? { password: initialHashedPassword } : {}),
              dob: body.dob ? new Date(body.dob) : null,
              gender: body.gender,
              maritalStatus: body.maritalStatus,
              nationality: body.nationality,
              warehouseId,
              customRoleId: body.customRoleId || null,
              approvalStatus: "PENDING",
              isOnline: true,
              ...(body.role && MANAGED_AGENT_ROLES.includes(body.role)
                ? { role: body.role }
                : {}),
            }
          });
        } else {
          // New user or ids match — upsert using identity UUID
          user = await prisma.user.upsert({
            where: { id: identityUserId || resolvedLocalId || "non-existent-id" },

            update: {
              name: body.fullName,
              surname: body.surname,
              fatherOrSpouseName: body.fatherOrSpouseName,
              phone: body.phone,
              alternatePhone: body.alternatePhone,
              email: agentEmail,
              ...(initialHashedPassword ? { password: initialHashedPassword } : {}),
              dob: body.dob ? new Date(body.dob) : null,
              gender: body.gender,
              maritalStatus: body.maritalStatus,
              nationality: body.nationality,
              warehouseId,
              customRoleId: body.customRoleId || null,
              approvalStatus: "PENDING",
              isOnline: true,
              ...(body.role && MANAGED_AGENT_ROLES.includes(body.role)
                ? { role: body.role }
                : {}),
            },

            create: {
              ...(identityUserId ? { id: identityUserId } : {}),
              name: body.fullName,
              surname: body.surname,
              fatherOrSpouseName: body.fatherOrSpouseName,
              phone: body.phone,
              alternatePhone: body.alternatePhone,
              email: agentEmail,
              ...(initialHashedPassword ? { password: initialHashedPassword } : {}),
              dob: body.dob ? new Date(body.dob) : null,
              gender: body.gender,
              maritalStatus: body.maritalStatus,
              nationality: body.nationality,
              role: (body.role && MANAGED_AGENT_ROLES.includes(body.role))
                ? body.role
                : "VEHICLE_AGENT",
              warehouseId,
              customRoleId: body.customRoleId || null,
              approvalStatus: "PENDING",
              isOnline: true,
            }

          });
        }

        finalUserId = user.id;

        logger.info("Step 1 completed successfully", {
          userId: user.id,
          identityUserId,
          warehouseId
        });

        break;
      }



      case 2: {

        logger.info("Processing Step 2 - Address")

        await prisma.address.createMany({

          data: [

            {
              userId,
              addressType: "PERMANENT",
              ...body.permanentAddress
            },

            {
              userId,
              addressType: "COMMUNICATION",
              ...(body.sameAsPermanent
                ? body.permanentAddress
                : body.communicationAddress)
            }

          ]

        })

        logger.info("Address saved successfully", { userId })

        break
      }


      /* ===============================================
      STEP 3 EDUCATION + EXPERIENCE
      =============================================== */

      case 3: {

        logger.info("Processing Step 3 - Education & Experience")

        /* ------------------------------
           EDUCATION
        ------------------------------ */
        for (const edu of body.education || []) {

          await prisma.deliveryAgentEducation.create({
            data: {
              userId,
              qualification: edu.qualification,
              institution: edu.institution,
              yearOfPassing: edu.yearOfPassing
                ? Number(edu.yearOfPassing)
                : null,
              cgpa: edu.cgpa || null
            }
          })

        }

        /* ------------------------------
           EXPERIENCE
        ------------------------------ */
        for (const exp of body.experience || []) {

          await prisma.deliveryAgentExperience.create({
            data: {
              userId,
              organization: exp.organization || null,
              designation: exp.designation || null,
              fromDate: exp.fromDate || null,
              toDate: exp.toDate || null,
              responsibilities: exp.responsibilities || null,
              payslips: exp.payslips || []
            }
          })

        }

        logger.info("Education & Experience saved", {
          educationCount: body.education?.length || 0,
          experienceCount: body.experience?.length || 0
        })

        break
      }


      /* ===============================================
      STEP 4 DOCUMENTS
      =============================================== */

      case 4: {

        logger.info("Processing Step 4 - Documents", {
          userId,
          totalDocs: body.documents?.length || 0
        });

        /* ------------------------------
           1️⃣ FILTER VALID DOCUMENTS
        ------------------------------ */
        const validDocs = (body.documents || []).filter(doc => {

          const isValid = doc?.documentType && doc?.fileUrl;

          if (!isValid) {
            logger.warn("Skipping invalid document", {
              userId,
              documentType: doc?.documentType,
              fileUrl: doc?.fileUrl
            });
          }

          return isValid;
        });

        if (validDocs.length === 0) {
          logger.warn("No valid documents found", { userId });
          break;
        }

        /* ------------------------------
           2️⃣ FETCH EXISTING DOCUMENTS
        ------------------------------ */
        const existingDocs = await prisma.deliveryAgentDocument.findMany({
          where: { userId },
          select: { id: true, documentType: true }
        });

        const existingMap = new Map(
          existingDocs.map(doc => [doc.documentType, doc.id])
        );

        /* ------------------------------
           3️⃣ UPSERT LOGIC
        ------------------------------ */
        let createdCount = 0;
        let updatedCount = 0;

        for (const doc of validDocs) {

          const existingId = existingMap.get(doc.documentType);

          if (existingId) {
            /* 🔄 UPDATE */
            await prisma.deliveryAgentDocument.update({
              where: { id: existingId },
              data: {
                fileUrl: doc.fileUrl
              }
            });

            updatedCount++;

            logger.info("Document updated", {
              userId,
              documentType: doc.documentType
            });

          } else {
            /* ➕ CREATE */
            await prisma.deliveryAgentDocument.create({
              data: {
                userId,
                documentType: doc.documentType,
                fileUrl: doc.fileUrl
              }
            });

            createdCount++;

            logger.info("Document created", {
              userId,
              documentType: doc.documentType
            });
          }
        }

        /* ------------------------------
           4️⃣ FINAL LOG
        ------------------------------ */
        logger.info("Documents processed successfully", {
          userId,
          createdCount,
          updatedCount,
          totalProcessed: validDocs.length
        });

        break;
      }


      /* ===============================================
      STEP 5 BANK DETAILS
      =============================================== */


      // import your mail service

      case 5: {

        logger.info("Processing Step 5 - Bank Info")

        /* ------------------------------
           1️⃣ Save Bank Info
        ------------------------------ */
        await prisma.deliveryAgentBank.upsert({
          where: { userId },
          update: {
            ...body.bankInfo
          },
          create: {
            userId,
            ...body.bankInfo
          }
        })

        /* ------------------------------
           4️⃣ Save password if generated (keep approvalStatus as PENDING for verification)
        ------------------------------ */
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { password: true, approvalStatus: true }
        });
        const hasExistingPassword = Boolean(existingUser?.password);
        let tempPassword = null;
        let hashedPassword = undefined;

        if (!hasExistingPassword) {
          tempPassword = crypto.randomBytes(4).toString("hex");
          hashedPassword = await bcrypt.hash(tempPassword, 10);
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: {
            ...(hashedPassword ? { password: hashedPassword } : {}),
            // New agents remain in PENDING status until verified and approved by admin
            approvalStatus: existingUser?.approvalStatus || "PENDING"
          },
          select: {
            email: true,
            name: true,
            approvalStatus: true
          }
        });

        if (tempPassword) {
          try {
            await updateIdentityUser(userId, { password: tempPassword });
          } catch (identityErr) {
            logger.warn("[Onboarding Step 5] Failed to sync temp password to Identity Service", { error: identityErr.message });
          }
        }

        /* ------------------------------
           5.5️⃣ Mirror agent into HRMS Employee Directory
           Non-blocking — HRMS attendance sync depends on this record existing.
           Uses the same /employees/internal/sync-employee endpoint that
           partnerAuthController uses for partner registrations.
        ------------------------------ */
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

          // Fetch full local user for mirror payload
          const agentForMirror = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, phone: true, role: true, customRoleId: true }
          });

          if (agentForMirror?.email) {
            const agentRole = agentForMirror.role || 'DELIVERY_AGENT';
            const roleDesignation = agentRole === 'SHOPKEEPER'
              ? 'Shopkeeper'
              : (agentRole === 'VEHICLE_AGENT' ? 'Vehicle Agent' : 'Delivery Agent');

            const syncBody = {
              userId,
              firstName: (agentForMirror.name || 'Delivery').trim().split(/\s+/)[0],
              lastName: (agentForMirror.name || '').trim().split(/\s+/).slice(1).join(' ') || '',
              personalEmail: agentForMirror.email,
              mobileNumber: agentForMirror.phone || '',
              designation: roleDesignation,
              department: body.department || 'Operations',
              role: agentRole,
              roleId: agentForMirror.customRoleId || null,
              status: 'ACTIVE'
            };

            const payloadStr = JSON.stringify(syncBody);
            const signature = crypto.createHmac('sha256', syncKey)
              .update(`${ts}.${payloadStr}`)
              .digest('hex');

            // Fire-and-forget — do not block the response
            fetch(`${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-sync-key': syncKey,
                'x-sync-ts': ts,
                'x-sync-signature': signature
              },
              body: payloadStr
            }).then(r => r.json()).then(data => {
              if (!data.success) logger.warn('[Onboarding] HRMS employee mirror failed:', data);
              else logger.info('[Onboarding] HRMS employee mirror success', { userId });
            }).catch(err => logger.warn('[Onboarding] HRMS mirror non-fatal error:', err.message));
          }
        } catch (hrmsMirrorErr) {
          logger.warn('[Onboarding] HRMS mirror setup error (non-fatal):', hrmsMirrorErr.message);
        }

        /* ------------------------------
           6️⃣ Final Response
           5️⃣ Final Response
        ------------------------------ */
        return successResponse(
          res,
          200,
          { approvalStatus: user.approvalStatus },
          "Delivery agent onboarding completed successfully.",
        )
      }


      default:

        logger.warn("Invalid onboarding step received", {
          step
        })

        return errorResponse(res, 400, "Invalid step")

    }


    return successResponse(
      res,
      200,
      { nextStep: step + 1, userId: finalUserId },
      "Step saved successfully",
    )

  } catch (error) {

    logger.error("Delivery agent onboarding failed", {
      error: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, "Internal server error")
  }

}
/* ============================================================
GET ALL DELIVERY AGENTS
============================================================ */

export const getDeliveryAgents = async (req, res) => {
  try {
    const userId = req.user.id
    const { search, dateFilter, approvalStatus } = req.query

    logger.info("Fetching delivery agents", {
      userId,
      search,
      dateFilter,
      approvalStatus
    })

    const userWarehouseId = await getPartnerWarehouseId(userId)

    if (!userWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.")
    }

    /* ------------------------------
       1️⃣ Build WHERE clause (filtered by partner's warehouseId)
    ------------------------------ */
    const whereClause = {
      role: { in: MANAGED_AGENT_ROLES },
      warehouseId: userWarehouseId
    }

    /* ✅ Approval status filter */
    if (approvalStatus) {
      const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"]
      const normalizedApprovalStatus = String(approvalStatus).toUpperCase()

      if (!allowedStatuses.includes(normalizedApprovalStatus)) {
        return errorResponse(
          res,
          400,
          "Invalid approvalStatus. Allowed values are PENDING, APPROVED, REJECTED"
        )
      }

      whereClause.approvalStatus = normalizedApprovalStatus
    }

    /* 🔍 Add search filter */
    if (search && search.trim().length > 0) {
      const searchText = search.trim()

      whereClause.OR = [
        { name: { contains: searchText, mode: "insensitive" } },
        { email: { contains: searchText, mode: "insensitive" } },
        { phone: { contains: searchText } }
      ]
    }

    /* 📅 Add date filter */
    if (dateFilter) {
      const rawFilter = String(dateFilter).toLowerCase()
      const allowedDateFilters = ["today", "thisweek", "week", "thismonth", "month"]

      if (!allowedDateFilters.includes(rawFilter)) {
        return errorResponse(
          res,
          400,
          "Invalid dateFilter. Allowed values are today, thisweek, thismonth"
        )
      }

      const normalizedDateFilter = rawFilter === "week" ? "thisweek" : rawFilter === "month" ? "thismonth" : rawFilter
      const now = new Date()
      let startDate

      switch (normalizedDateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
          )
          break

        case "thisweek": {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          const dayOfWeek = d.getDay()
          const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          startDate = new Date(d.setDate(diff))
          startDate.setHours(0, 0, 0, 0)
          break
        }

        case "thismonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
          break
      }

      if (startDate) {
        whereClause.createdAt = {
          gte: startDate,
          lte: new Date()
        }
      }
    }

    /* ------------------------------
       3️⃣ Stats Counts
       Same warehouse + role only
    ------------------------------ */
    const baseStatsWhere = {
      role: { in: MANAGED_AGENT_ROLES },
      warehouseId: userWarehouseId
    }

    const [total, pending, approved, rejected] = await Promise.all([
      prisma.user.count({
        where: baseStatsWhere
      }),

      prisma.user.count({
        where: {
          ...baseStatsWhere,
          approvalStatus: "PENDING"
        }
      }),

      prisma.user.count({
        where: {
          ...baseStatsWhere,
          approvalStatus: "APPROVED"
        }
      }),

      prisma.user.count({
        where: {
          ...baseStatsWhere,
          approvalStatus: "REJECTED"
        }
      })
    ])

    const stats = {
      total,
      pending,
      approved,
      rejected
    }

    /* ------------------------------
       4️⃣ Get delivery agents
    ------------------------------ */
    const agents = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        approvalStatus: true,
        createdAt: true,
        role: true,
        addresses: {
          select: {
            city: true
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    /* ------------------------------
       5️⃣ Format response
    ------------------------------ */
    const agentsWithCity = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      isActive: agent.isActive,
      approvalStatus: agent.approvalStatus,
      createdAt: formatToDDMMYYYY(agent.createdAt),
      city: agent.addresses?.[0]?.city || null,
      role: agent.role,
    }))

    const pagination = {
      page: 1,
      limit: agentsWithCity.length || 1,
      total: agentsWithCity.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }

    logger.info("Delivery agents fetched successfully", {
      count: agentsWithCity.length,
      stats,
      filters: {
        search: search || null,
        dateFilter: dateFilter || null,
        approvalStatus: approvalStatus || null
      },
      pagination
    })

    return res.status(200).json({
      status: true,
      response: "Delivery agents fetched successfully",
      data: agentsWithCity,
      stats,
      filters: {
        search: search || null,
        dateFilter: dateFilter || null,
        approvalStatus: approvalStatus || null
      },
      pagination
    })
  } catch (error) {
    logger.error("Failed to fetch delivery agents", {
      error: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, "Internal server error")
  }
}





/* ============================================================
GET DELIVERY AGENT BY ID
============================================================ */

export const getDeliveryAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerUserId = req.user.id;

    logger.info("Fetching delivery agent by ID", { id });

    /* ------------------------------
       1️⃣ GET AGENT
    ------------------------------ */
    const agent = await prisma.user.findFirst({
      where: {
        id,
        role: { in: MANAGED_AGENT_ROLES },
      },
      include: {
        addresses: true,
        agentEducations: true,
        agentExperiences: true,
        agentBank: true,
        deliveryAgentDocuments: true
      }
    });

    if (!agent) {
      logger.warn("Delivery agent not found", { id });

      return errorResponse(res, 404, "Delivery agent not found");
    }

    /* ------------------------------
       🔥 PAYMENT MESSAGE HELPER
    ------------------------------ */
    const getPaymentMessage = (status) => {
      switch (status) {
        case "PENDING":
          return "Payment is pending";
        case "SUCCESS":
          return "Payment completed successfully";
        case "FAILED":
          return "Payment failed";
        case "REFUNDED":
          return "Payment refunded";
        default:
          return "Unknown payment status";
      }
    };

    /* ------------------------------
       2️⃣ FETCH DATA
    ------------------------------ */
    const [
      assignedOrders,
      deliveryAssignmentsRaw,
      agentCashCollections,
      agentWithdrawals
    ] = await Promise.all([
      prisma.order.findMany({
        where: { agentId: id },
        orderBy: { createdAt: "desc" },
        include: {
          consumer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          address: {
            select: {
              line1: true,
              line2: true,
              city: true,
              state: true,
              pincode: true
            }
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              product: { select: { id: true, name: true } }
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true
            }
          },
          delivery: {
            select: {
              id: true,
              status: true,
              assignedAt: true,
              pickedUpAt: true,
              deliveredAt: true
            }
          },
          deliveryAssignment: {
            select: {
              id: true,
              amount: true,
              baseCharge: true,
              surgeCharge: true,
              tip: true,
              platformCommission: true,
              status: true,
              createdAt: true
            }
          }
        }
      }),

      /* ------------------------------
         🔥 UPDATED DELIVERY ASSIGNMENTS
      ------------------------------ */
      prisma.deliveryAssignment.findMany({
        where: { agentId: id },
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              items: {
                select: {
                  productName: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true
                }
              },
              payment: {
                select: {
                  method: true,
                  status: true
                }
              }
            }
          },
          warehouse: {
            select: { id: true, name: true }
          }
        }
      }),

      prisma.agentCashCollection.findMany({
        where: { agentId: id },
        orderBy: { createdAt: "desc" },
        include: {
          order: { select: { id: true, orderNumber: true } }
        }
      }),

      prisma.agentWithdrawal.findMany({
        where: { agentId: id },
        orderBy: { requestedAt: "desc" }
      })
    ]);

    /* ------------------------------
       🔥 TRANSFORM DELIVERY ASSIGNMENTS
    ------------------------------ */
    const deliveryAssignments = deliveryAssignmentsRaw.map((da) => {
      const items = da.order?.items || [];

      const uniqueProducts = new Set(
        items.map((i) => i.productName)
      );

      return {
        ...da,

        products: items,

        uniqueProductCount: uniqueProducts.size,

        paymentMethod: da.order?.payment?.method || null,

        paymentStatus: da.order?.payment?.status || null,

        paymentMessage: getPaymentMessage(
          da.order?.payment?.status
        ),

        createdAt: formatToDDMMYYYY(da.createdAt)
      };
    });

    /* ------------------------------
       🔥 FORMAT AGENT DATA WITH DD-MM-YYYY
    ------------------------------ */
    const formattedAgent = {
      ...agent,
      dob: formatToDDMMYYYY(agent.dob),
      createdAt: formatToDDMMYYYY(agent.createdAt),
      updatedAt: formatToDDMMYYYY(agent.updatedAt),
      addresses: agent.addresses?.map(addr => ({
        ...addr,
        createdAt: formatToDDMMYYYY(addr.createdAt),
        updatedAt: formatToDDMMYYYY(addr.updatedAt)
      })),
      agentEducations: agent.agentEducations?.map(edu => ({
        ...edu,
        createdAt: formatToDDMMYYYY(edu.createdAt),
        updatedAt: formatToDDMMYYYY(edu.updatedAt)
      })),
      agentExperiences: agent.agentExperiences?.map(exp => ({
        ...exp,
        fromDate: exp.fromDate,
        toDate: exp.toDate,
        createdAt: formatToDDMMYYYY(exp.createdAt),
        updatedAt: formatToDDMMYYYY(exp.updatedAt)
      })),
      agentBank: agent.agentBank ? {
        ...agent.agentBank,
        createdAt: formatToDDMMYYYY(agent.agentBank.createdAt),
        updatedAt: formatToDDMMYYYY(agent.agentBank.updatedAt)
      } : null,
      deliveryAgentDocuments: agent.deliveryAgentDocuments?.map(doc => ({
        ...doc,
        createdAt: formatToDDMMYYYY(doc.createdAt),
        updatedAt: formatToDDMMYYYY(doc.updatedAt)
      }))
    };

    /* ------------------------------
       🔥 FORMAT ORDER DATES
    ------------------------------ */
    const formattedOrders = assignedOrders?.map(order => ({
      ...order,
      createdAt: formatToDDMMYYYY(order.createdAt),
      updatedAt: formatToDDMMYYYY(order.updatedAt),
      delivery: order.delivery ? {
        ...order.delivery,
        assignedAt: formatToDDMMYYYY(order.delivery.assignedAt),
        pickedUpAt: formatToDDMMYYYY(order.delivery.pickedUpAt),
        deliveredAt: formatToDDMMYYYY(order.delivery.deliveredAt)
      } : null,
      deliveryAssignment: order.deliveryAssignment ? {
        ...order.deliveryAssignment,
        createdAt: formatToDDMMYYYY(order.deliveryAssignment.createdAt)
      } : null
    })) || [];

    /* ------------------------------
       🔥 FORMAT CASH COLLECTIONS DATES
    ------------------------------ */
    const formattedCashCollections = agentCashCollections?.map(cc => ({
      ...cc,
      createdAt: formatToDDMMYYYY(cc.createdAt),
      updatedAt: formatToDDMMYYYY(cc.updatedAt)
    })) || [];

    /* ------------------------------
       🔥 FORMAT WITHDRAWALS DATES
    ------------------------------ */
    const formattedWithdrawals = agentWithdrawals?.map(wd => ({
      ...wd,
      requestedAt: formatToDDMMYYYY(wd.requestedAt),
      approvedAt: formatToDDMMYYYY(wd.approvedAt),
      completedAt: formatToDDMMYYYY(wd.completedAt),
      createdAt: formatToDDMMYYYY(wd.createdAt),
      updatedAt: formatToDDMMYYYY(wd.updatedAt)
    })) || [];

    /* ------------------------------
       3️⃣ LOGGING
    ------------------------------ */
    logger.info("Delivery agent fetched successfully", {
      agentId: id,
      assignedOrders: assignedOrders.length,
      transactionCounts: {
        deliveryAssignments: deliveryAssignments.length,
        cashCollections: agentCashCollections.length,
        withdrawals: agentWithdrawals.length
      }
    });

    /* ------------------------------
       4️⃣ RESPONSE
    ------------------------------ */
    return successResponse(
      res,
      200,
      {
        ...formattedAgent,
        orders: formattedOrders,
        transactions: {
          deliveryAssignments: deliveryAssignments,
          cashCollections: formattedCashCollections,
          withdrawals: formattedWithdrawals,
        },
      },
      "Delivery agent fetched successfully",
    );

  } catch (error) {
    logger.error("Failed to fetch delivery agent", {
      error: error.message
    });

    return errorResponse(res, 500, "Internal server error");
  }
};


/* ============================================================
GET ORDER BY ID (FOR DELIVERY AGENT PANEL)
============================================================ */

export const getDeliveryAgentOrderById = async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return errorResponse(res, 400, "orderId is required")
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consumer: { select: { id: true, name: true, phone: true, email: true } },
        address: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, description: true, price: true, mrp: true }
            }
          }
        },
        payment: { select: { id: true, amount: true, method: true, status: true } },
        delivery: { select: { id: true, status: true, assignedAt: true, pickedUpAt: true, deliveredAt: true } },
        deliveryAssignment: { select: { id: true, amount: true, status: true, platformCommission: true, tip: true } },
      }
    })

    if (!order) {
      return successResponse(res, 200, {}, "Order not found")
    }

    /* Format all dates to DD-MM-YYYY */
    const formattedOrder = {
      ...order,
      createdAt: formatToDDMMYYYY(order.createdAt),
      updatedAt: formatToDDMMYYYY(order.updatedAt),
      delivery: order.delivery ? {
        ...order.delivery,
        assignedAt: formatToDDMMYYYY(order.delivery.assignedAt),
        pickedUpAt: formatToDDMMYYYY(order.delivery.pickedUpAt),
        deliveredAt: formatToDDMMYYYY(order.delivery.deliveredAt)
      } : null,
      deliveryAssignment: order.deliveryAssignment ? {
        ...order.deliveryAssignment,
        createdAt: formatToDDMMYYYY(order.deliveryAssignment.createdAt)
      } : null
    }

    return successResponse(res, 200, formattedOrder, "Order fetched successfully")

  } catch (error) {
    logger.error("Failed to fetch order by id", { error: error.message, orderId: req.params.orderId })
    return errorResponse(res, 500, "Internal server error")
  }
}


/* ============================================================
UPDATE DELIVERY AGENT
============================================================ */

export const updateDeliveryAgent = async (req, res) => {
  try {

    const { id } = req.params
    const { step, ...body } = req.body
    const partnerUserId = req.user.id

    logger.info("Updating delivery agent (step-based)", {
      agentId: id,
      step,
      payload: body
    })

    const partnerWarehouseId = await getPartnerWarehouseId(partnerUserId);
    if (!partnerWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    logger.info("Agent lookup debug", {
      agentId: id,
      partnerUserId,
      partnerWarehouseId,
    })

    const agentWhere = {
      id,
      role: { in: MANAGED_AGENT_ROLES },
    }

    const agent = await prisma.user.findFirst({ where: agentWhere })


    if (!agent) {
      return errorResponse(res, 404, "Agent not found")
    }

    // Direct approvalStatus update support on /update/:id
    if (!step && (body.approvalStatus || body.status)) {
      return await updateDeliveryAgentApprovalStatus(req, res);
    }

    switch (step) {

      /* ===============================================
      STEP 1 PERSONAL INFO
      =============================================== */
      case 1: {
        const rawPassword = body.password || null;
        let initialHashedPassword = null;
        if (rawPassword) {
          initialHashedPassword = await bcrypt.hash(rawPassword, 10);
        }

        // Validate email uniqueness if email is being changed
        if (body.email && body.email.trim() !== "" && body.email !== agent.email) {
          const existingUserWithEmail = await prisma.user.findFirst({
            where: {
              email: body.email.trim(),
              id: { not: id }
            }
          });
          if (existingUserWithEmail) {
            return errorResponse(res, 400, "Email is already registered with another account");
          }
        }

        // Sync with Identity Service
        try {
          await updateIdentityUser(id, {
            name: body.fullName,
            ...(body.email && body.email !== agent.email ? { email: body.email } : {}),
            phone: body.phone || null,
            ...(rawPassword ? { password: rawPassword, passwordChangeCompleted: true } : {})
          });
          if (body.role && MANAGED_AGENT_ROLES.includes(body.role)) {
            await updateIdentityUserRole(id, body.role);
          }
        } catch (identityErr) {
          logger.warn("[Update] Identity user update warning, attempting create if user not found", { error: identityErr.message });
          // If the user did not exist in Identity Service, provision them now with the new password
          try {
            await createIdentityUser({
              id,
              name: body.fullName,
              email: body.email || agent.email || null,
              phone: body.phone || agent.phone || null,
              password: rawPassword || 'Villagkart@123',
              role: body.role || agent.role || 'DELIVERY_AGENT',
            });
            if (rawPassword) {
              await updateIdentityUser(id, {
                password: rawPassword,
                passwordChangeCompleted: true
              });
            }
          } catch (createErr) {
            logger.error("[Update] Failed to provision user in Identity Service during update", { error: createErr.message });
          }
        }

        await prisma.user.update({
          where: { id },
          data: {
            name: body.fullName,
            surname: body.surname,
            fatherOrSpouseName: body.fatherOrSpouseName,
            phone: body.phone,
            alternatePhone: body.alternatePhone,
            ...(body.email ? { email: body.email } : {}),
            ...(initialHashedPassword ? { password: initialHashedPassword } : {}),
            dob: body.dob ? new Date(body.dob) : null,
            gender: body.gender,
            maritalStatus: body.maritalStatus,
            nationality: body.nationality,
            ...(body.role && MANAGED_AGENT_ROLES.includes(body.role)
              ? { role: body.role }
              : {}),
          }
        })

        break
      }

      /* ===============================================
      STEP 2 ADDRESS
      =============================================== */
      case 2: {

        // delete old addresses
        await prisma.address.deleteMany({
          where: { userId: id }
        })

        // insert new
        await prisma.address.createMany({
          data: [
            {
              userId: id,
              addressType: "PERMANENT",
              ...body.permanentAddress
            },
            {
              userId: id,
              addressType: "COMMUNICATION",
              ...(body.sameAsPermanent
                ? body.permanentAddress
                : body.communicationAddress)
            }
          ]
        })

        break
      }

      /* ===============================================
      STEP 3 EDUCATION + EXPERIENCE
      =============================================== */
      case 3: {

        // delete old
        await prisma.deliveryAgentEducation.deleteMany({
          where: { userId: id }
        })

        await prisma.deliveryAgentExperience.deleteMany({
          where: { userId: id }
        })

        // insert new
        for (const edu of body.education || []) {
          await prisma.deliveryAgentEducation.create({
            data: {
              userId: id,
              qualification: edu.qualification,
              institution: edu.institution,
              yearOfPassing: edu.yearOfPassing
                ? Number(edu.yearOfPassing)
                : null,
              cgpa: edu.cgpa || null
            }
          })
        }

        for (const exp of body.experience || []) {
          await prisma.deliveryAgentExperience.create({
            data: {
              userId: id,
              organization: exp.organization || null,
              designation: exp.designation || null,
              fromDate: exp.fromDate || null,
              toDate: exp.toDate || null,
              responsibilities: exp.responsibilities || null,
              payslips: exp.payslips || []
            }
          })
        }

        break
      }

      /* ===============================================
      STEP 4 DOCUMENTS
      =============================================== */
      case 4: {

        await prisma.deliveryAgentDocument.deleteMany({
          where: { userId: id }
        })

        for (const doc of body.documents || []) {
          await prisma.deliveryAgentDocument.create({
            data: {
              userId: id,
              documentType: doc.documentType,
              fileUrl: doc.fileUrl
            }
          })
        }

        break
      }

      /* ===============================================
      STEP 5 BANK DETAILS
      =============================================== */
      case 5: {

        await prisma.deliveryAgentBank.upsert({
          where: { userId: id },
          update: {
            ...body.bankInfo
          },
          create: {
            userId: id,
            ...body.bankInfo
          }
        })

        /* ------------------------------
           Check approvalStatus and handle accordingly
           Agents created via multi-step onboarding must remain PENDING
           until explicitly verified and approved.
        ------------------------------ */
        const currentAgent = await prisma.user.findUnique({
          where: { id },
          select: { approvalStatus: true, email: true, name: true, password: true }
        })

        let approvalMessage = ""
        let updatedApprovalStatus = currentAgent?.approvalStatus || "PENDING"
        const shouldExplicitlyApprove = body.approvalStatus === "APPROVED";

        if (shouldExplicitlyApprove && currentAgent?.approvalStatus !== "APPROVED") {
          const hasExistingPassword = Boolean(currentAgent?.password);
          let tempPassword = null;
          let hashedPassword = undefined;

          /* Only generate temp password if no password was set during Step 1 */
          if (!hasExistingPassword) {
            tempPassword = crypto.randomBytes(4).toString("hex");
            hashedPassword = await bcrypt.hash(tempPassword, 10);
          }

          /* Update user with password and approval status */
          const updatedAgent = await prisma.user.update({
            where: { id },
            data: {
              ...(hashedPassword ? { password: hashedPassword } : {}),
              approvalStatus: "APPROVED"
            },
            select: { approvalStatus: true, email: true, name: true }
          });

          // Sync password update to Identity Service ONLY if a new temp password was generated
          if (tempPassword) {
            try {
              await updateIdentityUser(id, { password: tempPassword });
              logger.info("[Update] Password updated in Identity Service during approval", { agentId: id });
            } catch (identityErr) {
              logger.warn("[Update] Identity update warning, attempting create if user not found", {
                agentId: id,
                error: identityErr.message
              });
              try {
                await createIdentityUser({
                  id,
                  name: updatedAgent.name,
                  email: updatedAgent.email || null,
                  phone: agent.phone || null,
                  password: tempPassword,
                  role: agent.role || 'DELIVERY_AGENT',
                });
              } catch (createErr) {
                logger.error("[Update] Failed to sync approval password to Identity Service", {
                  agentId: id,
                  error: createErr.message
                });
              }
            }
          }

          updatedApprovalStatus = updatedAgent.approvalStatus;

          /* Send approval email with credentials if email is present and valid */
          const recipientEmail = updatedAgent.email?.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (recipientEmail && emailRegex.test(recipientEmail)) {
            try {
              await sendEmail(
                recipientEmail,
                "Your Delivery Agent Account Approved",
                "deliveryAgentApproval",
                {
                  name: updatedAgent.name,
                  tempPassword: tempPassword || "Your registered password"
                }
              );

              logger.info("Approval email with credentials sent successfully", { agentId: id, email: recipientEmail });
              approvalMessage = " Agent approved and credentials sent via email.";

            } catch (emailError) {
              logger.error("Failed to send approval email", {
                error: emailError.message,
                agentId: id,
                email: recipientEmail
              });
              approvalMessage = " Agent approved.";
            }
          } else {
            approvalMessage = " Agent approved.";
          }
        } else if (currentAgent?.approvalStatus === "APPROVED") {
          approvalMessage = " Agent is already approved.";
        } else {
          // Retain PENDING status for verification
          updatedApprovalStatus = currentAgent?.approvalStatus || "PENDING";
        }

        /* ------------------------------
           HRMS Employee Directory Mirror (Upsert)
           Non-blocking — keeps HRMS in sync with partner data updates.
           Attendance sync depends on this record existing in HRMS.
        ------------------------------ */
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

          // Fetch full agent record for mirror payload
          const agentForMirror = await prisma.user.findUnique({
            where: { id },
            select: { name: true, email: true, phone: true, role: true, customRoleId: true }
          });

          if (agentForMirror?.email) {
            const agentRole = agentForMirror.role || 'DELIVERY_AGENT';
            const roleDesignation = agentRole === 'SHOPKEEPER'
              ? 'Shopkeeper'
              : (agentRole === 'VEHICLE_AGENT' ? 'Vehicle Agent' : 'Delivery Agent');

            const syncBody = {
              userId: id,
              firstName: (agentForMirror.name || 'Delivery').trim().split(/\s+/)[0],
              lastName: (agentForMirror.name || '').trim().split(/\s+/).slice(1).join(' ') || '',
              personalEmail: agentForMirror.email,
              mobileNumber: agentForMirror.phone || '',
              designation: roleDesignation,
              department: body.department || 'Operations',
              role: agentRole,
              roleId: agentForMirror.customRoleId || null,
              status: 'ACTIVE'
            };

            const payloadStr = JSON.stringify(syncBody);
            const signature = crypto.createHmac('sha256', syncKey)
              .update(`${ts}.${payloadStr}`)
              .digest('hex');

            // Fire-and-forget — do not block the response
            fetch(`${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-sync-key': syncKey,
                'x-sync-ts': ts,
                'x-sync-signature': signature
              },
              body: payloadStr
            }).then(r => r.json()).then(data => {
              if (!data.success) logger.warn('[Update] HRMS employee mirror failed:', data);
              else logger.info('[Update] HRMS employee mirror success', { agentId: id });
            }).catch(err => logger.warn('[Update] HRMS mirror non-fatal error:', err.message));
          }
        } catch (hrmsMirrorErr) {
          logger.warn('[Update] HRMS mirror setup error (non-fatal):', hrmsMirrorErr.message);
        }

        const isNewCreation = body.isOnboarding || (!body.isEditMode && currentAgent?.approvalStatus === "PENDING" && !shouldExplicitlyApprove);
        const baseMessage = isNewCreation
          ? "Delivery agent created successfully."
          : `Delivery agent updated successfully.${approvalMessage}`;

        return successResponse(
          res,
          200,
          { approvalStatus: updatedApprovalStatus },
          baseMessage,
        )
      }

      default:
        return errorResponse(res, 400, "Invalid step")
    }

    return successResponse(
      res,
      200,
      { nextStep: step + 1 },
      "Step updated successfully",
    )

  } catch (error) {

    logger.error("Agent update failed", {
      error: error.message
    })

    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return errorResponse(res, 400, "Email is already registered with another user account.")
    }

    return errorResponse(res, 500, error.message || "Internal server error")
  }
}




/* ============================================================
TOGGLE DELIVERY AGENT ACTIVE STATUS
============================================================ */

export const toggleDeliveryAgent = async (req, res) => {

  try {

    const { id } = req.params
    const partnerUserId = req.user.id

    logger.info("Toggling delivery agent status", { agentId: id })

    const partnerWarehouseId = await getPartnerWarehouseId(partnerUserId);
    if (!partnerWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const agent = await prisma.user.findFirst({
      where: {
        id,
        role: { in: MANAGED_AGENT_ROLES },
      }
    })

    if (!agent) {

      logger.warn("Agent not found for toggle", { id })

      return errorResponse(res, 404, "Agent not found")
    }

    const updated = await prisma.user.update({

      where: { id },

      data: {
        isActive: !agent.isActive
      }

    })

    logger.info("Agent status toggled", {
      agentId: id,
      newStatus: updated.isActive
    })

    return successResponse(
      res,
      200,
      { isActive: updated.isActive },
      "Agent status updated",
    )

  } catch (error) {

    logger.error("Failed to toggle agent status", {
      error: error.message
    })

    return errorResponse(res, 500, "Internal server error")
  }

}


/* ============================================================
UPDATE DELIVERY AGENT APPROVAL STATUS
============================================================ */
export const updateDeliveryAgentApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, status } = req.body;
    const partnerUserId = req.user.id;

    const rawStatus = approvalStatus || status;
    if (!rawStatus) {
      return errorResponse(res, 400, "approvalStatus is required");
    }

    const normalizedStatus = String(rawStatus).toUpperCase().trim();
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "DOCUMENT_VERIFICATION", "SUBMITTED"];
    if (!validStatuses.includes(normalizedStatus)) {
      return errorResponse(res, 400, `Invalid approval status. Allowed values: ${validStatuses.join(", ")}`);
    }

    const partnerWarehouseId = await getPartnerWarehouseId(partnerUserId);
    if (!partnerWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const agent = await prisma.user.findFirst({
      where: {
        id,
        role: { in: MANAGED_AGENT_ROLES },
      },
      select: { id: true, email: true, name: true, approvalStatus: true, password: true }
    });

    if (!agent) {
      return errorResponse(res, 404, "Agent not found");
    }

    let tempPassword = null;
    let hashedPassword = undefined;

    // If approving for the first time and user has no password
    if (normalizedStatus === "APPROVED" && agent.approvalStatus !== "APPROVED") {
      const hasExistingPassword = Boolean(agent.password);
      if (!hasExistingPassword) {
        tempPassword = crypto.randomBytes(4).toString("hex");
        hashedPassword = await bcrypt.hash(tempPassword, 10);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: normalizedStatus,
        ...(hashedPassword ? { password: hashedPassword } : {}),
        ...(normalizedStatus === "APPROVED" ? { isActive: true } : {}),
      },
      select: { id: true, name: true, email: true, approvalStatus: true, isActive: true }
    });

    if (tempPassword) {
      try {
        await updateIdentityUser(id, { password: tempPassword });
      } catch (identityErr) {
        logger.warn("[ApprovalStatus] Identity update warning, attempting create if user not found", {
          agentId: id,
          error: identityErr.message
        });
        try {
          await createIdentityUser({
            id,
            name: updated.name,
            email: updated.email || null,
            phone: agent.phone || null,
            password: tempPassword,
            role: agent.role || 'DELIVERY_AGENT',
          });
        } catch (createErr) {
          logger.error("[ApprovalStatus] Failed to sync temp password to Identity Service", {
            agentId: id,
            error: createErr.message
          });
        }
      }
    }

    // Send approval email if status changed to APPROVED
    if (normalizedStatus === "APPROVED" && agent.approvalStatus !== "APPROVED") {
      const recipientEmail = updated.email?.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (recipientEmail && emailRegex.test(recipientEmail)) {
        try {
          await sendEmail(
            recipientEmail,
            "Your Delivery Agent Account Approved",
            "deliveryAgentApproval",
            {
              name: updated.name,
              tempPassword: tempPassword || "Your registered password"
            }
          );
          logger.info("Approval email sent successfully", { agentId: id, email: recipientEmail });
        } catch (emailError) {
          logger.error("Failed to send approval email", {
            error: emailError.message,
            agentId: id,
            email: recipientEmail
          });
        }
      }
    }

    return successResponse(
      res,
      200,
      { approvalStatus: updated.approvalStatus, isActive: updated.isActive },
      `Agent approval status updated to ${normalizedStatus} successfully`
    );
  } catch (error) {
    logger.error("Failed to update agent approval status", { error: error.message });
    return errorResponse(res, 500, "Internal server error: " + error.message);
  }
};


/* ============================================================
DELETE SINGLE DELIVERY AGENT
============================================================ */
export const deleteDeliveryAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerUserId = req.user.id;

    logger.info("Deleting delivery agent", { agentId: id });

    const partnerWarehouseId = await getPartnerWarehouseId(partnerUserId);
    if (!partnerWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const agent = await prisma.user.findFirst({
      where: {
        id,
        role: { in: MANAGED_AGENT_ROLES },
      },
    });

    if (!agent) {
      logger.warn("Agent not found for deletion", { id });
      return errorResponse(res, 404, "Agent not found");
    }

    // Helper function to cleanup all user-related tables without cascade onDelete
    const cleanupUserRelations = async (tx, userIds) => {
      // Delivery agent profile & onboarding tables
      await tx.deliveryAgentDocument.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentEducation.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentExperience.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentBank.deleteMany({ where: { userId: { in: userIds } } });

      // Attendance, Shifts & Operations
      await tx.attendance.deleteMany({ where: { userId: { in: userIds } } });
      await tx.locationCheckIn.deleteMany({ where: { userId: { in: userIds } } });
      await tx.locationLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.lateEntry.deleteMany({ where: { userId: { in: userIds } } });
      await tx.lateEntryException.deleteMany({ where: { userId: { in: userIds } } });
      await tx.leaveBalance.deleteMany({ where: { userId: { in: userIds } } });

      // Delivery & Fleet assignments
      await tx.deliveryAssignment.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.deliveryAttempt.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.deliveryLocationHistory.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.assetAssignment.deleteMany({ where: { userId: { in: userIds } } });
      await tx.assetIssue.deleteMany({ where: { userId: { in: userIds } } });
      await tx.assetRequest.deleteMany({ where: { userId: { in: userIds } } });

      // Cash & Finance
      await tx.agentCashCollection.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.agentWithdrawal.deleteMany({ where: { agentId: { in: userIds } } });

      // Address & Devices
      await tx.address.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deviceToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deviceMetadata.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });

      // Ratings & Tracking
      await tx.orderRating.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { deliveryBoyId: { in: userIds } }] } });
      await tx.rating.deleteMany({ where: { userId: { in: userIds } } });
      await tx.orderTrackingEvent.deleteMany({ where: { agentId: { in: userIds } } });

      // Agent Stock Transfers
      const agentTransfers = await tx.agentStockTransfer.findMany({
        where: { OR: [{ fromUserId: { in: userIds } }, { toUserId: { in: userIds } }] },
        select: { id: true }
      });
      const transferIds = agentTransfers.map(t => t.id);
      if (transferIds.length > 0) {
        await tx.agentStockTransferItem.deleteMany({ where: { transferId: { in: transferIds } } });
        await tx.agentStockTransfer.deleteMany({ where: { id: { in: transferIds } } });
      }

      // Unlink orders associated with agent
      await tx.order.updateMany({ where: { agentId: { in: userIds } }, data: { agentId: null } });
    };

    // Delete related records in transaction to cascade cleanly
    await prisma.$transaction(async (tx) => {
      await cleanupUserRelations(tx, [id]);
      await tx.user.delete({ where: { id } });
    });

    logger.info("Delivery agent deleted successfully", { agentId: id });

    return successResponse(res, 200, null, "Delivery agent deleted successfully");
  } catch (error) {
    logger.error("Failed to delete agent", { error: error.message, stack: error.stack });
    return errorResponse(res, 500, "Failed to delete agent: " + error.message);
  }
};


/* ============================================================
BULK DELETE DELIVERY AGENTS
============================================================ */
export const bulkDeleteDeliveryAgents = async (req, res) => {
  try {
    const { ids } = req.body;
    const partnerUserId = req.user.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 400, "Please provide an array of agent IDs to delete.");
    }

    logger.info("Bulk deleting delivery agents", { ids });

    const partnerWarehouseId = await getPartnerWarehouseId(partnerUserId);
    if (!partnerWarehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const agents = await prisma.user.findMany({
      where: {
        id: { in: ids },
        role: { in: MANAGED_AGENT_ROLES },
      },
      select: { id: true }
    });

    const validIds = agents.map(a => a.id);

    if (validIds.length === 0) {
      return errorResponse(res, 404, "No matching agents found to delete.");
    }

    const cleanupUserRelations = async (tx, userIds) => {
      await tx.deliveryAgentDocument.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentEducation.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentExperience.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deliveryAgentBank.deleteMany({ where: { userId: { in: userIds } } });

      await tx.attendance.deleteMany({ where: { userId: { in: userIds } } });
      await tx.locationCheckIn.deleteMany({ where: { userId: { in: userIds } } });
      await tx.locationLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.lateEntry.deleteMany({ where: { userId: { in: userIds } } });
      await tx.lateEntryException.deleteMany({ where: { userId: { in: userIds } } });
      await tx.leaveBalance.deleteMany({ where: { userId: { in: userIds } } });

      await tx.deliveryAssignment.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.deliveryAttempt.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.deliveryLocationHistory.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.assetAssignment.deleteMany({ where: { userId: { in: userIds } } });
      await tx.assetIssue.deleteMany({ where: { userId: { in: userIds } } });
      await tx.assetRequest.deleteMany({ where: { userId: { in: userIds } } });

      await tx.agentCashCollection.deleteMany({ where: { agentId: { in: userIds } } });
      await tx.agentWithdrawal.deleteMany({ where: { agentId: { in: userIds } } });

      await tx.address.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deviceToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.deviceMetadata.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });

      await tx.orderRating.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { deliveryBoyId: { in: userIds } }] } });
      await tx.rating.deleteMany({ where: { userId: { in: userIds } } });
      await tx.orderTrackingEvent.deleteMany({ where: { agentId: { in: userIds } } });

      const agentTransfers = await tx.agentStockTransfer.findMany({
        where: { OR: [{ fromUserId: { in: userIds } }, { toUserId: { in: userIds } }] },
        select: { id: true }
      });
      const transferIds = agentTransfers.map(t => t.id);
      if (transferIds.length > 0) {
        await tx.agentStockTransferItem.deleteMany({ where: { transferId: { in: transferIds } } });
        await tx.agentStockTransfer.deleteMany({ where: { id: { in: transferIds } } });
      }

      await tx.order.updateMany({ where: { agentId: { in: userIds } }, data: { agentId: null } });
    };

    await prisma.$transaction(async (tx) => {
      await cleanupUserRelations(tx, validIds);
      await tx.user.deleteMany({ where: { id: { in: validIds } } });
    });

    logger.info("Bulk delivery agents deleted successfully", { count: validIds.length });

    return successResponse(res, 200, { deletedCount: validIds.length }, `${validIds.length} delivery agent(s) deleted successfully`);
  } catch (error) {
    logger.error("Failed to bulk delete agents", { error: error.message, stack: error.stack });
    return errorResponse(res, 500, "Failed to bulk delete agents: " + error.message);
  }
};

export const checkPhoneExists = async (req, res) => {
  try {
    const rawPhone = req.query.phone || req.body?.phone;
    if (!rawPhone) {
      return errorResponse(res, 400, "Phone number is required");
    }

    const normalizedPhone = String(rawPhone).replace(/\s+/g, '').replace(/^(?:\+91|91)/, '').replace(/\D/g, '');
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return errorResponse(res, 400, "Invalid phone number format");
    }

    const excludeUserId = req.query.excludeUserId || req.body?.excludeUserId || null;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: `+91${normalizedPhone}` },
          { phone: `91${normalizedPhone}` },
          { phone: String(rawPhone).trim() }
        ],
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: { id: true }
    });

    return successResponse(res, 200, {
      exists: !!existingUser,
      message: existingUser ? "This phone number is already registered with an existing account." : "Phone number is available."
    }, existingUser ? "Phone number already exists" : "Phone number is available");
  } catch (error) {
    logger.error("[checkPhoneExists] Error checking phone", { error: error.message });
    return errorResponse(res, 500, "Failed to check phone number: " + error.message);
  }
};