import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';

// ─── CREATE VENDOR ─────────────────────────────────────
export const createVendor = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { 
      vendorName, mobile, email, address, gstNumber, contactPerson, creditDays, openingBalance,
      paymentTerms, creditLimit, bankName, accountNumber, ifscCode, bankBranch, vendorCategory, minOrderQty, isTaxable
    } = req.body;

    if (!vendorName || !mobile) {
      return res.status(400).json({ message: 'Vendor name and mobile are required' });
    }

    // Check unique mobile within tenant
    const existing = await prisma.vendor.findFirst({ where: { tenantId, mobile } });
    if (existing) {
      return res.status(409).json({ message: 'A vendor with this mobile number already exists' });
    }

    // TAXABLE VENDORS VALIDATION: GST is mandatory for taxable vendors
    const isTax = isTaxable === true || isTaxable === 'true';
    if (isTax && (!gstNumber || !gstNumber.trim())) {
      return res.status(400).json({ message: 'GST Identification Number is mandatory for taxable vendors' });
    }

    // DUPLICATE GST VALIDATION: Check unique GST Number within tenant
    if (gstNumber && gstNumber.trim()) {
      const existingGst = await prisma.vendor.findFirst({
        where: { tenantId, gstNumber: gstNumber.trim() }
      });
      if (existingGst) {
        return res.status(409).json({ message: 'A vendor with this GST Identification Number already exists' });
      }
    }

    // Resolve storeId: Vendor.storeId is a FK to Store.id (NOT Warehouse.id)
    // req.user.storeId is set from the user's warehouseId, so we must verify it
    // actually exists in the Store table before using it.
    let storeId = req.body.storeId || null;
    if (!storeId) {
      const userStoreId = req.user.storeId || req.user.warehouseId || null;
      if (userStoreId) {
        // Check if userStoreId is a valid Store.id
        const storeExists = await prisma.store.findUnique({ where: { id: userStoreId } });
        if (storeExists) {
          storeId = userStoreId;
        } else {
          // It might be a warehouseId — look up Store by warehouseId
          const storeByWarehouse = await prisma.store.findFirst({ where: { warehouseId: userStoreId } });
          if (storeByWarehouse) {
            storeId = storeByWarehouse.id;
          } else {
            // Last resort: find the Store linked to the req user directly
            const storeByUser = await prisma.store.findFirst({ where: { userId: req.user.id } });
            storeId = storeByUser?.id || null;
          }
        }
      }
    }

    const openBal = parseFloat(openingBalance) || 0;

    const displayId = await generateId({
      entity: 'VND',
      tenantId,
      storeId
    });

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        storeId,
        displayId,
        vendorName,
        mobile,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        contactPerson: contactPerson || null,
        creditDays: parseInt(creditDays) || 30,
        openingBalance: openBal,
        currentBalance: openBal,
        paymentTerms: paymentTerms || null,
        creditLimit: parseFloat(creditLimit) || 0,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        bankBranch: bankBranch || null,
        vendorCategory: vendorCategory || null,
        minOrderQty: parseInt(minOrderQty) || 1,
        isTaxable: isTax,
        approvalStatus: 'PENDING'
      }
    });

    // If opening balance exists, create ledger entry
    if (openBal > 0) {
      await prisma.vendorLedger.create({
        data: {
          tenantId,
          storeId,
          vendorId: vendor.id,
          type: 'OPENING_BALANCE',
          debit: openBal,
          balance: openBal,
          description: 'Opening Balance'
        }
      });
    }

    res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
    console.error('❌ Create Vendor Error:', error);
    res.status(500).json({ message: 'Error creating vendor', error: error.message });
  }
};

// ─── UPDATE VENDOR ─────────────────────────────────────
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vendorName, mobile, email, address, gstNumber, contactPerson, creditDays,
      paymentTerms, creditLimit, bankName, accountNumber, ifscCode, bankBranch, vendorCategory, minOrderQty, isTaxable
    } = req.body;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check unique mobile if changed
    if (mobile && mobile !== vendor.mobile) {
      const existing = await prisma.vendor.findFirst({
        where: { tenantId: vendor.tenantId, mobile, id: { not: id } }
      });
      if (existing) {
        return res.status(409).json({ message: 'Another vendor with this mobile already exists' });
      }
    }

    // TAXABLE VENDORS VALIDATION: GST is mandatory for taxable vendors
    const isTax = isTaxable !== undefined ? (isTaxable === true || isTaxable === 'true') : vendor.isTaxable;
    const targetGst = gstNumber !== undefined ? gstNumber : vendor.gstNumber;
    if (isTax && (!targetGst || !targetGst.trim())) {
      return res.status(400).json({ message: 'GST Identification Number is mandatory for taxable vendors' });
    }

    // DUPLICATE GST VALIDATION: Check unique GST Number within tenant
    if (gstNumber && gstNumber !== vendor.gstNumber) {
      const existingGst = await prisma.vendor.findFirst({
        where: { tenantId: vendor.tenantId, gstNumber: gstNumber.trim(), id: { not: id } }
      });
      if (existingGst) {
        return res.status(409).json({ message: 'Another vendor with this GST Identification Number already exists' });
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        vendorName: vendorName || undefined,
        mobile: mobile || undefined,
        email: email !== undefined ? email : undefined,
        address: address !== undefined ? address : undefined,
        gstNumber: gstNumber !== undefined ? gstNumber : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson : undefined,
        creditDays: creditDays !== undefined ? parseInt(creditDays) : undefined,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
        bankName: bankName !== undefined ? bankName : undefined,
        accountNumber: accountNumber !== undefined ? accountNumber : undefined,
        ifscCode: ifscCode !== undefined ? ifscCode : undefined,
        bankBranch: bankBranch !== undefined ? bankBranch : undefined,
        vendorCategory: vendorCategory !== undefined ? vendorCategory : undefined,
        minOrderQty: minOrderQty !== undefined ? parseInt(minOrderQty) : undefined,
        isTaxable: isTaxable !== undefined ? isTax : undefined
      }
    });

    res.json({ message: 'Vendor updated successfully', vendor: updated });
  } catch (error) {
    console.error('❌ Update Vendor Error:', error);
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
};

// ─── DEACTIVATE / REACTIVATE VENDOR ─────────────────────────────────────
export const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const newStatus = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.vendor.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({ message: `Vendor ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`, vendor: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling vendor status', error: error.message });
  }
};

// ─── GET VENDORS ─────────────────────────────────────
export const getVendors = async (req, res) => {
  try {
    const { status, storeId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (status) where.status = status;
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            purchaseInvoices: true,
            payments: true
          }
        }
      }
    });

    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
};

// ─── GET VENDOR LEDGER ─────────────────────────────────────
export const getVendorLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const ledger = await prisma.vendorLedger.findMany({
      where: { vendorId: id },
      orderBy: { date: 'desc' }
    });

    res.json({ vendor, ledger });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor ledger', error: error.message });
  }
};

// ─── VENDOR ITEM MAPPINGS ─────────────────────────────────────
export const getVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        product: {
          include: {
            variants: true
          }
        },
        priceHistory: {
          orderBy: { changedAt: 'desc' }
        }
      }
    });

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

    res.json(enrichedMappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor mappings', error: error.message });
  }
};

export const updateVendorMappings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { mappings: incomingMappings } = req.body; // Array of detailed mapping objects
    const tenantId = req.user?.tenantId || getTenantId();
    const storeId = req.body.storeId || req.user.storeId || null;

    if (!Array.isArray(incomingMappings)) {
      return res.status(400).json({ message: 'mappings must be an array' });
    }

    const validIncomingMappings = incomingMappings.filter(m => m && typeof m.productId === 'string' && m.productId.trim() !== '');

    // Execute all mapping, history, and preferred vendor resets in a transaction
    await prisma.$transaction(async (tx) => {
      const requestedProductIds = [...new Set(validIncomingMappings.map(m => m.productId))];

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

      const normalizedMappings = validIncomingMappings.map(m => {
        if (variantToParentMap[m.productId]) {
          return { ...m, productId: variantToParentMap[m.productId] };
        }
        return m;
      });

      const rawExecutable = normalizedMappings.filter(m => validProductIds.has(m.productId));
      const executableMappings = [];
      const seenProductIds = new Set();
      for (const m of [...rawExecutable].reverse()) {
        if (!seenProductIds.has(m.productId)) {
          seenProductIds.add(m.productId);
          executableMappings.unshift(m);
        }
      }

      // 1. Get all current mappings for this vendor
      const currentMappings = await tx.vendorItemMapping.findMany({
        where: { vendorId }
      });

      const incomingProductIds = executableMappings.map(m => m.productId);

      // 2. Identify mappings to delete (not in incoming array)
      const toDelete = currentMappings.filter(
        (cm) => !incomingProductIds.includes(cm.productId)
      );

      if (toDelete.length > 0) {
        await tx.vendorItemMapping.deleteMany({
          where: {
            id: { in: toDelete.map((d) => d.id) }
          }
        });
      }

      // 3. Process each incoming mapping (create or update)
      for (const map of executableMappings) {
        const existing = currentMappings.find((cm) => cm.productId === map.productId);
        const purchasePrice = parseFloat(map.purchasePrice) || 0;
        const moq = parseInt(map.moq) || 1;
        const leadTime = parseInt(map.leadTime) || 0;
        const taxPercent = parseFloat(map.taxPercent) || 0;
        const isPreferred = !!map.isPreferred;

        let mappingRecord;

        if (existing) {
          // Check if price changed to record history
          if (existing.purchasePrice !== purchasePrice) {
            await tx.vendorPriceHistory.create({
              data: {
                tenantId,
                mappingId: existing.id,
                oldPrice: existing.purchasePrice,
                newPrice: purchasePrice
              }
            });
          }

          mappingRecord = await tx.vendorItemMapping.update({
            where: { id: existing.id },
            data: {
              vendorSku: map.vendorSku || null,
              purchasePrice,
              moq,
              leadTime,
              taxPercent,
              isPreferred,
              uom: map.uom || null,
              mrp: Number(map.mrp) || 0,
              landingPrice: Number(map.landingPrice) || 0,
              quantity: Math.round(Number(map.quantity) || 1)
            }
          });
        } else {
          // Create new mapping
          mappingRecord = await tx.vendorItemMapping.create({
            data: {
              tenantId,
              storeId,
              vendorId,
              productId: map.productId,
              vendorSku: map.vendorSku || null,
              purchasePrice,
              moq,
              leadTime,
              taxPercent,
              isPreferred,
              uom: map.uom || null,
              mrp: Number(map.mrp) || 0,
              landingPrice: Number(map.landingPrice) || 0,
              quantity: Math.round(Number(map.quantity) || 1)
            }
          });

          // Insert initial price history
          await tx.vendorPriceHistory.create({
            data: {
              tenantId,
              mappingId: mappingRecord.id,
              oldPrice: 0,
              newPrice: purchasePrice
            }
          });
        }

        // CONTROL: Enforce "One preferred vendor per item"
        if (isPreferred) {
          await tx.vendorItemMapping.updateMany({
            where: {
              productId: map.productId,
              vendorId: { not: vendorId },
              tenantId
            },
            data: { isPreferred: false }
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 60000
    });

    // Return the updated mappings list
    const mappings = await prisma.vendorItemMapping.findMany({
      where: { vendorId },
      include: {
        product: { select: { id: true, name: true, price: true, purchasePrice: true } },
        priceHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    res.json({ message: 'Vendor item mappings updated successfully', mappings });
  } catch (error) {
    console.error('❌ Update Vendor Mappings Error:', error);
    res.status(500).json({ message: 'Error updating vendor mappings', error: error.message });
  }
};
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            purchaseInvoices: true,
            payments: true
          }
        }
      }
    });

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check for transaction history
    if (vendor._count.purchaseOrders > 0 || vendor._count.purchaseInvoices > 0 || vendor._count.payments > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete vendor with transaction history. Please deactivate them instead.' 
      });
    }

    await prisma.$transaction([
      prisma.vendorItemMapping.deleteMany({ where: { vendorId: id } }),
      prisma.vendorLedger.deleteMany({ where: { vendorId: id } }),
      prisma.vendor.delete({ where: { id } })
    ]);

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Vendor Error:', error);
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};

// ─── ADMIN VENDOR APPROVAL WORKFLOW ─────────────────────────────────────
export const updateVendorApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status value' });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const updated = await prisma.vendor.update({
      where: { id },
      data: { approvalStatus }
    });

    res.json({ message: `Vendor approval status set to ${approvalStatus} successfully`, vendor: updated });
  } catch (error) {
    console.error('❌ Update Vendor Approval Status Error:', error);
    res.status(500).json({ message: 'Error updating vendor approval status', error: error.message });
  }
};
