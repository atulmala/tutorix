import {
  activeClassCountForCancellationRefund,
  allocateRefundAcrossCredits,
  computeClassCancellationRefund,
  fairLinePaidTotalInr,
  pickCreditsForCancellation,
  pricingSnapshotToRateCard,
} from './class-credit-cancellation-refund';

const slabRateCard = pricingSnapshotToRateCard({
  mode: 'offline',
  baseRate: 400,
  baseDiscountPct: 0,
  slab2DiscountPct: 5,
  slab3DiscountPct: 10,
});

describe('computeClassCancellationRefund', () => {
  it('reprices when cancelling from slab 3 to slab 2 (13 cancel 6)', () => {
    const parts = {
      lineSubtotalInr: 400 * 13,
      discountInr: 400 * 13 - 360 * 13,
      cgstInr: 0,
      sgstInr: 0,
      igstInr: 0,
      quantity: 13,
    };
    const result = computeClassCancellationRefund({
      parts,
      mode: 'offline',
      rateCard: slabRateCard,
      activeCount: 13,
      cancelCount: 6,
      priorRefundsInr: 0,
    });
    expect(result.fairTotalAfterInr).toBe(380 * 7);
    expect(result.refundInr).toBe(4680 - 380 * 7);
    expect(result.refundInr).toBe(2020);
  });

  it('applies proportional tax on repriced total', () => {
    const parts = {
      lineSubtotalInr: 400 * 13,
      discountInr: 400 * 13 - 360 * 13,
      cgstInr: 421,
      sgstInr: 421,
      igstInr: 0,
      quantity: 13,
    };
    const linePaid = 4680 + 842;
    const fairPreTax = 380 * 7;
    const expectedFair = Math.round((linePaid * fairPreTax) / 4680);
    const result = computeClassCancellationRefund({
      parts,
      mode: 'offline',
      rateCard: slabRateCard,
      activeCount: 13,
      cancelCount: 6,
      priorRefundsInr: 0,
    });
    expect(result.fairTotalAfterInr).toBe(expectedFair);
    expect(result.refundInr).toBe(linePaid - expectedFair);
  });

  it('subtracts prior refunds from net paid before', () => {
    const parts = {
      lineSubtotalInr: 2000,
      discountInr: 0,
      cgstInr: 0,
      sgstInr: 0,
      igstInr: 0,
      quantity: 5,
    };
    const result = computeClassCancellationRefund({
      parts,
      mode: 'offline',
      rateCard: slabRateCard,
      activeCount: 3,
      cancelCount: 1,
      priorRefundsInr: 800,
    });
    expect(result.netPaidBeforeInr).toBe(2000 - 800);
  });
});

describe('fairLinePaidTotalInr', () => {
  it('returns 0 for zero remaining classes', () => {
    expect(
      fairLinePaidTotalInr(
        {
          lineSubtotalInr: 4000,
          discountInr: 0,
          cgstInr: 0,
          sgstInr: 0,
          igstInr: 0,
          quantity: 10,
        },
        slabRateCard,
        'offline',
        0,
      ),
    ).toBe(0);
  });
});

describe('pickCreditsForCancellation', () => {
  it('picks unscheduled before scheduled and sorts by id / start time', () => {
    const picked = pickCreditsForCancellation(
      [
        {
          id: 3,
          status: 'scheduled',
          deliveryMode: 'offline',
          startsAt: '2026-12-01T10:00:00.000Z',
        },
        { id: 1, status: 'unscheduled', deliveryMode: 'offline' },
        {
          id: 2,
          status: 'scheduled',
          deliveryMode: 'offline',
          startsAt: '2026-11-01T10:00:00.000Z',
        },
      ],
      2,
    );
    expect(picked.map((row) => row.id)).toEqual([1, 2]);
  });
});

describe('activeClassCountForCancellationRefund', () => {
  it('includes credits being cancelled even when status is already cancelled', () => {
    const line = [
      { id: 1, status: 'scheduled' },
      { id: 2, status: 'cancelled' },
      { id: 3, status: 'unscheduled' },
    ];
    expect(activeClassCountForCancellationRefund(line, [2])).toBe(3);
    expect(activeClassCountForCancellationRefund(line, [])).toBe(2);
  });
});

describe('allocateRefundAcrossCredits', () => {
  it('distributes remainder rupees', () => {
    expect(allocateRefundAcrossCredits(2020, 6)).toEqual([337, 337, 337, 337, 336, 336]);
    expect(allocateRefundAcrossCredits(2020, 6).reduce((a, b) => a + b, 0)).toBe(2020);
  });
});
