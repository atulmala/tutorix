import {
  buildSlotGrid,
  buildVisibleDayStarts,
  comingSundayStartUtc,
  formatAvailabilityUpdatedTill,
  formatIstDayHeader,
  formatSlotTimeAmPmLabel,
  formatSlotTimeLabel,
  istSlotToUtc,
  listDailySlotStarts,
  needsCalendarUpdateThroughSunday,
  slotKeyFromInstant,
  slotKeyToUtc,
  validateSlotInstant,
} from './tutor-calendar';

describe('tutor-calendar', () => {
  it('lists 25 daily slot starts from 8:00 to 20:00', () => {
    const rows = listDailySlotStarts();
    expect(rows).toHaveLength(25);
    expect(rows[0]).toEqual({ hour: 8, minute: 0 });
    expect(rows[rows.length - 1]).toEqual({ hour: 20, minute: 0 });
  });

  it('formats day header as dd/mm weekday', () => {
    const day = istSlotToUtc(2026, 5, 2, 0, 0);
    expect(formatIstDayHeader(day)).toBe('02/06 Tu');
  });

  it('formats slot times in 24-hour IST without AM/PM', () => {
    expect(formatSlotTimeLabel(7, 0)).toBe('07:00');
    expect(formatSlotTimeLabel(9, 30)).toBe('09:30');
    expect(formatSlotTimeLabel(12, 0)).toBe('12:00');
    expect(formatSlotTimeLabel(15, 0)).toBe('15:00');
    expect(formatSlotTimeLabel(21, 30)).toBe('21:30');
  });

  it('formats slot times in 12-hour AM/PM for weekly UI', () => {
    expect(formatSlotTimeAmPmLabel(7, 0)).toBe('7:00 AM');
    expect(formatSlotTimeAmPmLabel(9, 30)).toBe('9:30 AM');
    expect(formatSlotTimeAmPmLabel(12, 0)).toBe('12:00 PM');
    expect(formatSlotTimeAmPmLabel(15, 0)).toBe('3:00 PM');
    expect(formatSlotTimeAmPmLabel(21, 30)).toBe('9:30 PM');
  });

  it('formats availability updated till label in IST', () => {
    const slot = istSlotToUtc(2026, 5, 3, 15, 0);
    expect(formatAvailabilityUpdatedTill(slot)).toBe('3rd June 15:00');
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

  it('rejects slots that have already started', () => {
    const now = istSlotToUtc(2026, 5, 3, 10, 0);
    const past = istSlotToUtc(2026, 5, 3, 9, 30);
    const upcoming = istSlotToUtc(2026, 5, 3, 10, 30);
    expect(validateSlotInstant(past, now)).toEqual({
      ok: false,
      message: 'Cannot set availability in the past.',
    });
    expect(validateSlotInstant(upcoming, now).ok).toBe(true);
  });

  it('treats missing or pre-Sunday availability as needing a calendar update', () => {
    const wednesday = istSlotToUtc(2026, 5, 3, 10, 0);
    const friday = istSlotToUtc(2026, 5, 5, 15, 0);
    const sundayMorning = istSlotToUtc(2026, 5, 7, 7, 0);
    expect(comingSundayStartUtc(wednesday).toISOString()).toBe(
      istSlotToUtc(2026, 5, 7, 0, 0).toISOString(),
    );
    expect(needsCalendarUpdateThroughSunday(null, wednesday)).toBe(true);
    expect(needsCalendarUpdateThroughSunday(friday, wednesday)).toBe(true);
    expect(needsCalendarUpdateThroughSunday(sundayMorning, wednesday)).toBe(false);
  });

  it('uses today as coming Sunday when today is Sunday', () => {
    const sunday = istSlotToUtc(2026, 5, 7, 9, 0);
    const saturday = istSlotToUtc(2026, 5, 6, 21, 0);
    expect(needsCalendarUpdateThroughSunday(saturday, sunday)).toBe(true);
    expect(needsCalendarUpdateThroughSunday(sunday, sunday)).toBe(false);
  });

  it('builds month day starts from the first of the month', () => {
    const viewStart = istSlotToUtc(2026, 5, 15, 0, 0);
    const days = buildVisibleDayStarts(viewStart, 'month');
    expect(days).toHaveLength(30);
    expect(days[0].toISOString()).toBe(istSlotToUtc(2026, 5, 1, 0, 0).toISOString());
    expect(days[29].toISOString()).toBe(istSlotToUtc(2026, 5, 30, 0, 0).toISOString());
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
    expect(timeSlots).toHaveLength(25);
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveLength(25);
  });
});
