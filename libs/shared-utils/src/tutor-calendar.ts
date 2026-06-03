/**
 * Tutor teaching calendar grid (IST). Shared by API and clients.
 */

import { isRateCardComplete, type RateCardLike } from './rate-card';

export const TUTOR_CALENDAR_TIMEZONE = 'Asia/Kolkata';
/** IST is UTC+5:30 (no DST). */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const SLOT_DURATION_MINUTES = 60;
export const SLOT_INTERVAL_MINUTES = 30;
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const MAX_WEEKS_AHEAD = 8;

export const RATE_CARD_REQUIRED_MESSAGE =
  'Set up at least one rate card before adding availability.';

export type CalendarViewMode = 'week' | 'month';

/** Full rate card fields or profile summary with `isComplete` only. */
export type OfferingRateCardRef =
  | RateCardLike
  | { isComplete: boolean };

export type OfferingWithRateCard = {
  rateCard?: OfferingRateCardRef | null;
};

function isRateCardSummaryComplete(
  rateCard: OfferingRateCardRef,
): rateCard is { isComplete: boolean } {
  return 'isComplete' in rateCard && rateCard.isComplete === true;
}

export function tutorHasAtLeastOneCompleteRateCard(
  offerings: OfferingWithRateCard[],
): boolean {
  return offerings.some((o) => {
    const rateCard = o.rateCard;
    if (!rateCard) return false;
    if (isRateCardSummaryComplete(rateCard)) return true;
    return isRateCardComplete(rateCard);
  });
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export type IstDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Calendar date parts in IST for an instant. */
export function toIstParts(instant: Date): IstDateParts {
  const t = instant.getTime() + IST_OFFSET_MS;
  const d = new Date(t);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** Start of IST calendar day as UTC instant. */
export function istDayStartUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}

export function istSlotToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(
    Date.UTC(year, month, day, hour, minute, 0, 0) - IST_OFFSET_MS,
  );
}

/** Slot key in IST local form `YYYY-MM-DDTHH:mm`. */
export function slotKeyFromParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}

export function slotKeyFromInstant(instant: Date): string {
  const p = toIstParts(instant);
  return slotKeyFromParts(p.year, p.month, p.day, p.hour, p.minute);
}

export function parseSlotKey(key: string): IstDateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(key.trim());
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]) - 1,
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

export function slotKeyToUtc(key: string): Date | null {
  const p = parseSlotKey(key);
  if (!p) return null;
  return istSlotToUtc(p.year, p.month, p.day, p.hour, p.minute);
}

/** IST midnight at start of today. */
export function istTodayStartUtc(now = new Date()): Date {
  const p = toIstParts(now);
  return istDayStartUtc(p.year, p.month, p.day);
}

export function addIstDaysUtc(startUtc: Date, days: number): Date {
  const p = toIstParts(startUtc);
  return istDayStartUtc(p.year, p.month, p.day + days);
}

export function maxHorizonEndUtc(now = new Date()): Date {
  return addIstDaysUtc(istTodayStartUtc(now), MAX_WEEKS_AHEAD * 7);
}

/** Daily row labels from 7:00 through 21:30. */
export function listDailySlotStarts(): Array<{ hour: number; minute: number }> {
  const rows: Array<{ hour: number; minute: number }> = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    rows.push({ hour: h, minute: 0 });
    rows.push({ hour: h, minute: 30 });
  }
  return rows;
}

export function isValidSlotMinute(minute: number): boolean {
  return minute === 0 || minute === 30;
}

export function isOnDailyGrid(hour: number, minute: number): boolean {
  if (!isValidSlotMinute(minute)) return false;
  return hour >= DAY_START_HOUR && hour <= DAY_END_HOUR - 1;
}

export function validateSlotInstant(
  startsAt: Date,
  now = new Date(),
): { ok: true } | { ok: false; message: string } {
  const p = toIstParts(startsAt);
  if (!isOnDailyGrid(p.hour, p.minute)) {
    return { ok: false, message: 'Slot must align to the 30-minute teaching grid (7:00 AM–9:30 PM IST).' };
  }
  if (
    startsAt.getUTCSeconds() !== 0 ||
    startsAt.getUTCMilliseconds() !== 0
  ) {
    return { ok: false, message: 'Slot start must be exact to the minute.' };
  }
  const todayStart = istTodayStartUtc(now);
  if (startsAt < now) {
    return { ok: false, message: 'Cannot set availability in the past.' };
  }
  const horizon = maxHorizonEndUtc(now);
  if (startsAt >= horizon) {
    return {
      ok: false,
      message: `Availability can only be set up to ${MAX_WEEKS_AHEAD} weeks ahead.`,
    };
  }
  return { ok: true };
}

export type SlotGridCell = {
  key: string;
  startsAtUtc: Date;
  dayIndex: number;
  /** Index into `timeSlots` / column in the day-as-row layout */
  timeIndex: number;
  disabled: boolean;
};

export function buildVisibleDayStarts(viewStartUtc: Date, mode: CalendarViewMode): Date[] {
  const days: Date[] = [];
  if (mode === 'week') {
    for (let i = 0; i < 7; i++) {
      days.push(addIstDaysUtc(viewStartUtc, i));
    }
    return days;
  }
  const p = toIstParts(viewStartUtc);
  const firstOfMonth = istDayStartUtc(p.year, p.month, 1);
  const month = p.month;
  const year = p.year;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(istDayStartUtc(year, month, d));
  }
  return days;
}

export function buildSlotGrid(options: {
  viewStartUtc: Date;
  mode: CalendarViewMode;
  selectedKeys: Set<string>;
  now?: Date;
}): {
  days: Date[];
  timeSlots: Array<{ hour: number; minute: number }>;
  /** cells[dayIndex][timeIndex] — one row per day, one column per time */
  cells: SlotGridCell[][];
} {
  const now = options.now ?? new Date();
  const todayStart = istTodayStartUtc(now);
  const horizon = maxHorizonEndUtc(now);
  const days = buildVisibleDayStarts(options.viewStartUtc, options.mode);
  const timeSlots = listDailySlotStarts();
  const cells: SlotGridCell[][] = days.map((dayStart, dayIndex) =>
    timeSlots.map((slot, timeIndex) => {
      const p = toIstParts(dayStart);
      const key = slotKeyFromParts(p.year, p.month, p.day, slot.hour, slot.minute);
      const startsAtUtc = istSlotToUtc(p.year, p.month, p.day, slot.hour, slot.minute);
      const beforeToday = dayStart < todayStart;
      const afterHorizon = startsAtUtc >= horizon;
      const inPast = startsAtUtc < now;
      const disabled = beforeToday || afterHorizon || inPast;
      return {
        key,
        startsAtUtc,
        dayIndex,
        timeIndex,
        disabled,
      };
    }),
  );
  return { days, timeSlots, cells };
}

export function clampViewStartUtc(
  candidate: Date,
  mode: CalendarViewMode,
  now = new Date(),
): Date {
  const todayStart = istTodayStartUtc(now);
  let start = candidate < todayStart ? todayStart : candidate;
  const horizon = maxHorizonEndUtc(now);
  if (mode === 'week') {
    const maxWeekStart = addIstDaysUtc(horizon, -6);
    if (start > maxWeekStart) start = maxWeekStart;
    return start;
  }
  const p = toIstParts(start);
  const monthStart = istDayStartUtc(p.year, p.month, 1);
  if (monthStart < todayStart) return todayStart;
  const horizonParts = toIstParts(horizon);
  const lastMonthStart = istDayStartUtc(horizonParts.year, horizonParts.month, 1);
  if (monthStart > lastMonthStart) return lastMonthStart;
  return monthStart;
}

export function formatSlotTimeLabel(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${pad2(minute)} ${ampm}`;
}

const IST_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function ordinalIstDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** e.g. `3rd June 3:00 PM` for the latest saved availability slot (IST). */
export function formatAvailabilityUpdatedTill(instant: Date): string {
  const p = toIstParts(instant);
  const month = IST_MONTH_NAMES[p.month] ?? 'Unknown';
  return `${ordinalIstDay(p.day)} ${month} ${formatSlotTimeLabel(p.hour, p.minute)}`;
}

const IST_DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/** Column header: `02/06 Tu` (dd/mm + two-letter weekday, IST). */
export function formatIstDayHeader(dayStartUtc: Date): string {
  const p = toIstParts(dayStartUtc);
  const dow = new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay();
  return `${pad2(p.day)}/${pad2(p.month + 1)} ${IST_DAY_ABBR[dow]}`;
}

export function formatIstDayLabel(dayStartUtc: Date): string {
  return formatIstDayHeader(dayStartUtc);
}

export function formatViewRangeLabel(
  viewStartUtc: Date,
  mode: CalendarViewMode,
): string {
  const days = buildVisibleDayStarts(viewStartUtc, mode);
  if (days.length === 0) return '';
  const first = formatIstDayHeader(days[0]);
  const last = formatIstDayHeader(days[days.length - 1]);
  if (mode === 'month') {
    const p = toIstParts(viewStartUtc);
    return new Date(Date.UTC(p.year, p.month, 1)).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return first === last ? first : `${first} – ${last}`;
}

export function shiftViewStart(
  viewStartUtc: Date,
  mode: CalendarViewMode,
  direction: -1 | 1,
  now = new Date(),
): Date {
  const deltaDays = mode === 'week' ? direction * 7 : 0;
  const next =
    mode === 'week'
      ? addIstDaysUtc(viewStartUtc, deltaDays)
      : (() => {
          const p = toIstParts(viewStartUtc);
          const m = p.month + direction;
          return istDayStartUtc(p.year, m, 1);
        })();
  return clampViewStartUtc(next, mode, now);
}

export function rangeForVisibleGrid(
  viewStartUtc: Date,
  mode: CalendarViewMode,
): { rangeStart: Date; rangeEnd: Date } {
  const days = buildVisibleDayStarts(viewStartUtc, mode);
  const rangeStart = days[0] ?? viewStartUtc;
  const lastDay = days[days.length - 1] ?? viewStartUtc;
  const lastParts = toIstParts(lastDay);
  const rangeEnd = istSlotToUtc(
    lastParts.year,
    lastParts.month,
    lastParts.day + 1,
    0,
    0,
  );
  return { rangeStart, rangeEnd };
}
