import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from project root
// __dirname will be apps/api/src after compilation
const envPath = join(__dirname, '../../../.env');
config({ path: envPath });

/**
 * TypeORM DataSource configuration for CLI operations (migrations, etc.)
 * This file is used by TypeORM CLI commands and is separate from the NestJS module configuration.
 * 
 * For CLI operations (migrations), we use synchronous .env loading since:
 * - Migrations are typically run in development/staging where .env files are used
 * - TypeORM CLI requires a synchronous DataSource instance
 * - Production migrations should be run with proper environment setup
 * 
 * Note: For production, ensure NODE_ENV and database credentials are set as environment variables
 * before running migrations (not from .env file).
 */
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tutorix',

  // Load all entity files from app modules (including common)
  entities: [join(__dirname, 'app', '**', '*.entity.ts')],

  // Migrations configuration
  migrations: [join(__dirname, 'migrations', '*.ts')],
  migrationsTableName: 'migrations',

  // IMPORTANT: Disable synchronize when using migrations
  synchronize: false,

  logging: process.env.NODE_ENV === 'development',
});

export default dataSource;


