import { istDayKey, istMondayWeekDaysForOffset, istMondayWeekOffset } from './student-schedule';
import {
  formatSlotTimeAmPmLabel,
  MAX_WEEKS_AHEAD,
  maxHorizonEndUtc,
  SLOT_DURATION_MINUTES,
  toIstParts,
} from './tutor-calendar';

export const STUDENT_BOOKING_WEEK_COUNT = MAX_WEEKS_AHEAD;
export const STUDENT_BOOKING_MAX_WEEK_OFFSET = MAX_WEEKS_AHEAD - 1;

export type StudentBookingDeliveryMode = 'online' | 'offline';

export type StudentBookingDraft = {
  tutorId: string;
  offeringId: string;
  tutorCalendarId?: string;
  deliveryMode?: StudentBookingDeliveryMode;
  startsAt?: string;
};

const IST_WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const IST_MONTH_SHORT = [
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

export function bookingHorizonRange(now = new Date()): { from: Date; to: Date } {
  return { from: now, to: maxHorizonEndUtc(now) };
}

export function lockedDeliveryMode(
  offlineEnabled: boolean,
  onlineEnabled: boolean,
): StudentBookingDeliveryMode | null {
  if (offlineEnabled && !onlineEnabled) {
    return 'offline';
  }
  if (onlineEnabled && !offlineEnabled) {
    return 'online';
  }
  return null;
}

export function formatIstBookingDateLabel(instant: Date): string {
  const parts = toIstParts(instant);
  const dow = new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
  return `${IST_WEEKDAY_SHORT[dow]} ${parts.day} ${IST_MONTH_SHORT[parts.month]}`;
}

export function formatIstBookingTimeRange(
  startsAt: Date,
  durationMinutes = SLOT_DURATION_MINUTES,
): string {
  const start = toIstParts(startsAt);
  const end = toIstParts(new Date(startsAt.getTime() + durationMinutes * 60_000));
  return `${formatSlotTimeAmPmLabel(start.hour, start.minute)} – ${formatSlotTimeAmPmLabel(end.hour, end.minute)}`;
}

export function formatIstBookingChipLabel(startsAt: Date): string {
  const start = toIstParts(startsAt);
  return formatSlotTimeAmPmLabel(start.hour, start.minute);
}

export function isStudentBookingDraftReady(
  draft: StudentBookingDraft | null | undefined,
): draft is Required<StudentBookingDraft> {
  return Boolean(
    draft?.tutorId &&
      draft.offeringId &&
      draft.tutorCalendarId &&
      draft.deliveryMode &&
      draft.startsAt,
  );
}

export function availableSlotDayKeys(startsAt: Array<string | Date>): Set<string> {
  return new Set(
    startsAt.map((value) => istDayKey(value instanceof Date ? value : new Date(value))),
  );
}

export function weekOffsetsWithSlots(
  startsAt: Array<string | Date>,
  now = new Date(),
  maxOffset = STUDENT_BOOKING_MAX_WEEK_OFFSET,
): number[] {
  const offsets = new Set<number>();
  for (const value of startsAt) {
    const instant = value instanceof Date ? value : new Date(value);
    const offset = istMondayWeekOffset(instant, now);
    if (offset >= 0 && offset <= maxOffset) {
      offsets.add(offset);
    }
  }
  return [...offsets].sort((a, b) => a - b);
}

export function bookingDaysWithSlots(
  startsAt: Array<string | Date>,
  weekOffset: number,
  now = new Date(),
) {
  const keys = availableSlotDayKeys(startsAt);
  return istMondayWeekDaysForOffset(weekOffset, now).filter((day) => keys.has(day.key));
}

export function bookingCalendarFromDraft(
  draft?: StudentBookingDraft | null,
  now = new Date(),
): {
  weekOffset: number;
  selectedKey: string | null;
  selectedSlotId: string | null;
  deliveryMode: StudentBookingDeliveryMode | null;
} {
  if (!draft?.startsAt) {
    return {
      weekOffset: 0,
      selectedKey: null,
      selectedSlotId: draft?.tutorCalendarId ?? null,
      deliveryMode: draft?.deliveryMode ?? null,
    };
  }
  const startsAt = new Date(draft.startsAt);
  return {
    weekOffset: Math.min(
      STUDENT_BOOKING_MAX_WEEK_OFFSET,
      Math.max(0, istMondayWeekOffset(startsAt, now)),
    ),
    selectedKey: istDayKey(startsAt),
    selectedSlotId: draft.tutorCalendarId ?? null,
    deliveryMode: draft.deliveryMode ?? null,
  };
}
