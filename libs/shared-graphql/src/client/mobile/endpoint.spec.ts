import {
  PRODUCTION_MOBILE_GRAPHQL_ENDPOINT,
  isInsecureMobileGraphQLEndpoint,
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

  it('keeps an explicit HTTPS env in release', () => {
    expect(
      resolveMobileGraphQLEndpoint({
        isDev: false,
        env: {
          NX_GRAPHQL_ENDPOINT: 'https://dev.tutorix.tech/api/graphql',
        },
      }),
    ).toBe('https://dev.tutorix.tech/api/graphql');
  });
});
