import { pool } from '../config/database';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schemaSql);

    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

runMigrations();
