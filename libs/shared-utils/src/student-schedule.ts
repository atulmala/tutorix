import { addIstDaysUtc, IST_OFFSET_MS, istTodayStartUtc, toIstParts } from './tutor-calendar';

export const IST_MONDAY_WEEK_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export type IstMondayWeekDay = {
  key: string;
  abbr: (typeof IST_MONDAY_WEEK_ABBR)[number];
  day: number;
  isToday: boolean;
};

export function istMondayWeekDays(now = new Date()): IstMondayWeekDay[] {
  const todayStart = istTodayStartUtc(now);
  const dow = new Date(todayStart.getTime() + IST_OFFSET_MS).getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = addIstDaysUtc(todayStart, offsetToMonday);
  return IST_MONDAY_WEEK_ABBR.map((abbr, index) => {
    const start = addIstDaysUtc(monday, index);
    const parts = toIstParts(start);
    return {
      key: `${parts.year}-${parts.month + 1}-${parts.day}`,
      abbr,
      day: parts.day,
      isToday: start.getTime() === todayStart.getTime(),
    };
  });
}
