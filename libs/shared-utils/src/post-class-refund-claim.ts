import { formatIstBookingDateLabel, scheduledClassHasEnded } from './student-booking';
import { istDayStartUtc, SLOT_DURATION_MINUTES, toIstParts } from './tutor-calendar';

export function classEndedAtUtc(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
): Date | null {
  if (startsAt == null || startsAt === '') {
    return null;
  }
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }
  const minutes =
    durationMinutes != null && durationMinutes > 0 ? durationMinutes : SLOT_DURATION_MINUTES;
  return new Date(startMs + minutes * 60 * 1000);
}

/**
 * Exclusive upper bound for submitting a post-class refund claim (IST).
 * Class ending on Tue 4pm → claims allowed until end of Wed (deadline = Thu 00:00 IST).
 */
export function postClassRefundClaimDeadlineUtc(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
): Date | null {
  const endedAt = classEndedAtUtc(startsAt, durationMinutes);
  if (!endedAt) {
    return null;
  }
  const p = toIstParts(endedAt);
  return istDayStartUtc(p.year, p.month, p.day + 2);
}

export function canSubmitPostClassRefundClaim(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!scheduledClassHasEnded(startsAt, durationMinutes, now)) {
    return false;
  }
  const deadline = postClassRefundClaimDeadlineUtc(startsAt, durationMinutes);
  if (!deadline) {
    return false;
  }
  return now.getTime() < deadline.getTime();
}

/** Human-readable last moment to claim or for tutor to respond (IST). */
export function formatPostClassRefundDeadlineIst(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
): string {
  const deadline = postClassRefundClaimDeadlineUtc(startsAt, durationMinutes);
  if (!deadline) {
    return '';
  }
  const lastInstant = new Date(deadline.getTime() - 1);
  const dateLabel = formatIstBookingDateLabel(lastInstant);
  const p = toIstParts(lastInstant);
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const ampm = p.hour < 12 ? 'am' : 'pm';
  const minute = p.minute.toString().padStart(2, '0');
  return `${dateLabel}, ${hour12}:${minute} ${ampm} IST`;
}
