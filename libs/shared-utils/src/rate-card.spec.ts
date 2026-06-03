import {
  calculateEffectiveRate,
  DEFAULT_BATCH_SIZE,
  formatRateCardSummary,
  getBatchSizeForMode,
  isRateCardComplete,
  MAX_BATCH_SIZE,
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
