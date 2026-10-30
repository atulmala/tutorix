import {
  type ClassPricingCommissionSettings,
  tutorCommissionPercentForClassRate,
} from './class-pricing-settings';
import { classEndedAtUtc } from './post-class-refund-claim';
import { addIstDaysUtc, istDayStartUtc, istTodayStartUtc, toIstParts } from './tutor-calendar';

export type TutorPayoutDeliveryMode = 'online' | 'offline';

export type TutorPayoutPricingSettings = ClassPricingCommissionSettings & {
  platformFeePerParticipantInr: number;
};

export type ComputeTutorPayoutRowInput = {
  rateInr: number;
  unitRateInr: number;
  concludedInRange: number;
  deliveryMode: TutorPayoutDeliveryMode;
  settings: TutorPayoutPricingSettings;
};

export type TutorPayoutRowAmounts = {
  grossInr: number;
  commissionPercent: number;
  commissionInr: number;
  onlineChargesInr: number;
  totalDeductionsInr: number;
  netPayoutInr: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format an instant as IST calendar `YYYY-MM-DD`. */
export function formatIstCalendarDate(instant: Date): string {
  const p = toIstParts(instant);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`;
}

/** Parse `YYYY-MM-DD` into IST calendar parts (month 0-based). */
export function parseIstCalendarDate(
  isoDate: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    return null;
  }
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

export type IstDateRangeUtcBounds = {
  rangeStartUtc: Date;
  /** Exclusive upper bound (start of IST day after endDate). */
  rangeEndExclusiveUtc: Date;
};

/**
 * Inclusive IST calendar date range → UTC bounds for filtering class end instants.
 */
export function istDateRangeToUtcBounds(
  startDate: string,
  endDate: string,
): IstDateRangeUtcBounds | null {
  const startParts = parseIstCalendarDate(startDate);
  const endParts = parseIstCalendarDate(endDate);
  if (!startParts || !endParts) {
    return null;
  }
  const rangeStartUtc = istDayStartUtc(startParts.year, startParts.month, startParts.day);
  const endDayStart = istDayStartUtc(endParts.year, endParts.month, endParts.day);
  const rangeEndExclusiveUtc = addIstDaysUtc(endDayStart, 1);
  if (rangeStartUtc.getTime() > endDayStart.getTime()) {
    return null;
  }
  return { rangeStartUtc, rangeEndExclusiveUtc };
}

/** Default 7-day payout window ending on (today IST − 7 days), inclusive. */
export function defaultTutorPayoutPeriodIstDates(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const todayStart = istTodayStartUtc(now);
  const endDayStart = addIstDaysUtc(todayStart, -7);
  const startDayStart = addIstDaysUtc(endDayStart, -6);
  return {
    startDate: formatIstCalendarDate(startDayStart),
    endDate: formatIstCalendarDate(endDayStart),
  };
}

export function classEndedWithinUtcRange(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  bounds: IstDateRangeUtcBounds,
  now: Date = new Date(),
): boolean {
  const endedAt = classEndedAtUtc(startsAt, durationMinutes);
  if (!endedAt || endedAt.getTime() > now.getTime()) {
    return false;
  }
  const t = endedAt.getTime();
  return t >= bounds.rangeStartUtc.getTime() && t < bounds.rangeEndExclusiveUtc.getTime();
}

export function computeTutorPayoutRow(
  input: ComputeTutorPayoutRowInput,
): TutorPayoutRowAmounts {
  const concluded = Math.max(0, input.concludedInRange);
  const rateInr = Math.max(0, input.rateInr);
  const grossInr = rateInr * concluded;
  const commissionPercent = tutorCommissionPercentForClassRate(
    input.unitRateInr,
    input.settings,
  );
  const commissionInr = Math.round((grossInr * commissionPercent) / 100);
  const feePerClass =
    input.deliveryMode === 'online'
      ? Math.max(0, input.settings.platformFeePerParticipantInr)
      : 0;
  const onlineChargesInr = feePerClass * concluded;
  const totalDeductionsInr = commissionInr + onlineChargesInr;
  const netPayoutInr = grossInr - totalDeductionsInr;
  return {
    grossInr,
    commissionPercent,
    commissionInr,
    onlineChargesInr,
    totalDeductionsInr,
    netPayoutInr,
  };
}
