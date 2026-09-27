import { addIstDaysUtc, IST_OFFSET_MS, istTodayStartUtc, toIstParts } from './tutor-calendar';

export const IST_MONDAY_WEEK_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const IST_MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type IstMondayWeekDay = {
  key: string;
  abbr: (typeof IST_MONDAY_WEEK_ABBR)[number];
  monthAbbr: (typeof IST_MONTH_ABBR)[number];
  day: number;
  isToday: boolean;
};

export function istMondayWeekRange(
  weekOffset = 0,
  now = new Date(),
): { weekStart: Date; weekEnd: Date } {
  const todayStart = istTodayStartUtc(now);
  const dow = new Date(todayStart.getTime() + IST_OFFSET_MS).getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const weekStart = addIstDaysUtc(todayStart, offsetToMonday + weekOffset * 7);
  return { weekStart, weekEnd: addIstDaysUtc(weekStart, 7) };
}

export function istMondayWeekDaysForOffset(
  weekOffset = 0,
  now = new Date(),
): IstMondayWeekDay[] {
  const todayStart = istTodayStartUtc(now);
  const { weekStart } = istMondayWeekRange(weekOffset, now);
  return IST_MONDAY_WEEK_ABBR.map((abbr, index) => {
    const start = addIstDaysUtc(weekStart, index);
    const parts = toIstParts(start);
    return {
      key: `${parts.year}-${parts.month + 1}-${parts.day}`,
      abbr,
      monthAbbr: IST_MONTH_ABBR[parts.month],
      day: parts.day,
      isToday: start.getTime() === todayStart.getTime(),
    };
  });
}

export function istMondayWeekDays(now = new Date()): IstMondayWeekDay[] {
  return istMondayWeekDaysForOffset(0, now);
}

export const HOME_SCHEDULE_DAY_COUNT = 14;

export function istHomeScheduleRange(
  now = new Date(),
  dayCount = HOME_SCHEDULE_DAY_COUNT,
): { from: Date; to: Date } {
  const from = istTodayStartUtc(now);
  return { from, to: addIstDaysUtc(from, dayCount) };
}

/** Today (IST) through the next two weeks, excluding past days. */
export function istHomeScheduleDays(
  now = new Date(),
  dayCount = HOME_SCHEDULE_DAY_COUNT,
): IstMondayWeekDay[] {
  const todayStart = istTodayStartUtc(now);
  return Array.from({ length: dayCount }, (_, index) => {
    const start = addIstDaysUtc(todayStart, index);
    const parts = toIstParts(start);
    const dow = new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
    const abbrIndex = dow === 0 ? 6 : dow - 1;
    return {
      key: `${parts.year}-${parts.month + 1}-${parts.day}`,
      abbr: IST_MONDAY_WEEK_ABBR[abbrIndex],
      monthAbbr: IST_MONTH_ABBR[parts.month],
      day: parts.day,
      isToday: start.getTime() === todayStart.getTime(),
    };
  });
}

export function istDayKey(instant: Date): string {
  const parts = toIstParts(instant);
  return `${parts.year}-${parts.month + 1}-${parts.day}`;
}

/** Monday-week index of `instant` relative to the week containing `now` (0 = this week). */
export function istMondayWeekOffset(instant: Date, now = new Date()): number {
  const { weekStart: current } = istMondayWeekRange(0, now);
  const { weekStart: target } = istMondayWeekRange(0, instant);
  return Math.round((target.getTime() - current.getTime()) / (7 * 24 * 60 * 60 * 1000));
}
