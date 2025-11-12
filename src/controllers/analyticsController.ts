import { Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { parseUserAgent, extractIpAddress } from '../utils/userAgent';
import { cacheGet, cacheSet, cacheDeletePattern } from '../config/redis';

/**
 * Collect analytics event
 */
export const collectEvent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      event,
      url,
      referrer,
      device: clientDevice,
      ipAddress: clientIp,
      timestamp,
      metadata = {},
      user_id,
    } = req.body;

    const apiKeyId = req.apiKeyData.id;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Parse user agent for device details
    const parsedUA = parseUserAgent(userAgent);
    const device = clientDevice || parsedUA.device;
    const ipAddress = clientIp || extractIpAddress(req);

    // Extract additional metadata
    const enrichedMetadata = {
      ...metadata,
      userAgent,
    };

    // Insert event into database
    const result = await pool.query(
      `INSERT INTO events (
        api_key_id, event_name, url, referrer, device, ip_address,
        user_agent, browser, os, screen_size, user_id, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at`,
      [
        apiKeyId,
        event,
        url,
        referrer,
        device,
        ipAddress,
        userAgent,
        parsedUA.browser,
        parsedUA.os,
        metadata.screenSize,
        user_id,
        JSON.stringify(enrichedMetadata),
        timestamp || new Date(),
      ]
    );

    // Clear relevant caches (fire and forget)
    cacheDeletePattern(`analytics:${apiKeyId}:*`).catch((err) =>
      logger.error('Error clearing cache', err)
    );

    logger.info('Event collected', {
      eventId: result.rows[0].id,
      eventName: event,
      apiKeyId,
    });

    res.status(201).json({
      success: true,
      message: 'Event collected successfully',
      data: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (error) {
    logger.error('Error collecting event', error);
    res.status(500).json({
      success: false,
      message: 'Error collecting event',
    });
  }
};

/**
 * Get event summary with aggregations
 */
export const getEventSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { event, startDate, endDate, app_id } = req.query;
    const userId = req.user?.id;

    // Build cache key
    const cacheKey = `analytics:summary:${event}:${startDate || 'all'}:${endDate || 'all'}:${app_id || 'all'}:${userId}`;

    // Try to get from cache
    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.debug('Returning cached event summary', { event });
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    // Build query conditions
    const conditions: string[] = ['e.event_name = $1'];
    const params: any[] = [event];
    let paramIndex = 2;

    // Add user filter - user can only see their own data
    if (userId) {
      conditions.push(`ak.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    // Add app_id filter if provided
    if (app_id) {
      conditions.push(`ak.id = $${paramIndex}`);
      params.push(app_id);
      paramIndex++;
    }

    // Add date filters
    if (startDate) {
      conditions.push(`e.timestamp >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`e.timestamp <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Execute aggregation query
    const result = await pool.query(
      `SELECT
        e.event_name,
        COUNT(*) as count,
        COUNT(DISTINCT e.user_id) as unique_users,
        COUNT(DISTINCT e.ip_address) as unique_ips,
        json_object_agg(
          COALESCE(e.device, 'unknown'),
          device_counts.count
        ) FILTER (WHERE e.device IS NOT NULL) as device_data,
        json_object_agg(
          COALESCE(e.browser, 'unknown'),
          browser_counts.count
        ) FILTER (WHERE e.browser IS NOT NULL) as browser_data,
        json_object_agg(
          COALESCE(e.os, 'unknown'),
          os_counts.count
        ) FILTER (WHERE e.os IS NOT NULL) as os_data
      FROM events e
      JOIN api_keys ak ON e.api_key_id = ak.id
      LEFT JOIN (
        SELECT api_key_id, device, COUNT(*) as count
        FROM events
        GROUP BY api_key_id, device
      ) device_counts ON e.api_key_id = device_counts.api_key_id AND e.device = device_counts.device
      LEFT JOIN (
        SELECT api_key_id, browser, COUNT(*) as count
        FROM events
        GROUP BY api_key_id, browser
      ) browser_counts ON e.api_key_id = browser_counts.api_key_id AND e.browser = browser_counts.browser
      LEFT JOIN (
        SELECT api_key_id, os, COUNT(*) as count
        FROM events
        GROUP BY api_key_id, os
      ) os_counts ON e.api_key_id = os_counts.api_key_id AND e.os = os_counts.os
      WHERE ${whereClause}
      GROUP BY e.event_name`,
      params
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          event,
          count: 0,
          uniqueUsers: 0,
          uniqueIps: 0,
          deviceData: {},
          browserData: {},
          osData: {},
        },
      });
    }

    const data = {
      event: result.rows[0].event_name,
      count: parseInt(result.rows[0].count),
      uniqueUsers: parseInt(result.rows[0].unique_users),
      uniqueIps: parseInt(result.rows[0].unique_ips),
      deviceData: result.rows[0].device_data || {},
      browserData: result.rows[0].browser_data || {},
      osData: result.rows[0].os_data || {},
    };

    // Cache the result
    await cacheSet(cacheKey, JSON.stringify(data), 300); // 5 minutes

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting event summary', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving event summary',
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query;
    const authenticatedUserId = req.user?.id;

    // Build cache key
    const cacheKey = `analytics:user:${userId}:${authenticatedUserId}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.debug('Returning cached user stats', { userId });
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    // Query user event statistics
    const query = `
      SELECT
        e.user_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT e.event_name) as unique_events,
        json_object_agg(
          COALESCE(e.device, 'unknown'),
          device_counts.count
        ) FILTER (WHERE e.device IS NOT NULL) as device_details,
        json_agg(DISTINCT e.ip_address) FILTER (WHERE e.ip_address IS NOT NULL) as ip_addresses,
        MAX(e.timestamp) as last_event_at,
        MIN(e.timestamp) as first_event_at,
        json_agg(
          json_build_object(
            'event_name', recent.event_name,
            'timestamp', recent.timestamp,
            'url', recent.url
          ) ORDER BY recent.timestamp DESC
        ) FILTER (WHERE recent.event_name IS NOT NULL) as recent_events
      FROM events e
      JOIN api_keys ak ON e.api_key_id = ak.id
      LEFT JOIN (
        SELECT api_key_id, user_id, device, COUNT(*) as count
        FROM events
        GROUP BY api_key_id, user_id, device
      ) device_counts ON e.api_key_id = device_counts.api_key_id
        AND e.user_id = device_counts.user_id
        AND e.device = device_counts.device
      LEFT JOIN LATERAL (
        SELECT event_name, timestamp, url
        FROM events
        WHERE user_id = e.user_id AND api_key_id = e.api_key_id
        ORDER BY timestamp DESC
        LIMIT 10
      ) recent ON true
      WHERE e.user_id = $1
        ${authenticatedUserId ? 'AND ak.user_id = $2' : ''}
      GROUP BY e.user_id
    `;

    const params = authenticatedUserId ? [userId, authenticatedUserId] : [userId];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no events tracked',
      });
    }

    const userData = result.rows[0];
    const data = {
      userId: userData.user_id,
      totalEvents: parseInt(userData.total_events),
      uniqueEvents: parseInt(userData.unique_events),
      deviceDetails: userData.device_details || {},
      ipAddresses: userData.ip_addresses || [],
      lastEventAt: userData.last_event_at,
      firstEventAt: userData.first_event_at,
      recentEvents: userData.recent_events || [],
    };

    // Cache the result
    await cacheSet(cacheKey, JSON.stringify(data), 180); // 3 minutes

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting user stats', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user statistics',
    });
  }
};

/**
 * Get dashboard overview for authenticated user
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    // Get summary statistics
    const statsQuery = await pool.query(
      `SELECT
        COUNT(DISTINCT ak.id) as total_apps,
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT e.user_id) as unique_users,
        COUNT(DISTINCT DATE(e.timestamp)) as active_days
      FROM api_keys ak
      LEFT JOIN events e ON ak.id = e.api_key_id
        AND e.timestamp >= NOW() - INTERVAL '${parseInt(days as string)} days'
      WHERE ak.user_id = $1 AND ak.is_active = true`,
      [userId]
    );

    // Get top events
    const topEventsQuery = await pool.query(
      `SELECT
        e.event_name,
        COUNT(*) as count
      FROM events e
      JOIN api_keys ak ON e.api_key_id = ak.id
      WHERE ak.user_id = $1
        AND e.timestamp >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY e.event_name
      ORDER BY count DESC
      LIMIT 10`,
      [userId]
    );

    // Get events over time
    const timeSeriesQuery = await pool.query(
      `SELECT
        DATE(e.timestamp) as date,
        COUNT(*) as count
      FROM events e
      JOIN api_keys ak ON e.api_key_id = ak.id
      WHERE ak.user_id = $1
        AND e.timestamp >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(e.timestamp)
      ORDER BY date ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        summary: statsQuery.rows[0],
        topEvents: topEventsQuery.rows,
        timeSeries: timeSeriesQuery.rows,
      },
    });
  } catch (error) {
    logger.error('Error getting dashboard data', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard data',
    });
  }
};
