import { NativeModules, TurboModuleRegistry } from 'react-native';

export const AGORA_NATIVE_REBUILD_HINT =
  'Video is unavailable on this build. From the repo root run `npm run mobile:android` (links native modules and reinstalls the app), then restart Metro with `--reset-cache`.';

/** True when the Agora RTC TurboModule / legacy module is registered. */
export function isAgoraRtcNativeAvailable(): boolean {
  try {
    return (
      TurboModuleRegistry.get('AgoraRtcNg') != null || NativeModules.AgoraRtcNg != null
    );
  } catch {
    return false;
  }
}

/** True when the Agora RTM native module is registered. */
export function isAgoraRtmNativeAvailable(): boolean {
  try {
    return (
      TurboModuleRegistry.get('AgoraRtmNg') != null || NativeModules.AgoraRtmNg != null
    );
  } catch {
    return false;
  }
}

type AgoraRtcModule = typeof import('react-native-agora');
type AgoraRtmModule = typeof import('agora-react-native-rtm');

function resolveCreateEngine(mod: AgoraRtcModule & { default?: unknown }): AgoraRtcModule {
  if (typeof mod.createAgoraRtcEngine === 'function') {
    return mod;
  }
  const fromDefault = mod.default;
  if (typeof fromDefault === 'function') {
    return { ...mod, createAgoraRtcEngine: fromDefault as AgoraRtcModule['createAgoraRtcEngine'] };
  }
  throw new Error(
    'Agora RTC JavaScript failed to load. Stop Metro and run: npx react-native start --reset-cache',
  );
}

/** Loads the RTC SDK after verifying native linking (throws with a clear message otherwise). */
export function loadAgoraRtcModule(): AgoraRtcModule {
  if (!isAgoraRtcNativeAvailable()) {
    throw new Error(AGORA_NATIVE_REBUILD_HINT);
  }
  const mod = require('react-native-agora') as AgoraRtcModule & { default?: unknown };
  if (mod == null) {
    throw new Error(
      'Agora RTC module is empty. Stop Metro and run: npx react-native start --reset-cache',
    );
  }
  return resolveCreateEngine(mod);
}

/** Loads the RTM SDK after verifying native linking. */
/** Agora events may deliver uids as strings (JSON bigint handling). */
export function normalizeAgoraUid(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function loadAgoraRtmModule(): AgoraRtmModule {
  if (!isAgoraRtmNativeAvailable()) {
    throw new Error(AGORA_NATIVE_REBUILD_HINT);
  }
  const mod = require('agora-react-native-rtm') as AgoraRtmModule & { default?: unknown };
  if (mod == null || typeof mod.createAgoraRtmClient !== 'function') {
    throw new Error(
      'Agora RTM JavaScript failed to load. Stop Metro and run: npx react-native start --reset-cache',
    );
  }
  return mod;
}
