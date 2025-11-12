import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * More permissive rate limiter for event collection
 */
export const eventCollectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Allow high throughput for analytics
  message: {
    success: false,
    message: 'Event collection rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per API key instead of IP
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for analytics queries
 */
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: 'Analytics query rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
