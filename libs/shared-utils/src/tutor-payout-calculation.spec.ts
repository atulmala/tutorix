import {
  classEndedWithinUtcRange,
  classEligibleForPayoutView,
  computeTutorPayoutRow,
  defaultSettlementMonthPeriod,
  defaultTutorPayoutPeriodIstDates,
  formatIstCalendarDate,
  formatIstMonthLabel,
  istDateRangeToUtcBounds,
  istMonthBounds,
  tutorPayoutHoldPeriodIstDates,
} from './tutor-payout-calculation';
import { istDayStartUtc } from './tutor-calendar';

const settings = {
  commissionSlabThresholdInr: 600,
  tutorCommissionPercentUpToSlab: 10,
  tutorCommissionPercentAboveSlab: 15,
  platformFeePerParticipantInr: 20,
};

describe('tutor-payout-calculation', () => {
  describe('istMonthBounds', () => {
    it('returns full October 2026', () => {
      expect(istMonthBounds(2026, 10)).toEqual({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });
    });

    it('handles February in a leap year', () => {
      expect(istMonthBounds(2028, 2)).toEqual({
        startDate: '2028-02-01',
        endDate: '2028-02-29',
      });
    });
  });

  describe('defaultSettlementMonthPeriod', () => {
    it('returns previous calendar month in IST', () => {
      const now = istDayStartUtc(2026, 10, 5);
      const period = defaultSettlementMonthPeriod(new Date(now.getTime() + 12 * 60 * 60 * 1000));
      expect(period.year).toBe(2026);
      expect(period.month).toBe(10);
      expect(period.startDate).toBe('2026-10-01');
      expect(period.endDate).toBe('2026-10-31');
    });

    it('rolls back to December when viewing January', () => {
      const now = istDayStartUtc(2027, 0, 10);
      const period = defaultSettlementMonthPeriod(new Date(now.getTime() + 12 * 60 * 60 * 1000));
      expect(period).toEqual({
        year: 2026,
        month: 12,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    });
  });

  describe('formatIstMonthLabel', () => {
    it('formats month name', () => {
      expect(formatIstMonthLabel(2026, 10)).toBe('October 2026');
    });
  });

  describe('classEligibleForPayoutView', () => {
    it('is false before dispute deadline', () => {
      const startsAt = istDayStartUtc(2026, 9, 1);
      startsAt.setUTCHours(startsAt.getUTCHours() + 16);
      const now = istDayStartUtc(2026, 9, 2);
      expect(classEligibleForPayoutView(startsAt, 60, now)).toBe(false);
    });

    it('is true after dispute deadline', () => {
      const startsAt = istDayStartUtc(2026, 9, 1);
      startsAt.setUTCHours(startsAt.getUTCHours() + 16);
      const now = istDayStartUtc(2026, 9, 4);
      expect(classEligibleForPayoutView(startsAt, 60, now)).toBe(true);
    });
  });

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

  describe('tutorPayoutHoldPeriodIstDates', () => {
    it('starts the day after the next payout period ends through today IST', () => {
      const now = istDayStartUtc(2026, 9, 30);
      const hold = tutorPayoutHoldPeriodIstDates(
        new Date(now.getTime() + 12 * 60 * 60 * 1000),
      );
      expect(hold).toEqual({
        startDate: '2026-10-24',
        endDate: '2026-10-30',
      });
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
      expect(row.paymentGatewayChargesInr).toBe(0);
      expect(row.netPayoutInr).toBe(1400 - row.commissionInr);
    });

    it('deducts payment gateway fee and GST on gross', () => {
      const row = computeTutorPayoutRow({
        rateInr: 500,
        unitRateInr: 500,
        concludedInRange: 3,
        deliveryMode: 'online',
        settings,
        paymentGateway: { chargePercent: 2, gstRatePercent: 18 },
      });
      expect(row.grossInr).toBe(1500);
      expect(row.paymentGatewayFeeInr).toBe(30);
      expect(row.paymentGatewayGstInr).toBe(5);
      expect(row.paymentGatewayChargesInr).toBe(35);
      expect(row.totalDeductionsInr).toBe(150 + 60 + 35);
      expect(row.netPayoutInr).toBe(1255);
    });
  });
});
