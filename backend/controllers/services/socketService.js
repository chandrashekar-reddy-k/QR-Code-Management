import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const defaultAllowedOrigins = [
          "https://partner.villagkart.com",
          "https://erppartner.villagkart.com",
          "https://devpartner.villagkart.com",
          "https://admin.villagkart.com",
          "https://erpadmin.villagkart.com"
        ];
        const allowedOrigins = [
          ...(process.env.FRONTEND_URL || '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
          ...defaultAllowedOrigins
        ];
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS blocked by Socket.IO'));
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const authMiddleware = (socket, next) => {
    // Try to get token from auth object (standard Socket.IO) or headers
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1] || socket.handshake.query.token;
    
    if (!token) {
      console.log('Socket Connection Error: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Contains id, role, assignedVehicleId
      next();
    } catch (err) {
      console.log('Socket Connection Error: Invalid token', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  };

  io.use(authMiddleware);

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

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.user.id}`);
    });
  });

  // Admin Namespace Setup
  const adminNamespace = io.of('/admin');
  adminNamespace.use(authMiddleware);
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
  partnerNamespace.use(authMiddleware);
  partnerNamespace.on('connection', (socket) => {
    console.log(`User connected to partner socket: ${socket.user.id}`);
    socket.join(`user:${socket.user.id}`);
    
    if (socket.user.warehouseId) {
      socket.join(`warehouse:${socket.user.warehouseId}`);
      console.log(`User ${socket.user.id} joined partner room warehouse:${socket.user.warehouseId}`);
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected from partner socket: ${socket.user.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
