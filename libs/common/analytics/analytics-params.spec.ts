import { normalizeEnvironment, withAnalyticsContext } from './analytics-params';

describe('analytics-params', () => {
  describe('normalizeEnvironment', () => {
    it('normalizes production variants', () => {
      expect(normalizeEnvironment('prod')).toBe('production');
      expect(normalizeEnvironment('PRODUCTION')).toBe('production');
    });

    it('normalizes development variants', () => {
      expect(normalizeEnvironment('dev')).toBe('development');
    });
  });

  describe('withAnalyticsContext', () => {
    it('merges app context into event params', () => {
      expect(
        withAnalyticsContext({ step_id: 'address' }, {
          appName: 'web',
          environment: 'development',
          platform: 'web',
        }),
      ).toEqual({
        step_id: 'address',
        app_name: 'web',
        environment: 'development',
        platform: 'web',
      });
    });
  });
});
