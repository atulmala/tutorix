/**
 * Pick the dev GraphQL URL for a phone.
 *
 * Android over USB must stay on 127.0.0.1. `adb reverse` only forwards IPv4,
 * and `localhost` often resolves to ::1 first, so each request waits out an
 * IPv6 timeout before content shows. A Metro LAN address is for iOS. Using it
 * on Android sends API traffic over Wi-Fi even when the cable is connected.
 */
export function resolveMobileDevEndpoint(options: {
  endpoint: string;
  platform: string;
  metroHost: string | null;
  devLanHost: string | null;
}): string {
  const { endpoint, platform, metroHost, devLanHost } = options;
  const loopback =
    endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
  if (!loopback) {
    return endpoint;
  }

  if (platform === 'android') {
    return endpoint.replace('://localhost', '://127.0.0.1');
  }

  const host = metroHost || devLanHost;
  if (!host) {
    return endpoint;
  }

  return endpoint
    .replace('://localhost', `://${host}`)
    .replace('://127.0.0.1', `://${host}`);
}
