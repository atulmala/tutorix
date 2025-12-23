import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { DatabaseCredentials } from './database-credentials.loader';

/**
 * Creates database options with credentials
 * Credentials are loaded from .env (dev/staging) or AWS Secrets Manager (production)
 */
export function createDatabaseOptions(
  credentials: DatabaseCredentials,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: credentials.host || process.env.DB_HOST || 'localhost',
    port: credentials.port || parseInt(process.env.DB_PORT || '5432', 10),
    username: credentials.username,
    password: credentials.password,
    database: credentials.database || process.env.DB_NAME || 'tutorix',

    // Load all entity files from app modules (including common)
    entities: [join(__dirname, '..', '**', '*.entity.ts')],

    // Migrations configuration
    migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
    migrationsTableName: 'migrations',

    // IMPORTANT: Disable synchronize when using migrations
    // Use migrations instead for production-safe schema changes
    synchronize: false,

    logging: process.env.NODE_ENV === 'development',
  };
}


