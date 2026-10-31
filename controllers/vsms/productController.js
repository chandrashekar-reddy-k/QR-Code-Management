import { prisma } from '../../config/prismaClient.js';
import { logActivity } from '../utils/activityLogger.js';
import { PriceResolverService } from '../../services/priceResolverService.js';

// Helper to map DB unit UUIDs to human-readable names for frontend cards
const mapProductUnits = (product, unitMap) => {
    if (!product) return product;
    const unitRecord = unitMap.get(product.unit);
    return {
        ...product,
        unitValue: product.measurement || '',
        unit: {
            name: unitRecord ? unitRecord.name : (product.unit || 'Piece'),
            type: unitRecord ? (unitRecord.shortCode || unitRecord.name) : (product.unitType || 'pcs')
        }
    };
};

// @desc    Get all products or search by keyword
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        let { search, categoryId, warehouseId, vehicleId, storeId } = req.query;

        // Sanitize inputs
        search = typeof search === 'string' ? search.trim() : null;
        categoryId = typeof categoryId === 'string' ? categoryId.trim() : null;
        warehouseId = typeof warehouseId === 'string' ? warehouseId.trim() : null;
        vehicleId = typeof vehicleId === 'string' ? vehicleId.trim() : null;
        storeId = typeof storeId === 'string' ? storeId.trim() : null;

        const showAll = req.query.showAll === 'true';

        const isAgent = ['SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'SUPERVISOR', 'HELPER'].includes(req.user?.role);
        if (isAgent && !showAll) {
            vehicleId = vehicleId || req.user.assignedVehicleId;
        }

        console.log(`[getProducts] Request from ${req.user?.name} (Role: ${req.user?.role}):`, JSON.stringify({ search, categoryId, warehouseId, vehicleId }));

        const query = {
            where: {
                isActive: true,
                status: 'APPROVED',
            },

            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true,
                channelInventories: true,
                unifiedInventory: true, // warehouse stock
                vehicleStocks: true,    // vehicle stock
            },
        };

        if (search) {
            query.where.AND = [
                ...(query.where.AND || []),
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { sku: { contains: search, mode: 'insensitive' } },
                        { barcode: { contains: search, mode: 'insensitive' } },
                        {
                            variants: {
                                some: {
                                    OR: [
                                        { gtin: { contains: search, mode: 'insensitive' } },
                                        { sku: { contains: search, mode: 'insensitive' } },
                                        { variantName: { contains: search, mode: 'insensitive' } }
                                    ]
                                }
                            }
                        }
                    ]
                }
            ];
        }

        if (categoryId && categoryId !== 'all') {
            query.where.categoryId = categoryId;
        }

        if (storeId && storeId !== 'all') {
            query.where.storeId = storeId;
        }

        // Filter by Warehouse
        if (warehouseId) {
            query.where.unifiedInventory = { 
                some: { warehouseId, quantity: { gt: 0 } } 
            };
            // Override the include to only show this specific warehouse if requested
            query.include.unifiedInventory = {
                where: { warehouseId }
            };
        }

        // Include vehicle stock relation for requested vehicle
        if (vehicleId) {
            query.include.vehicleStocks = {
                where: { vehicleId }
            };
            if (!showAll) {
                // Must be active and must have stock on this vehicle
                query.where.isActive = true;
                query.where.vehicleStocks = { some: { vehicleId, quantity: { gt: 0 } } };
            }
        }

        const rawProducts = await prisma.product.findMany(query);
        const products = rawProducts.filter(p => {
            if (p.isActive === false) return false;
            const vehicleInv = p.channelInventories?.find(ci => ci.channel === 'VEHICLE');
            if (vehicleInv && vehicleInv.isActive === false) return false;
            return true;
        });
        const resolvedProducts = await Promise.all(products.map(async (p) => {
            const vehicleInv = p.channelInventories?.find(ci => ci.channel === 'VEHICLE');
            const resolved = await PriceResolverService.resolvePrice({ productId: p.id, channel: 'VEHICLE', partnerId: req.user?.id });
            const resolvedPrice = (vehicleInv?.channelPrice != null && Number(vehicleInv.channelPrice) > 0)
                ? Number(vehicleInv.channelPrice)
                : (resolved?.sellingPrice ?? p.finalPrice ?? p.price);

            const mappedVariants = p.variants ? await Promise.all(p.variants.map(async (v) => {
                const vResolved = await PriceResolverService.resolvePrice({ productId: p.id, productVariantId: v.id, channel: 'VEHICLE', partnerId: req.user?.id });
                return {
                    ...v,
                    name: v.variantName || v.name,
                    price: vResolved?.sellingPrice ?? v.sellingPrice ?? v.finalPrice ?? v.price,
                    sellingPrice: vResolved?.sellingPrice ?? v.sellingPrice ?? v.finalPrice ?? v.price,
                    mrp: vResolved?.mrp ?? v.mrp
                };
            })) : [];

            return {
                ...p,
                price: resolvedPrice,
                sellingPrice: resolvedPrice,
                vsmPrice: resolvedPrice,
                variants: mappedVariants
            };
        }));
        console.log(`[getProducts] Found ${resolvedProducts.length} products. Source: ${vehicleId ? 'Vehicle' : (warehouseId ? 'Warehouse' : 'General')}`);
        
        const units = await prisma.unit.findMany();
        const unitMap = new Map(units.map(u => [u.id, u]));

        // Flatten stock info for easier frontend consumption
        const result = resolvedProducts.map(p => {
            const warehouseQty = p.unifiedInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
            const vehicleQty = p.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
            const totalQty = warehouseQty + vehicleQty;

            const mappedProduct = mapProductUnits(p, unitMap);

            const vStockObj = p.vehicleStocks?.find(vs => vs.vehicleId === vehicleId) || p.vehicleStocks?.[0];
            const currentStock = vehicleId
                ? (vStockObj ? vStockObj.quantity : 0)
                : (warehouseId ? (p.unifiedInventory?.[0]?.quantity || 0) : (warehouseQty > 0 ? warehouseQty : (p.stock ?? 0)));

            return {
                ...mappedProduct,
                warehouseStock: warehouseQty,
                vehicleStock: vehicleQty,
                posStock: 0,
                totalStock: totalQty,
                stock: currentStock
            };
        });

        if (req.query.groupBy === 'category' || req.query.view === 'categories') {
            const categoryMap = new Map();
            for (const p of result) {
                const cat = p.category;
                if (!cat || !cat.id || cat.isActive === false) continue;
                const subCat = (p.subCategory && p.subCategory.id && p.subCategory.isActive !== false) ? p.subCategory : null;

                if (!categoryMap.has(cat.id)) {
                    categoryMap.set(cat.id, {
                        id: cat.id,
                        name: cat.name,
                        image: cat.image || null,
                        productCount: 0,
                        subCategoriesMap: new Map(),
                        products: []
                    });
                }
                const catEntry = categoryMap.get(cat.id);
                catEntry.productCount += 1;
                catEntry.products.push(p);

                if (subCat) {
                    if (!catEntry.subCategoriesMap.has(subCat.id)) {
                        catEntry.subCategoriesMap.set(subCat.id, {
                            id: subCat.id,
                            name: subCat.name,
                            image: subCat.image || null,
                            productCount: 0,
                            products: []
                        });
                    }
                    const subEntry = catEntry.subCategoriesMap.get(subCat.id);
                    subEntry.productCount += 1;
                    subEntry.products.push(p);
                }
            }

            const categories = Array.from(categoryMap.values())
                .filter(cat => cat.productCount > 0 && cat.products.length > 0)
                .map(cat => {
                    const subCategories = Array.from(cat.subCategoriesMap.values())
                        .filter(sub => sub.productCount > 0 && sub.products.length > 0)
                        .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));

                    return {
                        id: cat.id,
                        name: cat.name,
                        image: cat.image || null,
                        productCount: cat.productCount,
                        subCategories,
                        products: cat.products
                    };
                })
                .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));

            return res.json(categories);
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Get vehicle products grouped by categories (strictly suppresses empty categories & subcategories)
// @route   GET /api/products/categories
// @access  Private
export const getVehicleCategories = async (req, res, next) => {
    try {
        req.query.groupBy = 'category';
        return getProducts(req, res, next);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                category: true,
                subCategory: true,
                brand: true,
                variants: true
            },
        });

        if (product) {
            const resolved = await PriceResolverService.resolvePrice({ productId: product.id, channel: 'VEHICLE', partnerId: req.user?.id });
            const resolvedProduct = { ...product, price: resolved?.sellingPrice ?? product.sellingPrice ?? product.price };
            
            const units = await prisma.unit.findMany();
            const unitMap = new Map(units.map(u => [u.id, u]));
            const mappedProduct = mapProductUnits(resolvedProduct, unitMap);

            res.json(mappedProduct);
        } else {
            res.status(404);
            throw new Error('Product not found');
        }
    } catch (error) {
        next(error);
    }
};

export const requestRefill = async (req, res, next) => {
    try {
        const { vehicleId, items } = req.body; // items: [{ productId, quantity }]

        if (!vehicleId || !items || items.length === 0) {
            return res.status(400).json({ message: 'Missing vehicle ID or items' });
        }

        const refillRequest = await prisma.refillRequest.create({
            data: {
                tenantId: req.user.tenantId,
                storeId: req.user.storeId,
                vehicleId,
                userId: req.user.id,
                items: {
                    create: items.map(i => ({
                        tenantId: req.user.tenantId,
                        productId: i.productId,
                        quantity: parseInt(i.quantity, 10)
                    }))
                }
            }
        });

        logActivity({
            userId: req.user.id,
            tenantId: req.user.tenantId,
            storeId: req.user.storeId,
            action: 'REFILL_REQUESTED',
            details: `Requested refill for ${items.length} items for vehicle ${vehicleId}`,
            metadata: { 
                vehicleId, 
                itemCount: items.length, 
                refillRequestId: refillRequest.id 
            }
        });

        res.status(201).json({ message: 'Refill requested successfully', refillRequest });
    } catch (error) {
        next(error);
    }
};

export const getVehicleAuditHistory = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;

        if (!vehicleId || vehicleId === 'undefined' || vehicleId === 'null') {
            return res.json([]);
        }

        const audits = await prisma.stockAudit.findMany({
            where: {
                vehicleId,
                tenantId: req.user.tenantId
            },
            include: {
                user: { select: { name: true } },
                items: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add "type" to audits for frontend labeling
        const formattedAudits = audits.map(a => ({
            ...a,
            type: 'AUDIT'
        }));

        // Fetch transactions (LOAD and REFILL)
        const transactions = await prisma.stockTransaction.findMany({
            where: {
                vehicleId,
                tenantId: req.user.tenantId,
                type: { in: ['LOAD', 'REFILL'] }
            },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        const allProductIds = [...new Set(transactions.map(t => t.productId).filter(Boolean))];
        const products = allProductIds.length > 0
            ? await prisma.product.findMany({
                where: { id: { in: allProductIds } },
                include: { category: true }
              })
            : [];
        const productMap = Object.fromEntries(products.map(p => [p.id, p]));

        const processedTransactions = transactions.map(t => ({
            ...t,
            product: productMap[t.productId] || null
        }));

        // Group transactions by type and time (5 min window)
        const groupedTransactions = [];
        processedTransactions.forEach(tx => {
            const lastGroup = groupedTransactions[groupedTransactions.length - 1];
            const txDate = new Date(tx.date);
            
            if (lastGroup && 
                lastGroup.type === tx.type && 
                Math.abs(new Date(lastGroup.createdAt) - txDate) < 5 * 60 * 1000) {
                
                lastGroup.items.push({
                    id: tx.id,
                    productId: tx.productId,
                    product: tx.product,
                    newQuantity: tx.quantity,
                    oldQuantity: 0 // For transactions, we just show what was added
                });
            } else {
                groupedTransactions.push({
                    id: `tx-group-${tx.id}`,
                    type: tx.type,
                    createdAt: tx.date,
                    user: tx.user,
                    remark: tx.type === 'LOAD' ? 'Morning Stock Loading' : 'Stock Refill Approval',
                    items: [{
                        id: tx.id,
                        productId: tx.productId,
                        product: tx.product,
                        newQuantity: tx.quantity,
                        oldQuantity: 0
                    }]
                });
            }
        });

        // Unify and sort
        const combined = [...formattedAudits, ...groupedTransactions].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json(combined);
    } catch (error) {
        next(error);
    }
};
