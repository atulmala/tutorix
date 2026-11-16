import {
  PRODUCTION_MOBILE_GRAPHQL_ENDPOINT,
  isInsecureMobileGraphQLEndpoint,
  isProductionMobileUrl,
  resolveMobileGraphQLEndpoint,
} from './endpoint';

describe('isInsecureMobileGraphQLEndpoint', () => {
  it('rejects loopback and http', () => {
    expect(
      isInsecureMobileGraphQLEndpoint('http://localhost:3000/api/graphql'),
    ).toBe(true);
    expect(
      isInsecureMobileGraphQLEndpoint('https://127.0.0.1/api/graphql'),
    ).toBe(true);
    expect(
      isInsecureMobileGraphQLEndpoint('https://10.0.2.2:3000/api/graphql'),
    ).toBe(true);
  });

  it('accepts production https', () => {
    expect(
      isInsecureMobileGraphQLEndpoint(PRODUCTION_MOBILE_GRAPHQL_ENDPOINT),
    ).toBe(false);
  });
});

describe('resolveMobileGraphQLEndpoint', () => {
  it('defaults to localhost in __DEV__ when env is empty', () => {
    expect(resolveMobileGraphQLEndpoint({ isDev: true, env: {} })).toBe(
      'http://localhost:3000/api/graphql',
    );
  });

  it('uses env in __DEV__ even when it is localhost', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: true,
        env: { NX_GRAPHQL_ENDPOINT: 'http://192.168.1.10:3000/api/graphql' },
      }),
    ).toBe('http://192.168.1.10:3000/api/graphql');
  });

  it('falls back to production HTTPS in release when env is missing', () => {
    expect(resolveMobileGraphQLEndpoint({ isDev: false, env: {} })).toBe(
      PRODUCTION_MOBILE_GRAPHQL_ENDPOINT,
    );
  });

  it('rejects a localhost env value in release', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: false,
        env: { VITE_GRAPHQL_ENDPOINT: 'http://localhost:3000/api/graphql' },
      }),
    ).toBe(PRODUCTION_MOBILE_GRAPHQL_ENDPOINT);
  });

  it('keeps a production HTTPS env in release', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: false,
        env: {
          NX_GRAPHQL_ENDPOINT: 'https://tutorix.tech/api/graphql',
        },
      }),
    ).toBe('https://tutorix.tech/api/graphql');
  });

  it('rejects a non-production HTTPS env in release', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: false,
        env: {
          NX_GRAPHQL_ENDPOINT: 'https://dev.tutorix.tech/api/graphql',
        },
      }),
    ).toBe(PRODUCTION_MOBILE_GRAPHQL_ENDPOINT);
  });

  it('keeps a staging HTTPS env in __DEV__', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: true,
        env: {
          NX_GRAPHQL_ENDPOINT: 'https://dev.tutorix.tech/api/graphql',
        },
      }),
    ).toBe('https://dev.tutorix.tech/api/graphql');
  });
});

describe('isProductionMobileUrl', () => {
  it('accepts production hosts over https', () => {
    expect(isProductionMobileUrl('https://www.tutorix.tech')).toBe(true);
    expect(isProductionMobileUrl('https://TUTORIX.tech/privacy')).toBe(true);
  });

  it('rejects other hosts, http, and invalid values', () => {
    expect(isProductionMobileUrl('https://dev.tutorix.tech')).toBe(false);
    expect(isProductionMobileUrl('http://www.tutorix.tech')).toBe(false);
    expect(isProductionMobileUrl('https://www.tutorix.tech.evil.com')).toBe(
      false,
    );
    expect(isProductionMobileUrl('not a url')).toBe(false);
  });
});
