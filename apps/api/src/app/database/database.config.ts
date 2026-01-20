import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { DatabaseCredentials } from './database-credentials.loader';

// Explicitly import all entities to ensure they're registered
import { User } from '../modules/auth/entities/user.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Otp } from '../modules/auth/entities/otp.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { Tutor } from '../modules/tutor/entities/tutor.entity';
import { AddressEntity } from '../modules/address/entities/address.entity';
import { Example } from '../entities/example.entity';
// Add other entities as they are created

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

    // Explicitly register all entities
    // This is more reliable than glob patterns, especially in compiled environments
    entities: [
      User,
      RefreshToken,
      Otp,
      PasswordResetToken,
      Tutor,
      AddressEntity,
      Example, // Remove this when you no longer need the example entity
      // Add other entities here as they are created
      // Student,
      // Class,
    ],

    // Migrations configuration
    migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
    migrationsTableName: 'migrations',

    // IMPORTANT: Disable synchronize when using migrations
    // Use migrations instead for production-safe schema changes
    synchronize: false,

    // Logging configuration: disable SQL query logs (too verbose)
    // Set to ['error', 'warn'] to keep important logs but exclude SQL queries
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  };
}


