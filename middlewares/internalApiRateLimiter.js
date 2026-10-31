import rateLimit from 'express-rate-limit'

export const internalApiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.INTERNAL_API_RATE_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.INTERNAL_API_RATE_MAX || '600', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, message: 'Too many internal requests' }
})
