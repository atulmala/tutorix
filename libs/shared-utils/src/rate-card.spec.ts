import {
  calculateEffectiveRate,
  DEFAULT_BATCH_SIZE,
  formatRateCardSummary,
  getBatchSizeForMode,
  isRateCardComplete,
  MAX_BATCH_SIZE,
  canDeferRateCardSetup,
  hasIncompleteRateCardOfferings,
  needsRateCardSetup,
  offeringsNeedingRateCardSetup,
  offeringCoveredBySharedRateCard,
  ptPassResultMessage,
  PT_PASSED_ONBOARDING_MESSAGE,
  PT_PASSED_RATE_CARD_MESSAGE,
  validateRateCardForm,
} from './rate-card';

const emptyOnlineMode = {
  enabled: false,
  baseRate: '',
  baseDiscountPct: '',
  slab2DiscountPct: '',
  slab3DiscountPct: '',
  batchSize: '1',
};

describe('rate-card', () => {
  describe('calculateEffectiveRate', () => {
    it('returns base rate when discount is null or zero', () => {
      expect(calculateEffectiveRate(500, null)).toBe(500);
      expect(calculateEffectiveRate(500, 0)).toBe(500);
    });

    it('applies percentage discount', () => {
      expect(calculateEffectiveRate(500, 10)).toBe(450);
      expect(calculateEffectiveRate(400, 15)).toBe(340);
    });
  });

  describe('isRateCardComplete', () => {
    it('returns false when rate card is missing or incomplete', () => {
      expect(isRateCardComplete(null)).toBe(false);
      expect(isRateCardComplete({ offlineEnabled: false, onlineEnabled: false })).toBe(false);
    });

    it('returns true when at least one mode is configured', () => {
      expect(
        isRateCardComplete({ offlineEnabled: true, offlineBaseRate: 500, onlineEnabled: false }),
      ).toBe(true);
    });
  });

  describe('needsRateCardSetup', () => {
    it('is false when there are no passed offerings', () => {
      expect(needsRateCardSetup([])).toBe(false);
      expect(
        needsRateCardSetup([{ status: 'pending_pt', rateCard: null }]),
      ).toBe(false);
    });

    it('is true when a passed offering has no complete rate card', () => {
      expect(
        needsRateCardSetup([{ status: 'pt_passed', rateCard: null }]),
      ).toBe(true);
    });

    it('is false when at least one passed offering has a complete rate card', () => {
      expect(
        needsRateCardSetup([
          { status: 'pt_passed', rateCard: null },
          {
            status: 'pt_passed',
            rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
          },
        ]),
      ).toBe(false);
    });
  });

  describe('hasIncompleteRateCardOfferings', () => {
    it('is false when every passed offering has a complete rate card', () => {
      expect(hasIncompleteRateCardOfferings([])).toBe(false);
      expect(
        hasIncompleteRateCardOfferings([
          {
            status: 'pt_passed',
            rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
          },
        ]),
      ).toBe(false);
    });

    it('is true when a passed offering still lacks a complete rate card', () => {
      expect(
        hasIncompleteRateCardOfferings([
          { status: 'pt_passed', rateCard: null },
          {
            status: 'pt_passed',
            rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
          },
        ]),
      ).toBe(true);
    });

    it('is false when a sibling offering sharing the same PT already has a card', () => {
      expect(
        hasIncompleteRateCardOfferings([
          {
            id: 1,
            proficiencyTestId: 70,
            status: 'pt_passed',
            rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
          },
          { id: 2, proficiencyTestId: 70, status: 'pt_passed', rateCard: null },
        ]),
      ).toBe(false);
    });
  });

  describe('canDeferRateCardSetup', () => {
    it('is false for the first rate card', () => {
      expect(
        canDeferRateCardSetup([{ status: 'pt_passed', rateCard: null }]),
      ).toBe(false);
    });

    it('is true when another offering still needs a card after one is complete', () => {
      expect(
        canDeferRateCardSetup([
          {
            status: 'pt_passed',
            rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
          },
          { status: 'pt_passed', rateCard: null },
        ]),
      ).toBe(true);
    });
  });

  describe('offeringsNeedingRateCardSetup', () => {
    it('asks for one card when two classes share a PT and neither has a card', () => {
      const pending = offeringsNeedingRateCardSetup([
        { id: 1, proficiencyTestId: 70, status: 'pt_passed', rateCard: null },
        { id: 2, proficiencyTestId: 70, status: 'pt_passed', rateCard: null },
      ]);
      expect(pending).toEqual([
        { id: 1, proficiencyTestId: 70, status: 'pt_passed', rateCard: null },
      ]);
    });

    it('still requires a card for a different proficiency test', () => {
      const pending = offeringsNeedingRateCardSetup([
        {
          id: 1,
          proficiencyTestId: 70,
          status: 'pt_passed',
          rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
        },
        { id: 2, proficiencyTestId: 70, status: 'pt_passed', rateCard: null },
        { id: 3, proficiencyTestId: 71, status: 'pt_passed', rateCard: null },
      ]);
      expect(pending.map((offering) => offering.id)).toEqual([3]);
    });
  });

  describe('offeringCoveredBySharedRateCard', () => {
    it('covers a class XI offering when class XII already has the shared card', () => {
      const class12 = {
        id: 1,
        proficiencyTestId: 70,
        status: 'pt_passed',
        rateCard: { isComplete: true, offlineEnabled: true, offlineBaseRate: 400 },
      };
      const class11 = {
        id: 2,
        proficiencyTestId: 70,
        status: 'pt_passed',
        rateCard: null,
      };
      expect(offeringCoveredBySharedRateCard([class12, class11], class11)).toBe(true);
      expect(offeringCoveredBySharedRateCard([class12, class11], class12)).toBe(true);
    });
  });

  describe('ptPassResultMessage', () => {
    it('keeps onboarding congratulations copy during onboarding', () => {
      expect(ptPassResultMessage(false)).toBe(PT_PASSED_ONBOARDING_MESSAGE);
    });

    it('advises rate card setup after a post-onboarding pass', () => {
      expect(ptPassResultMessage(true)).toBe(PT_PASSED_RATE_CARD_MESSAGE);
    });
  });

  describe('getBatchSizeForMode', () => {
    it('returns default when rate card missing or mode disabled', () => {
      expect(getBatchSizeForMode(null, 'offline')).toBe(DEFAULT_BATCH_SIZE);
      expect(
        getBatchSizeForMode({ offlineEnabled: false, offlineBatchSize: 4 }, 'offline'),
      ).toBe(DEFAULT_BATCH_SIZE);
    });

    it('returns configured batch size when mode enabled', () => {
      expect(
        getBatchSizeForMode(
          { offlineEnabled: true, offlineBatchSize: 4, onlineEnabled: true, onlineBatchSize: 6 },
          'offline',
        ),
      ).toBe(4);
      expect(
        getBatchSizeForMode(
          { offlineEnabled: true, offlineBatchSize: 4, onlineEnabled: true, onlineBatchSize: 6 },
          'online',
        ),
      ).toBe(6);
    });
  });

  describe('validateRateCardForm', () => {
    const validOfflineOnly = {
      freeDemoOffered: true,
      offline: {
        enabled: true,
        baseRate: '500',
        baseDiscountPct: '5',
        slab2DiscountPct: '10',
        slab3DiscountPct: '20',
        batchSize: '4',
      },
      online: emptyOnlineMode,
    };

    it('accepts valid offline-only rate card', () => {
      const result = validateRateCardForm(validOfflineOnly);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.normalized.offlineBaseRate).toBe(500);
        expect(result.normalized.offlineBaseDiscountPct).toBe(5);
        expect(result.normalized.offlineSlab2DiscountPct).toBe(10);
        expect(result.normalized.offlineBatchSize).toBe(4);
      }
    });

    it('defaults base discount to 0 when empty', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: { ...validOfflineOnly.offline, baseDiscountPct: '' },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.normalized.offlineBaseDiscountPct).toBe(0);
      }
    });

    it('defaults batch size to 1 when empty', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: { ...validOfflineOnly.offline, batchSize: '' },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.normalized.offlineBatchSize).toBe(1);
      }
    });

    it('rejects batch size below 1 or above max', () => {
      expect(
        validateRateCardForm({
          ...validOfflineOnly,
          offline: { ...validOfflineOnly.offline, batchSize: '0' },
        }).ok,
      ).toBe(false);
      expect(
        validateRateCardForm({
          ...validOfflineOnly,
          offline: {
            ...validOfflineOnly.offline,
            batchSize: String(MAX_BATCH_SIZE + 1),
          },
        }).ok,
      ).toBe(false);
    });

    it('stores batch size 1 when mode disabled', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: { ...validOfflineOnly.offline, enabled: false },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects when no mode is enabled', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: { ...validOfflineOnly.offline, enabled: false },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects when base discount exceeds slab 2', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: {
          ...validOfflineOnly.offline,
          baseDiscountPct: '15',
          slab2DiscountPct: '10',
        },
      });
      expect(result.ok).toBe(false);
    });

    it('rejects when slab 3 discount is less than slab 2', () => {
      const result = validateRateCardForm({
        ...validOfflineOnly,
        offline: {
          ...validOfflineOnly.offline,
          slab2DiscountPct: '20',
          slab3DiscountPct: '10',
        },
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('formatRateCardSummary', () => {
    it('formats configured rate card with effective rates', () => {
      expect(
        formatRateCardSummary({
          offlineEnabled: true,
          offlineBaseRate: 500,
          offlineBaseDiscountPct: 10,
          onlineEnabled: true,
          onlineBaseRate: 400,
          onlineBaseDiscountPct: 0,
          freeDemoOffered: true,
        }),
      ).toBe('₹450/class offline · ₹400/class online · Demo: Yes');
    });

    it('includes batch size in summary when greater than 1', () => {
      expect(
        formatRateCardSummary({
          offlineEnabled: true,
          offlineBaseRate: 500,
          offlineBaseDiscountPct: 0,
          offlineBatchSize: 4,
          onlineEnabled: false,
        }),
      ).toBe('₹500/class offline · Batch: 4');
    });
  });
});
