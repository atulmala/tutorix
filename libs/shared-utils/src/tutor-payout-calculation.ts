import {
  type ClassPricingCommissionSettings,
  tutorCommissionPercentForClassRate,
} from './class-pricing-settings';
import {
  classEndedAtUtc,
  postClassRefundClaimDeadlineUtc,
} from './post-class-refund-claim';
import { addIstDaysUtc, istDayStartUtc, istTodayStartUtc, toIstParts } from './tutor-calendar';

export type TutorPayoutDeliveryMode = 'online' | 'offline';

export type TutorPayoutPricingSettings = ClassPricingCommissionSettings & {
  platformFeePerParticipantInr: number;
};

export type PaymentGatewayPayoutSettings = {
  chargePercent: number;
  gstRatePercent: number;
};

export type ComputeTutorPayoutRowInput = {
  rateInr: number;
  unitRateInr: number;
  concludedInRange: number;
  deliveryMode: TutorPayoutDeliveryMode;
  settings: TutorPayoutPricingSettings;
  paymentGateway?: PaymentGatewayPayoutSettings;
};

export type TutorPayoutRowAmounts = {
  grossInr: number;
  commissionPercent: number;
  commissionInr: number;
  onlineChargesInr: number;
  paymentGatewayFeeInr: number;
  paymentGatewayGstInr: number;
  paymentGatewayChargesInr: number;
  totalDeductionsInr: number;
  netPayoutInr: number;
};

export function computePaymentGatewayChargeAmounts(
  grossInr: number,
  chargePercent: number,
  gstRatePercent: number,
): Pick<
  TutorPayoutRowAmounts,
  'paymentGatewayFeeInr' | 'paymentGatewayGstInr' | 'paymentGatewayChargesInr'
> {
  if (grossInr <= 0 || chargePercent <= 0) {
    return {
      paymentGatewayFeeInr: 0,
      paymentGatewayGstInr: 0,
      paymentGatewayChargesInr: 0,
    };
  }
  const paymentGatewayFeeInr = Math.round((grossInr * chargePercent) / 100);
  const paymentGatewayGstInr =
    gstRatePercent > 0
      ? Math.round((paymentGatewayFeeInr * gstRatePercent) / 100)
      : 0;
  return {
    paymentGatewayFeeInr,
    paymentGatewayGstInr,
    paymentGatewayChargesInr: paymentGatewayFeeInr + paymentGatewayGstInr,
  };
}

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

const IST_MONTHS_LONG = [
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

/** IST calendar month (1–12) length in days. */
export function istDaysInMonth(year: number, month1to12: number): number {
  if (month1to12 < 1 || month1to12 > 12) {
    return 0;
  }
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Current IST calendar year and month (1–12). */
export function istCurrentYearMonth(now: Date = new Date()): { year: number; month: number } {
  const p = toIstParts(now);
  return { year: p.year, month: p.month + 1 };
}

/** Full IST calendar month as inclusive `YYYY-MM-DD` bounds. `month` is 1–12. */
export function istMonthBounds(
  year: number,
  month1to12: number,
): { startDate: string; endDate: string } | null {
  if (month1to12 < 1 || month1to12 > 12) {
    return null;
  }
  const month0 = month1to12 - 1;
  const lastDay = istDaysInMonth(year, month1to12);
  if (lastDay < 1) {
    return null;
  }
  return {
    startDate: formatIstCalendarDate(istDayStartUtc(year, month0, 1)),
    endDate: formatIstCalendarDate(istDayStartUtc(year, month0, lastDay)),
  };
}

/** Default admin settlement range: previous full IST calendar month. */
export function defaultSettlementMonthPeriod(now: Date = new Date()): {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
} {
  const { year, month } = istCurrentYearMonth(now);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const bounds = istMonthBounds(prevYear, prevMonth);
  if (!bounds) {
    return { year: prevYear, month: prevMonth, startDate: '', endDate: '' };
  }
  return { year: prevYear, month: prevMonth, ...bounds };
}

/** Human-readable IST month label, e.g. `October 2026`. `month` is 1–12. */
export function formatIstMonthLabel(year: number, month1to12: number): string | null {
  if (month1to12 < 1 || month1to12 > 12) {
    return null;
  }
  return `${IST_MONTHS_LONG[month1to12 - 1]} ${year}`;
}

/**
 * True when the student post-class refund dispute window has closed.
 * Used for current-month tutor earnings previews.
 */
export function classEligibleForPayoutView(
  startsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): boolean {
  const deadline = postClassRefundClaimDeadlineUtc(startsAt, durationMinutes);
  if (!deadline) {
    return false;
  }
  return now.getTime() >= deadline.getTime();
}

/** Month-to-date range for the current IST calendar month through today. */
export function istCurrentMonthToDatePeriod(now: Date = new Date()): {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
} {
  const { year, month } = istCurrentYearMonth(now);
  const monthStart = istMonthBounds(year, month);
  const today = formatIstCalendarDate(istTodayStartUtc(now));
  return {
    year,
    month,
    startDate: monthStart?.startDate ?? today,
    endDate: today,
  };
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

/**
 * Classes that ended after the next payout period and through today IST are still in hold.
 * Returns null when there is no hold window (e.g. hold start is after today).
 */
export function tutorPayoutHoldPeriodIstDates(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} | null {
  const nextPeriod = defaultTutorPayoutPeriodIstDates(now);
  const endParts = parseIstCalendarDate(nextPeriod.endDate);
  if (!endParts) {
    return null;
  }
  const holdStart = addIstDaysUtc(
    istDayStartUtc(endParts.year, endParts.month, endParts.day),
    1,
  );
  const todayStart = istTodayStartUtc(now);
  if (holdStart.getTime() > todayStart.getTime()) {
    return null;
  }
  return {
    startDate: formatIstCalendarDate(holdStart),
    endDate: formatIstCalendarDate(todayStart),
  };
}

const IST_MONTHS_SHORT = [
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

/** Human-readable IST date range for tutor earnings UI, e.g. `17 Oct – 23 Oct 2026`. */
export function formatIstDateRangeLabel(startDate: string, endDate: string): string | null {
  const startParts = parseIstCalendarDate(startDate);
  const endParts = parseIstCalendarDate(endDate);
  if (!startParts || !endParts) {
    return null;
  }
  const startLabel = `${startParts.day} ${IST_MONTHS_SHORT[startParts.month]}`;
  const endLabel = `${endParts.day} ${IST_MONTHS_SHORT[endParts.month]} ${endParts.year}`;
  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${startParts.day} – ${endLabel}`;
  }
  if (startParts.year === endParts.year) {
    return `${startLabel} – ${endLabel}`;
  }
  return `${startLabel} ${startParts.year} – ${endLabel}`;
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
  const gatewayAmounts = input.paymentGateway
    ? computePaymentGatewayChargeAmounts(
        grossInr,
        input.paymentGateway.chargePercent,
        input.paymentGateway.gstRatePercent,
      )
    : {
        paymentGatewayFeeInr: 0,
        paymentGatewayGstInr: 0,
        paymentGatewayChargesInr: 0,
      };
  const totalDeductionsInr =
    commissionInr +
    onlineChargesInr +
    gatewayAmounts.paymentGatewayChargesInr;
  const netPayoutInr = grossInr - totalDeductionsInr;
  return {
    grossInr,
    commissionPercent,
    commissionInr,
    onlineChargesInr,
    paymentGatewayFeeInr: gatewayAmounts.paymentGatewayFeeInr,
    paymentGatewayGstInr: gatewayAmounts.paymentGatewayGstInr,
    paymentGatewayChargesInr: gatewayAmounts.paymentGatewayChargesInr,
    totalDeductionsInr,
    netPayoutInr,
  };
}
