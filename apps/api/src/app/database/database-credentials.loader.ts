import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from 'dotenv';
import { join } from 'path';

function emitAgentDebugLog(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: 'ce7057',
    runId: process.env.AGENT_DEBUG_RUN_ID ?? 'pre-fix',
    hypothesisId,
    location: 'apps/api/src/app/database/database-credentials.loader.ts',
    message,
    data,
    timestamp: Date.now(),
  };
  fetch('http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ce7057'},body:JSON.stringify(payload)}).catch(() => { /* debug log fire-and-forget */ });
  console.log('[agent-debug-ce7057]', JSON.stringify(payload));
}

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
 * - Production: From DB_* env when DB_HOST is set; otherwise AWS Secrets Manager
 */
export async function loadDatabaseCredentials(): Promise<DatabaseCredentials> {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // #region agent log
  emitAgentDebugLog('H1,H2,H3', 'database credential loader entered', {
    nodeEnv,
    hasDbHost: Boolean(process.env.DB_HOST?.trim()),
    dbHost: process.env.DB_HOST,
    hasDbPort: Boolean(process.env.DB_PORT?.trim()),
    hasDbUsername: Boolean(process.env.DB_USERNAME?.trim()),
    hasDbPassword: Boolean(process.env.DB_PASSWORD),
    hasDbName: Boolean(process.env.DB_NAME?.trim()),
  });
  // #endregion

  // Development and Staging: Load from .env file
  if (nodeEnv === 'development' || nodeEnv === 'staging') {
    // Load .env file if not already loaded
    const envPath = join(__dirname, '../../../../.env');
    config({ path: envPath });

    // #region agent log
    emitAgentDebugLog('H3', 'using dotenv database credentials branch', {
      nodeEnv,
      envPath,
      hasDbHostAfterDotenv: Boolean(process.env.DB_HOST?.trim()),
    });
    // #endregion

    return {
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
      database: process.env.DB_NAME,
    };
  }

  // Production: Prefer explicit DB_* env when DB_HOST is set (Docker Compose, ECS with env-backed DB settings).
  // Otherwise AWS Secrets Manager (host-only-in-secret setups still use Secrets Manager path).
  if (nodeEnv === 'production') {
    if (process.env.DB_HOST?.trim()) {
      // #region agent log
      emitAgentDebugLog('H1,H2,H4', 'using production env database credentials branch', {
        dbHost: process.env.DB_HOST,
        dbPort: process.env.DB_PORT,
        hasDbUsername: Boolean(process.env.DB_USERNAME?.trim()),
        hasDbPassword: Boolean(process.env.DB_PASSWORD),
        dbName: process.env.DB_NAME,
      });
      // #endregion

      return {
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        database: process.env.DB_NAME,
      };
    }

    const secretName = process.env.AWS_SECRET_NAME || 'tutorix/production/database';
    const region = process.env.AWS_REGION || 'us-east-1';

    // #region agent log
    emitAgentDebugLog('H1,H2,H4', 'using production AWS Secrets Manager branch', {
      hasDbHost: Boolean(process.env.DB_HOST?.trim()),
      dbHostRaw: process.env.DB_HOST,
      secretName,
      region,
      hasAwsAccessKeyId: Boolean(process.env.AWS_ACCESS_KEY_ID),
      hasAwsSecretAccessKey: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
    });
    // #endregion

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
      // #region agent log
      emitAgentDebugLog('H4', 'AWS Secrets Manager database credential load failed', {
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // #endregion

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

