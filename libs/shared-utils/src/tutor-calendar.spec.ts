import {
  buildSlotGrid,
  formatAvailabilityUpdatedTill,
  formatIstDayHeader,
  istSlotToUtc,
  listDailySlotStarts,
  slotKeyFromInstant,
  slotKeyToUtc,
  validateSlotInstant,
} from './tutor-calendar';

describe('tutor-calendar', () => {
  it('lists 30 daily slot starts from 7:00 to 21:30', () => {
    const rows = listDailySlotStarts();
    expect(rows).toHaveLength(30);
    expect(rows[0]).toEqual({ hour: 7, minute: 0 });
    expect(rows[rows.length - 1]).toEqual({ hour: 21, minute: 30 });
  });

  it('formats day header as dd/mm weekday', () => {
    const day = istSlotToUtc(2026, 5, 2, 0, 0);
    expect(formatIstDayHeader(day)).toBe('02/06 Tu');
  });

  it('formats availability updated till label in IST', () => {
    const slot = istSlotToUtc(2026, 5, 3, 15, 0);
    expect(formatAvailabilityUpdatedTill(slot)).toBe('3rd June 3:00 PM');
  });

  it('round-trips slot keys through UTC', () => {
    const utc = istSlotToUtc(2026, 5, 2, 7, 30);
    expect(slotKeyFromInstant(utc)).toBe('2026-06-02T07:30');
    expect(slotKeyToUtc('2026-06-02T07:30')?.toISOString()).toBe(utc.toISOString());
  });

  it('rejects misaligned slot times', () => {
    const bad = istSlotToUtc(2026, 5, 2, 7, 15);
    const now = istSlotToUtc(2026, 5, 1, 0, 0);
    expect(validateSlotInstant(bad, now).ok).toBe(false);
  });

  it('builds a week grid with 7 day columns', () => {
    const viewStart = istSlotToUtc(2026, 5, 2, 0, 0);
    const now = istSlotToUtc(2026, 5, 2, 6, 0);
    const { days, timeSlots, cells } = buildSlotGrid({
      viewStartUtc: viewStart,
      mode: 'week',
      selectedKeys: new Set(),
      now,
    });
    expect(days).toHaveLength(7);
    expect(timeSlots).toHaveLength(30);
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveLength(30);
  });
});
