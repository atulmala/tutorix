const { applyDevLanHost, applyGraphqlEndpointAlias, pickLanHost } = require('./detect-lan-host.cjs');

describe('pickLanHost', () => {
  it('prefers 192.168/16 on en0 over docker and other private nets', () => {
    expect(
      pickLanHost({
        lo0: [
          { address: '127.0.0.1', family: 'IPv4', internal: true },
        ],
        docker0: [
          { address: '172.17.0.1', family: 'IPv4', internal: false },
        ],
        en0: [
          { address: '192.168.1.42', family: 'IPv4', internal: false },
        ],
        utun2: [
          { address: '10.8.0.2', family: 'IPv4', internal: false },
        ],
      }),
    ).toBe('192.168.1.42');
  });

  it('skips link-local addresses', () => {
    expect(
      pickLanHost({
        en0: [
          { address: '169.254.12.34', family: 'IPv4', internal: false },
        ],
      }),
    ).toBeNull();
  });

  it('accepts Node family 4', () => {
    expect(
      pickLanHost({
        eth0: [{ address: '10.0.0.8', family: 4, internal: false }],
      }),
    ).toBe('10.0.0.8');
  });
});

describe('applyGraphqlEndpointAlias', () => {
  it('copies VITE_GRAPHQL_ENDPOINT onto NX_GRAPHQL_ENDPOINT when unset', () => {
    const env: NodeJS.ProcessEnv = {
      VITE_GRAPHQL_ENDPOINT: 'http://localhost:3000/api/graphql',
    };
    applyGraphqlEndpointAlias(env);
    expect(env.NX_GRAPHQL_ENDPOINT).toBe('http://localhost:3000/api/graphql');
    expect(env.GRAPHQL_ENDPOINT).toBe('http://localhost:3000/api/graphql');
  });
});

describe('applyDevLanHost', () => {
  it('keeps an explicit override', () => {
    const env: NodeJS.ProcessEnv = { DEV_LAN_HOST: '10.1.2.3' };
    expect(applyDevLanHost(env)).toBe('10.1.2.3');
    expect(env.DEV_LAN_HOST).toBe('10.1.2.3');
  });

  it('replaces loopback with a detected LAN address when one exists', () => {
    const env: NodeJS.ProcessEnv = { DEV_LAN_HOST: 'localhost' };
    const result = applyDevLanHost(env);
    if (result) {
      expect(result).not.toBe('localhost');
      expect(env.DEV_LAN_HOST).toBe(result);
    }
  });
});
