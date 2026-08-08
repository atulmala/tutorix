/**
 * Unit tests for semver helpers used by the mobile update gate.
 */
import { compareSemver, isVersionLessThan } from './semver';

describe('semver', () => {
  it('compares major.minor.patch', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('treats missing patch as 0', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(isVersionLessThan('1.0', '1.0.1')).toBe(true);
  });

  it('strips leading v', () => {
    expect(compareSemver('v1.2.3', '1.2.3')).toBe(0);
  });
});
