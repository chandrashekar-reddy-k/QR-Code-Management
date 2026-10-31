import express from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { getIO } from '../services/socketService.js';

const router = express.Router();

const INTERNAL_SYNC_KEY = process.env.DELIVERY_API_SYNC_KEY || '';

// Validate the signature of the request
const validateSignature = (req, res, next) => {
  const syncKey = req.headers['x-internal-sync-key'];
  const syncTs = req.headers['x-sync-ts'];
  const signature = req.headers['x-sync-signature'];

  if (!syncKey || !syncTs || !signature) {
    logger.warn('[Realtime Fanout] Missing internal sync headers');
    return res.status(401).json({ error: 'Missing internal sync headers' });
  }

  // Check timestamp (e.g. within 5 mins)
  if (Math.abs(Date.now() - parseInt(syncTs, 10)) > 5 * 60 * 1000) {
    logger.warn('[Realtime Fanout] Sync timestamp expired');
    return res.status(401).json({ error: 'Sync timestamp expired' });
  }

  const bodyStr = JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', INTERNAL_SYNC_KEY || syncKey)
    .update(`${syncTs}.${bodyStr}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('[Realtime Fanout] Invalid sync signature');
    return res.status(401).json({ error: 'Invalid sync signature' });
  }

  next();
};

router.post('/fanout', validateSignature, (req, res) => {
  try {
    const { correlationId, emits } = req.body;
    
    if (!Array.isArray(emits)) {
      return res.status(400).json({ error: 'emits must be an array' });
    }

    const io = getIO();

    emits.forEach((emitObj) => {
      const { namespace, room, event, payload } = emitObj;
      if (!event) return;

      const nsp = namespace ? io.of(namespace) : io;
      if (room) {
        nsp.to(room).emit(event, payload);
      } else {
        nsp.emit(event, payload);
      }
    });

    return res.json({ success: true, message: 'Fanout processed successfully' });
  } catch (error) {
    logger.error('[Realtime Fanout] Error processing fanout', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
