import { Router } from 'express';
import passport from '../config/passport';
import {
  registerApp,
  getApiKeys,
  getApiKey,
  revokeApiKey,
  regenerateApiKey,
  getCurrentUser,
  logout,
} from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google for authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Google OAuth callback
 *     description: Callback URL for Google OAuth
 *     responses:
 *       302:
 *         description: Redirect after authentication
 */
router.get(
  '/google/callback',
  authLimiter,
  passport.authenticate('google', {
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:3000',
    successRedirect: process.env.FRONTEND_URL || 'http://localhost:3000',
  })
);

// Protected routes - require authentication
router.use(isAuthenticated);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: Returns information about the currently authenticated user
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 */
router.get('/me', getCurrentUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Logs out the current user and destroys the session
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register new app and generate API key
 *     description: Creates a new application and returns an API key for event collection
 *     security:
 *       - CookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_name
 *             properties:
 *               app_name:
 *                 type: string
 *                 example: My Awesome App
 *               app_domain:
 *                 type: string
 *                 example: https://myapp.com
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 */
router.post('/register', validate(schemas.registerApp), registerApp);

/**
 * @swagger
 * /api/auth/api-keys:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: List all API keys
 *     description: Returns all API keys for the authenticated user
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 */
router.get('/api-keys', getApiKeys);

/**
 * @swagger
 * /api/auth/api-keys/{id}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get specific API key
 *     description: Returns details for a specific API key
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 */
router.get('/api-keys/:id', getApiKey);

/**
 * @swagger
 * /api/auth/api-keys/{id}/revoke:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Revoke API key
 *     description: Revokes an API key, preventing further use
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked successfully
 */
router.post('/api-keys/:id/revoke', revokeApiKey);

/**
 * @swagger
 * /api/auth/api-keys/{id}/regenerate:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Regenerate API key
 *     description: Generates a new API key for the application
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key regenerated successfully
 */
router.post('/api-keys/:id/regenerate', regenerateApiKey);

export default router;
