const os = require('os');

const SKIP_IFACE =
  /^(lo|docker|br-|veth|cni|flannel|tun|utun|awdl|llw|bridge|vmnet|vboxnet|ap\d)/i;

function isIpv4(family) {
  return family === 'IPv4' || family === 4;
}

function rfc1918Rank(address) {
  if (address.startsWith('169.254.')) {
    return -1;
  }
  const parts = address.split('.').map(Number);
  if (parts[0] === 192 && parts[1] === 168) {
    return 3;
  }
  if (parts[0] === 10) {
    return 2;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    // Docker's default bridge is 172.17.0.0/16; keep it last among private nets.
    return parts[1] === 17 ? 0 : 1;
  }
  return -1;
}

function ifacePreference(name) {
  if (/^(en0|eth0|wlan0)$/i.test(name)) {
    return 2;
  }
  if (/^(en\d+|eth\d+|wlan\d+)$/i.test(name)) {
    return 1;
  }
  return 0;
}

/**
 * Pick a LAN IPv4 the phone can likely reach. Prefers 192.168/16 on en0/eth0/wlan0.
 * @param {NodeJS.Dict<os.NetworkInterfaceInfo[]>} ifaces
 * @returns {string | null}
 */
function pickLanHost(ifaces) {
  const candidates = [];
  for (const [name, addrs] of Object.entries(ifaces || {})) {
    if (SKIP_IFACE.test(name)) {
      continue;
    }
    for (const addr of addrs || []) {
      if (!isIpv4(addr.family) || addr.internal) {
        continue;
      }
      const rank = rfc1918Rank(addr.address);
      if (rank < 0) {
        continue;
      }
      candidates.push({
        address: addr.address,
        rank,
        iface: ifacePreference(name),
      });
    }
  }
  candidates.sort((a, b) => b.rank - a.rank || b.iface - a.iface);
  return candidates[0]?.address ?? null;
}

function detectLanHost() {
  return pickLanHost(os.networkInterfaces());
}

/**
 * Local .env stores the API URL as VITE_GRAPHQL_ENDPOINT. Metro/Babel must
 * copy it onto the names the mobile client actually reads.
 * @param {NodeJS.ProcessEnv} [env]
 */
function applyGraphqlEndpointAlias(env = process.env) {
  const vite = env.VITE_GRAPHQL_ENDPOINT?.trim();
  if (!vite) {
    return;
  }
  if (!env.NX_GRAPHQL_ENDPOINT?.trim()) {
    env.NX_GRAPHQL_ENDPOINT = vite;
  }
  if (!env.GRAPHQL_ENDPOINT?.trim()) {
    env.GRAPHQL_ENDPOINT = vite;
  }
}

/**
 * Set `DEV_LAN_HOST` from this machine's LAN IPv4 when it is unset or loopback.
 * An explicit .env value (VPN, USB, etc.) wins.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
function applyDevLanHost(env = process.env) {
  const existing = env.DEV_LAN_HOST?.trim();
  if (existing && existing !== 'localhost' && existing !== '127.0.0.1') {
    return existing;
  }
  const detected = detectLanHost();
  if (detected) {
    env.DEV_LAN_HOST = detected;
  }
  return detected;
}

module.exports = {
  pickLanHost,
  detectLanHost,
  applyDevLanHost,
  applyGraphqlEndpointAlias,
};
