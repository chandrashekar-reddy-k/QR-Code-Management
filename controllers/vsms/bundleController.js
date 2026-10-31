import { prisma } from '../../config/prismaClient.js';
import { randomUUID } from 'crypto';

// DB columns that ACTUALLY exist in the Bundle table:
// id, name, description, isActive, createdAt, updatedAt, bundlePrice, image, mrp, status, warehouseId
// Columns that DON'T exist yet (schema ahead of DB):
// approvalStatus, rejectionReason, startDate, endDate

/**
 * Format bundle to include virtual/legacy aliases expected by all frontend components
 */
const formatBundleResponse = (bundle) => {
  if (!bundle) return null;
  // Derive approvalStatus from the actual DB `status` column
  // (approvalStatus column doesn't exist in DB yet)
  const dbStatus = bundle.status || '';
  const computedApprovalStatus =
    dbStatus === 'ACTIVE' ? 'APPROVED' :
    dbStatus === 'REJECTED' ? 'REJECTED' :
    'PENDING';
  return {
    ...bundle,
    price: bundle.price ?? bundle.bundlePrice ?? 0,
    bundlePrice: bundle.bundlePrice ?? bundle.price ?? 0,
    originalPrice: bundle.originalPrice ?? bundle.mrp ?? 0,
    mrp: bundle.mrp ?? bundle.originalPrice ?? 0,
    imageUrl: bundle.imageUrl ?? bundle.image ?? null,
    image: bundle.image ?? bundle.imageUrl ?? null,
    approvalStatus: computedApprovalStatus,
    rejectionReason: bundle.rejectionReason || null,
  };
};

/**
 * List all bundles
 */
export const listBundles = async (req, res, next) => {
  try {
    const isGlobal = 
      req.query?.showAll === 'true' ||
      req.query?.isAdmin === 'true' ||
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) || 
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    const where = {};
    if (!isGlobal) {
      if (req.user?.warehouseId) {
        where.warehouseId = req.user.warehouseId;
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    // Use raw query to avoid issues with columns that may not exist in DB yet
    let whereClause = '1=1';
    const params = [];
    if (where.warehouseId) {
      params.push(where.warehouseId);
      whereClause = `b."warehouseId" = $${params.length}`;
    }

    const bundleRows = await prisma.$queryRawUnsafe(
      `SELECT b.id, b.name, b.description, b."isActive", b."createdAt", b."updatedAt",
              b."bundlePrice", b."mrp", b."image", b."status", b."warehouseId"
       FROM "Bundle" b
       WHERE ${whereClause}
       ORDER BY b."createdAt" DESC`,
      ...params
    );

    // Get all bundle items in one query
    const bundleIds = bundleRows.map(b => b.id);
    let items = [];
    if (bundleIds.length > 0) {
      const placeholders = bundleIds.map((_, i) => `$${i + 1}`).join(', ');
      items = await prisma.$queryRawUnsafe(
        `SELECT bi.id, bi."bundleId", bi."productId", bi.quantity,
                p.id as "p_id", p.name as "p_name", p.price as "p_price", p.mrp as "p_mrp",
                p.images as "p_images", p.unit as "p_unit", p.stock as "p_stock",
                p."isActive" as "p_isActive", p.status as "p_status", p."warehouseId" as "p_warehouseId"
         FROM "BundleItem" bi
         LEFT JOIN "Product" p ON p.id = bi."productId"
         WHERE bi."bundleId" IN (${placeholders})`,
        ...bundleIds
      );
    }

    // Group items by bundleId
    const itemsByBundle = {};
    for (const item of items) {
      if (!itemsByBundle[item.bundleId]) itemsByBundle[item.bundleId] = [];
      itemsByBundle[item.bundleId].push({
        id: item.id,
        bundleId: item.bundleId,
        productId: item.productId,
        quantity: item.quantity,
        product: item.p_id ? {
          id: item.p_id,
          name: item.p_name,
          price: item.p_price,
          mrp: item.p_mrp,
          images: item.p_images || [],
          unit: item.p_unit,
          stock: item.p_stock,
          isActive: item.p_isActive,
          status: item.p_status,
          warehouseId: item.p_warehouseId,
        } : null
      });
    }

    const bundles = bundleRows.map(b => ({
      ...b,
      price: b.bundlePrice,
      originalPrice: b.mrp,
      imageUrl: b.image,
      items: itemsByBundle[b.id] || [],
    }));

    const formattedBundles = bundles.map(formatBundleResponse);

    res.json({ success: true, data: formattedBundles });
  } catch (error) {
    console.error('[listBundles Error]:', error);
    res.status(200).json({ success: true, data: [] });
  }
};

/**
 * Create a new bundle
 */
export const createBundle = async (req, res, next) => {
  try {
    const { name, description, price, bundlePrice, originalPrice, mrp, imageUrl, image, items } = req.body;

    const rawPrice = (price !== undefined && price !== null && price !== '') ? price : bundlePrice;
    const rawOriginalPrice = (originalPrice !== undefined && originalPrice !== null && originalPrice !== '') ? originalPrice : (mrp !== undefined ? mrp : rawPrice);
    const rawImage = imageUrl || image || null;

    if (!name || rawPrice === undefined || rawPrice === null || rawPrice === '' || isNaN(parseFloat(rawPrice)) || !items || !Array.isArray(items)) {
      console.warn('[createBundle 400]: Missing required fields', { name, price: rawPrice, itemsIsArray: Array.isArray(items) });
      return res.status(400).json({ message: 'Name, Price, and at least one item are required.' });
    }

    const validItems = items
      .filter(item => item && (item.productId || item.id))
      .map(item => ({
        productId: item.productId || item.id,
        quantity: Math.max(1, parseInt(item.quantity || 1))
      }));

    if (validItems.length === 0) {
      console.warn('[createBundle 400]: No valid items', { items });
      return res.status(400).json({ message: 'At least one valid product is required.' });
    }

    const isGlobal = 
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) || 
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    let warehouseId = (!isGlobal && req.user?.warehouseId) ? req.user.warehouseId : null;
    if (!isGlobal && !warehouseId && req.user?.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { warehouseId: true } });
      warehouseId = dbUser?.warehouseId || null;
    }

    const parsedPrice = Math.max(0, Math.round(parseFloat(rawPrice)));
    const parsedOriginalPrice = Math.max(0, Math.round(parseFloat(rawOriginalPrice)));

    // Use raw INSERT — DB is missing approvalStatus/rejectionReason/startDate/endDate columns
    const bundleId = randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Bundle" ("id", "name", "description", "bundlePrice", "mrp", "image", "isActive", "createdAt", "updatedAt", "warehouseId", "status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      bundleId,
      name.trim(),
      description ? description.trim() : null,
      parsedPrice,
      parsedOriginalPrice,
      rawImage,
      true,
      now,
      now,
      warehouseId,
      'PENDING'
    );

    // Insert bundle items
    for (const item of validItems) {
      const itemId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "BundleItem" ("id", "bundleId", "productId", "quantity") VALUES ($1, $2, $3, $4)`,
        itemId, bundleId, item.productId, item.quantity
      );
    }

    // Fetch the created bundle with items
    const [createdBundle] = await prisma.$queryRawUnsafe(
      `SELECT id, name, description, "isActive", "createdAt", "updatedAt", "bundlePrice", "mrp", "image", "status", "warehouseId"
       FROM "Bundle" WHERE id = $1`,
      bundleId
    );

    const itemRows = await prisma.$queryRawUnsafe(
      `SELECT bi.id, bi."bundleId", bi."productId", bi.quantity,
              p.id as "p_id", p.name as "p_name", p.price as "p_price", p.mrp as "p_mrp",
              p.images as "p_images", p.unit as "p_unit", p.stock as "p_stock",
              p."isActive" as "p_isActive", p.status as "p_status", p."warehouseId" as "p_warehouseId"
       FROM "BundleItem" bi
       LEFT JOIN "Product" p ON p.id = bi."productId"
       WHERE bi."bundleId" = $1`,
      bundleId
    );

    const newBundle = {
      ...createdBundle,
      price: createdBundle.bundlePrice,
      originalPrice: createdBundle.mrp,
      imageUrl: createdBundle.image,
      items: itemRows.map(item => ({
        id: item.id,
        bundleId: item.bundleId,
        productId: item.productId,
        quantity: item.quantity,
        product: item.p_id ? {
          id: item.p_id,
          name: item.p_name,
          price: item.p_price,
          mrp: item.p_mrp,
          images: item.p_images || [],
          unit: item.p_unit,
          stock: item.p_stock,
          isActive: item.p_isActive,
          status: item.p_status,
          warehouseId: item.p_warehouseId,
        } : null
      }))
    };

    const formattedBundle = formatBundleResponse(newBundle);

    res.status(201).json({ 
      success: true, 
      message: 'Bundle created successfully. Submitted for Admin Approval.', 
      data: formattedBundle 
    });
  } catch (error) {
    console.error('[createBundle Error]:', error);
    next(error);
  }
};

/**
 * Update an existing bundle
 */
export const updateBundle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, bundlePrice, originalPrice, mrp, imageUrl, image, isActive, approvalStatus, status, items } = req.body;

    // Check if bundle exists using raw query
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Bundle" WHERE id = $1`, id
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Bundle not found.' });
    }

    // Build SET clause dynamically with only existing DB columns
    const setClauses = [];
    const params = [];

    if (name !== undefined) {
      params.push(name.trim());
      setClauses.push(`"name" = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description ? description.trim() : null);
      setClauses.push(`"description" = $${params.length}`);
    }

    const rawPrice = price !== undefined ? price : bundlePrice;
    if (rawPrice !== undefined && !isNaN(parseFloat(rawPrice))) {
      params.push(Math.max(0, Math.round(parseFloat(rawPrice))));
      setClauses.push(`"bundlePrice" = $${params.length}`);
    }

    const rawOriginalPrice = originalPrice !== undefined ? originalPrice : mrp;
    if (rawOriginalPrice !== undefined && !isNaN(parseFloat(rawOriginalPrice))) {
      params.push(Math.max(0, Math.round(parseFloat(rawOriginalPrice))));
      setClauses.push(`"mrp" = $${params.length}`);
    }

    const rawImage = imageUrl !== undefined ? imageUrl : image;
    if (rawImage !== undefined) {
      params.push(rawImage);
      setClauses.push(`"image" = $${params.length}`);
    }

    if (isActive !== undefined) {
      params.push(isActive);
      setClauses.push(`"isActive" = $${params.length}`);
    }

    const targetStatus = status || (approvalStatus === 'APPROVED' ? 'ACTIVE' : (approvalStatus === 'REJECTED' ? 'REJECTED' : undefined));
    if (targetStatus !== undefined) {
      params.push(targetStatus);
      setClauses.push(`"status" = $${params.length}`);
    }

    // Always update updatedAt
    params.push(new Date());
    setClauses.push(`"updatedAt" = $${params.length}`);

    if (setClauses.length > 1) { // more than just updatedAt
      params.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "Bundle" SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
        ...params
      );
    }

    // Re-create items if provided
    if (items && Array.isArray(items)) {
      const validItems = items
        .filter(item => item && (item.productId || item.id))
        .map(item => ({
          bundleId: id,
          productId: item.productId || item.id,
          quantity: Math.max(1, parseInt(item.quantity || 1))
        }));

      if (validItems.length > 0) {
        await prisma.$executeRawUnsafe(`DELETE FROM "BundleItem" WHERE "bundleId" = $1`, id);
        for (const item of validItems) {
          const itemId = randomUUID();
          await prisma.$executeRawUnsafe(
            `INSERT INTO "BundleItem" ("id", "bundleId", "productId", "quantity") VALUES ($1, $2, $3, $4)`,
            itemId, item.bundleId, item.productId, item.quantity
          );
        }
      }
    }

    // Fetch updated bundle
    const [finalBundleRow] = await prisma.$queryRawUnsafe(
      `SELECT id, name, description, "isActive", "createdAt", "updatedAt", "bundlePrice", "mrp", "image", "status", "warehouseId"
       FROM "Bundle" WHERE id = $1`,
      id
    );

    const itemRows = await prisma.$queryRawUnsafe(
      `SELECT bi.id, bi."bundleId", bi."productId", bi.quantity,
              p.id as "p_id", p.name as "p_name", p.price as "p_price", p.mrp as "p_mrp",
              p.images as "p_images", p.unit as "p_unit", p.stock as "p_stock",
              p."isActive" as "p_isActive", p.status as "p_status", p."warehouseId" as "p_warehouseId"
       FROM "BundleItem" bi
       LEFT JOIN "Product" p ON p.id = bi."productId"
       WHERE bi."bundleId" = $1`,
      id
    );

    const finalBundle = {
      ...finalBundleRow,
      price: finalBundleRow.bundlePrice,
      originalPrice: finalBundleRow.mrp,
      imageUrl: finalBundleRow.image,
      items: itemRows.map(item => ({
        id: item.id,
        bundleId: item.bundleId,
        productId: item.productId,
        quantity: item.quantity,
        product: item.p_id ? {
          id: item.p_id,
          name: item.p_name,
          price: item.p_price,
          mrp: item.p_mrp,
          images: item.p_images || [],
          unit: item.p_unit,
          stock: item.p_stock,
          isActive: item.p_isActive,
          status: item.p_status,
          warehouseId: item.p_warehouseId,
        } : null
      }))
    };

    const formattedBundle = formatBundleResponse(finalBundle);

    res.json({ success: true, message: 'Bundle updated successfully.', data: formattedBundle });
  } catch (error) {
    console.error('[updateBundle Error]:', error);
    next(error);
  }
};

/**
 * Delete a bundle
 */
export const deleteBundle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.$queryRawUnsafe(`SELECT id FROM "Bundle" WHERE id = $1`, id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Bundle not found.' });
    }

    // Delete items first due to FK constraint
    await prisma.$executeRawUnsafe(`DELETE FROM "BundleItem" WHERE "bundleId" = $1`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM "Bundle" WHERE id = $1`, id);

    res.json({ success: true, message: 'Bundle deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
