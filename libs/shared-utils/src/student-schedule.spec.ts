import { istSlotToUtc } from './tutor-calendar';
import { istMondayWeekDays } from './student-schedule';

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
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days[2].isToday).toBe(true);
  });

  it('treats Sunday as the end of the Monday week', () => {
    const sunday = istSlotToUtc(2026, 8, 20, 10, 0);
    const days = istMondayWeekDays(sunday);
    expect(days[0].day).toBe(14);
    expect(days[6].isToday).toBe(true);
  });
});
