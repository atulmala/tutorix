import { istSlotToUtc } from './tutor-calendar';
import {
  materializedAvailableSlotStarts,
  presetMonFriFourToEightPmUnavailable,
  unavailableKeysFromBlocks,
  weeklyUnavailabilityKey,
} from './tutor-weekly-calendar';

describe('tutor-weekly-calendar', () => {
  it('materializes available slots when no blocks are set', () => {
    const now = istSlotToUtc(2026, 5, 4, 8, 0);
    const starts = materializedAvailableSlotStarts(new Set(), now);
    expect(starts.length).toBeGreaterThan(100);
  });

  it('excludes blocked weekly keys from materialized starts', () => {
    const now = istSlotToUtc(2026, 5, 4, 8, 0);
    const blocks = unavailableKeysFromBlocks([
      { dayOfWeek: 1, hour: 9, minute: 0 },
    ]);
    const starts = materializedAvailableSlotStarts(blocks, now);
    const monNineUtc = istSlotToUtc(2026, 5, 4, 9, 0);
    expect(starts.some((s) => s.getTime() === monNineUtc.getTime())).toBe(false);
    expect(starts.some((s) => s.getTime() === istSlotToUtc(2026, 5, 4, 10, 0).getTime())).toBe(
      true,
    );
  });

  it('builds Mon–Fri 4–8 PM preset as unavailable outside window', () => {
    const keys = presetMonFriFourToEightPmUnavailable();
    expect(keys.has(weeklyUnavailabilityKey(1, 8, 0))).toBe(true);
    expect(keys.has(weeklyUnavailabilityKey(1, 16, 0))).toBe(false);
    expect(keys.has(weeklyUnavailabilityKey(6, 16, 0))).toBe(true);
  });
});
