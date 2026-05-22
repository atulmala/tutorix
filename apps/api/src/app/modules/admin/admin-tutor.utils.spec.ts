import { computeDaysInStage } from './admin-tutor.utils';

describe('computeDaysInStage', () => {
  it('returns 0 when enteredAt is missing', () => {
    expect(computeDaysInStage(undefined)).toBe(0);
    expect(computeDaysInStage(null)).toBe(0);
  });

  it('returns whole days since enteredAt', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const enteredAt = new Date('2026-05-17T12:00:00.000Z');
    expect(computeDaysInStage(enteredAt, now)).toBe(5);
  });

  it('never returns negative days', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const enteredAt = new Date('2026-05-23T12:00:00.000Z');
    expect(computeDaysInStage(enteredAt, now)).toBe(0);
  });
});
