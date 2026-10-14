/**
 * Heuristic for AVD / emulator images (sdk_gphone*, emu64*, etc.).
 * Used so API traffic uses 10.0.2.2 (host loopback) instead of 127.0.0.1
 * (the emulator itself). Physical devices keep 127.0.0.1 + `adb reverse`.
 */
export function looksLikeAndroidEmulator(props: {
  model?: string;
  fingerprint?: string;
}): boolean {
  const model = (props.model ?? '').toLowerCase();
  const fingerprint = (props.fingerprint ?? '').toLowerCase();
  return (
    model.includes('sdk_gphone') ||
    model.includes('emulator') ||
    fingerprint.includes('sdk_gphone') ||
    fingerprint.includes('emu64') ||
    fingerprint.includes('generic_google') ||
    fingerprint.includes('google/sdk_gphone')
  );
}

/**
 * Pick the dev GraphQL URL for a phone or emulator.
 *
 * Android physical + USB: 127.0.0.1 + `adb reverse tcp:3000`. Emulator: 10.0.2.2
 * (host machine). `localhost` on Android is normalized to IPv4 loopback first;
 * `localhost` often resolves to ::1 and stalls before IPv4.
 *
 * iOS uses the Metro host, then DEV_LAN_HOST.
 */
export function resolveMobileDevEndpoint(options: {
  endpoint: string;
  platform: string;
  metroHost: string | null;
  devLanHost: string | null;
  isAndroidEmulator?: boolean;
}): string {
  const { endpoint, platform, metroHost, devLanHost, isAndroidEmulator } =
    options;
  const loopback =
    endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
  if (!loopback) {
    return endpoint;
  }

  if (platform === 'android') {
    const host =
      isAndroidEmulator || metroHost === '10.0.2.2' ? '10.0.2.2' : '127.0.0.1';
    return endpoint
      .replace('://localhost', `://${host}`)
      .replace('://127.0.0.1', `://${host}`);
  }

  const host = metroHost || devLanHost;
  if (!host) {
    return endpoint;
  }

  return endpoint
    .replace('://localhost', `://${host}`)
    .replace('://127.0.0.1', `://${host}`);
}
