import {
  canChangeScheduledClass,
  scheduledClassHasEnded,
} from './student-booking';
import type { RateCardLike } from './rate-card';
import {
  discountPercentForQuantity,
  quoteClassPack,
  rateForModeAndQuantity,
} from './tutor-search';

export type ClassOrderLinePaidParts = {
  lineSubtotalInr: number;
  discountInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  quantity: number;
};

export type ClassOrderPricingSnapshot = {
  mode: 'online' | 'offline';
  baseRate: number;
  baseDiscountPct: number | null;
  slab2DiscountPct: number | null;
  slab3DiscountPct: number | null;
};

export type CancellableCreditPick = {
  id: number;
  status: 'unscheduled' | 'scheduled' | 'cancelled' | string;
  isDemo?: boolean | null;
  startsAt?: Date | string | null;
  durationMinutes?: number | null;
  deliveryMode: string;
};

export type ClassCancellationRefundBreakdown = {
  activeCount: number;
  cancelCount: number;
  remainingCount: number;
  netPaidBeforeInr: number;
  fairTotalAfterInr: number;
  refundInr: number;
  remainingUnitRateInr: number | null;
  remainingDiscountPct: number;
  lines: string[];
};

export function orderLinePaidTotalInr(parts: ClassOrderLinePaidParts): number {
  return Math.max(
    0,
    parts.lineSubtotalInr -
      parts.discountInr +
      parts.cgstInr +
      parts.sgstInr +
      parts.igstInr,
  );
}

export function classPricingSnapshotFromRateCard(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
): ClassOrderPricingSnapshot | null {
  if (mode === 'offline') {
    if (rateCard.offlineEnabled !== true || rateCard.offlineBaseRate == null) {
      return null;
    }
    return {
      mode: 'offline',
      baseRate: rateCard.offlineBaseRate,
      baseDiscountPct: rateCard.offlineBaseDiscountPct ?? null,
      slab2DiscountPct: rateCard.offlineSlab2DiscountPct ?? null,
      slab3DiscountPct: rateCard.offlineSlab3DiscountPct ?? null,
    };
  }
  if (rateCard.onlineEnabled !== true || rateCard.onlineBaseRate == null) {
    return null;
  }
  return {
    mode: 'online',
    baseRate: rateCard.onlineBaseRate,
    baseDiscountPct: rateCard.onlineBaseDiscountPct ?? null,
    slab2DiscountPct: rateCard.onlineSlab2DiscountPct ?? null,
    slab3DiscountPct: rateCard.onlineSlab3DiscountPct ?? null,
  };
}

export function pricingSnapshotToRateCard(
  snapshot: ClassOrderPricingSnapshot,
): RateCardLike {
  if (snapshot.mode === 'offline') {
    return {
      offlineEnabled: true,
      offlineBaseRate: snapshot.baseRate,
      offlineBaseDiscountPct: snapshot.baseDiscountPct,
      offlineSlab2DiscountPct: snapshot.slab2DiscountPct,
      offlineSlab3DiscountPct: snapshot.slab3DiscountPct,
      onlineEnabled: false,
    };
  }
  return {
    onlineEnabled: true,
    onlineBaseRate: snapshot.baseRate,
    onlineBaseDiscountPct: snapshot.baseDiscountPct,
    onlineSlab2DiscountPct: snapshot.slab2DiscountPct,
    onlineSlab3DiscountPct: snapshot.slab3DiscountPct,
    offlineEnabled: false,
  };
}

export function isClassCreditCancellable(
  credit: CancellableCreditPick,
  now: Date = new Date(),
): boolean {
  if (credit.isDemo === true) {
    return false;
  }
  if (credit.status === 'cancelled') {
    return false;
  }
  if (credit.status === 'unscheduled') {
    return true;
  }
  if (credit.status === 'scheduled') {
    if (scheduledClassHasEnded(credit.startsAt, credit.durationMinutes, now)) {
      return false;
    }
    return canChangeScheduledClass(credit.startsAt, credit.deliveryMode, now);
  }
  return false;
}

export function pickCreditsForCancellation<T extends CancellableCreditPick>(
  credits: T[],
  cancelCount: number,
  now: Date = new Date(),
): T[] {
  const eligible = credits.filter((row) => isClassCreditCancellable(row, now));
  const unscheduled = eligible
    .filter((row) => row.status === 'unscheduled')
    .sort((a, b) => a.id - b.id);
  const scheduled = eligible
    .filter((row) => row.status === 'scheduled')
    .sort((left, right) => {
      const leftStart = left.startsAt ? new Date(left.startsAt).getTime() : 0;
      const rightStart = right.startsAt ? new Date(right.startsAt).getTime() : 0;
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }
      return left.id - right.id;
    });
  const ordered = [...unscheduled, ...scheduled];
  if (cancelCount < 1 || cancelCount > ordered.length) {
    return [];
  }
  return ordered.slice(0, cancelCount);
}

function fairPreTaxTotalInr(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
  classCount: number,
): number {
  if (classCount <= 0) {
    return 0;
  }
  const quote = quoteClassPack(rateCard, mode, classCount);
  if (!quote) {
    return 0;
  }
  return quote.unitRateInr * classCount;
}

export function fairLinePaidTotalInr(
  parts: ClassOrderLinePaidParts,
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
  classCount: number,
): number {
  if (classCount <= 0 || parts.quantity <= 0) {
    return 0;
  }
  const originalPreTax = Math.max(0, parts.lineSubtotalInr - parts.discountInr);
  const originalPaid = orderLinePaidTotalInr(parts);
  const fairPreTax = fairPreTaxTotalInr(rateCard, mode, classCount);
  if (originalPreTax <= 0) {
    return 0;
  }
  return Math.round((originalPaid * fairPreTax) / originalPreTax);
}

export function allocateRefundAcrossCredits(
  totalRefundInr: number,
  creditCount: number,
): number[] {
  if (creditCount <= 0 || totalRefundInr <= 0) {
    return Array.from({ length: creditCount }, () => 0);
  }
  const base = Math.floor(totalRefundInr / creditCount);
  let remainder = totalRefundInr - base * creditCount;
  return Array.from({ length: creditCount }, () => {
    if (remainder > 0) {
      remainder -= 1;
      return base + 1;
    }
    return base;
  });
}

export function computeClassCancellationRefund(input: {
  parts: ClassOrderLinePaidParts;
  mode: 'online' | 'offline';
  rateCard: RateCardLike;
  activeCount: number;
  cancelCount: number;
  priorRefundsInr: number;
}): ClassCancellationRefundBreakdown {
  const { parts, mode, rateCard, activeCount, cancelCount, priorRefundsInr } = input;
  const linePaidTotal = orderLinePaidTotalInr(parts);
  const netPaidBefore = Math.max(0, linePaidTotal - Math.max(0, priorRefundsInr));
  const remainingCount = Math.max(0, activeCount - cancelCount);
  const fairTotalAfter = fairLinePaidTotalInr(parts, rateCard, mode, remainingCount);
  const refundInr = Math.max(0, netPaidBefore - fairTotalAfter);

  const remainingUnitRateInr =
    remainingCount > 0 ? rateForModeAndQuantity(rateCard, mode, remainingCount) : null;
  const remainingDiscountPct =
    remainingCount > 0
      ? discountPercentForQuantity(
          remainingCount,
          mode === 'offline'
            ? rateCard.offlineBaseDiscountPct
            : rateCard.onlineBaseDiscountPct,
          mode === 'offline'
            ? rateCard.offlineSlab2DiscountPct
            : rateCard.onlineSlab2DiscountPct,
          mode === 'offline'
            ? rateCard.offlineSlab3DiscountPct
            : rateCard.onlineSlab3DiscountPct,
        )
      : 0;

  const lines: string[] = [
    `${activeCount} active class${activeCount === 1 ? '' : 'es'} on this booking`,
    `Amount for active classes: ₹${netPaidBefore.toLocaleString('en-IN')}`,
    `After cancelling ${cancelCount}, ${remainingCount} class${remainingCount === 1 ? '' : 'es'} remain`,
  ];
  if (remainingCount > 0 && remainingUnitRateInr != null) {
    lines.push(
      `Fair price for ${remainingCount} at ${remainingDiscountPct}% bulk discount: ₹${remainingUnitRateInr.toLocaleString('en-IN')} per class`,
    );
    lines.push(`Fair total for remaining classes: ₹${fairTotalAfter.toLocaleString('en-IN')}`);
  } else if (remainingCount === 0) {
    lines.push('No classes remain after this cancellation');
  }
  lines.push(`Refund amount: ₹${refundInr.toLocaleString('en-IN')}`);

  return {
    activeCount,
    cancelCount,
    remainingCount,
    netPaidBeforeInr: netPaidBefore,
    fairTotalAfterInr: fairTotalAfter,
    refundInr,
    remainingUnitRateInr,
    remainingDiscountPct,
    lines,
  };
}
