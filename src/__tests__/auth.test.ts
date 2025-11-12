import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';
import { generateApiKey } from '../utils/apiKey';

describe('Authentication Endpoints', () => {
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Create a test user directly in the database
    const result = await pool.query(
      `INSERT INTO users (google_id, email, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['test-google-id', 'test@example.com', 'Test User']
    );
    userId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test user
    await pool.query('DELETE FROM users WHERE google_id = $1', ['test-google-id']);
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app).get('/api/auth/google');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('google');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          app_name: 'Test App',
          app_domain: 'https://test.com',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('API Key Management', () => {
  let testUserId: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    const userResult = await pool.query(
      `INSERT INTO users (google_id, email, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['test-user-2', 'test2@example.com', 'Test User 2']
    );
    testUserId = userResult.rows[0].id;

    const apiKeyResult = await pool.query(
      `INSERT INTO api_keys (user_id, app_name, api_key)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [testUserId, 'Test App', generateApiKey()]
    );
    testApiKeyId = apiKeyResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM api_keys WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should create API key successfully', async () => {
    const apiKey = generateApiKey();
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, app_name, api_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [testUserId, 'New Test App', apiKey]
    );

    expect(result.rows[0].app_name).toBe('New Test App');
    expect(result.rows[0].api_key).toBe(apiKey);
    expect(result.rows[0].is_active).toBe(true);
  });

  it('should retrieve API keys for user', async () => {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE user_id = $1',
      [testUserId]
    );

    expect(result.rows.length).toBeGreaterThan(0);
  });
});
