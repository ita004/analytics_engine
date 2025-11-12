import { Request, Response } from 'express';
import { pool } from '../config/database';
import { generateApiKey, generateExpiryDate } from '../utils/apiKey';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { cacheDelete } from '../config/redis';

/**
 * Register new app and generate API key
 */
export const registerApp = async (req: AuthRequest, res: Response) => {
  try {
    const { app_name, app_domain } = req.body;
    const userId = req.user.id;

    // Generate API key
    const apiKey = generateApiKey();
    const expiresAt = generateExpiryDate(
      parseInt(process.env.API_KEY_EXPIRY_DAYS || '365')
    );

    // Insert API key into database
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, app_name, app_domain, api_key, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, app_name, app_domain, api_key, expires_at, created_at`,
      [userId, app_name, app_domain, apiKey, expiresAt]
    );

    const apiKeyData = result.rows[0];

    logger.info('New API key created', {
      userId,
      appName: app_name,
      apiKeyId: apiKeyData.id,
    });

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id: apiKeyData.id,
        app_name: apiKeyData.app_name,
        app_domain: apiKeyData.app_domain,
        api_key: apiKeyData.api_key,
        expires_at: apiKeyData.expires_at,
        created_at: apiKeyData.created_at,
      },
    });
  } catch (error) {
    logger.error('Error registering app', error);
    res.status(500).json({
      success: false,
      message: 'Error generating API key',
    });
  }
};

/**
 * Get all API keys for authenticated user
 */
export const getApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, app_name, app_domain, api_key, is_active, expires_at, created_at, last_used_at, revoked_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching API keys', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching API keys',
    });
  }
};

/**
 * Get single API key details
 */
export const getApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, app_name, app_domain, api_key, is_active, expires_at, created_at, last_used_at, revoked_at
       FROM api_keys
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching API key', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching API key',
    });
  }
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, app_name, revoked_at`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    // Clear any cached data for this API key
    await cacheDelete(`apikey:${id}:*`);

    logger.info('API key revoked', {
      userId,
      apiKeyId: id,
    });

    res.json({
      success: true,
      message: 'API key revoked successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error revoking API key', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking API key',
    });
  }
};

/**
 * Regenerate API key
 */
export const regenerateApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Generate new API key
    const newApiKey = generateApiKey();
    const expiresAt = generateExpiryDate(
      parseInt(process.env.API_KEY_EXPIRY_DAYS || '365')
    );

    const result = await pool.query(
      `UPDATE api_keys
       SET api_key = $1, expires_at = $2, is_active = true, revoked_at = NULL
       WHERE id = $3 AND user_id = $4
       RETURNING id, app_name, app_domain, api_key, expires_at`,
      [newApiKey, expiresAt, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    // Clear cached data
    await cacheDelete(`apikey:${id}:*`);

    logger.info('API key regenerated', {
      userId,
      apiKeyId: id,
    });

    res.json({
      success: true,
      message: 'API key regenerated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error regenerating API key', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating API key',
    });
  }
};

/**
 * Get current authenticated user info
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        profile_picture: req.user.profile_picture,
      },
    });
  } catch (error) {
    logger.error('Error fetching current user', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user information',
    });
  }
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      logger.error('Error logging out', err);
      return res.status(500).json({
        success: false,
        message: 'Error logging out',
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
};
