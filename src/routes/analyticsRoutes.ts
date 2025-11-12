import { Router } from 'express';
import {
  collectEvent,
  getEventSummary,
  getUserStats,
  getDashboard,
} from '../controllers/analyticsController';
import { validateApiKey, isAuthenticated, optionalApiKey } from '../middleware/auth';
import { validate, validateQuery, schemas } from '../middleware/validation';
import { eventCollectionLimiter, analyticsLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/analytics/collect:
 *   post:
 *     tags:
 *       - Analytics
 *     summary: Collect analytics event
 *     description: Submit analytics events from your website or mobile app
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event collected successfully
 *       401:
 *         description: Invalid or missing API key
 *       400:
 *         description: Validation error
 */
router.post(
  '/collect',
  eventCollectionLimiter,
  validateApiKey,
  validate(schemas.collectEvent),
  collectEvent
);

/**
 * @swagger
 * /api/analytics/event-summary:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get event summary with aggregations
 *     description: Retrieve analytics summary for a specific event type with device breakdown
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: event
 *         required: true
 *         schema:
 *           type: string
 *         description: Event name to query
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *         description: Filter by specific app ID
 *     responses:
 *       200:
 *         description: Event summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventSummary'
 */
router.get(
  '/event-summary',
  analyticsLimiter,
  optionalApiKey,
  isAuthenticated,
  validateQuery(schemas.eventSummaryQuery),
  getEventSummary
);

/**
 * @swagger
 * /api/analytics/user-stats:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get user statistics
 *     description: Returns stats for a specific user including event counts and device details
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to query
 *     responses:
 *       200:
 *         description: User stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 */
router.get(
  '/user-stats',
  analyticsLimiter,
  optionalApiKey,
  isAuthenticated,
  validateQuery(schemas.userStatsQuery),
  getUserStats
);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get dashboard overview
 *     description: Returns comprehensive dashboard data including top events and trends
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to include in dashboard
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get(
  '/dashboard',
  analyticsLimiter,
  isAuthenticated,
  getDashboard
);

export default router;
