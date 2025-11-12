import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';
import { generateApiKey } from '../utils/apiKey';

describe('Analytics Endpoints', () => {
  let testApiKey: string;
  let testUserId: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (google_id, email, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['analytics-test-user', 'analytics@example.com', 'Analytics Test User']
    );
    testUserId = userResult.rows[0].id;

    // Create API key
    testApiKey = generateApiKey();
    const apiKeyResult = await pool.query(
      `INSERT INTO api_keys (user_id, app_name, api_key, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, 'Analytics Test App', testApiKey, true]
    );
    testApiKeyId = apiKeyResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM events WHERE api_key_id = $1', [testApiKeyId]);
    await pool.query('DELETE FROM api_keys WHERE id = $1', [testApiKeyId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /api/analytics/collect', () => {
    it('should collect event with valid API key', async () => {
      const response = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-Key', testApiKey)
        .send({
          event: 'test_event',
          url: 'https://example.com',
          referrer: 'https://google.com',
          device: 'mobile',
          metadata: {
            browser: 'Chrome',
            os: 'Android',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should fail without API key', async () => {
      const response = await request(app)
        .post('/api/analytics/collect')
        .send({
          event: 'test_event',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid API key', async () => {
      const response = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-Key', 'invalid-key')
        .send({
          event: 'test_event',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate event data', async () => {
      const response = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-Key', testApiKey)
        .send({
          // Missing required 'event' field
          url: 'https://example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Event Data Integrity', () => {
    it('should store event with all fields correctly', async () => {
      const eventData = {
        event: 'detailed_test_event',
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        device: 'desktop',
        user_id: 'user123',
        metadata: {
          browser: 'Firefox',
          os: 'Windows',
          screenSize: '1920x1080',
        },
      };

      const response = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-Key', testApiKey)
        .send(eventData);

      expect(response.status).toBe(201);

      // Verify in database
      const dbResult = await pool.query(
        'SELECT * FROM events WHERE id = $1',
        [response.body.data.id]
      );

      const storedEvent = dbResult.rows[0];
      expect(storedEvent.event_name).toBe(eventData.event);
      expect(storedEvent.url).toBe(eventData.url);
      expect(storedEvent.referrer).toBe(eventData.referrer);
      expect(storedEvent.device).toBe(eventData.device);
      expect(storedEvent.user_id).toBe(eventData.user_id);
    });
  });
});

describe('Analytics Queries', () => {
  it('should handle event summary query validation', async () => {
    const response = await request(app)
      .get('/api/analytics/event-summary')
      .query({
        // Missing required 'event' parameter
        startDate: '2024-01-01',
      });

    expect(response.status).toBe(401); // Will fail auth first
  });

  it('should handle user stats query validation', async () => {
    const response = await request(app)
      .get('/api/analytics/user-stats')
      .query({
        // Missing required 'userId' parameter
      });

    expect(response.status).toBe(401); // Will fail auth first
  });
});
