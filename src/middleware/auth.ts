import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: any;
  apiKeyData?: any;
}

/**
 * Middleware to check if user is authenticated via session
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please login with Google.',
  });
};

/**
 * Middleware to validate API key from headers
 */
export const validateApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required. Please include X-API-Key header.',
      });
    }

    // Query to get API key details and check validity
    const result = await pool.query(
      `SELECT ak.*, u.id as user_id, u.email as user_email
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key = $1
         AND ak.is_active = true
         AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      logger.warn('Invalid or expired API key used', { apiKey: apiKey.substring(0, 8) + '...' });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired API key.',
      });
    }

    const apiKeyData = result.rows[0];

    // Update last_used_at timestamp (fire and forget)
    pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyData.id]
    ).catch((err) => logger.error('Error updating last_used_at', err));

    // Attach API key data to request
    req.apiKeyData = apiKeyData;

    next();
  } catch (error) {
    logger.error('Error validating API key', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating API key.',
    });
  }
};

/**
 * Optional API key validation - doesn't fail if missing
 */
export const optionalApiKey = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return next();
    }

    const result = await pool.query(
      `SELECT ak.*, u.id as user_id, u.email as user_email
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key = $1
         AND ak.is_active = true
         AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [apiKey]
    );

    if (result.rows.length > 0) {
      req.apiKeyData = result.rows[0];
    }

    next();
  } catch (error) {
    logger.error('Error in optional API key validation', error);
    next();
  }
};
