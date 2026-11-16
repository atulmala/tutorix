import { resolveLegalOrigin } from './config';

describe('resolveLegalOrigin', () => {
  it('uses the env origin in dev', () => {
    expect(
      resolveLegalOrigin({ fromEnv: 'https://dev.tutorix.tech/', isDev: true }),
    ).toBe('https://dev.tutorix.tech');
  });

  it('keeps a production origin in release', () => {
    expect(
      resolveLegalOrigin({ fromEnv: 'https://www.tutorix.tech', isDev: false }),
    ).toBe('https://www.tutorix.tech');
  });

  it('falls back to production for non-production origins in release', () => {
    expect(
      resolveLegalOrigin({ fromEnv: 'https://dev.tutorix.tech', isDev: false }),
    ).toBe('https://www.tutorix.tech');
    expect(
      resolveLegalOrigin({ fromEnv: 'http://localhost:4200', isDev: false }),
    ).toBe('https://www.tutorix.tech');
    expect(resolveLegalOrigin({ fromEnv: '', isDev: false })).toBe(
      'https://www.tutorix.tech',
    );
  });
});
