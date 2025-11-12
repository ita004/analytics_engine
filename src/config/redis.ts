import { createClient } from 'redis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

let redisClient: any;

export const connectRedis = async (): Promise<any> => {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis reconnection failed');
        }
        return retries * 100;
      },
    },
  });

  client.on('error', (err) => {
    logger.error('Redis Client Error', err);
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  await client.connect();
  redisClient = client;
  return client;
};

export const getRedisClient = (): any => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

// Cache helper functions
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: string,
  ttl: number = parseInt(process.env.CACHE_TTL || '3600')
): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, value);
  } catch (error) {
    logger.error('Cache set error', { key, error });
  }
};

export const cacheDelete = async (key: string): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error('Cache delete error', { key, error });
  }
};

export const cacheDeletePattern = async (pattern: string): Promise<void> => {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.error('Cache delete pattern error', { pattern, error });
  }
};
