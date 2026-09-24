import { addIstDaysUtc, istSlotToUtc, istTodayStartUtc } from './tutor-calendar';
import {
  HOME_SCHEDULE_DAY_COUNT,
  istDayKey,
  istHomeScheduleDays,
  istHomeScheduleRange,
  istMondayWeekDays,
  istMondayWeekDaysForOffset,
  istMondayWeekOffset,
} from './student-schedule';

describe('istMondayWeekDays', () => {
  it('returns Monday through Sunday with today marked', () => {
    const wednesday = istSlotToUtc(2026, 8, 16, 10, 0);
    const days = istMondayWeekDays(wednesday);
    expect(days.map((d) => d.abbr)).toEqual([
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT',
      'SUN',
    ]);
    expect(days.map((d) => d.day)).toEqual([14, 15, 16, 17, 18, 19, 20]);
    expect(days.map((d) => d.monthAbbr)).toEqual([
      'Sep',
      'Sep',
      'Sep',
      'Sep',
      'Sep',
      'Sep',
      'Sep',
    ]);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days[2].isToday).toBe(true);
  });

  it('treats Sunday as the end of the Monday week', () => {
    const sunday = istSlotToUtc(2026, 8, 20, 10, 0);
    const days = istMondayWeekDays(sunday);
    expect(days[0].day).toBe(14);
    expect(days[6].isToday).toBe(true);
  });

  it('shifts the Monday week by offset without moving today', () => {
    const wednesday = istSlotToUtc(2026, 8, 16, 10, 0);
    const nextWeek = istMondayWeekDaysForOffset(1, wednesday);
    expect(nextWeek.map((d) => d.day)).toEqual([21, 22, 23, 24, 25, 26, 27]);
    expect(nextWeek.some((d) => d.isToday)).toBe(false);
    expect(istDayKey(wednesday)).toBe('2026-9-16');
    expect(istMondayWeekOffset(istSlotToUtc(2026, 8, 23, 10, 0), wednesday)).toBe(1);
    expect(istMondayWeekOffset(wednesday, wednesday)).toBe(0);
  });
});

describe('istHomeScheduleDays', () => {
  it('starts at today and covers the next two weeks without past days', () => {
    const wednesday = istSlotToUtc(2026, 8, 16, 10, 0);
    const days = istHomeScheduleDays(wednesday);
    expect(days).toHaveLength(HOME_SCHEDULE_DAY_COUNT);
    expect(days[0]).toMatchObject({
      key: '2026-9-16',
      abbr: 'WED',
      day: 16,
      monthAbbr: 'Sep',
      isToday: true,
    });
    expect(days[13]).toMatchObject({
      key: '2026-9-29',
      abbr: 'TUE',
      day: 29,
      monthAbbr: 'Sep',
      isToday: false,
    });
    expect(days.map((d) => d.day)).not.toContain(14);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);

    const range = istHomeScheduleRange(wednesday);
    expect(range.from.getTime()).toBe(istTodayStartUtc(wednesday).getTime());
    expect(range.to.getTime()).toBe(addIstDaysUtc(range.from, HOME_SCHEDULE_DAY_COUNT).getTime());
  });

  it('rolls into the next month', () => {
    const lateSeptember = istSlotToUtc(2026, 8, 24, 10, 0);
    const days = istHomeScheduleDays(lateSeptember);
    expect(days[0]).toMatchObject({ day: 24, monthAbbr: 'Sep', abbr: 'THU' });
    expect(days[13]).toMatchObject({ day: 7, monthAbbr: 'Oct', abbr: 'WED' });
  });
});
