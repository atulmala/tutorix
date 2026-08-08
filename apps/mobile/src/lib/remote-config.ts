import remoteConfig from '@react-native-firebase/remote-config';

export const REMOTE_CONFIG_DEFAULTS = {
  min_supported_version: '1.0.0',
  latest_version: '1.0.0',
  ios_store_url: 'https://apps.apple.com',
  android_store_url: 'https://play.google.com/store',
  force_update_message:
    'A required update is available. Please update Tutorix to continue.',
  optional_update_message:
    'A newer version of Tutorix is available. Update for the latest improvements.',
} as const;

export type RemoteConfigDefaults = typeof REMOTE_CONFIG_DEFAULTS;
export type RemoteConfigStringKey = keyof RemoteConfigDefaults;

let initialized = false;

/**
 * Initialize Firebase Remote Config with in-app defaults and activate fetched values.
 * Used for force/optional app update gates only (registration flags come from GraphQL).
 */
export async function initializeRemoteConfig(): Promise<void> {
  if (initialized) {
    return;
  }

  const rc = remoteConfig();
  await rc.setDefaults({ ...REMOTE_CONFIG_DEFAULTS });
  await rc.setConfigSettings({
    minimumFetchIntervalMillis:
      typeof __DEV__ !== 'undefined' && __DEV__ ? 0 : 60 * 60 * 1000,
  });

  try {
    await rc.fetchAndActivate();
  } catch (error) {
    console.warn(
      '[remote-config] fetchAndActivate failed; using defaults/cached values',
      error,
    );
  }

  initialized = true;
}

export function isRemoteConfigReady(): boolean {
  return initialized;
}

export function getRemoteConfigString(key: RemoteConfigStringKey): string {
  try {
    return remoteConfig().getValue(key).asString();
  } catch {
    return REMOTE_CONFIG_DEFAULTS[key];
  }
}

/** Re-fetch without resetting the ready flag (foreground refresh). */
export async function refreshRemoteConfig(): Promise<void> {
  try {
    const rc = remoteConfig();
    await rc.fetchAndActivate();
  } catch (error) {
    console.warn('[remote-config] refresh failed', error);
  }
}
