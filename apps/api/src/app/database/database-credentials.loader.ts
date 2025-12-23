import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from 'dotenv';
import { join } from 'path';

/**
 * Database credentials interface
 */
export interface DatabaseCredentials {
  username: string;
  password: string;
  host?: string;
  port?: number;
  database?: string;
}

/**
 * Loads database credentials based on environment:
 * - Development/Staging: From .env file
 * - Production: From AWS Secrets Manager
 */
export async function loadDatabaseCredentials(): Promise<DatabaseCredentials> {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Development and Staging: Load from .env file
  if (nodeEnv === 'development' || nodeEnv === 'staging') {
    // Load .env file if not already loaded
    const envPath = join(__dirname, '../../../../.env');
    config({ path: envPath });

    return {
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
      database: process.env.DB_NAME,
    };
  }

  // Production: Load from AWS Secrets Manager
  if (nodeEnv === 'production') {
    const secretName = process.env.AWS_SECRET_NAME || 'tutorix/production/database';
    const region = process.env.AWS_REGION || 'us-east-1';

    try {
      const client = new SecretsManagerClient({ region });
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} does not contain a SecretString`);
      }

      // Parse the secret (assuming JSON format)
      const secrets = JSON.parse(response.SecretString);

      return {
        username: secrets.DB_USERNAME || secrets.username,
        password: secrets.DB_PASSWORD || secrets.password,
        host: secrets.DB_HOST || secrets.host,
        port: secrets.DB_PORT ? parseInt(secrets.DB_PORT, 10) : undefined,
        database: secrets.DB_NAME || secrets.database,
      };
    } catch (error) {
      throw new Error(
        `Failed to load database credentials from AWS Secrets Manager: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Fallback to .env for unknown environments
  const envPath = join(__dirname, '../../../../.env');
  config({ path: envPath });

  return {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
  };
}

