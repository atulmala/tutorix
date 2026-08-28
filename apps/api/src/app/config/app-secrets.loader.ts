import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { normalizeFirebaseServiceAccountJson } from './firebase-service-account';

const NEVER_OVERWRITE = new Set([
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
]);

const RAZORPAY_KEYS = new Set(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);

export type TutorixEnv = 'development' | 'staging' | 'production' | 'test';

export type SecretsManagerLike = {
  send: (command: unknown) => Promise<{ SecretString?: string }>;
};

let inflight: Promise<void> | null = null;

export function resetAppSecretsLoaderForTests(): void {
  inflight = null;
}

/**
 * Docker Compose sets NODE_ENV=production on staging too, so Razorpay live
 * keys must key off TUTORIX_ENV, not NODE_ENV.
 */
export function resolveTutorixEnv(
  env: NodeJS.ProcessEnv = process.env,
): TutorixEnv {
  const explicit = env.TUTORIX_ENV?.trim().toLowerCase();
  if (
    explicit === 'development' ||
    explicit === 'staging' ||
    explicit === 'production' ||
    explicit === 'test'
  ) {
    return explicit;
  }
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === 'test' || nodeEnv === 'development' || nodeEnv === 'staging') {
    return nodeEnv;
  }
  return 'development';
}

export function shouldApplyRazorpayFromSecrets(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveTutorixEnv(env) === 'production';
}

/**
 * The AWS SDK warns when both AWS_PROFILE and static access keys are set.
 * On this machine the profile is the identity that can read Secrets Manager;
 * the .env keys belong to a different IAM user.
 */
export function clearStaticAwsKeysWhenProfilePresent(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!env.AWS_PROFILE?.trim()) {
    return false;
  }
  if (!env.AWS_ACCESS_KEY_ID && !env.AWS_SECRET_ACCESS_KEY) {
    return false;
  }
  delete env.AWS_ACCESS_KEY_ID;
  delete env.AWS_SECRET_ACCESS_KEY;
  return true;
}

export async function loadAppSecrets(options?: {
  client?: SecretsManagerLike;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const isolated = Boolean(options?.client || options?.env);
  if (!isolated && inflight) {
    return inflight;
  }
  const run = loadAppSecretsOnce(options);
  if (!isolated) {
    inflight = run;
  }
  return run;
}

async function loadAppSecretsOnce(options?: {
  client?: SecretsManagerLike;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const env = options?.env ?? process.env;
  if (resolveTutorixEnv(env) === 'test') {
    return;
  }

  const secretName = env.AWS_SECRET_NAME?.trim() || 'tutorix/app';
  const region =
    env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
  // Dual AWS_PROFILE + static keys makes the SDK warn. Prefer the profile in
  // this process: it is the identity that can read Secrets Manager.
  if (!options?.client) {
    clearStaticAwsKeysWhenProfilePresent(process.env);
  }
  const client =
    options?.client ?? new SecretsManagerClient({ region });

  let response: { SecretString?: string };
  try {
    response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
  } catch (error) {
    throw new Error(
      `Failed to load ${secretName} from AWS Secrets Manager: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} does not contain a SecretString`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.SecretString);
  } catch {
    throw new Error(`Secret ${secretName} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Secret ${secretName} must be a JSON object`);
  }

  const applyRazorpay = shouldApplyRazorpayFromSecrets(env);
  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    if (NEVER_OVERWRITE.has(key)) continue;
    if (RAZORPAY_KEYS.has(key) && !applyRazorpay) continue;
    if (typeof raw !== 'string' || raw.length === 0) continue;
    if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
      try {
        env[key] = normalizeFirebaseServiceAccountJson(raw);
      } catch {
        env[key] = raw;
      }
      continue;
    }
    env[key] = raw;
  }

  if (!env.DB_USERNAME?.trim() || env.DB_PASSWORD == null || env.DB_PASSWORD === '') {
    throw new Error(`Secret ${secretName} is missing DB_USERNAME or DB_PASSWORD`);
  }
}
