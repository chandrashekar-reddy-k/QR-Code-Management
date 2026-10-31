import Redis from 'ioredis';
import logger from './logger.js';

// Simple in-memory cache to act as a fallback when Redis is unavailable
const memoryCacheStore = new Map();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';
let redisClient = null;
let isRedisAvailable = false;
let hasLoggedCacheError = false;

if (!DISABLE_REDIS) {
  try {
    logger.info(`[Cache] Initializing Redis connection to ${REDIS_URL}...`);
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        // Stop reconnecting after 3 failed attempts to prevent infinite loop spam
        if (times > 3) {
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
      reconnectOnError: (err) => {
        if (!hasLoggedCacheError) {
          logger.warn(`[Cache] Redis reconnect error: ${err.message}`);
          hasLoggedCacheError = true;
        }
        return false;
      }
    });

    redisClient.on('connect', () => {
      logger.info('[Cache] Redis client connected successfully');
      isRedisAvailable = true;
      hasLoggedCacheError = false;
    });

    redisClient.on('error', (err) => {
      // Only log the fallback error message on transition from working -> broken,
      // or on the first connection failure, to avoid spamming the log.
      if (isRedisAvailable || !hasLoggedCacheError) {
        logger.info(`[Cache] Redis offline: ${err.message}. Falling back to in-memory cache.`);
        hasLoggedCacheError = true;
      }
      isRedisAvailable = false;
    });
  } catch (err) {
    logger.warn(`[Cache] Failed to initialize Redis client: ${err.message}. Using in-memory fallback cache.`);
    isRedisAvailable = false;
  }
} else {
  logger.info('[Cache] Redis is disabled via configuration (DISABLE_REDIS=true). Using in-memory cache.');
}

export const InventoryCache = {
  async get(key) {
    // Cache completely disabled
    return null;
  },

  async set(key, value, ttlSeconds = 300) {
    // Cache completely disabled
    return;
  },

  async invalidate(key) {
    if (isRedisAvailable && redisClient) {
      try {
        logger.debug(`[Cache] Redis invalidate key: ${key}`);
        await redisClient.del(key);
        return;
      } catch (err) {
        logger.error(`[Cache] Redis del error: ${err.message}. Invalidating memory fallback.`);
      }
    }

    // In-memory fallback
    logger.debug(`[Cache] In-Memory invalidate key: ${key}`);
    memoryCacheStore.delete(key);
  },

  async invalidatePrefix(prefix) {
    if (isRedisAvailable && redisClient) {
      try {
        logger.debug(`[Cache] Redis invalidate prefix: ${prefix}`);
        const keys = await redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        return;
      } catch (err) {
        logger.error(`[Cache] Redis prefix del error: ${err.message}. Invalidating memory fallback.`);
      }
    }

    // In-memory fallback
    logger.debug(`[Cache] In-Memory invalidate prefix: ${prefix}`);
    for (const key of memoryCacheStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryCacheStore.delete(key);
      }
    }
  },

  async clear() {
    if (isRedisAvailable && redisClient) {
      try {
        logger.debug('[Cache] Redis flushall');
        await redisClient.flushall();
        return;
      } catch (err) {
        logger.error(`[Cache] Redis flushall error: ${err.message}. Clearing memory fallback.`);
      }
    }

    // In-memory fallback
    memoryCacheStore.clear();
  }
};
