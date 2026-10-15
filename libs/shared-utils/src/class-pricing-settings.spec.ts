import {
  canAcceptBaseRateString,
  checkRateCardModeChangeAllowed,
  lowestPerClassRateInr,
  roundSuggestedBaseRateInr,
  suggestedBaseRateForMinimumAndDiscount,
  tutorCommissionPercentForClassRate,
  validateRateCardMinimumPrices,
} from './class-pricing-settings';
import { rateCardToFormInput } from './rate-card';
import type { RateCardFormValues } from './rate-card';

function baseValues(overrides: Partial<RateCardFormValues> = {}): RateCardFormValues {
  return {
    freeDemoOffered: false,
    offlineEnabled: false,
    offlineBaseRate: 0,
    offlineBaseDiscountPct: 0,
    offlineSlab2DiscountPct: null,
    offlineSlab3DiscountPct: null,
    offlineBatchSize: 1,
    onlineEnabled: true,
    onlineBaseRate: 800,
    onlineBaseDiscountPct: 0,
    onlineSlab2DiscountPct: null,
    onlineSlab3DiscountPct: null,
    onlineBatchSize: 1,
    ...overrides,
  };
}

describe('class-pricing-settings', () => {
  describe('lowestPerClassRateInr', () => {
    it('returns lowest rate across bulk slabs', () => {
      const values = baseValues({
        onlineBaseRate: 1000,
        onlineBaseDiscountPct: 0,
        onlineSlab2DiscountPct: 10,
        onlineSlab3DiscountPct: 20,
      });
      expect(lowestPerClassRateInr(values, 'online')).toBe(800);
    });
  });

  describe('validateRateCardMinimumPrices', () => {
    it('skips when floor is 0', () => {
      const result = validateRateCardMinimumPrices(baseValues({ onlineBaseRate: 50 }), {
        onlineMinimumPricePerClassInr: 0,
      });
      expect(result.ok).toBe(true);
    });

    it('fails when online lowest rate is below floor', () => {
      const result = validateRateCardMinimumPrices(baseValues({ onlineBaseRate: 500 }), {
        onlineMinimumPricePerClassInr: 600,
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.message).toContain('minimum rate of ₹600');
        expect(result.message).toContain('at least ₹600');
      }
    });

    it('explains discount that pushes effective rate below floor', () => {
      const result = validateRateCardMinimumPrices(
        baseValues({
          onlineBaseRate: 400,
          onlineBaseDiscountPct: 5,
        }),
        { onlineMinimumPricePerClassInr: 400 },
      );
      expect(result).toEqual({
        ok: false,
        message:
          'After offering a discount of 5% the effective rate would be ₹380 which is less than the minimum rate of ₹400. Your base rate should be at least ₹425 in order to offer this discount.',
      });
    });

    it('checks offline mode', () => {
      const result = validateRateCardMinimumPrices(
        baseValues({
          onlineEnabled: false,
          offlineEnabled: true,
          offlineBaseRate: 400,
        }),
        { offlineMinimumPricePerClassInr: 450 },
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('roundSuggestedBaseRateInr', () => {
    it('rounds up to nearest 5', () => {
      expect(roundSuggestedBaseRateInr(421)).toBe(425);
      expect(roundSuggestedBaseRateInr(426)).toBe(430);
      expect(roundSuggestedBaseRateInr(420)).toBe(420);
    });
  });

  describe('suggestedBaseRateForMinimumAndDiscount', () => {
    it('computes base for 5% discount and ₹400 floor', () => {
      expect(suggestedBaseRateForMinimumAndDiscount(400, 5)).toBe(425);
    });
  });

  describe('canAcceptBaseRateString', () => {
    it('allows prefix digits while typing toward minimum base', () => {
      const mode = {
        enabled: true,
        baseRate: '6',
        baseDiscountPct: '0',
        slab2DiscountPct: '',
        slab3DiscountPct: '',
        batchSize: '1',
      };
      expect(canAcceptBaseRateString('6', mode, 600)).toBe(true);
      expect(canAcceptBaseRateString('599', mode, 600)).toBe(false);
    });
  });

  describe('checkRateCardModeChangeAllowed', () => {
    it('blocks discount that pushes effective rate below floor', () => {
      const form = rateCardToFormInput({
        onlineEnabled: true,
        onlineBaseRate: 800,
        offlineEnabled: false,
      });
      const previous = form.online;
      const next = { ...form.online, baseDiscountPct: '50' };
      const result = checkRateCardModeChangeAllowed(
        form,
        'online',
        next,
        { onlineMinimumPricePerClassInr: 600 },
        previous,
      );
      expect(result.allowed).toBe(false);
      if (result.allowed === false) {
        expect(result.message).toContain('minimum rate of ₹600');
      }
    });
  });

  describe('tutorCommissionPercentForClassRate', () => {
    const settings = {
      commissionSlabThresholdInr: 600,
      tutorCommissionPercentUpToSlab: 10,
      tutorCommissionPercentAboveSlab: 15,
    };

    it('uses up-to-slab percent at threshold', () => {
      expect(tutorCommissionPercentForClassRate(600, settings)).toBe(10);
    });

    it('uses above-slab percent above threshold', () => {
      expect(tutorCommissionPercentForClassRate(601, settings)).toBe(15);
    });

    it('respects custom threshold', () => {
      expect(
        tutorCommissionPercentForClassRate(500, {
          ...settings,
          commissionSlabThresholdInr: 400,
        }),
      ).toBe(15);
    });
  });
});
