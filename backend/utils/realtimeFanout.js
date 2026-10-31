import crypto from 'crypto';

import { getIO } from '../services/socketService.js';
import { publishOrHttpFanout } from '../services/realtimeTransport.js';

export async function emitToDeliveryApp(orderId, agentId, extraPayload = {}) {
    try {
        const payload = {
            orderId,
            agentId,
            ...extraPayload
        };

        // 1. Local Socket.io emission
        try {
            const io = getIO();
            if (io) {
                // Emit to delivery namespace
                io.of('/delivery').to(`user:${agentId}`).emit('delivery:new_assignment', payload);
                io.of('/delivery').to(`agent:${agentId}`).emit('delivery:new_assignment', payload);
                io.of('/delivery').to(`user:${agentId}`).emit('delivery:order_assigned', payload);
                io.of('/delivery').to(`agent:${agentId}`).emit('delivery:order_assigned', payload);

                // Emit to root namespace
                io.to(`user:${agentId}`).emit('delivery:new_assignment', payload);
                io.to(`user:${agentId}`).emit('order:assigned', payload);
                console.log(`[RealtimeFanout] Local socket emitted new_assignment for order ${orderId} to agent ${agentId}`);
            }
        } catch (sockErr) {
            console.warn('[RealtimeFanout] Failed local socket emit:', sockErr.message);
        }

        // 2. Cross-service fanout envelope
        const envelope = {
            correlationId: `assign_rider_${orderId}_${Date.now()}`,
            emits: [
                {
                    namespace: '/delivery',
                    room: `user:${agentId}`,
                    event: 'delivery:new_assignment',
                    payload
                },
                {
                    namespace: '/delivery',
                    room: `agent:${agentId}`,
                    event: 'delivery:new_assignment',
                    payload
                }
            ]
        };

        await publishOrHttpFanout(envelope).catch(() => {});
        console.log(`[RealtimeFanout] Successfully processed fanout for order ${orderId} to agent ${agentId}`);
    } catch (error) {
        console.error("[RealtimeFanout] Failed to emit to delivery app", error.message);
    }
}

export async function notifyConsumerOrderStatusSync(orderId, status) {
    try {
        const url = process.env.CONSUMER_INTERNAL_SYNC_URL || 'http://localhost:3000/api/v1/internal/order-sync/status';
        const INTERNAL_SYNC_KEY = process.env.INTERNAL_SYNC_SHARED_SECRET || 'vk_sync_2026_super_secret_key_1234567890';
        
        const bodyObj = {
            eventId: `partner_status_sync_${orderId}_${Date.now()}`,
            orderId,
            status
        };
        const body = JSON.stringify(bodyObj);
        const syncTs = Date.now().toString();
        const signature = crypto.createHmac('sha256', INTERNAL_SYNC_KEY).update(`${syncTs}.${body}`).digest('hex');

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-sync-key': INTERNAL_SYNC_KEY,
                'x-sync-ts': syncTs,
                'x-sync-signature': signature
            },
            body
        });
        console.log(`[RealtimeFanout] Successfully synced status ${status} for order ${orderId} to consumer-api`);
    } catch (error) {
        console.error("[RealtimeFanout] Failed to sync order status to consumer app", error.message);
    }
}
