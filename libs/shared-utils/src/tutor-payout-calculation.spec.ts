import {
  classEndedWithinUtcRange,
  computeTutorPayoutRow,
  defaultTutorPayoutPeriodIstDates,
  formatIstCalendarDate,
  istDateRangeToUtcBounds,
} from './tutor-payout-calculation';
import { istDayStartUtc } from './tutor-calendar';

const settings = {
  commissionSlabThresholdInr: 600,
  tutorCommissionPercentUpToSlab: 10,
  tutorCommissionPercentAboveSlab: 15,
  platformFeePerParticipantInr: 20,
};

describe('tutor-payout-calculation', () => {
  describe('defaultTutorPayoutPeriodIstDates', () => {
    it('returns a 7-day window ending 7 IST days before now', () => {
      const now = istDayStartUtc(2026, 9, 30);
      const { startDate, endDate } = defaultTutorPayoutPeriodIstDates(
        new Date(now.getTime() + 12 * 60 * 60 * 1000),
      );
      expect(endDate).toBe('2026-10-23');
      expect(startDate).toBe('2026-10-17');
    });
  });

  describe('istDateRangeToUtcBounds', () => {
    it('includes class ending on last day of range', () => {
      const bounds = istDateRangeToUtcBounds('2026-10-17', '2026-10-23');
      if (bounds == null) {
        throw new Error('expected valid bounds');
      }
      const endOfLastDay = new Date(bounds.rangeEndExclusiveUtc.getTime() - 1);
      expect(
        classEndedWithinUtcRange(
          endOfLastDay,
          60,
          bounds,
          new Date(bounds.rangeEndExclusiveUtc.getTime() + 86400000),
        ),
      ).toBe(true);
    });

    it('rejects inverted ranges', () => {
      expect(istDateRangeToUtcBounds('2026-10-24', '2026-10-20')).toBeNull();
    });
  });

  describe('formatIstCalendarDate', () => {
    it('formats IST midnight boundary', () => {
      expect(formatIstCalendarDate(istDayStartUtc(2026, 9, 23))).toBe('2026-10-23');
    });
  });

  describe('computeTutorPayoutRow', () => {
    it('computes online row with commission and platform fee', () => {
      const row = computeTutorPayoutRow({
        rateInr: 500,
        unitRateInr: 500,
        concludedInRange: 3,
        deliveryMode: 'online',
        settings,
      });
      expect(row.grossInr).toBe(1500);
      expect(row.commissionPercent).toBe(10);
      expect(row.commissionInr).toBe(150);
      expect(row.onlineChargesInr).toBe(60);
      expect(row.totalDeductionsInr).toBe(210);
      expect(row.netPayoutInr).toBe(1290);
    });

    it('uses above-slab commission and zero online fee offline', () => {
      const row = computeTutorPayoutRow({
        rateInr: 700,
        unitRateInr: 700,
        concludedInRange: 2,
        deliveryMode: 'offline',
        settings,
      });
      expect(row.commissionPercent).toBe(15);
      expect(row.commissionInr).toBe(Math.round(1400 * 0.15));
      expect(row.onlineChargesInr).toBe(0);
      expect(row.netPayoutInr).toBe(1400 - row.commissionInr);
    });
  });
});
