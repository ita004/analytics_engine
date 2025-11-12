import app from './app';
import { pool, closeDatabase } from './config/database';
import { connectRedis, closeRedis } from './config/redis';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

let server: any;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, closing server gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await closeRedis();
        await closeDatabase();
        logger.info('All connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;
