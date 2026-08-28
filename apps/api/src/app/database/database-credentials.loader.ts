import { loadAppSecrets } from '../config/app-secrets.loader';

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
 * Username/password come from AWS Secrets Manager (`tutorix/app`).
 * Host, port, and database stay on process.env (per environment).
 * NODE_ENV=test / TUTORIX_ENV=test skips Secrets Manager.
 */
export async function loadDatabaseCredentials(): Promise<DatabaseCredentials> {
  await loadAppSecrets();

  return {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
  };
}
