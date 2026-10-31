import prisma from '../utils/prisma.js';
import { getIO } from './socketService.js';

/**
 * Send notification to specific users, roles, or vehicles.
 * @param {Object} params - Notification parameters
 * @param {string[]} params.userIds - List of User IDs
 * @param {string[]} params.roles - List of roles (ADMIN, SUPERVISOR, SALES_AGENT, etc.)
 * @param {string[]} params.vehicleIds - List of vehicle IDs
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @param {string} params.type - Category (sales, inventory, cash, route, performance, system)
 * @param {string} params.priority - low | medium | high
 * @param {Object} params.metadata - Extra data
 * @param {boolean} params.isBroadcast - If true, sends to all users
 */
export const sendNotification = async ({
    userIds = [],
    roles = [],
    vehicleIds = [],
    title,
    message,
    type,
    priority = 'low',
    metadata = {},
    isBroadcast = false
}) => {
    try {
        let io;
        try {
          io = getIO();
        } catch (e) {
          console.warn('Socket.IO not initialized, skipping real-time emission');
        }

        // Define target user IDs
        let targetUserIds = new Set(userIds);
        
        // If roles/vehicles are specified, find corresponding users
        if (roles.length > 0 || vehicleIds.length > 0) {
            const orConditions = [];
            if (roles.length > 0) {
                // Mapping generic roles to database UserRole enum values
                const ROLE_MAP = {
                    ADMIN: ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'OPERATIONAL_ADMIN'],
                    SUPER_ADMIN: ['SUPER_ADMIN'],
                    REGIONAL_ADMIN: ['REGIONAL_ADMIN'],
                    OPERATIONAL_ADMIN: ['OPERATIONAL_ADMIN'],
                    SUPERVISOR: ['MANAGER', 'OPERATIONAL_ADMIN'],
                    MANAGER: ['MANAGER'],
                    DIRECTOR: ['DIRECTOR'],
                    OWNER: ['OWNER'],
                    TENANT_OWNER: ['OWNER'],
                    PARTNER: ['PARTNER'],
                    VENDOR: ['VENDOR'],
                    SUPPLIER: ['SUPPLIER'],
                    AGENT: ['DELIVERY_AGENT', 'VEHICLE_AGENT'],
                    DRIVER: ['DELIVERY_AGENT', 'VEHICLE_AGENT'],
                    DELIVERY_AGENT: ['DELIVERY_AGENT'],
                    VEHICLE_AGENT: ['VEHICLE_AGENT'],
                    WAREHOUSE_STAFF: ['WAREHOUSE_STAFF'],
                    CUSTOMER: ['CONSUMER'],
                    CONSUMER: ['CONSUMER'],
                    SHOPKEEPER: ['SHOPKEEPER']
                };

                const validPrismaRoles = new Set([
                    'CONSUMER', 'WAREHOUSE_STAFF', 'DELIVERY_AGENT', 'SUPER_ADMIN',
                    'REGIONAL_ADMIN', 'OPERATIONAL_ADMIN', 'SUPPLIER', 'VENDOR',
                    'PARTNER', 'OWNER', 'DIRECTOR', 'MANAGER', 'VEHICLE_AGENT', 'SHOPKEEPER'
                ]);

                const resolvedRoles = new Set();
                roles.forEach(r => {
                    const normalized = String(r || '').trim().toUpperCase();
                    if (validPrismaRoles.has(normalized)) {
                        resolvedRoles.add(normalized);
                    } else if (ROLE_MAP[normalized]) {
                        ROLE_MAP[normalized].forEach(mRole => {
                            if (validPrismaRoles.has(mRole)) resolvedRoles.add(mRole);
                        });
                    }
                });

                if (resolvedRoles.size > 0) {
                    orConditions.push({ role: { in: Array.from(resolvedRoles) } });
                }
            }
            if (vehicleIds.length > 0) {
                orConditions.push({ assignedVehicleId: { in: vehicleIds } });
            }

            if (orConditions.length > 0) {
                const users = await prisma.user.findMany({
                    where: { OR: orConditions },
                    select: { id: true }
                });
                users.forEach(u => targetUserIds.add(u.id));
            }
        }

        // If it's a broadcast to all users
        if (isBroadcast) {
            const allUsers = await prisma.user.findMany({ select: { id: true } });
            allUsers.forEach(u => targetUserIds.add(u.id));
        }

        const targetArray = Array.from(targetUserIds);
        console.log(`[NotificationService] Sending "${title}" to ${targetArray.length} users. IDs: ${targetArray}`);
        
        if (targetArray.length === 0 && !isBroadcast) {
          console.log('No target users found for notification');
          return [];
        }

        // Resolve valid NotificationType enum
        const VALID_NOTIFICATION_TYPES = new Set([
            'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_READY',
            'ORDER_PICKED_UP', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_SUCCESS',
            'PAYMENT_FAILED', 'DELIVERY_ASSIGNED', 'CHAT_MESSAGE', 'PROMOTION',
            'LOW_STOCK', 'SYSTEM_ALERT'
        ]);

        const NOTIF_TYPE_MAP = {
            INVENTORY: 'LOW_STOCK',
            STOCK: 'LOW_STOCK',
            ORDER: 'ORDER_CREATED',
            DELIVERY: 'DELIVERY_ASSIGNED',
            CHAT: 'CHAT_MESSAGE',
            SYSTEM: 'SYSTEM_ALERT'
        };

        const normalizedType = String(type || '').trim().toUpperCase();
        const resolvedType = VALID_NOTIFICATION_TYPES.has(normalizedType)
            ? normalizedType
            : (NOTIF_TYPE_MAP[normalizedType] || 'SYSTEM_ALERT');

        // Prepare data for DB
        const notificationData = targetArray.map(targetId => ({
            userId: targetId,
            title,
            message,
            type: resolvedType,
            data: metadata ? { ...metadata, priority } : (priority ? { priority } : undefined)
        }));

        // 1. Save to DB
        const createdNotifications = await Promise.all(
          notificationData.map(data => prisma.notification.create({ data }))
        );

        // 2. Emit real-time events via socket
        if (io) {
            createdNotifications.forEach(notif => {
                io.to(`user:${notif.userId}`).emit('notification', {
                    id: notif.id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    priority,
                    metadata,
                    createdAt: notif.createdAt,
                    isRead: notif.isRead
                });
            });

            // Additionally emit to role and vehicle rooms for blanket updates (optional)
            roles.forEach(role => io.to(`role:${role}`).emit('role_notification', { title, message, type }));
            vehicleIds.forEach(vId => io.to(`vehicle:${vId}`).emit('vehicle_notification', { title, message, type }));
        }

        // 3. TODO: Push Notification (FCM) Fallback
        // This would involve fetching FCM tokens and sending via firebase-admin

        return createdNotifications;
    } catch (error) {
        console.error('Error sending notification:', error);
        // Don't throw if it's not critical, but here we might want to know
        return [];
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId) => {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    });
};

/**
 * Mark all user notifications as read
 */
export const markAllAsRead = async (userId) => {
    return await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });
};

/**
 * Get user notifications with infinite scroll support
 */
export const getUserNotifications = async (userId, limit = 20, page = 1) => {
    const skip = (page - 1) * limit;
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip
    });
};
