// controllers/partnerAuthController.js
import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/responseHelper.js";
import {
  generateUserToken,
  generateRefreshToken,
  generateResetToken,
  verifyResetToken,
} from "../utils/jwtUtils.js";
import { extractEmailOrPhoneFromRequest } from "../utils/authUtils.js";
import { sendOtpEmail, sendPartnerWelcomeEmail } from "../utils/emailUtils.js";
import pkg from "@prisma/client";
const { UserRole } = pkg;
import bcrypt from "bcryptjs";
import { createIdentityUser } from "../utils/identityService.js";

/**
 * Partner-specific registration endpoint
 * POST /api/v1/partner/register
 * Creates user with PARTNER role and optionally creates Store/Supplier profiles
 */
export const registerPartner = async (req, res) => {
  try {
    const {
      phone,
      name,
      email,
      password,
      avatar,
      countryCode = "+91",
      address,
      store,
      supplier,
      customRoleId,
      warehouseId,
      department,
      bankInfo,
      dob,
      gender,
      alternatePhone,
      fatherOrSpouseName,
      maritalStatus,
      nationality,
      surname,
      warehouseLocation,
      warehouseBusiness,
      warehouseBusinessDocument,
      educationQualification,
      permanentAddress,
      communicationAddress,
      sameAsPermanent,
      businessDocFiles,
      canclCheck,
    } = req.body;

    console.log('[DEBUG-BACKEND] Register request received body:', {
      name,
      email,
      phone,
      department
    });

    // Basic validation
    if (!name || !phone || !avatar) {
      return errorResponse(res, 400, "Name, Phone, and avatar are required");
    }

    // Validate address object
    if (
      !address ||
      !address.line1 ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      return errorResponse(
        res,
        400,
        "Address line1, city, state, and pincode are required",
      );
    }

    // Check duplicate phone
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhoneUser) {
      return errorResponse(res, 400, "Phone number already registered");
    }

    // Check duplicate email (if provided)
    if (email) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmailUser) {
        return errorResponse(res, 400, "Email already registered");
      }
    }

    // Register user centrally in the Identity service
    let identityUserId = null;
    let roleIdToSave = customRoleId || null;
    try {
      logger.info("[partnerAuth] Registering partner in central identity service...", { email, phone });
      const identityUser = await createIdentityUser({
        name,
        email: email || null,
        phone: phone || null,
        password: password || "password123",
        role: "PARTNER",
        customRoleId: customRoleId || null,
      });
      identityUserId = identityUser.id;
      if (identityUser.roleId) {
        roleIdToSave = identityUser.roleId;
      }
    } catch (identityErr) {
      logger.error("[partnerAuth] Identity registration error: " + identityErr.message);
      // Non-blocking but warning
    }

    // Resolve or Auto-Create a warehouse based on store details
    let resolvedWarehouseId = warehouseId || null;
    if (!resolvedWarehouseId) {
      try {
        const uniqueSuffix = Date.now();
        const generatedCode = `WH-${uniqueSuffix}`;
        const newWarehouseName = store?.name ? `${store.name}'s Warehouse` : `${name}'s Warehouse`;
        
        logger.info(`[partnerAuth] Auto-creating warehouse: ${newWarehouseName} (${generatedCode})`);
        
        const autoWarehouse = await prisma.warehouse.create({
          data: {
            name: newWarehouseName,
            code: generatedCode,
            isActive: true,
            address: `${address.line1}, ${address.city}`,
            location: permanentAddress || {
              line1: address.line1,
              line2: address.line2 || "",
              city: address.city,
              state: address.state,
              pincode: address.pincode
            },
            communicationAddress: communicationAddress || {
              line1: address.line1,
              line2: address.line2 || "",
              city: address.city,
              state: address.state,
              pincode: address.pincode
            },
            servicePincodes: [address.pincode], // Initialize service pincodes with the warehouse pincode
            sameAsPermanent: sameAsPermanent !== undefined ? sameAsPermanent : false,
            approvalStatus: 'PENDING',
            onboardingStatus: 'COMPLETED',
            onboardingStep: 6,
            sirName: surname || "",
            fatherOrSpouseName: fatherOrSpouseName || "",
            alternateMobileNumber: alternatePhone || "",
            maritalStatus: maritalStatus || "",
            educationQualification: educationQualification || "",
          }
        });
        resolvedWarehouseId = autoWarehouse.id;
      } catch (createWhErr) {
        logger.error("[partnerAuth] Error auto-creating warehouse, falling back: " + createWhErr.message);
        try {
          const activeWarehouse = await prisma.warehouse.findFirst({
            where: { isActive: true }
          });
          if (activeWarehouse) {
            resolvedWarehouseId = activeWarehouse.id;
          }
        } catch (whErr) {
          logger.error("[partnerAuth] Error resolving default warehouse fallback: " + whErr.message);
        }
      }
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user with PARTNER role and related profiles in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          id: identityUserId || undefined,
          phone,
          role: UserRole.PARTNER,
          name,
          email: email || null,
          password: hashedPassword,
          avatar,
          countryCode,
          warehouseId: resolvedWarehouseId,
          customRoleId: roleIdToSave,
          bankInfo: bankInfo || null,
          dob: dob ? new Date(dob) : null,
          gender: gender || null,
          approvalStatus: 'PENDING',
          alternatePhone: alternatePhone || null,
          fatherOrSpouseName: fatherOrSpouseName || null,
          maritalStatus: maritalStatus || null,
          nationality: nationality || null,
          surname: surname || null,
          addresses: {
            create: {
              label: address.label || "Default",
              line1: address.line1,
              line2: address.line2 || null,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              isDefault: true,
              location: address.location || null,
            },
          },
        },
      });

      // Create WarehouseLocation if provided
      if (warehouseLocation) {
        await tx.warehouseLocation.create({
          data: {
            warehouseId: resolvedWarehouseId,
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
          }
        });
      }

      // Create WarehouseBusiness if provided
      if (warehouseBusiness) {
        await tx.warehouseBusiness.create({
          data: {
            warehouseId: resolvedWarehouseId,
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
          }
        });
      }

      // Create WarehouseBusinessDocument if provided
      if (warehouseBusinessDocument) {
        await tx.warehouseBusinessDocument.create({
          data: {
            warehouseId: resolvedWarehouseId,
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
          }
        });
      }

      if (businessDocFiles && Array.isArray(businessDocFiles)) {
        for (const file of businessDocFiles) {
          if (file.fileUrl) {
            await tx.warehouseDocumentFile.create({
              data: {
                warehouseId: resolvedWarehouseId,
                documentType: file.documentType,
                fileUrl: file.fileUrl
              }
            });
          }
        }
      }
      if (canclCheck && canclCheck.fileUrl) {
        await tx.warehouseDocumentFile.create({
          data: {
            warehouseId: resolvedWarehouseId,
            documentType: 'CANCEL_CHECK',
            fileUrl: canclCheck.fileUrl
          }
        });
      }

      let storeData = null;
      let supplierData = null;

      // Create Store profile if provided
      if (store) {
        if (
          !store.name ||
          !store.panNumber ||
          !store.logoUrl ||
          !store.nationalIdUrl ||
          !store.addressProofUrl
        ) {
          throw new Error(
            "Store profile requires: name, panNumber, logoUrl, nationalIdUrl, addressProofUrl",
          );
        }

        storeData = await tx.store.create({
          data: {
            userId: user.id,
            name: store.name,
            description: store.description || null,
            categoryIds: store.categoryIds || [],
            taxName: store.taxName || null,
            taxNumber: store.taxNumber || null,
            panNumber: store.panNumber,
            logoUrl: store.logoUrl,
            nationalIdUrl: store.nationalIdUrl,
            addressProofUrl: store.addressProofUrl,
            commission: store.commission || 0,
            status: "ACTIVE",
          },
        });
      }

      // Create Supplier profile if provided
      if (supplier) {
        if (!supplier.companyName || !supplier.businessAddress) {
          throw new Error(
            "Supplier profile requires: companyName, businessAddress",
          );
        }

        supplierData = await tx.supplier.create({
          data: {
            userId: user.id,
            companyName: supplier.companyName,
            gstin: supplier.gstin || null,
            businessAddress: supplier.businessAddress,
            licenseDocs: supplier.licenseDocs || null,
            operatingHours: supplier.operatingHours || null,
            deliveryOptions: supplier.deliveryOptions || null,
          },
        });
      }

      return {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        store: storeData,
        supplier: supplierData,
      };
    });

    // Generate tokens and store refresh token in session
    const userForToken = {
      id: result.user.id,
      phone: result.user.phone,
      role: result.user.role,
    };
    const accessToken = generateUserToken(userForToken);
    const refreshToken = generateRefreshToken(userForToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for refresh token

    await prisma.session.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Notify HRMS of new user registration via internal sync endpoint
    try {
      // HRMS core service runs on port 5001; routes are mounted without /api/v1 prefix
      let hrmsBaseUrl = process.env.HRMS_CORE_URL || process.env.HRMS_API_URL || 'https://hrmsapi.villagkart.com/hr/core';
      if (process.env.NODE_ENV === 'production' && hrmsBaseUrl.includes('localhost')) {
        hrmsBaseUrl = 'https://hrmsapi.villagkart.com/hr/core';
      }
      if (hrmsBaseUrl.includes('hrmsapi.villagkart.com') && !hrmsBaseUrl.includes('/hr/core')) {
        hrmsBaseUrl = hrmsBaseUrl.replace(/\/$/, '') + '/hr/core';
      }
      const syncKey = process.env.DELIVERY_API_SYNC_KEY || 'vk_sync_2026_super_secret_key_1234567890';
      const { createHmac } = await import('crypto');
      const ts = String(Date.now());

      // Resolve designation from role record if available
      let finalRoleName = 'Partner';
      if (roleIdToSave && typeof roleIdToSave === 'string' && roleIdToSave.match(/^[0-9a-fA-F-]{36}$/)) {
        try {
          // Partner-apis schema uses "Role" model (not CustomRole)
          const roleRec = await prisma.$queryRawUnsafe(
            `SELECT name FROM "Role" WHERE id = $1::uuid LIMIT 1`,
            roleIdToSave
          );
          if (roleRec?.[0]?.name) finalRoleName = roleRec[0].name;
        } catch (_) { /* fallback to default */ }
      }

      const syncBody = {
        userId: result.user.id,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        personalEmail: email || null,
        mobileNumber: phone || '',
        designation: finalRoleName,
        department: department || 'Operations',
        role: 'EMPLOYEE',
        roleId: roleIdToSave || null,
        status: 'ACTIVE'
      };

      const payloadStr = JSON.stringify(syncBody);
      const signature = createHmac('sha256', syncKey)
        .update(`${ts}.${payloadStr}`)
        .digest('hex');

      logger.info(`[partnerAuth] Syncing new Partner to HRMS...`, { userId: result.user.id, department: syncBody.department });
      console.log('[DEBUG-BACKEND] Calling HRMS Sync:', {
        url: `${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`,
        syncBody
      });
      fetch(`${hrmsBaseUrl.replace(/\/$/, '')}/employees/internal/sync-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-sync-key': syncKey,
          'x-sync-ts': ts,
          'x-sync-signature': signature
        },
        body: payloadStr
      }).then(r => {
        console.log('[DEBUG-BACKEND] HRMS Sync response status:', r.status);
        return r.json();
      }).then(data => {
        console.log('[DEBUG-BACKEND] HRMS Sync response body:', data);
        if (!data.success) logger.error('[partnerAuth] HRMS Sync failed:', data);
        else logger.info('[partnerAuth] HRMS Sync success:', data.message);
      }).catch(err => {
      });
    } catch (syncErr) {
      logger.error('[partnerAuth] Fatal sync to HRMS error:', syncErr);
    }

    // Send Welcome & Credentials Email asynchronously if email is provided
    if (email) {
      sendPartnerWelcomeEmail(email, {
        name,
        email,
        password: password || 'Set during signup',
      }).catch(err => {
        logger.error(`[partnerAuth] Failed to send welcome email to ${email}:`, { error: err.message });
      });
    }

    logger.info("Partner registered successfully", { userId: result.user.id });
    return successResponse(
      res,
      201,
      {
        ...result,
        accessToken,
        refreshToken,
        expiresIn: "24h", // Access token expiry hint for client
      },
      "Partner registered successfully",
    );
  } catch (error) {
    logger.error("Error registering partner", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Login with email or phone and password
 * POST /api/v1/partner/auth/login
 * Body: { email?: string, phone?: string, password: string }
 * Either email or phone is required
 */
export const loginWithPassword = async (req, res) => {
  try {
    const { email, phone, password, deviceId, fcmToken } = req.body;

    if (!password) {
      return errorResponse(res, 400, "Password is required");
    }

    if (!email && !phone) {
      return errorResponse(
        res,
        400,
        "Either email or phone is required for login",
      );
    }

    if (email && phone) {
      return errorResponse(res, 400, "Provide either email or phone, not both");
    }

    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;

    const userSelect = {
      id: true,
      phone: true,
      role: true,
      name: true,
      email: true,
      password: true,
      avatar: true,
      isActive: true,
      lastLoginAt: true,
      warehouseId: true,
      store: { select: { id: true, name: true, status: true } },
      supplier: { select: { id: true, companyName: true } },
      Warehouse: {
        select: {
          id: true,
          name: true,
          approvalStatus: true,
          warehouseBusiness: {
            take: 1,
            select: { displayName: true },
          },
        },
      },
    };

    const user = trimmedEmail
      ? await prisma.user.findFirst({
          where: {
            OR: [
              { email: trimmedEmail },
              { email: trimmedEmail.replace(/@villagkart\.com$/i, '@gmail.com') },
              { email: trimmedEmail.replace(/@gmail\.com$/i, '@villagkart.com') },
            ],
          },
          select: userSelect,
        })
      : await prisma.user.findUnique({
          where: { phone: trimmedPhone },
          select: userSelect,
        });

    if (!user) {
      return errorResponse(res, 401, "Invalid email/phone or password");
    }

    if (user.role !== UserRole.PARTNER && user.role !== UserRole.SHOPKEEPER) {
      return errorResponse(
        res,
        403,
        "This account is not registered as a partner or shopkeeper",
      );
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        "Account is Inactive. Please contact support.",
      );
    }

    if (!user.password) {
      return errorResponse(
        res,
        400,
        "No password set. Use OTP login or set password first.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse(res, 401, "Invalid email/phone or password");
    }

    /* ---------------------------------------------------
       🔥 Check if warehouse is approved
    ---------------------------------------------------- */


    if (user.Warehouse) {
      if (user.Warehouse.approvalStatus !== "APPROVED") {
        return errorResponse(
          res,
          403,
          `Your warehouse is currently ${user.Warehouse.approvalStatus.toLowerCase()}. Please wait for approval or contact support.`
        );
      }
    }

    /* ---------------------------------------------------
       🔥 Check if warehouse categories exist
    ---------------------------------------------------- */

    let categoriesPresent = false;

    if (user.Warehouse?.id) {

      const categoryCount = await prisma.warehouseCategory.count({
        where: {
          warehouseId: user.Warehouse.id
        }
      });

      categoriesPresent = categoryCount > 0;
    }

    const accessToken = generateUserToken(user);
    const refreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        deviceId: deviceId || null,
        fcmToken: fcmToken || null,
        expiresAt,
      },
    });

    const isFirstLogin = user.lastLoginAt == null;

    const displayName =
      user.store?.name ??
      user.supplier?.companyName ??
      user.Warehouse?.warehouseBusiness?.[0]?.displayName ??
      user.Warehouse?.name ??
      user.name ??
      null;

    const userResponse = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      displayName,
      isCreatedPassword: isFirstLogin,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      store: user.store,
      supplier: user.supplier,
      warehouseId: user.warehouseId,

      // 🔥 new key
      categoriesPresent
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });

    logger.info("Partner logged in with password", { userId: user.id });

    return successResponse(
      res,
      200,
      {
        user: userResponse,
        accessToken,
        refreshToken,
        expiresIn: "24h",
      },
      "Logged in successfully",
    );

  } catch (error) {

    logger.error("Error in password login", {
      error: error.message,
      stack: error.stack,
    });

    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Create new password for approved partner (first-time setup or change)
 * POST /api/v1/partner/auth/create-password
 * Requires: Bearer token (partner must be logged in via OTP first)
 * Body: { newPassword: string, confirmNewPassword: string }
 */
import jwt from "jsonwebtoken";

export const createNewPassword = async (req, res) => {
  try {

    let { token } = req.body;
    const { newPassword, confirmNewPassword } = req.body;

    /* ------------------------------
       1️⃣ Extract Token (from body or Authorization header)
    ------------------------------ */

    // If no token in body, try to get from Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7); // Remove 'Bearer ' prefix
        } else {
          token = authHeader; // Use as-is if no Bearer prefix
        }
      }
    }

    if (!token) {
      return errorResponse(res, 400, "Token is required (pass in body or Authorization header)");
    }

    /* ------------------------------
       2️⃣ Validate Input
    ------------------------------ */
    if (!newPassword || !confirmNewPassword) {
      return errorResponse(
        res,
        400,
        "New password and confirm new password are required"
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, "Password must be at least 6 characters");
    }

    if (newPassword !== confirmNewPassword) {
      return errorResponse(res, 400, "Passwords do not match");
    }

    /* ------------------------------
       3️⃣ Decode and Verify Token
    ------------------------------ */
    let decoded;

    try {
      const { verifyToken } = await import("../utils/jwtUtils.js");
      decoded = await verifyToken(token);
    } catch (err) {
      logger.error("Token verification failed", {
        error: err.message,
        tokenPreview: token.substring(0, 20) + "...",
      });
      return errorResponse(res, 401, "Invalid or expired token. Please login again.");
    }

    const userId = decoded.sub || decoded.id;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user && (decoded.email || decoded.phone)) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(decoded.email ? [{ email: decoded.email }] : []),
            ...(decoded.phone ? [{ phone: decoded.phone }] : [])
          ]
        },
        select: { id: true, role: true, isActive: true }
      });
    }

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    const targetUserId = user.id;

    // Allow any active user to set their own password via token
    // (PARTNER, SHOPKEEPER, VSMS_AGENT, WAREHOUSE_STAFF, etc.)

    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        "Account is deactivated. Please contact support."
      );
    }

    /* ------------------------------
       5️⃣ Update Password
    ------------------------------ */
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword, lastLoginAt: new Date() },
      select: { id: true },
    });

    // Also sync password to Identity Service so SSO login works
    try {
      const { updateIdentityUser } = await import('../utils/identityService.js');
      await updateIdentityUser(userId, { email: user.email, password: newPassword, passwordChangeCompleted: true });
      logger.info('Password synced to Identity Service', { userId });
    } catch (syncErr) {
      logger.warn('Failed to sync password to Identity Service', { userId, error: syncErr.message });
      // Non-fatal: local password is already updated
    }

    logger.info("Password updated successfully", { userId: targetUserId });

    return successResponse(res, 200, {}, "Password updated successfully! Please login with your new password.");

  } catch (error) {
    logger.error("Error updating password", {
      error: error.message,
      stack: error.stack,
    });

    return errorResponse(res, 500, "Internal server error");
  }
};
/**
 * Send OTP for partner login
 * POST /api/v1/partner/auth/send-otp
 * Body: { emailOrPhone: string } or legacy { phone: string, countryCode?: string }
 */
export const sendLoginOtp = async (req, res) => {
  try {
    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(
        res,
        404,
        `${identifier} not registered. Please register first.`,
      );
    }

    if (user.role !== UserRole.PARTNER && user.role !== UserRole.SHOPKEEPER) {
       const identifier = type === "email" ? "This email" : "This phone number";
       return errorResponse(
         res,
         403,
         `${identifier} is not registered as a partner or shopkeeper`,
       );
     }

    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        "Account is deactivated. Please contact support.",
      );
    }

    const { generateOTP } = await import("../utils/otpUtils.js");
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.session.create({
      data: {
        userId: user.id,
        otp,
        expiresAt,
      },
    });

    if (type === "email") {
      try {
        await sendOtpEmail(user.email, otp, "login");
      } catch (emailErr) {
        logger.error("Failed to send OTP email", {
          error: emailErr.message,
          userId: user.id,
        });
        return errorResponse(
          res,
          500,
          "Failed to send OTP to email. Please try again.",
        );
      }
    }
    // Phone: existing flow - OTP stored, SMS integration can be added here
    logger.info("Login OTP generated for partner", {
      userId: user.id,
      channel: type,
    });

    const response = { message: "OTP sent successfully" };
    if (process.env.NODE_ENV === "development") {
      response.otp = otp;
    }

    return successResponse(res, 200, response, "OTP sent successfully");
  } catch (error) {
    logger.error("Error sending login OTP", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Verify OTP and login partner
 * POST /api/v1/partner/auth/verify-otp
 * Body: { emailOrPhone: string, otp: string } or legacy { phone: string, otp: string }
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    const { otp, deviceId, fcmToken } = req.body;

    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    if (!otp) {
      return errorResponse(res, 400, "OTP is required");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        phone: true,
        role: true,
        name: true,
        email: true,
        avatar: true,
        warehouseId: true,
        store: { select: { id: true, name: true, status: true } },
        supplier: { select: { id: true, companyName: true } },
        isActive: true,
      },
    });

    if (!user) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(res, 404, `${identifier} not registered`);
    }

    if (user.role === UserRole.DELIVERY_AGENT) {
      return errorResponse(
        res,
        403,
        "Delivery agents are not permitted to log in here. Please use the Delivery Agent App.",
      );
    }

    if (user.role !== UserRole.PARTNER && user.role !== UserRole.SHOPKEEPER) {
      const identifier = type === "email" ? "This email" : "This phone number";
      return errorResponse(
        res,
        403,
        `${identifier} is not registered as a partner or shopkeeper`,
      );
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        "Account is Inactive. Please contact support.",
      );
    }

    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        otp,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return errorResponse(res, 400, "Invalid or expired OTP");
    }

    const accessToken = generateUserToken(user);
    const refreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        otp: null,
        token: refreshToken,
        deviceId: deviceId || null,
        fcmToken: fcmToken || null,
        expiresAt,
      },
    });

    const userResponse = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      store: user.store,
      supplier: user.supplier,
      warehouseId: user.warehouseId,
    };

    logger.info("Partner logged in successfully", { userId: user.id });

    return successResponse(
      res,
      200,
      {
        user: userResponse,
        accessToken,
        refreshToken,
        expiresIn: "24h",
      },
      "Logged in successfully",
    );
  } catch (error) {
    logger.error("Error verifying login OTP", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Resend OTP for partner login
 * POST /api/v1/partner/auth/resend-otp
 * Body: { emailOrPhone: string } or legacy { phone: string }
 */
export const resendLoginOtp = async (req, res) => {
  try {
    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: { id: true, email: true, role: true },
    });

    if (!user || (user.role !== UserRole.PARTNER && user.role !== UserRole.SHOPKEEPER)) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(
        res,
        404,
        `${identifier} not registered as a partner or shopkeeper`,
      );
    }

    const { generateOTP } = await import("../utils/otpUtils.js");
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const existingSession = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (existingSession) {
      await prisma.session.update({
        where: { id: existingSession.id },
        data: { otp, expiresAt, token: null },
      });
    } else {
      await prisma.session.create({
        data: { userId: user.id, otp, expiresAt },
      });
    }

    if (type === "email") {
      try {
        await sendOtpEmail(user.email, otp, "login");
      } catch (emailErr) {
        logger.error("Failed to resend OTP email", {
          error: emailErr.message,
          userId: user.id,
        });
        return errorResponse(
          res,
          500,
          "Failed to resend OTP to email. Please try again.",
        );
      }
    }

    const response = { message: "OTP resent successfully" };
    if (process.env.NODE_ENV === "development") {
      response.otp = otp;
    }

    return successResponse(res, 200, response, "OTP resent successfully");
  } catch (error) {
    logger.error("Error resending OTP", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Refresh access token
 * POST /api/v1/partner/auth/refresh-token
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, "Refresh token is required");
    }

    let decoded;
    try {
      const { verifyToken } = await import("../utils/jwtUtils.js");
      decoded = await verifyToken(refreshToken);
    } catch (err) {
      return errorResponse(res, 401, "Invalid or expired refresh token");
    }

    if (decoded.type !== "refresh") {
      return errorResponse(res, 401, "Invalid token type");
    }

    const session = await prisma.session.findFirst({
      where: {
        userId: decoded.id,
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return errorResponse(res, 401, "Refresh token expired or invalid");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || (user.role !== UserRole.PARTNER && user.role !== UserRole.SHOPKEEPER)) {
      return errorResponse(res, 401, "User not found or inactive");
    }

    const accessToken = generateUserToken(user);

    return successResponse(
      res,
      200,
      {
        accessToken,
        expiresIn: "24h",
      },
      "Token refreshed successfully",
    );
  } catch (error) {
    logger.error("Error refreshing token", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Logout partner (invalidate refresh token)
 * POST /api/v1/partner/auth/logout
 */
export const logoutPartner = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, "Refresh token is required");
    }

    const session = await prisma.session.findFirst({
      where: { token: refreshToken },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { token: null },
      });
    }

    return successResponse(res, 200, {}, "Logged out successfully");
  } catch (error) {
    logger.error("Error during logout", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Request password reset (sends OTP to email or phone)
 * POST /api/v1/partner/auth/forgot-password
 * Body: { emailOrPhone: string } or legacy { phone: string }
 */
export const forgotPassword = async (req, res) => {
  try {
    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: { id: true, email: true, role: true, password: true },
    });

    if (!user) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(
        res,
        404,
        `${identifier} is not registered`,
      );
    }

    if (!user.password) {
      return errorResponse(
        res,
        400,
        "No password set for this account. Use OTP login.",
      );
    }

    const { generateOTP } = await import("../utils/otpUtils.js");
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        otp,
        expiresAt,
      },
    });

    if (type === "email") {
      try {
        await sendOtpEmail(user.email, otp, "password_reset");
      } catch (emailErr) {
        logger.error("Failed to send password reset OTP email", {
          error: emailErr.message,
          userId: user.id,
        });
        return errorResponse(
          res,
          500,
          "Failed to send OTP to email. Please try again.",
        );
      }
    }

    logger.info("Password reset OTP generated", {
      userId: user.id,
      channel: type,
    });

    const response =
      type === "email"
        ? { message: "OTP sent to your registered email address" }
        : { message: "OTP sent to your registered phone number" };
    if (process.env.NODE_ENV === "development") {
      response.otp = otp;
    }

    return successResponse(res, 200, response, "OTP sent successfully");
  } catch (error) {
    logger.error("Error in forgot password", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Step 2 – Verify OTP for password reset (returns resetToken only; frontend stores and goes to New Password screen)
 * POST /api/v1/partner/auth/verify-reset-otp
 * Body: { emailOrPhone: string, otp: string } or { email: string, otp: string }
 */
export const verifyResetOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    if (!otp) {
      return errorResponse(res, 400, "OTP is required");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: { id: true, role: true },
    });

    if (!user) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(
        res,
        404,
        `${identifier} not found`,
      );
    }

    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        otp,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return errorResponse(res, 400, "Invalid or expired OTP");
    }

    // Invalidate OTP so it cannot be reused
    await prisma.session.update({
      where: { id: session.id },
      data: { otp: null },
    });

    const resetToken = generateResetToken(user.id);

    logger.info("Password reset OTP verified, resetToken issued", {
      userId: user.id,
    });

    return successResponse(
      res,
      200,
      { resetToken },
      "OTP verified. Proceed to set your new password.",
    );
  } catch (error) {
    logger.error("Error verifying reset OTP", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

/**
 * Step 3 – Reset password using resetToken (set new password, then redirect to Login)
 * POST /api/v1/partner/auth/reset-password
 * Body: { emailOrPhone: string, newPassword: string, confirmPassword: string, resetToken: string }
 */
export const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword, resetToken } = req.body;

    const parsed = extractEmailOrPhoneFromRequest(req.body);
    if (!parsed) {
      return errorResponse(res, 400, "Valid email or phone number is required");
    }

    if (!resetToken) {
      return errorResponse(res, 400, "Reset token is required");
    }

    if (!newPassword || !confirmPassword) {
      return errorResponse(
        res,
        400,
        "New password and confirm password are required",
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, "Password must be at least 6 characters");
    }

    if (newPassword !== confirmPassword) {
      return errorResponse(
        res,
        400,
        "New password and confirm password do not match",
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let decoded;
    try {
      decoded = await verifyResetToken(resetToken);
    } catch (err) {
      logger.error("verifyResetToken failed", { error: err.message });
      return errorResponse(res, 400, "Invalid or expired reset token");
    }

    const { type, value } = parsed;
    const whereClause = type === "email" ? { email: value } : { phone: value };

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: { id: true, role: true },
    });

    if (!user) {
      const identifier = type === "email" ? "Email" : "Phone number";
      return errorResponse(
        res,
        404,
        `${identifier} not found`,
      );
    }

    const decodedUserId = decoded.sub || decoded.id;
    if (user.id !== decodedUserId) {
      return errorResponse(res, 400, "Reset token does not match this account");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
      select: { id: true },
    });

    // Sync password to Identity Service
    try {
      const { updateIdentityUser } = await import('../utils/identityService.js');
      await updateIdentityUser(user.id, { password: newPassword });
      logger.info('Forgot-password reset synced to Identity Service', { userId: user.id });
    } catch (syncErr) {
      logger.warn('Failed to sync reset password to Identity Service', { userId: user.id, error: syncErr.message });
    }

    logger.info("Partner password reset completed", { userId: user.id });

    return successResponse(
      res,
      200,
      { message: "Password updated successfully. Please login." },
      "Password updated successfully. Please login.",
    );
  } catch (error) {
    logger.error("Error resetting password", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};
