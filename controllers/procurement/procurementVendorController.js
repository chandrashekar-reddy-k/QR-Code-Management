import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/responseHelper.js';
import { resolveStoreScopeFromReq, resolveWriteStoreId } from '../../utils/resolveStoreScope.js';
// Removed duplicate prisma import

// Get all vendors (with pagination) — warehouse-isolated
export const getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search, status, approvalStatus } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const storeScope = await resolveStoreScopeFromReq(req);

    const where = {
      ...storeScope,
      ...(search && {
        OR: [
          { vendorName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }),
      ...(status && { status }),
      ...(approvalStatus && { approvalStatus }),
    };

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vendor.count({ where })
    ]);

    return paginatedResponse(
      res,
      200,
      vendors,
      { page: Number(page), limit: Number(limit), total },
      'Vendors fetched successfully'
    );
  } catch (error) {
    logger.error(`getVendors error: ${error.message}`);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

// Get single vendor by ID — warehouse-isolated
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeScope = await resolveStoreScopeFromReq(req);

    const vendor = await prisma.vendor.findFirst({
      where: { id, ...storeScope },
      include: { itemMappings: true }
    });

    if (!vendor) {
      return errorResponse(res, 404, 'Vendor not found');
    }

    return successResponse(res, 200, vendor, 'Vendor fetched successfully');
  } catch (error) {
    logger.error(`getVendorById error: ${error.message}`);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

import { generateId } from '../../utils/idGenerator.js';

// ── Validation regex constants ────────────────────────────────────────────────
const PHONE_REGEX   = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX     = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX    = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{9,18}$/;

// Create new vendor — always scoped to partner's store
export const createVendor = async (req, res) => {
  try {
    const rawId = req.body?.storeId || req.user?.storeId || req.user?.warehouseId || null;
    const storeId = await resolveWriteStoreId(rawId);
    const {
      vendorName,
      mobile,
      email,
      address,
      gstNumber,
      panNumber,
      pincode,
      contactPerson,
      creditDays,
      openingBalance,
      paymentTerms,
      creditLimit,
      bankName,
      accountNumber,
      ifscCode,
      bankBranch,
      vendorCategory,
      minOrderQty,
      isTaxable
    } = req.body;

    const trimmedName = vendorName?.trim();
    const trimmedMobile = mobile?.trim();
    const trimmedEmail = email?.trim();
    const trimmedGst = gstNumber?.trim();
    const trimmedPan = panNumber?.trim()?.toUpperCase();
    const trimmedIfsc = ifscCode?.trim()?.toUpperCase();
    const trimmedPincode = pincode?.trim();
    const trimmedAccount = accountNumber?.trim();

    // ── Required fields ──────────────────────────────────────────────────────
    if (!trimmedName) {
      return errorResponse(res, 400, 'Vendor name is required');
    }
    if (trimmedName.length < 2 || trimmedName.length > 200) {
      return errorResponse(res, 400, 'Vendor name must be between 2 and 200 characters');
    }
    if (!trimmedMobile) {
      return errorResponse(res, 400, 'Mobile number is required');
    }

    // ── Format validations (Email is optional; validate only if provided) ───

    if (!PHONE_REGEX.test(trimmedMobile)) {
      return errorResponse(res, 400, 'Invalid mobile number. Must be a valid 10-digit Indian mobile number');
    }
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return errorResponse(res, 400, 'Invalid email address format');
    }
    if (trimmedGst) {
      if (trimmedGst.length !== 15 || !GSTIN_REGEX.test(trimmedGst)) {
        return errorResponse(res, 400, 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)');
      }
    }
    if (trimmedPan && !PAN_REGEX.test(trimmedPan)) {
      return errorResponse(res, 400, 'Invalid PAN format (e.g. ABCDE1234F)');
    }
    if (trimmedIfsc && !IFSC_REGEX.test(trimmedIfsc)) {
      return errorResponse(res, 400, 'Invalid IFSC code format (e.g. SBIN0001234)');
    }
    if (trimmedPincode && !PINCODE_REGEX.test(trimmedPincode)) {
      return errorResponse(res, 400, 'Pincode must be exactly 6 digits');
    }
    if (trimmedAccount && !ACCOUNT_REGEX.test(trimmedAccount)) {
      return errorResponse(res, 400, 'Bank account number must be between 9 and 18 digits');
    }

    // ── Numeric validations ───────────────────────────────────────────────────
    if (creditDays !== undefined && creditDays !== null && creditDays !== '') {
      const cd = Number(creditDays);
      if (isNaN(cd) || cd < 0 || cd > 365) {
        return errorResponse(res, 400, 'Credit days must be between 0 and 365');
      }
    }
    if (creditLimit !== undefined && creditLimit !== null && creditLimit !== '') {
      const cl = Number(creditLimit);
      if (isNaN(cl) || cl < 0) {
        return errorResponse(res, 400, 'Credit limit cannot be negative');
      }
    }
    if (minOrderQty !== undefined && minOrderQty !== null && minOrderQty !== '') {
      const moq = Number(minOrderQty);
      if (isNaN(moq) || moq < 1) {
        return errorResponse(res, 400, 'Minimum order quantity must be at least 1');
      }
    }

    // Check if mobile already exists
    const existingVendor = await prisma.vendor.findFirst({ where: { mobile: trimmedMobile } });
    if (existingVendor) {
      return errorResponse(res, 400, 'Vendor with this mobile number already exists');
    }

    const displayId = await generateId({
      entity: 'VND',
      storeId
    });

    const openBal = openingBalance ? Number(openingBalance) : 0;

    const newVendor = await prisma.vendor.create({
      data: {
        storeId: storeId || null,
        displayId,
        vendorName: trimmedName,
        mobile: trimmedMobile,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        creditDays: creditDays ? Number(creditDays) : 30,
        openingBalance: openBal,
        currentBalance: openBal,
        paymentTerms: paymentTerms || 'Net 30',
        creditLimit: creditLimit ? Number(creditLimit) : 0,
        bankName: bankName?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        ifscCode: ifscCode?.trim() || null,
        bankBranch: bankBranch?.trim() || null,
        vendorCategory: vendorCategory || 'RAW_MATERIAL',
        minOrderQty: minOrderQty ? Number(minOrderQty) : 1,
        isTaxable: isTaxable === true || isTaxable === 'true',
        status: 'ACTIVE',
        approvalStatus: 'APPROVED'
      }
    });

    return successResponse(res, 201, newVendor, 'Vendor created successfully');
  } catch (error) {
    logger.error(`createVendor error: ${error.message}`);
    return errorResponse(res, 500, error.message);
  }
};

// Update vendor approval status
export const updateVendorApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!approvalStatus || !['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return errorResponse(res, 400, 'Valid approval status (PENDING, APPROVED, REJECTED) is required');
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: { approvalStatus }
    });

    return successResponse(res, 200, updated, `Vendor approval status set to ${approvalStatus}`);
  } catch (error) {
    logger.error(`updateVendorApproval error: ${error.message}`);
    if (error.code === 'P2025') return errorResponse(res, 404, 'Vendor not found');
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

// Update vendor
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      storeId,
      vendorName,
      mobile,
      email,
      address,
      gstNumber,
      contactPerson,
      creditDays,
      openingBalance,
      currentBalance,
      paymentTerms,
      creditLimit,
      bankName,
      accountNumber,
      ifscCode,
      bankBranch,
      vendorCategory,
      minOrderQty,
      isTaxable,
      status,
      approvalStatus
    } = req.body;

    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return errorResponse(res, 404, 'Vendor not found');
    }

    if (mobile && mobile.trim() !== existingVendor.mobile) {
      const mobileDuplicate = await prisma.vendor.findFirst({
        where: { mobile: mobile.trim(), id: { not: id } }
      });
      if (mobileDuplicate) {
        return errorResponse(res, 400, 'Another vendor with this mobile number already exists');
      }
    }

    const data = {};
    if (storeId !== undefined) {
      const resolvedStoreId = await resolveWriteStoreId(storeId);
      data.storeId = resolvedStoreId || existingVendor.storeId || null;
    }
    if (vendorName !== undefined) {
      const trimmedName = String(vendorName).trim();
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 200) {
        return errorResponse(res, 400, 'Vendor name must be between 2 and 200 characters');
      }
      data.vendorName = trimmedName;
    }
    if (mobile !== undefined) {
      const trimmedMobile = String(mobile).trim();
      if (!PHONE_REGEX.test(trimmedMobile)) {
        return errorResponse(res, 400, 'Invalid mobile number. Must be a valid 10-digit Indian mobile number');
      }
      data.mobile = trimmedMobile;
    }
    if (email !== undefined) {
      const trimmedEmail = email ? String(email).trim() : '';
      if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
        return errorResponse(res, 400, 'Invalid email address format');
      }
      data.email = trimmedEmail || null;
    }
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (gstNumber !== undefined) {
      const trimmedGst = gstNumber ? String(gstNumber).trim().toUpperCase() : '';
      if (trimmedGst && (trimmedGst.length !== 15 || !GSTIN_REGEX.test(trimmedGst))) {
        return errorResponse(res, 400, 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)');
      }
      data.gstNumber = trimmedGst || null;
    }
    if (contactPerson !== undefined) data.contactPerson = contactPerson ? String(contactPerson).trim() : null;
    if (creditDays !== undefined && creditDays !== null && creditDays !== '') {
      const cd = Number(creditDays);
      if (isNaN(cd) || cd < 0 || cd > 365) {
        return errorResponse(res, 400, 'Credit days must be between 0 and 365');
      }
      data.creditDays = cd;
    }
    if (openingBalance !== undefined) data.openingBalance = Number(openingBalance) || 0;
    if (currentBalance !== undefined) data.currentBalance = Number(currentBalance) || 0;
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
    if (creditLimit !== undefined && creditLimit !== null && creditLimit !== '') {
      const cl = Number(creditLimit);
      if (isNaN(cl) || cl < 0) {
        return errorResponse(res, 400, 'Credit limit cannot be negative');
      }
      data.creditLimit = cl;
    }
    if (bankName !== undefined) data.bankName = bankName ? String(bankName).trim() : null;
    if (accountNumber !== undefined) {
      const trimmedAcc = accountNumber ? String(accountNumber).trim() : '';
      if (trimmedAcc && !ACCOUNT_REGEX.test(trimmedAcc)) {
        return errorResponse(res, 400, 'Bank account number must be between 9 and 18 digits');
      }
      data.accountNumber = trimmedAcc || null;
    }
    if (ifscCode !== undefined) {
      const trimmedIfsc = ifscCode ? String(ifscCode).trim().toUpperCase() : '';
      if (trimmedIfsc && !IFSC_REGEX.test(trimmedIfsc)) {
        return errorResponse(res, 400, 'Invalid IFSC code format (e.g. SBIN0001234)');
      }
      data.ifscCode = trimmedIfsc || null;
    }
    if (bankBranch !== undefined) data.bankBranch = bankBranch ? String(bankBranch).trim() : null;
    if (vendorCategory !== undefined) data.vendorCategory = vendorCategory;
    if (minOrderQty !== undefined && minOrderQty !== null && minOrderQty !== '') {
      const moq = Number(minOrderQty);
      if (isNaN(moq) || moq < 1) {
        return errorResponse(res, 400, 'Minimum order quantity must be at least 1');
      }
      data.minOrderQty = moq;
    }
    if (isTaxable !== undefined) data.isTaxable = isTaxable === true || isTaxable === 'true';
    if (status !== undefined) data.status = status;
    if (approvalStatus !== undefined) data.approvalStatus = approvalStatus;

    const vendor = await prisma.vendor.update({
      where: { id },
      data
    });

    return successResponse(res, 200, vendor, 'Vendor updated successfully');
  } catch (error) {
    logger.error(`updateVendor error: ${error.message}`);
    if (error.code === 'P2025') return errorResponse(res, 404, 'Vendor not found');
    if (error.code === 'P2002') return errorResponse(res, 400, 'Duplicate value for a unique field (mobile or GST)');
    return errorResponse(res, 500, error.message || 'Internal Server Error');
  }
};

// Delete vendor and cascade delete all related procurement records
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // 1. Delete allocations related to payments of this vendor or invoices of this vendor
      const invoices = await tx.purchaseInvoice.findMany({
        where: { vendorId: id },
        select: { id: true }
      });
      const invoiceIds = invoices.map(i => i.id);

      const payments = await tx.vendorPayment.findMany({
        where: { vendorId: id },
        select: { id: true }
      });
      const paymentIds = payments.map(p => p.id);

      if (invoiceIds.length > 0 || paymentIds.length > 0) {
        await tx.vendorPaymentAllocation.deleteMany({
          where: {
            OR: [
              ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
              ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : [])
            ]
          }
        });
      }

      // 2. Delete Vendor Payments
      if (paymentIds.length > 0) {
        await tx.vendorPayment.deleteMany({
          where: { id: { in: paymentIds } }
        });
      }

      // 3. Delete Purchase Invoice Items & Purchase Invoices
      if (invoiceIds.length > 0) {
        await tx.purchaseInvoiceItem.deleteMany({
          where: { invoiceId: { in: invoiceIds } }
        });
        await tx.purchaseInvoice.deleteMany({
          where: { id: { in: invoiceIds } }
        });
      }

      // 4. Delete Goods Receipts & Items for vendor's POs
      const pos = await tx.purchaseOrder.findMany({
        where: { vendorId: id },
        select: { id: true }
      });
      const poIds = pos.map(p => p.id);

      if (poIds.length > 0) {
        const grns = await tx.procurementGoodsReceipt.findMany({
          where: { poId: { in: poIds } },
          select: { id: true }
        });
        const grnIds = grns.map(g => g.id);

        if (grnIds.length > 0) {
          await tx.procurementGoodsReceiptItem.deleteMany({
            where: { grnId: { in: grnIds } }
          });
          await tx.procurementGoodsReceipt.deleteMany({
            where: { id: { in: grnIds } }
          });
        }

        // Delete Purchase Order Items & Purchase Orders
        await tx.purchaseOrderItem.deleteMany({
          where: { poId: { in: poIds } }
        });
        await tx.purchaseOrder.deleteMany({
          where: { id: { in: poIds } }
        });
      }

      // 5. Delete Item Mappings & Price History
      const mappings = await tx.vendorItemMapping.findMany({
        where: { vendorId: id },
        select: { id: true }
      });
      const mappingIds = mappings.map(m => m.id);

      if (mappingIds.length > 0) {
        await tx.vendorPriceHistory.deleteMany({
          where: { mappingId: { in: mappingIds } }
        });
        await tx.vendorItemMapping.deleteMany({
          where: { id: { in: mappingIds } }
        });
      }

      // 6. Delete Vendor Ledger
      await tx.vendorLedger.deleteMany({
        where: { vendorId: id }
      });

      // 7. Finally Delete Vendor
      await tx.vendor.delete({
        where: { id }
      });
    });

    return successResponse(res, 200, null, 'Vendor and all associated procurement data deleted successfully');
  } catch (error) {
    logger.error(`deleteVendor error: ${error.message}`);
    if (error.code === 'P2025') return errorResponse(res, 404, 'Vendor not found');
    return errorResponse(res, 500, error.message || 'Internal Server Error');
  }
};

// Toggle vendor status (ACTIVE / INACTIVE) — warehouse-isolated
export const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const storeScope = await resolveStoreScopeFromReq(req);
    const vendor = await prisma.vendor.findFirst({ where: { id, ...storeScope } });
    if (!vendor) return errorResponse(res, 404, 'Vendor not found');

    const newStatus = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.vendor.update({
      where: { id },
      data: { status: newStatus }
    });

    return successResponse(res, 200, updated, `Vendor marked as ${newStatus}`);
  } catch (error) {
    logger.error(`toggleVendorStatus error: ${error.message}`);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

// Vendor Ledger
export const getVendorLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const [vendor, ledger] = await Promise.all([
      prisma.vendor.findUnique({ where: { id } }),
      prisma.vendorLedger.findMany({
        where: { vendorId: id },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    return successResponse(res, 200, { vendor, ledger }, 'Vendor ledger fetched');
  } catch (error) {
    logger.error(`getVendorLedger error: ${error.message}`);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

// Get Vendor Mappings
export const getVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        priceHistory: {
          orderBy: { changedAt: 'desc' }
        },
        product: {
          include: {
            category: true,
            variants: true
          }
        }
      }
    });

    // Fetch raw uom, mrp, landingPrice, quantity columns from DB table
    const rawMappings = await prisma.$queryRawUnsafe(
      `SELECT "productId", "uom", "mrp", "landingPrice", "quantity" FROM "VendorItemMapping" WHERE "vendorId" = $1`,
      vendorId
    ).catch(() => []);

    const rawMap = {};
    if (Array.isArray(rawMappings)) {
      rawMappings.forEach(rm => {
        if (rm && rm.productId) rawMap[rm.productId] = rm;
      });
    }

    const enrichedMappings = mappings.map(m => {
      const rm = rawMap[m.productId] || {};
      return {
        ...m,
        uom: m.uom || rm.uom || null,
        mrp: m.mrp !== undefined && m.mrp !== 0 ? m.mrp : (rm.mrp !== undefined ? rm.mrp : 0),
        landingPrice: m.landingPrice !== undefined && m.landingPrice !== 0 ? m.landingPrice : (rm.landingPrice !== undefined ? rm.landingPrice : 0),
        quantity: m.quantity !== undefined && m.quantity !== 1 ? m.quantity : (rm.quantity !== undefined ? rm.quantity : 1)
      };
    });

    return successResponse(res, 200, enrichedMappings, 'Vendor mappings fetched');
  } catch (error) {
    logger.error(`getVendorMappings error: ${error.message}`);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

// Update Vendor Mappings
export const updateVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return errorResponse(res, 400, 'Mappings must be an array');
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, storeId: true }
    });
    if (!vendor) {
      return errorResponse(res, 404, 'Vendor not found');
    }

    const targetStoreId = await resolveWriteStoreId(vendor.storeId || req.user?.storeId || req.user?.warehouseId);

    // Filter out items missing a valid string productId
    const validMappings = mappings.filter(m => m && typeof m.productId === 'string' && m.productId.trim() !== '');

    await prisma.$transaction(async (tx) => {
      // Find which product IDs actually exist in Product or ProductVariant table
      const requestedProductIds = [...new Set(validMappings.map(m => m.productId))];
      
      const existingProducts = requestedProductIds.length > 0 
        ? await tx.product.findMany({
            where: { id: { in: requestedProductIds } },
            select: { id: true }
          })
        : [];
      
      const validProductIds = new Set(existingProducts.map(p => p.id));
      const missingProductIds = requestedProductIds.filter(id => !validProductIds.has(id));

      const variantToParentMap = {};
      if (missingProductIds.length > 0) {
        const existingVariants = await tx.productVariant.findMany({
          where: { id: { in: missingProductIds } },
          select: { id: true, productId: true }
        });
        existingVariants.forEach(v => {
          if (v.productId) {
            variantToParentMap[v.id] = v.productId;
            validProductIds.add(v.productId);
          }
        });
      }

      // Remap any variant IDs in incoming mappings to their parent Product IDs
      const normalizedMappings = validMappings.map(m => {
        if (variantToParentMap[m.productId]) {
          return { ...m, productId: variantToParentMap[m.productId] };
        }
        return m;
      });

      // Filter to mappings whose productId exists in Product table and deduplicate
      const rawExecutable = normalizedMappings.filter(m => validProductIds.has(m.productId));
      const executableMappings = [];
      const seenProductIds = new Set();
      for (const m of [...rawExecutable].reverse()) {
        if (!seenProductIds.has(m.productId)) {
          seenProductIds.add(m.productId);
          executableMappings.unshift(m);
        }
      }

      if (executableMappings.length < validMappings.length) {
        const missingIds = requestedProductIds.filter(id => !validProductIds.has(id) && !variantToParentMap[id]);
        if (missingIds.length > 0) {
          logger.warn(`updateVendorMappings: Skipping ${missingIds.length} mappings with non-existent product IDs: ${missingIds.join(', ')}`);
        }
      }

      // Get current mappings to find what to delete
      const currentMappings = await tx.vendorItemMapping.findMany({
        where: { vendorId },
        select: { id: true, productId: true, purchasePrice: true }
      });

      const newProductIds = executableMappings.map(m => m.productId);

      const toDelete = currentMappings.filter(m => !newProductIds.includes(m.productId));
      const toDeleteIds = toDelete.map(m => m.id);

      // Delete history for mappings that are being completely removed
      if (toDeleteIds.length > 0) {
        await tx.vendorPriceHistory.deleteMany({
          where: { mappingId: { in: toDeleteIds } }
        });
        await tx.vendorItemMapping.deleteMany({
          where: { id: { in: toDeleteIds } }
        });
      }

      // Upsert mappings and log history if price changed
      for (const m of executableMappings) {
        const existing = currentMappings.find(cm => cm.productId === m.productId);
        const safeMoq = Math.round(Number(m.moq) || 1);
        const safeLeadTime = Math.round(Number(m.leadTime) || 0);
        const safePurchasePrice = Number(m.purchasePrice) || 0;
        const safeTaxPercent = Number(m.taxPercent) || 0;
        
        const safeUom = m.uom || null;
        const safeMrp = Number(m.mrp) || 0;
        const safeLandingPrice = Number(m.landingPrice) || 0;
        const safeQuantity = Math.round(Number(m.quantity) || 1);

        let upserted;
        if (existing) {
          upserted = await tx.vendorItemMapping.update({
            where: { id: existing.id },
            data: {
              vendorSku: m.vendorSku || null,
              purchasePrice: safePurchasePrice,
              moq: safeMoq,
              leadTime: safeLeadTime,
              taxPercent: safeTaxPercent,
              isPreferred: Boolean(m.isPreferred),
              lastPurchaseRate: existing.purchasePrice,
              uom: safeUom,
              mrp: safeMrp,
              landingPrice: safeLandingPrice,
              quantity: safeQuantity
            }
          });
        } else {
          upserted = await tx.vendorItemMapping.upsert({
            where: { vendorId_productId: { vendorId, productId: m.productId } },
            update: {
              vendorSku: m.vendorSku || null,
              purchasePrice: safePurchasePrice,
              moq: safeMoq,
              leadTime: safeLeadTime,
              taxPercent: safeTaxPercent,
              isPreferred: Boolean(m.isPreferred),
              lastPurchaseRate: safePurchasePrice,
              uom: safeUom,
              mrp: safeMrp,
              landingPrice: safeLandingPrice,
              quantity: safeQuantity
            },
            create: {
              vendorId,
              productId: m.productId,
              vendorSku: m.vendorSku || null,
              purchasePrice: safePurchasePrice,
              moq: safeMoq,
              leadTime: safeLeadTime,
              taxPercent: safeTaxPercent,
              isPreferred: Boolean(m.isPreferred),
              lastPurchaseRate: safePurchasePrice,
              storeId: targetStoreId || null,
              uom: safeUom,
              mrp: safeMrp,
              landingPrice: safeLandingPrice,
              quantity: safeQuantity
            }
          });
        }

        // If price changed, log it
        if (existing && existing.purchasePrice !== safePurchasePrice) {
          await tx.vendorPriceHistory.create({
            data: {
              mappingId: upserted.id,
              oldPrice: existing.purchasePrice,
              newPrice: safePurchasePrice
            }
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 60000
    });

    return successResponse(res, 200, null, 'Vendor mappings updated successfully');
  } catch (error) {
    console.error('❌ updateVendorMappings Error details:', error);
    logger.error(`updateVendorMappings error: ${error.message}`);
    return errorResponse(res, 500, error.message || 'Internal Server Error');
  }
};
