import { prisma } from '../../config/prismaClient.js';
import { fetchPlanForVehicle, getCoverageType } from './agentRouteController.js';
import { sendNotification } from '../../services/notificationService.js';
import { InventoryCache } from '../../utils/cacheHelper.js';
import { updateDailyPerformance } from '../../services/vgeAggregationService.js';
import { recalculateDailySummary } from './cashController.js';
import { format } from 'date-fns';
import logger from '../../utils/logger.js';
import { PriceResolverService } from '../../services/priceResolverService.js';
import { createIdentityUser } from '../../utils/identityService.js';

const logActivity = (details) => logger.info(JSON.stringify(details));

const generateId = async ({ entity }) => {
    return `${entity}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

// @desc    Create order from cart
// @route   POST /api/orders/create-from-cart
// @access  Private
export const createOrderFromCart = async (req, res, next) => {
    try {
        const { mobile, customerName, items, customerId, deliverySlot, deliveryDate, lat, lon, couponCode, storeId, terminalId, vehicleId: bodyVehicleId } = req.body;
        const agentId = req.user.id;
        const tenantId = req.user.tenantId || 'VK001';

        const cleanMobile = typeof mobile === 'string' ? mobile.trim() : (mobile ? String(mobile) : '');
        let resolvedCustomerId = customerId || null;
        let resolvedConsumerId = null;

        // ── Resolve or create Customer in Customer table AND User table (role: CONSUMER) ──
        if (cleanMobile) {
            const customerDisplayName = customerName?.trim() || `Customer ${cleanMobile}`;

            // 1. Resolve or create in User table (role: CONSUMER)
            try {
                let consumerUser = await prisma.user.findFirst({
                    where: { phone: cleanMobile }
                });

                if (!consumerUser) {
                    let identityUserId = null;
                    try {
                        const identityRes = await createIdentityUser({
                            name: customerDisplayName,
                            phone: cleanMobile,
                            role: 'CONSUMER'
                        });
                        if (identityRes?.id) identityUserId = identityRes.id;
                    } catch (idErr) {
                        logger.warn(`[OrderController] Identity user creation warning for ${cleanMobile}: ${idErr.message}`);
                    }

                    consumerUser = await prisma.user.create({
                        data: {
                            ...(identityUserId ? { id: identityUserId } : {}),
                            phone: cleanMobile,
                            name: customerDisplayName,
                            role: 'CONSUMER',
                            isActive: true,
                            isVerified: true
                        }
                    });
                } else if (customerName?.trim() && (!consumerUser.name || consumerUser.name.startsWith('Customer '))) {
                    consumerUser = await prisma.user.update({
                        where: { id: consumerUser.id },
                        data: { name: customerDisplayName }
                    }).catch(() => consumerUser);
                }

                if (consumerUser) {
                    resolvedConsumerId = consumerUser.id;
                }
            } catch (userErr) {
                logger.error(`[OrderController] Error resolving/creating consumer User for ${cleanMobile}:`, userErr);
            }

            // 2. Resolve or create in Customer table (CRM / Store scope)
            if (!resolvedCustomerId) {
                let cust = await prisma.customer.findFirst({ 
                    where: { 
                        tenantId,
                        mobile: cleanMobile
                    } 
                });
                if (cust) {
                    if (customerName?.trim() && (!cust.name || cust.name.startsWith('Customer ') || cust.name !== customerName.trim())) {
                        cust = await prisma.customer.update({
                            where: { id: cust.id },
                            data: { name: customerDisplayName }
                        }).catch(() => cust);
                    }
                } else {
                    const targetStoreId = req.user.warehouseId || req.user.storeId || storeId || null;
                    let validStoreId = null;
                    if (targetStoreId) {
                        const exists = await prisma.warehouse.findUnique({ where: { id: targetStoreId } });
                        if (exists) validStoreId = targetStoreId;
                    }
                    cust = await prisma.customer.create({
                        data: {
                            tenantId,
                            storeId: validStoreId,
                            name: customerDisplayName,
                            mobile: cleanMobile,
                            segment: 'REGULAR'
                        }
                    });
                }
                if (cust) resolvedCustomerId = cust.id;
            }
        }

        let cartItems = [];
        let cartId = null;

        // 1. Validate cart (Either from body or database)
        if (items && Array.isArray(items) && items.length > 0) {
            cartItems = items;
        } else {
            const cart = await prisma.cart.findFirst({
                where: { userId: agentId },
                include: { items: true },
            });

            if (!cart || cart.items.length === 0) {
                res.status(400);
                throw new Error('Cart is empty');
            }
            cartItems = cart.items;
            cartId = cart.id;
        }

        // 2. Bulk fetch product details and calculate totals
        const productIds = cartItems.map((i) => i.productId);
        const productVariantIds = cartItems.map((i) => i.productVariantId).filter(Boolean);

        const [products, variants] = await Promise.all([
            prisma.product.findMany({ where: { id: { in: productIds } } }),
            productVariantIds.length > 0 ? prisma.productVariant.findMany({ where: { id: { in: productVariantIds } } }) : []
        ]);

        const productMap = products.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        const variantMap = variants.reduce((acc, v) => {
            acc[v.id] = v;
            return acc;
        }, {});

        // 2.5 Resolve Vehicle context and pricing channel
        const vehicleId = req.user.assignedVehicleId || bodyVehicleId || null;
        const channel = vehicleId ? 'VEHICLE' : 'POS';

        let totalAmount = 0;
        let subtotal = 0;
        const orderItemsData = [];

        // Pre-calculate subtotal for non-free items to determine 'Free' eligibility
        let paidSubtotal = 0;
        for (const item of cartItems) {
            const product = productMap[item.productId];
            const isFree = product?.isFree === true || product?.isFree === 'true';
            if (product && !isFree) {
                const resolved = await PriceResolverService.resolvePrice({
                    productId: item.productId,
                    productVariantId: item.productVariantId || null,
                    channel,
                    partnerId: req.user?.id
                });
                paidSubtotal += Number(resolved.sellingPrice || 0) * item.quantity;
            }
        }

        // Ensure subtotal is rounded to 2 decimal places to avoid floating point errors in comparison
        const subtotalForComparison = Math.round(paidSubtotal * 100) / 100;

        for (const item of cartItems) {
            const product = productMap[item.productId];
            if (!product) {
                res.status(400);
                throw new Error(`Product ${item.productId} not found`);
            }

            const resolved = await PriceResolverService.resolvePrice({
                productId: item.productId,
                productVariantId: item.productVariantId || null,
                channel,
                partnerId: req.user?.id
            });

            // Apply free product logic: skip or price becomes 0
            const isFreeProduct = product.isFree === true || product.isFree === 'true';
            let finalPrice = Number(resolved.sellingPrice || 0);
            let isItemFree = false;

            if (isFreeProduct) {
                const threshold = Number(product.minShopAmount || 0);
                if (subtotalForComparison >= threshold) {
                    finalPrice = 0;
                    isItemFree = true;
                }
            }

            const itemTotal = finalPrice * item.quantity;
            subtotal += itemTotal;
            totalAmount += itemTotal;

            const taxRate = Number(product.taxRate || product.gst || 0);
            const itemTaxable = taxRate > 0 ? (itemTotal / (1 + taxRate / 100)) : itemTotal;
            const itemTaxAmt = itemTotal - itemTaxable;
            const halfTax = itemTaxAmt / 2;

            const variant = item.productVariantId ? variantMap[item.productVariantId] : null;
            const displayName = variant ? `${product.name} (${variant.variantName})` : product.name;

            orderItemsData.push({
                productId: item.productId,
                productVariantId: item.productVariantId || null,
                productName: displayName,
                quantity: item.quantity,
                unitPrice: finalPrice, // Save as 0 if free
                totalPrice: itemTotal,
                discount: isItemFree ? (resolved.mrp || resolved.sellingPrice) : Math.max(0, (resolved.mrp || 0) - finalPrice),
                mrp: resolved.mrp || resolved.sellingPrice,
                taxAmount: itemTaxAmt,
                cgst: halfTax,
                sgst: halfTax,
                igst: 0
            });
        }

        // Fetch Route plan context for tagging
        const plan = await fetchPlanForVehicle(vehicleId);
        const coverage = getCoverageType();

        const routeTag = {
            routeId: plan?.routeId || null,
            villageName: plan?.villageName || (plan?.noVillage ? 'Unspecified Village' : 'No Active Plan'),
            coverageType: coverage
        };

        // 2.6 Handle Promotion / Coupon
        let discountAmount = 0;
        let appliedPromotionId = null;

        if (couponCode) {
            const promotion = await prisma.coupon.findFirst({
                where: { code: couponCode, isActive: true }
            });

            if (promotion) {
                // Perform simple validation
                const now = new Date();
                const isDateValid = (!promotion.startDate || now >= promotion.startDate) && 
                                   (!promotion.endDate || now <= promotion.endDate);
                
                if (isDateValid) {
                    appliedPromotionId = promotion.id;
                    const discountValue = Number(promotion.discount || 0);
                    
                    if (promotion.discountType === 'PERCENTAGE') {
                        discountAmount = (subtotal * discountValue) / 100;
                    } else {
                        discountAmount = discountValue;
                    }
                }
            }
        }

        // Final total after discount
        totalAmount = Math.max(0, totalAmount - discountAmount);

        // 2.7 Verify Stock Availability (Vehicle Stock OR Store Stock)
        if (vehicleId) {
            for (const item of orderItemsData) {
                const stock = await prisma.vehicleStock.findUnique({
                    where: {
                        vehicleId_productId: { vehicleId, productId: item.productId }
                    }
                });

                if (!stock || stock.quantity < item.quantity) {
                    const product = await prisma.product.findUnique({ where: { id: item.productId } });

                    sendNotification({
                        roles: ['ADMIN'],
                        title: 'Inventory Alert: Stock Mismatch',
                        message: `Agent ${req.user.name} attempted sale exceeding vehicle stock for ${product.name}.`,
                        type: 'inventory',
                        priority: 'high',
                        metadata: { productId: item.productId, vehicleId, requested: item.quantity, available: stock?.quantity || 0 }
                    });

                    res.status(400);
                    throw new Error(`Insufficient stock for ${product.name} (Available: ${stock?.quantity || 0})`);
                }
            }
        } else {
            // POS / Store-level sale — validate against ChannelInventory (POS_STORE) / ProductVariant / PosStoreStock
            const targetStore = req.user.warehouseId || req.user.storeId || storeId || null;
            for (const item of orderItemsData) {
                const product = productMap[item.productId];
                const variant = item.productVariantId ? variantMap[item.productVariantId] : null;
                const itemName = item.productName || (variant ? `${product?.name} (${variant.variantName})` : product?.name || 'Item');

                if (product) {
                    let availableStock = 0;

                    if (item.productVariantId) {
                        // 1. Check variant-specific ChannelInventory first
                        const varPosInv = await prisma.channelInventory.findFirst({
                            where: {
                                productId: item.productId,
                                productVariantId: item.productVariantId,
                                channel: 'POS_STORE',
                                ...(targetStore ? { warehouseId: targetStore } : {})
                            }
                        });

                        if (varPosInv !== null && varPosInv !== undefined) {
                            availableStock = varPosInv.quantity;
                        } else if (variant && (variant.posStock !== undefined && variant.posStock !== null)) {
                            availableStock = Number(variant.posStock);
                        } else if (variant && (variant.stockQuantity !== undefined && variant.stockQuantity !== null)) {
                            availableStock = Number(variant.stockQuantity);
                        } else if (variant && (variant.stock !== undefined && variant.stock !== null)) {
                            availableStock = Number(variant.stock);
                        } else {
                            // Fallback to parent product channel/store stock
                            const posInv = await prisma.channelInventory.findFirst({
                                where: {
                                    productId: item.productId,
                                    channel: 'POS_STORE',
                                    ...(targetStore ? { warehouseId: targetStore } : {})
                                }
                            });
                            const posStoreStock = !posInv ? await prisma.posStoreStock.findFirst({
                                where: { productId: item.productId }
                            }) : null;
                            availableStock = posInv ? posInv.quantity : (posStoreStock ? posStoreStock.posStock : (product.stock || 0));
                        }
                    } else {
                        // Product-level stock validation
                        const posInv = await prisma.channelInventory.findFirst({
                            where: {
                                productId: item.productId,
                                productVariantId: null,
                                channel: 'POS_STORE',
                                ...(targetStore ? { warehouseId: targetStore } : {})
                            }
                        });
                        const posStoreStock = !posInv ? await prisma.posStoreStock.findFirst({
                            where: { productId: item.productId }
                        }) : null;
                        availableStock = posInv ? posInv.quantity : (posStoreStock ? posStoreStock.posStock : (product.stock || 0));
                    }

                    if (availableStock < item.quantity) {
                        res.status(400);
                        throw new Error(`Insufficient store POS stock for ${itemName} (Available: ${availableStock})`);
                    }
                }
            }
        }

        // 2.8 Delivery Logistics
        let deliveryCharge = 0;
        const settings = await prisma.businessSettings.findFirst({
            where: { tenantId, storeId: req.user.storeId || null }
        });

        if (settings) {
            // A. Calculate Delivery Charge from Slabs
            if (settings.deliverySlabs && Array.isArray(settings.deliverySlabs)) {
                const slabs = [...settings.deliverySlabs].sort((a, b) => b.minOrderValue - a.minOrderValue);
                const matchedSlab = slabs.find(slab => subtotal >= slab.minOrderValue);
                if (matchedSlab) {
                    deliveryCharge = Number(matchedSlab.fee || 0);
                }
            }
        }

        totalAmount += deliveryCharge;

        let effectiveStoreId = req.user.warehouseId || req.user.storeId || storeId || null;
        if (!effectiveStoreId && vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: vehicleId },
                select: { storeId: true }
            });
            effectiveStoreId = vehicle?.storeId || null;
        }

        // 3. Create Order + OrderItems in a transaction
        const order = await prisma.$transaction(async (tx) => {
            const orderDisplayId = `ORD-${Date.now()}`;

            const newOrder = await tx.order.create({
                data: {
                    orderNumber: orderDisplayId,
                    totalAmount: totalAmount,
                    status: 'PENDING',
                    agentId: agentId,
                    customerId: resolvedCustomerId,
                    consumerId: resolvedConsumerId || agentId, // mapped to customer User record when available, fallback to agentId
                    orderType: vehicleId ? 'VEHICLE' : 'POS',
                    fulfillmentType: vehicleId ? 'VEHICLE_PICKUP' : 'STORE_PICKUP',
                    vehicleId: vehicleId || null,
                    warehouseId: effectiveStoreId,
                    routeId: routeTag.routeId || null,
                    deliveryCharge: deliveryCharge,
                    deliverySlot: deliverySlot || null,
                    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                    items: {
                        create: orderItemsData.map(item => ({
                            productId: item.productId,
                            productVariantId: item.productVariantId || null,
                            productName: item.productName || null,
                            mrp: item.mrp || null,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            discount: item.discount,
                            taxAmount: item.taxAmount,
                            cgst: item.cgst,
                            sgst: item.sgst,
                            igst: item.igst
                        })),
                    },
                },
                include: { items: true },
            });

            // Clear the cart if we used the database one
            if (cartId) {
                await tx.cartItem.deleteMany({ where: { cartId: cartId } });
            }

            return newOrder;
        }, { maxWait: 5000, timeout: 20000 });

        res.status(201).json(order);
    } catch (error) {
        console.error('[Order Create Error]:', error);
        next(error);
    }
};

// @desc    Complete payment for an order
// @route   POST /api/orders/complete-payment
// @access  Private
export const completePayment = async (req, res, next) => {
    try {
        const { orderId, paymentMode, cashAmount, upiAmount } = req.body;
        const tenantId = req.user.tenantId || 'VK001';

        if (!orderId || !paymentMode) {
            res.status(400);
            throw new Error('orderId and paymentMode are required');
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        if (order.status === 'DELIVERED') {
            res.status(400);
            throw new Error('Order already completed');
        }

        // Transaction: update order, create payment, reduce inventory
        const lowStockItems = [];
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Update order status
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'DELIVERED', // maps to completed/paid
                    paymentMode,
                    cashAmount: cashAmount ? parseFloat(cashAmount) : 0,
                    upiAmount: upiAmount ? parseFloat(upiAmount) : 0,
                },
                include: { items: true, payment: true },
            });

            // Map paymentMode -> PaymentMethod
            let method = 'COD';
            let pStatus = 'SUCCESS';
            if (paymentMode === 'UPI') method = 'RAZORPAY_UPI';
            else if (paymentMode === 'CARD') method = 'RAZORPAY_CARD';
            else if (paymentMode === 'WALLET') method = 'WALLET';
            else if (paymentMode === 'CREDIT') {
                method = 'COD';
                pStatus = 'PENDING';
            }

            // Create payment record
            await tx.payment.create({
                data: {
                    orderId: orderId,
                    method,
                    amount: order.totalAmount,
                    status: pStatus,
                    codCollected: method === 'COD' && paymentMode !== 'CREDIT',
                },
            });

            // Update customer credit balance if CREDIT sale
            if (paymentMode === 'CREDIT' && order.customerId) {
                await tx.customer.update({
                    where: { id: order.customerId },
                    data: {
                        creditBalance: { increment: order.totalAmount }
                    }
                }).catch(() => {}); // non-blocking if customer missing
            }

            // Reduce inventory for all items in parallel
            if (order.vehicleId) {
                // Vehicle-level sale — decrement VehicleStock
                await Promise.all(order.items.map(async (item) => {
                    const updatedStock = await tx.vehicleStock.upsert({
                        where: {
                            vehicleId_productId: {
                                vehicleId: order.vehicleId,
                                productId: item.productId,
                            }
                        },
                        update: {
                            quantity: { decrement: item.quantity },
                        },
                        create: {
                            vehicleId: order.vehicleId,
                            productId: item.productId,
                            quantity: -item.quantity,
                            tenantId,
                            storeId: req.user.storeId || null,
                        },
                        include: { product: { select: { name: true } } }
                    });

                    // Collect low stock alerts (threshold < 5) to notify AFTER transaction
                    if (updatedStock.quantity < 5) {
                        lowStockItems.push({
                            name: updatedStock.product.name,
                            productId: item.productId,
                            quantity: updatedStock.quantity
                        });
                    }
                }));
            } else {
                // Resolve the InventoryLocation for the warehouse
                const storeId = order.warehouseId || req.user.storeId;
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

                // POS / Store-level sale — decrement ChannelInventory (POS_STORE), PosStoreStock, Product.stock AND UnifiedInventory
                await Promise.all(order.items.map(async (item) => {
                    // Decrement ChannelInventory for POS_STORE channel
                    const targetStore = order.warehouseId || req.user.storeId;
                    const existingPosInv = await tx.channelInventory.findFirst({
                        where: {
                            productId: item.productId,
                            ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
                            channel: 'POS_STORE',
                            ...(targetStore ? { warehouseId: targetStore } : {})
                        }
                    });
                    if (existingPosInv) {
                        await tx.channelInventory.update({
                            where: { id: existingPosInv.id },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    }
                    if (tx.posStoreStock && !item.productVariantId) {
                        await tx.posStoreStock.updateMany({
                            where: { productId: item.productId },
                            data: { posStock: { decrement: item.quantity } }
                        }).catch(() => {});
                    }

                    // 1. Decrement main Product.stock
                    const updatedProduct = await tx.product.update({
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
                        const wi = await tx.unifiedInventory.findFirst({
                            where: {
                                productId: item.productId,
                                locationId
                            }
                        });

                        if (wi) {
                            const newOnHand = Math.max(0, wi.onHand - item.quantity);
                            await tx.unifiedInventory.update({
                                where: { id: wi.id },
                                data: {
                                    onHand: newOnHand,
                                    available: newOnHand - wi.reserved
                                }
                            });
                        } else {
                            const startingStock = updatedProduct.stock || 0;
                            const newOnHand = Math.max(0, startingStock - item.quantity);
                            await tx.unifiedInventory.create({
                                data: {
                                    productId: item.productId,
                                    locationId,
                                    onHand: newOnHand,
                                    available: newOnHand
                                }
                            });
                        }
                    }

                    // Low stock alert for store products
                    if (updatedProduct.stock < 5) {
                        lowStockItems.push({
                            name: updatedProduct.name,
                            productId: item.productId,
                            quantity: updatedProduct.stock
                        });
                    }
                }));
            }

            return updated;
        }, { maxWait: 15000, timeout: 45000 });

        // Log the completion of the payment
        logActivity({
            userId: req.user.id,
            tenantId,
            storeId: req.user.storeId,
            action: 'SALE_COMPLETED',
            details: `Completed sale #${updatedOrder.orderNumber} for ₹${updatedOrder.totalAmount}`,
            metadata: {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                amount: updatedOrder.totalAmount,
                paymentMode: paymentMode,
                totalItems: updatedOrder.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
        // Invalidate VSMS products cache and vehicle inventory cache to show updated stock immediately
        try {
            await InventoryCache.invalidatePrefix('vsms:inventory:items:');
            if (updatedOrder.vehicleId) {
                await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${updatedOrder.vehicleId}`);
            }
        } catch (cacheErr) {
            logger.warn('Failed to invalidate vsms inventory cache', cacheErr);
        }

        // Notifications
        res.json(updatedOrder);

        // Notify for low stock
        if (lowStockItems.length > 0) {
            const lowStockCount = lowStockItems.length;
            const msg = lowStockCount === 1
                ? `Vehicle is low on ${lowStockItems[0].name} (Only ${lowStockItems[0].quantity} left).`
                : `Vehicle is low on ${lowStockCount} items including ${lowStockItems[0].name}. Please check inventory.`;

            sendNotification({
                userIds: [updatedOrder.agentId],
                roles: ['ADMIN'],
                title: `Low Stock Alert (${lowStockCount} items)`,
                message: msg,
                type: 'inventory',
                priority: 'medium',
                metadata: { vehicleId: updatedOrder.vehicleId, items: lowStockItems.map(i => i.productId) }
            });
        }

        // Send background notification
        sendNotification({
            userIds: [updatedOrder.agentId].filter(id => id),
            roles: ['ADMIN'],
            title: updatedOrder.totalAmount >= 2000 ? 'High-Value Order Alert!' : 'New Order Completed',
            message: `Order #${updatedOrder.orderNumber} for ₹${updatedOrder.totalAmount} has been completed by ${req.user.name}.`,
            type: 'sales',
            priority: updatedOrder.totalAmount >= 2000 ? 'high' : 'medium',
            metadata: {
                orderId: updatedOrder.id,
                amount: updatedOrder.totalAmount,
                vehicleId: updatedOrder.vehicleId,
                orderNumber: updatedOrder.orderNumber
            }
        });

        // Trigger VGE performance recalculation
        if (updatedOrder.agentId) {
            updateDailyPerformance(updatedOrder.agentId).catch(err => {
                console.warn('[VGE] Background recalculation failed:', err.message);
            });
        }

        // Recalculate Daily Cash Summary for any payment mode to ensure all sales (CASH, UPI, CARD, etc.) are synced
        if (updatedOrder.vehicleId) {
            const dateString = format(new Date(), 'yyyy-MM-dd');
            recalculateDailySummary(updatedOrder.vehicleId, dateString, tenantId, req.user.storeId).catch(err => {
                console.warn('[CASH] Summary sync failed:', err.message);
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
    try {
        const paramId = req.params.id;
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { id: paramId },
                    { orderNumber: paramId },
                    { orderNumber: paramId.replace(/^VK-/, '') },
                    { orderNumber: paramId.replace(/^ORD-/, '') },
                ]
            },
            include: {
                items: true,
                payment: true,
                customer: true,
                consumer: { select: { id: true, name: true, phone: true } },
                vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
                route: { select: { id: true, routeName: true } },
            },
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Bulk enrich items with product details
        const enrichedProductIds = order.items.map((i) => i.productId);
        const enrichedProducts = await prisma.product.findMany({
            where: { id: { in: enrichedProductIds } }
        });

        const enrichedProductMap = enrichedProducts.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        // Fetch all returns for this order
        const orderReturns = await prisma.orderReturn.findMany({
            where: { orderId: order.id },
            orderBy: { createdAt: 'desc' }
        });

        let recalculatedSubtotal = 0;

        const enrichedItems = order.items.map((item) => {
            const product = enrichedProductMap[item.productId] || null;
            const effectiveSellingPrice = product
              ? (product.sellingPrice || product.finalPrice || product.salePrice || product.price || 0)
              : Number(item.unitPrice || item.price || 0);

            const unitPriceToUse = (item.unitPrice && item.unitPrice !== product?.costPrice && item.unitPrice >= effectiveSellingPrice)
              ? Number(item.unitPrice)
              : (effectiveSellingPrice || Number(item.price || 0));

            const itemReturns = orderReturns.filter(r => r.orderItemId === item.id);
            const returnedQty = itemReturns.reduce((sum, r) => sum + (r.returnQty || 0), 0);
            const remainingQty = Math.max(0, item.quantity - returnedQty);

            const itemTotalPrice = unitPriceToUse * (item.quantity || 1);
            const netTotalPrice = unitPriceToUse * remainingQty;
            recalculatedSubtotal += netTotalPrice;

            return {
                ...item,
                name: product?.name || item.productName || item.name || 'Unknown Product',
                productName: product?.name || item.productName || 'Unknown Product',
                unitPrice: unitPriceToUse,
                price: unitPriceToUse,
                totalPrice: itemTotalPrice,
                netTotalPrice,
                mrp: item.mrp || product?.mrp || null,
                taxRate: product?.taxRate || product?.gst || 0,
                product: product ? {
                    ...product,
                    name: product.name,
                    taxRate: product.taxRate || product.gst || 0,
                    image: product.images?.[0] || null,
                    price: effectiveSellingPrice,
                    sellingPrice: effectiveSellingPrice
                } : null,
                returnedQty,
                returnableQty: remainingQty,
            };
        });

        // Use the actual stored totalAmount (which reflects returns and partial returns)
        const finalTotalAmount = (order.totalAmount !== undefined && order.totalAmount !== null)
            ? order.totalAmount
            : recalculatedSubtotal;

        const customerName = order.customer?.name || order.consumer?.name || order.customerName || null;
        const customerMobile = order.customer?.mobile || order.consumer?.phone || order.customerMobile || order.mobile || null;

        // Enrich returns with product info for frontend display
        const enrichedReturns = orderReturns.map(r => {
            const prod = enrichedProductMap[r.productId];
            return {
                ...r,
                refundAmount: r.returnAmount,
                product: prod ? {
                    id: prod.id,
                    name: prod.name,
                    images: prod.images,
                    image: prod.images?.[0] || null,
                    price: prod.price
                } : null
            };
        });

        res.json({
            ...order,
            storeId: order.warehouseId || order.storeId || order.allocatedStoreId || order.pickupStoreId || null,
            customerName,
            customerMobile,
            mobile: customerMobile,
            totalAmount: finalTotalAmount,
            items: enrichedItems,
            returns: enrichedReturns
        });
    } catch (error) {
        console.error('[Get Order Error]:', error);
        next(error);
    }
};

// @desc    Get my orders (Agent history)
// @route   GET /api/orders/my-history
// @access  Private
export const getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 100, page = 1, status, date } = req.query;

        // Find agent's assigned vehicle if any
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, assignedVehicleId: true }
        });

        const agentConditions = [{ agentId: userId }];
        if (user?.assignedVehicleId) {
            agentConditions.push({ vehicleId: user.assignedVehicleId });
        }

        const whereClause = {
            OR: agentConditions
        };

        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.createdAt = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            include: {
                items: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                        mobile: true
                    }
                }
            }
        });

        // Bulk enrich product names & landing prices
        const allProductIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
        const [products, variants] = await Promise.all([
            prisma.product.findMany({
                where: { id: { in: allProductIds } },
                select: { id: true, name: true, costPrice: true, price: true, finalPrice: true }
            }),
            prisma.productVariant.findMany({
                where: { productId: { in: allProductIds } },
                select: { id: true, productId: true, landingPrice: true, sellingPrice: true }
            })
        ]);

        const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const variantMap = variants.reduce((acc, v) => ({ ...acc, [v.productId]: v }), {});

        const enrichedOrders = orders.map(order => {
            const items = order.items.map(item => {
                const prod = productMap[item.productId];
                const v = variantMap[item.productId];
                const landingPrice = Number(v?.landingPrice || prod?.costPrice || 0);
                return {
                    ...item,
                    productName: prod?.name || item.productName || 'Product',
                    landingPrice: landingPrice > 0 ? landingPrice : (Number(item.unitPrice || item.price || 0) * 0.8)
                };
            });

            const orderMargin = items.reduce((sum, item) => {
                const sp = Number(item.unitPrice || item.price || 0);
                const lp = Number(item.landingPrice || (sp * 0.8));
                return sum + ((sp - lp) * Number(item.quantity || 1));
            }, 0);

            return {
                ...order,
                displayId: order.orderNumber || order.id,
                customerName: order.customer?.name || (order.paymentMode === 'CASH' ? 'Walk-In' : 'Customer'),
                mobile: order.customer?.mobile || '',
                margin: orderMargin,
                items
            };
        });

        res.json(enrichedOrders);
    } catch (error) {
        console.error('[Get My Orders Error]:', error);
        next(error);
    }
};

/**
 * @desc    Get Route App Orders for Authenticated Agent
 * @route   GET /api/v1/agent/route-orders/app-orders
 * @access  Private
 */
export const getAgentAppOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { tab = 'app_orders', status, search, date, page = 1, limit = 50 } = req.query;

        // 1. Authoritatively resolve the agent's vehicle ID
        let vehicleId = req.query.vehicleId || req.user.assignedVehicleId || null;
        if (!vehicleId) {
            const userRec = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, assignedVehicleId: true }
            });
            vehicleId = userRec?.assignedVehicleId || null;
        }

        if (!vehicleId) {
            const activeAssignment = await prisma.routeAssignment.findFirst({
                where: { userId, status: true },
                select: { vehicleId: true }
            });
            vehicleId = activeAssignment?.vehicleId || null;
        }

        // If user is not assigned to any vehicle, return empty list gracefully
        if (!vehicleId) {
            return res.json({
                success: true,
                vehicle: null,
                orders: [],
                counts: { appOrders: 0, processed: 0 },
                pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 }
            });
        }

        // 2. Fetch vehicle & route details
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: {
                id: true,
                vehicleNumber: true,
                vehicleName: true,
                status: true,
                store: { select: { id: true, name: true } },
                routeAssignments: {
                    where: { status: true },
                    include: { route: { select: { id: true, routeName: true, villages: true } } },
                    take: 1
                }
            }
        });

        const activeRoute = vehicle?.routeAssignments?.[0]?.route || null;

        // 3. Define status sets for tabs
        const activeStatuses = ['PLACED', 'CONFIRMED', 'PACKED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];
        const processedStatuses = ['COMPLETED', 'DELIVERED', 'CANCELLED', 'FAILED'];

        // Compute tab counts
        const [appOrdersCount, processedCount] = await Promise.all([
            prisma.order.count({
                where: {
                    vehicleId,
                    fulfillmentType: 'VEHICLE_PICKUP',
                    status: { in: activeStatuses }
                }
            }),
            prisma.order.count({
                where: {
                    vehicleId,
                    fulfillmentType: 'VEHICLE_PICKUP',
                    status: { in: processedStatuses }
                }
            })
        ]);

        // 4. Build query where clause
        const andConditions = [
            { vehicleId },
            { fulfillmentType: 'VEHICLE_PICKUP' }
        ];

        if (status && status !== 'ALL') {
            andConditions.push({ status: status.toUpperCase() });
        } else if (tab === 'processed') {
            andConditions.push({ status: { in: processedStatuses } });
        } else {
            andConditions.push({ status: { in: activeStatuses } });
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            andConditions.push({ createdAt: { gte: startOfDay, lte: endOfDay } });
        }

        if (search && search.trim()) {
            const q = search.trim();
            andConditions.push({
                OR: [
                    { orderNumber: { contains: q, mode: 'insensitive' } },
                    { customer: { name: { contains: q, mode: 'insensitive' } } },
                    { customer: { mobile: { contains: q, mode: 'insensitive' } } },
                    { consumer: { name: { contains: q, mode: 'insensitive' } } },
                    { consumer: { phone: { contains: q, mode: 'insensitive' } } }
                ]
            });
        }

        const where = { AND: andConditions };
        const skip = (Number(page) - 1) * Number(limit);

        const [totalMatching, rawOrders] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    images: true,
                                    unit: true
                                }
                            },
                            productVariant: {
                                select: {
                                    id: true,
                                    variantName: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            mobile: true
                        }
                    },
                    consumer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    payment: {
                        select: {
                            id: true,
                            method: true,
                            status: true,
                            amount: true
                        }
                    },
                    route: {
                        select: {
                            id: true,
                            routeName: true,
                            villages: true
                        }
                    },
                    address: true
                }
            })
        ]);

        // Format orders for the VSMS Agent Portal UI
        const formattedOrders = rawOrders.map(order => {
            const customerName = order.customer?.name || order.consumer?.name || 'Customer';
            const customerPhone = order.customer?.mobile || order.consumer?.phone || '';
            const pickupPoint = order.address?.addressLine1 || (order.route?.villages?.[0] ? `Stop: ${order.route.villages[0]}` : 'Vehicle Pickup Stop');

            let nextAllowedActions = [];
            if (order.status === 'PLACED') {
                nextAllowedActions = [
                    { action: 'CONFIRMED', label: 'Accept', color: 'emerald', description: 'Accept order for preparation' }
                ];
            } else if (order.status === 'CONFIRMED') {
                nextAllowedActions = [
                    { action: 'PACKED', label: 'Mark Packed', color: 'amber', description: 'Items gathered & packed' }
                ];
            } else if (order.status === 'PACKED' || order.status === 'PROCESSING') {
                nextAllowedActions = [
                    { action: 'READY_FOR_PICKUP', label: 'Mark Ready', color: 'purple', description: 'Ready for customer pickup' }
                ];
            } else if (order.status === 'READY_FOR_PICKUP') {
                nextAllowedActions = [
                    { action: 'OUT_FOR_DELIVERY', label: 'Out for Customer', color: 'blue', description: 'Vehicle approaching pickup stop' },
                    { action: 'COMPLETED', label: 'Mark Delivered', color: 'emerald', description: 'Order handed to customer' }
                ];
            } else if (order.status === 'OUT_FOR_DELIVERY') {
                nextAllowedActions = [
                    { action: 'COMPLETED', label: 'Mark Delivered', color: 'emerald', description: 'Order handed to customer' }
                ];
            }

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                displayId: order.orderNumber || order.id,
                status: order.status,
                createdAt: order.createdAt,
                placementTime: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                customer: {
                    name: customerName,
                    phone: customerPhone
                },
                totalAmount: Number(order.totalAmount || 0),
                paymentMethod: order.payment?.method || 'COD',
                paymentStatus: order.payment?.status || (order.payment?.codCollected ? 'SUCCESS' : (order.status === 'COMPLETED' ? (order.payment?.codCollected === false ? 'PENDING' : 'SUCCESS') : 'PENDING')),
                codCollected: order.payment?.codCollected ?? false,
                fulfillmentType: order.fulfillmentType,
                deliveryType: order.deliveryType,
                pickupPoint,
                vehicle: {
                    id: vehicle?.id || order.vehicleId,
                    vehicleNumber: vehicle?.vehicleNumber || 'N/A',
                    vehicleName: vehicle?.vehicleName || 'Mobile Mart'
                },
                route: {
                    id: order.route?.id || activeRoute?.id || null,
                    routeName: order.route?.routeName || activeRoute?.routeName || 'Assigned Route'
                },
                itemCount: order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
                items: order.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productName: item.product?.name || item.productName || 'Product',
                    variantName: item.productVariant?.variantName || null,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice || 0),
                    totalPrice: Number(item.totalPrice || 0),
                    image: item.product?.images?.[0] || null
                })),
                allowedActions: nextAllowedActions
            };
        });

        res.json({
            success: true,
            vehicle: vehicle ? {
                id: vehicle.id,
                vehicleNumber: vehicle.vehicleNumber,
                vehicleName: vehicle.vehicleName,
                routeName: activeRoute?.routeName || null
            } : null,
            counts: {
                appOrders: appOrdersCount,
                processed: processedCount
            },
            orders: formattedOrders,
            pagination: {
                total: totalMatching,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalMatching / Number(limit))
            }
        });
    } catch (error) {
        logger.error('[getAgentAppOrders] Error:', error);
        next(error);
    }
};

/**
 * @desc    Update App Order Status from VSMS Agent Portal
 * @route   PUT /api/v1/agent/route-orders/:orderId/status
 * @access  Private
 */
export const updateAgentOrderStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const { nextStatus, reason, paymentCollected } = req.body;

        if (!nextStatus) {
            return res.status(400).json({ success: false, message: 'nextStatus is required' });
        }

        const targetStatus = String(nextStatus).trim().toUpperCase();

        // 1. Authoritatively resolve agent's vehicle ID
        let vehicleId = req.user.assignedVehicleId || null;
        if (!vehicleId) {
            const userRec = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, assignedVehicleId: true }
            });
            vehicleId = userRec?.assignedVehicleId || null;
        }

        if (!vehicleId) {
            const activeAssignment = await prisma.routeAssignment.findFirst({
                where: { userId, status: true },
                select: { vehicleId: true }
            });
            vehicleId = activeAssignment?.vehicleId || null;
        }

        // 2. Fetch order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: true,
                items: true,
                vehicle: true
            }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.fulfillmentType !== 'VEHICLE_PICKUP') {
            return res.status(400).json({ success: false, message: 'This is not a vehicle app order' });
        }

        // 3. Strict Authorization: Verify agent is assigned to the vehicle for this order
        const isSuperAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(String(req.user.role).toUpperCase());
        if (!isSuperAdmin && order.vehicleId !== vehicleId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You are not authorized to update orders for this vehicle'
            });
        }

        // 4. Validate sequential state transitions
        const LEGAL_AGENT_TRANSITIONS = {
            PLACED: ['CONFIRMED', 'CANCELLED', 'FAILED'],
            CONFIRMED: ['PACKED', 'PROCESSING', 'CANCELLED', 'FAILED'],
            PACKED: ['READY_FOR_PICKUP', 'CANCELLED', 'FAILED'],
            PROCESSING: ['READY_FOR_PICKUP', 'CANCELLED', 'FAILED'],
            READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'FAILED'],
            OUT_FOR_DELIVERY: ['COMPLETED', 'DELIVERED', 'CANCELLED', 'FAILED'],
            COMPLETED: [],
            DELIVERED: [],
            CANCELLED: [],
            FAILED: []
        };

        const allowedNext = LEGAL_AGENT_TRANSITIONS[order.status] || [];
        if (!allowedNext.includes(targetStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid order transition from ${order.status} to ${targetStatus}. Allowed: ${allowedNext.join(', ') || 'none'}`
            });
        }

        // 5. Execute transaction: Status update, explicit payment collection, and stock deduction/release
        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: targetStatus,
                    updatedAt: new Date()
                }
            });

            // Payment Collection Handling (Requirement 3)
            // Distinguish payment collected from order delivered: delivery completion does NOT automatically imply payment collection!
            if (['COMPLETED', 'DELIVERED'].includes(targetStatus) && order.payment) {
                if (paymentCollected === true) {
                    await tx.payment.update({
                        where: { id: order.payment.id },
                        data: {
                            status: 'SUCCESS',
                            codCollected: true,
                            codAmount: Number(order.payment.amount || order.totalAmount || 0),
                            updatedAt: new Date()
                        }
                    });
                } else if (paymentCollected === false) {
                    await tx.payment.update({
                        where: { id: order.payment.id },
                        data: {
                            status: 'PENDING',
                            codCollected: false,
                            updatedAt: new Date()
                        }
                    });
                }
            }

            // Inventory Stock Lifecycle Handling (Requirements 5.C and 5.E)
            // When delivered: deduct physical vehicle stock once by consuming pending reservations
            if (['COMPLETED', 'DELIVERED'].includes(targetStatus)) {
                const pendingReservations = await tx.inventoryReservation.findMany({
                    where: { orderId, status: 'PENDING' }
                });

                for (const res of pendingReservations) {
                    await tx.inventoryReservation.update({
                        where: { id: res.id },
                        data: { status: 'COMPLETED', updatedAt: new Date() }
                    });

                    if (order.vehicleId) {
                        await tx.$executeRaw`
                            UPDATE "VehicleStock"
                            SET "quantity" = GREATEST(0, "quantity" - ${res.quantity})
                            WHERE "vehicleId" = ${order.vehicleId}
                              AND "productId" = ${res.productId}
                        `;
                    }
                }
            }

            // When cancelled: release reservation once, physical stock is untouched
            if (['CANCELLED', 'FAILED'].includes(targetStatus)) {
                const pendingReservations = await tx.inventoryReservation.findMany({
                    where: { orderId, status: 'PENDING' }
                });

                for (const res of pendingReservations) {
                    await tx.inventoryReservation.update({
                        where: { id: res.id },
                        data: { status: 'CANCELLED', updatedAt: new Date() }
                    });
                }
            }

            // Record status history
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    fromStatus: order.status,
                    toStatus: targetStatus,
                    changedBy: userId,
                    reason: reason || `Updated by vehicle agent (${targetStatus})${paymentCollected !== undefined ? ` [Payment Collected: ${paymentCollected ? 'YES' : 'NO'}]` : ''}`
                }
            });

            return updated;
        });

        // 6. Realtime broadcast via Socket.IO (Vehicle, Customer, Admin)
        try {
            const { getIO } = await import('../../services/socketService.js');
            const io = getIO();
            if (io) {
                const statusPayload = {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    vehicleId: order.vehicleId,
                    consumerId: order.consumerId,
                    fromStatus: order.status,
                    toStatus: targetStatus,
                    status: targetStatus,
                    updatedAt: new Date().toISOString()
                };

                if (order.vehicleId) {
                    io.to(`vehicle:${order.vehicleId}`).emit('order:status_updated', statusPayload);
                }
                if (order.consumerId) {
                    io.to(`user:${order.consumerId}`).emit('order:status_updated', statusPayload);
                    io.to(`user:${order.consumerId}`).emit('order-status-update', statusPayload);
                }
                try {
                    io.to('oms:admin').emit('order:status_updated', statusPayload);
                    io.of('/admin').to('oms:admin').emit('order:status_updated', statusPayload);
                } catch (_) {}
            }
        } catch (socketErr) {
            logger.warn('[updateAgentOrderStatus] Socket broadcast non-blocking error:', socketErr?.message);
        }

        // 7. Customer notification with deduplication (Stage D)
        const NOTIFICATION_MESSAGES = {
            CONFIRMED: {
                title: 'Order Accepted',
                message: `Your order #${order.orderNumber} has been accepted by the vehicle agent.`,
                type: 'ORDER_CONFIRMED'
            },
            PACKED: {
                title: 'Order Packed',
                message: `Your order #${order.orderNumber} is packed in the vehicle.`,
                type: 'ORDER_PROCESSING'
            },
            READY_FOR_PICKUP: {
                title: 'Ready for Pickup',
                message: `Your order #${order.orderNumber} is ready for pickup at the vehicle!`,
                type: 'ORDER_READY'
            },
            OUT_FOR_DELIVERY: {
                title: 'Vehicle En Route',
                message: `The vehicle with your order #${order.orderNumber} is on the move to pickup stop.`,
                type: 'ORDER_PICKED_UP'
            },
            COMPLETED: {
                title: 'Order Completed',
                message: `Your order #${order.orderNumber} has been successfully completed. Thank you!`,
                type: 'ORDER_DELIVERED'
            },
            DELIVERED: {
                title: 'Order Delivered',
                message: `Your order #${order.orderNumber} has been completed.`,
                type: 'ORDER_DELIVERED'
            },
            CANCELLED: {
                title: 'Order Cancelled',
                message: `Your order #${order.orderNumber} has been cancelled.`,
                type: 'ORDER_CANCELLED'
            }
        };

        const notifConfig = NOTIFICATION_MESSAGES[targetStatus];
        if (notifConfig && order.consumerId) {
            try {
                // Deduplication check: check if notification was already created in last 10 minutes for this order & status
                const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
                const existingNotif = await prisma.notification.findFirst({
                    where: {
                        userId: order.consumerId,
                        type: notifConfig.type,
                        createdAt: { gte: tenMinsAgo }
                    }
                });

                if (!existingNotif) {
                    const { sendNotification } = await import('../../services/notificationService.js');
                    await sendNotification({
                        userIds: [order.consumerId],
                        title: notifConfig.title,
                        message: notifConfig.message,
                        type: notifConfig.type,
                        priority: 'high',
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            vehicleId: order.vehicleId,
                            status: targetStatus
                        }
                    });
                }
            } catch (notifErr) {
                logger.warn('[updateAgentOrderStatus] Customer notification skipped:', notifErr?.message);
            }
        }

        logger.info('[updateAgentOrderStatus] Success', {
            orderId,
            fromStatus: order.status,
            toStatus: targetStatus,
            agentId: userId,
            vehicleId: order.vehicleId
        });

        res.json({
            success: true,
            message: `Order status successfully updated to ${targetStatus}`,
            order: {
                id: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                status: updatedOrder.status,
                previousStatus: order.status
            }
        });
    } catch (error) {
        logger.error('[updateAgentOrderStatus] Error:', error);
        next(error);
    }
};
