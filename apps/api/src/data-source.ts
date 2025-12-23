import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { createDatabaseOptions } from './app/database/database.config';
import { loadDatabaseCredentials } from './app/database/database-credentials.loader';

// Load environment variables from project root
// __dirname will be apps/api/src after compilation
const envPath = join(__dirname, '../../../.env');
config({ path: envPath });

/**
 * TypeORM DataSource configuration for CLI operations (migrations, etc.)
 * This file is used by TypeORM CLI commands and is separate from the NestJS module configuration.
 * 
 * TypeORM CLI supports async data source creation via a function export.
 * This allows us to load credentials from AWS Secrets Manager in production.
 * 
 * Credential loading:
 * - Development/Staging: From .env file (via loadDatabaseCredentials)
 * - Production: From AWS Secrets Manager (via loadDatabaseCredentials)
 */
async function createDataSource(): Promise<DataSource> {
  // Load credentials based on environment
  // loadDatabaseCredentials() automatically detects NODE_ENV and:
  // - For development/staging: loads from .env file
  // - For production: loads from AWS Secrets Manager
  const credentials = await loadDatabaseCredentials();
  const options = createDatabaseOptions(credentials);
  return new DataSource(options);
}

// Export async function for TypeORM CLI (supports async data source creation)
export default createDataSource;


