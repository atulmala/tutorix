import {
  baselineRequiredErrorMessage,
  shouldBaselineMigrations,
  shouldRequireMigrationBaseline,
} from './migration-baseline.util';

describe('migration-baseline.util', () => {
  const originalBaseline = process.env.BASELINE_MIGRATIONS;

  afterEach(() => {
    if (originalBaseline === undefined) {
      delete process.env.BASELINE_MIGRATIONS;
    } else {
      process.env.BASELINE_MIGRATIONS = originalBaseline;
    }
  });

  it('detects legacy schema without migration history', () => {
    expect(
      shouldRequireMigrationBaseline({ count: 0 }, { count: 42 }),
    ).toBe(true);
    expect(
      shouldRequireMigrationBaseline({ count: 0 }, { count: 2 }),
    ).toBe(false);
    expect(
      shouldRequireMigrationBaseline({ count: 3 }, { count: 42 }),
    ).toBe(false);
  });

  it('baselines only when env flag set on legacy schema', () => {
    process.env.BASELINE_MIGRATIONS = 'true';
    expect(shouldBaselineMigrations({ count: 0 }, { count: 20 })).toBe(true);
    delete process.env.BASELINE_MIGRATIONS;
    expect(shouldBaselineMigrations({ count: 0 }, { count: 20 })).toBe(false);
  });

  it('documents baseline recovery steps', () => {
    expect(baselineRequiredErrorMessage()).toContain('BASELINE_MIGRATIONS=true');
  });
});
