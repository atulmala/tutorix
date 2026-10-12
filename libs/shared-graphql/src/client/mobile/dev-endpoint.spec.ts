import { resolveMobileDevEndpoint } from './dev-endpoint';

const LOCAL = 'http://localhost:3000/api/graphql';

describe('resolveMobileDevEndpoint', () => {
  it('keeps Android on IPv4 loopback so adb reverse is used', () => {
    expect(
      resolveMobileDevEndpoint({
        endpoint: LOCAL,
        platform: 'android',
        metroHost: '192.168.1.20',
        devLanHost: '192.168.1.20',
      }),
    ).toBe('http://127.0.0.1:3000/api/graphql');
  });

  it('rewrites an Android localhost URL that is already 127.0.0.1', () => {
    expect(
      resolveMobileDevEndpoint({
        endpoint: 'http://127.0.0.1:3000/api/graphql',
        platform: 'android',
        metroHost: null,
        devLanHost: null,
      }),
    ).toBe('http://127.0.0.1:3000/api/graphql');
  });

  it('points iOS at the Metro host', () => {
    expect(
      resolveMobileDevEndpoint({
        endpoint: LOCAL,
        platform: 'ios',
        metroHost: '192.168.1.20',
        devLanHost: '10.0.0.4',
      }),
    ).toBe('http://192.168.1.20:3000/api/graphql');
  });

  it('falls back to DEV_LAN_HOST on iOS when Metro host is missing', () => {
    expect(
      resolveMobileDevEndpoint({
        endpoint: LOCAL,
        platform: 'ios',
        metroHost: null,
        devLanHost: '192.168.1.20',
      }),
    ).toBe('http://192.168.1.20:3000/api/graphql');
  });

  it('leaves a non-loopback endpoint unchanged', () => {
    expect(
      resolveMobileDevEndpoint({
        endpoint: 'https://www.tutorix.tech/api/graphql',
        platform: 'android',
        metroHost: '192.168.1.20',
        devLanHost: '192.168.1.20',
      }),
    ).toBe('https://www.tutorix.tech/api/graphql');
  });
});
