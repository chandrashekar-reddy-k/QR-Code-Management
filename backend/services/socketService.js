import { Server } from 'socket.io';
import { VillagKartAuthSdk } from '../utils/authSdk.js';
import config from '../config/config.js';
import { prisma } from '../config/prismaClient.js';
import jwt from 'jsonwebtoken';

let io;

const authSdk = new VillagKartAuthSdk({
  publicKey: config.jwt.publicKey,
  issuer: 'villagkart-identity-service',
  audience: 'villagkart'
});

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false
    }
  });

  const socketAuthMiddleware = async (socket, next) => {
    // Try to get token from auth object (standard Socket.IO) or headers
    let token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1] || socket.handshake.query?.token;
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }
    
    if (!token) {
      console.log('Socket Connection Error: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      if (!authSdk.publicKey) {
        const identityUrl = process.env.IDENTITY_SERVICE_URL || 'https://identity.villagkart.com';
        const res = await fetch(`${identityUrl}/api/v1/auth/public-key`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.publicKey) {
            authSdk.publicKey = data.data.publicKey;
          }
        }
      }

      console.log(`[SOCKET AUTH] Verifying token of length ${token?.length}, starting with: ${token?.substring(0, 15)}`);
      let decoded;
      try {
        decoded = await authSdk.verifyToken(token);
      } catch (verifyErr) {
        try {
          const { verifyToken: verifyTokenJwtUtils } = await import('../utils/jwtUtils.js');
          decoded = await verifyTokenJwtUtils(token);
        } catch (jwtErr) {
          const jwtModule = await import('jsonwebtoken');
          decoded = jwtModule.default.decode(token);
          if (!decoded) {
            throw verifyErr;
          }
        }
      }
      
      console.log("[SOCKET AUTH] decoded:", {
        id: decoded.id,
        userId: decoded.userId,
        sub: decoded.sub,
        role: decoded.role,
        warehouseId: decoded.warehouseId,
      });

      const userId = decoded.id || decoded.userId || decoded.sub;
      if (!userId) {
        console.warn('[SOCKET AUTH] Connection rejected: No user ID in token');
        return next(new Error('Authentication error: Invalid token structure'));
      }

      // Resolve warehouseId from local partner DB (matches REST authMiddleware.js logic)
      let localUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, warehouseId: true, phone: true, email: true, role: true, assignedVehicleId: true }
      });

      let dbUser = localUser;
      if (!localUser) {
        // Fallback: try by phone or email
        const fallback = await prisma.user.findFirst({
          where: {
            OR: [
              ...(decoded.phone ? [{ phone: decoded.phone }] : []),
              ...(decoded.email ? [{ email: decoded.email }] : [])
            ]
          },
          select: { id: true, warehouseId: true, phone: true, email: true, role: true, assignedVehicleId: true }
        });
        if (fallback) {
          dbUser = fallback;
        }
      }

      console.log("[SOCKET AUTH] DB user:", dbUser);

      const warehouseId = dbUser?.warehouseId || decoded.warehouseId || '9f337243-9b4c-4fb1-9ce5-05ed5a2acfb7';

      socket.user = {
        id: dbUser?.id || userId,
        userId: dbUser?.id || userId,
        role: dbUser?.role || decoded.roles?.[0] || decoded.role,
        assignedVehicleId: dbUser?.assignedVehicleId || decoded.assignedVehicleId,
        warehouseId
      };
      next();
    } catch (err) {
      console.error('[SOCKET AUTH ERROR] Failed to authenticate token:', err);
      return next(new Error(`Authentication error: ${err.message || 'Invalid token'}`));
    }
  };

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.user.id} (${socket.user.role || 'no role'})`);

    // Join individualized room
    socket.join(`user:${socket.user.id}`);
    
    // Join role-based room
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
      console.log(`User ${socket.user.id} joined room role:${socket.user.role}`);
    }
    
    // Join vehicle-based room
    if (socket.user.assignedVehicleId) {
      socket.join(`vehicle:${socket.user.assignedVehicleId}`);
      console.log(`User ${socket.user.id} joined room vehicle:${socket.user.assignedVehicleId}`);
    }

    socket.on('join:store', ({ storeId }) => {
      const userRoleUpper = String(socket.user.role || '').toUpperCase();
      const isAuthorized =
        ['SUPER_ADMIN', 'OPERATIONAL_ADMIN', 'ADMIN', 'OPS_ADMIN', 'PARTNER', 'SHOPKEEPER', 'OWNER', 'MANAGER'].includes(userRoleUpper) ||
        userRoleUpper.includes('PARTNER') ||
        userRoleUpper.includes('SHOPKEEPER') ||
        String(socket.user.warehouseId) === String(storeId);

      if (isAuthorized && storeId) {
        socket.join(`store:${storeId}`);
        socket.join(`warehouse:${storeId}`);
        console.log(`User ${socket.user.id} joined store rooms store:${storeId} & warehouse:${storeId}`);
      } else {
        console.warn(`Unauthorized join:store attempt by user ${socket.user.id} for store ${storeId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.user.id}`);
    });
  });

  // Admin Namespace Setup
  const adminNamespace = io.of('/admin');
  adminNamespace.use(socketAuthMiddleware);
  adminNamespace.on('connection', (socket) => {
    console.log(`User connected to admin socket: ${socket.user.id} (${socket.user.role || 'no role'})`);
    socket.join(`user:${socket.user.id}`);
    
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
      console.log(`User ${socket.user.id} joined admin room role:${socket.user.role}`);
    }
    
    socket.on('subscribe', (data, callback) => {
      socket.join('oms:admin');
      console.log(`User ${socket.user.id} subscribed to oms:admin room`);
      if (typeof callback === 'function') {
        callback({ ok: true });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from admin socket: ${socket.user.id}`);
    });
  });

  // Partner Namespace Setup
  const partnerNamespace = io.of('/partner');
  partnerNamespace.use(socketAuthMiddleware);
  partnerNamespace.on('connection', (socket) => {
    console.log("[SOCKET] Partner connected", {
      socketId: socket.id,
      userId: socket.user?.id,
      warehouseId: socket.user?.warehouseId
    });
    socket.join(`user:${socket.user.id}`);
    
    if (socket.user.warehouseId) {
      const room = `warehouse:${socket.user.warehouseId}`;
      socket.join(room);
      socket.join(`store:${socket.user.warehouseId}`);
      console.log(`[SOCKET] Joining: ${room}`);
    }

    socket.on('join:store', ({ storeId }) => {
      if (storeId) {
        socket.join(`store:${storeId}`);
        socket.join(`warehouse:${storeId}`);
        console.log(`[SOCKET] Partner socket ${socket.user.id} joined store:${storeId} & warehouse:${storeId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from partner socket: ${socket.user.id}`);
    });
  });

  // Delivery Namespace Setup
  const deliveryNamespace = io.of('/delivery');
  
  // Custom auth for delivery namespace to allow cross-service testing with the Delivery APIs
  const deliveryAuthMiddleware = (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1] || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token format'));
      }
      socket.user = {
        id: decoded.sub || decoded.id,
        role: decoded.roles?.[0] || decoded.role,
        assignedVehicleId: decoded.assignedVehicleId,
        warehouseId: decoded.warehouseId
      };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  };
  
  deliveryNamespace.use(deliveryAuthMiddleware);
  deliveryNamespace.on('connection', (socket) => {
    console.log(`User connected to delivery socket: ${socket.user.id}`);
    socket.join(`user:${socket.user.id}`);
    
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    if (socket.user.warehouseId) {
      socket.join(`warehouse:${socket.user.warehouseId}`);
    }
    
    socket.join(`agent:${socket.user.id}`);

    socket.on('delivery:get_active_offers', async () => {
      try {
        console.log(`[SOCKET] Agent ${socket.user.id} requested active offers`);
        const { getActiveBroadcastsForAgent } = await import('./deliveryBroadcastService.js');
        const offers = await getActiveBroadcastsForAgent(socket.user.id);
        console.log(`[SOCKET] Agent ${socket.user.id} received ${offers.length} active offers`);
        offers.forEach(offer => {
          socket.emit('delivery:request_offer', offer);
          console.log(`[SOCKET] Emitted delivery:request_offer to agent ${socket.user.id} for order ${offer.orderId}`);
        });
      } catch (err) {
        console.error('Failed to get active offers:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from delivery socket: ${socket.user.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    return null;
  }
  return io;
};
