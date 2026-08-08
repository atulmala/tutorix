/**
 * Simple semver compare for app update gates (major.minor.patch).
 * Non-numeric segments are treated as 0.
 */

function parseParts(version: string): number[] {
  return String(version)
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .slice(0, 3)
    .map((part) => {
      const n = parseInt(part.replace(/[^0-9].*$/, ''), 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** Negative if a < b, 0 if equal, positive if a > b */
export function compareSemver(a: string, b: string): number {
  const pa = parseParts(a);
  const pb = parseParts(b);
  for (let i = 0; i < 3; i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function isVersionLessThan(a: string, b: string): boolean {
  return compareSemver(a, b) < 0;
}
