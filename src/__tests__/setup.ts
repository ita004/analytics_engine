import { pool } from '../config/database';
import { getRedisClient, connectRedis } from '../config/redis';

// Setup before all tests
beforeAll(async () => {
  // Connect to Redis
  await connectRedis();
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connections
  await pool.end();

  // Close Redis connection
  const redis = getRedisClient();
  if (redis) {
    await redis.quit();
  }
});

// Clear data before each test
beforeEach(async () => {
  // Clear test data if needed
});
