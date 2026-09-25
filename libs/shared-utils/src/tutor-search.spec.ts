import {
  currentIstWeekRange,
  MIN_SLOTS_THIS_WEEK,
  istSlotToUtc,
} from './tutor-calendar';
import {
  rankTutorSearchHits,
  classPackSlabLinesForMode,
  rateForModeAndQuantity,
  type TutorSearchCandidate,
} from './tutor-search';

describe('currentIstWeekRange', () => {
  it('starts Sunday 00:00 IST for a Wednesday', () => {
    const wednesday = istSlotToUtc(2026, 8, 16, 10, 0);
    const { weekStart, weekEnd } = currentIstWeekRange(wednesday);
    expect(weekStart.toISOString()).toBe(istSlotToUtc(2026, 8, 13, 0, 0).toISOString());
    expect(weekEnd.toISOString()).toBe(istSlotToUtc(2026, 8, 20, 0, 0).toISOString());
  });
});

describe('rankTutorSearchHits', () => {
  const baseCard = {
    freeDemoOffered: false,
    offlineEnabled: true,
    offlineBaseRate: 500,
    offlineBaseDiscountPct: 0,
    offlineBatchSize: 1,
    onlineEnabled: true,
    onlineBaseRate: 400,
    onlineBaseDiscountPct: 0,
    onlineBatchSize: 1,
  };

  const filters = {
    deliveryMode: 'ANY' as const,
    classFormat: 'ANY' as const,
    maxRateInr: null,
    radiusKm: 10,
    originHasCoordinates: true,
    sortBy: 'BEST_MATCH' as const,
  };

  function candidate(
    overrides: Partial<TutorSearchCandidate> & { tutorId: number },
  ): TutorSearchCandidate {
    return {
      displayName: `Tutor ${overrides.tutorId}`,
      yearsOfExperienceRank: 1,
      offeringLabel: 'CBSE | Mathematics | Class 8',
      matchingOfferingId: 10,
      rateCard: baseCard,
      distanceKm: 2,
      city: 'Bengaluru',
      slotsThisWeek: 0,
      ...overrides,
    };
  }

  it('ranks a tutor with current-week slots above an identical empty calendar', () => {
    const ranked = rankTutorSearchHits(
      [
        candidate({ tutorId: 1, slotsThisWeek: 0 }),
        candidate({ tutorId: 2, slotsThisWeek: MIN_SLOTS_THIS_WEEK }),
      ],
      filters,
    );
    expect(ranked.map((h) => h.tutorId)).toEqual([2, 1]);
    expect(ranked[0].hasAvailabilityThisWeek).toBe(true);
  });

  it('excludes offline tutors outside the radius when searching offline only', () => {
    const ranked = rankTutorSearchHits(
      [
        candidate({ tutorId: 1, distanceKm: 15, slotsThisWeek: 3 }),
        candidate({
          tutorId: 2,
          distanceKm: 15,
          rateCard: { ...baseCard, offlineEnabled: false },
        }),
      ],
      { ...filters, deliveryMode: 'OFFLINE' },
    );
    expect(ranked).toHaveLength(0);
  });

  it('includes online tutors when the origin has no coordinates', () => {
    const ranked = rankTutorSearchHits(
      [candidate({ tutorId: 1, distanceKm: null, slotsThisWeek: 2 })],
      { ...filters, originHasCoordinates: false, deliveryMode: 'ANY' },
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].deliveryModeShown).toBe('ONLINE');
    expect(ranked[0].distanceKm).toBeNull();
  });

  it('prefers nearby offline over online when both match', () => {
    const ranked = rankTutorSearchHits(
      [candidate({ tutorId: 1, distanceKm: 3 })],
      filters,
    );
    expect(ranked[0].deliveryModeShown).toBe('OFFLINE');
    expect(ranked[0].distanceKm).toBe(3);
  });

  it('keeps over-budget tutors but ranks in-budget first', () => {
    const ranked = rankTutorSearchHits(
      [
        candidate({
          tutorId: 1,
          rateCard: { ...baseCard, onlineBaseRate: 900, offlineBaseRate: 900 },
        }),
        candidate({ tutorId: 2 }),
      ],
      { ...filters, deliveryMode: 'ONLINE', maxRateInr: 500 },
    );
    expect(ranked.map((h) => h.tutorId)).toEqual([2, 1]);
    expect(ranked[0].inBudget).toBe(true);
    expect(ranked[1].inBudget).toBe(false);
  });
});

describe('classPackSlabLinesForMode', () => {
  const card = {
    offlineEnabled: true,
    offlineBaseRate: 1000,
    offlineBaseDiscountPct: 0,
    offlineSlab2DiscountPct: 10,
    offlineSlab3DiscountPct: 20,
    onlineEnabled: false,
  };

  it('returns three tiers with discount badges when configured', () => {
    const lines = classPackSlabLinesForMode(card, 'offline');
    expect(lines).toHaveLength(3);
    expect(lines[1].discountPct).toBe(10);
    expect(lines[2].unitRateInr).toBe(800);
  });
});

describe('rateForModeAndQuantity', () => {
  const card = {
    offlineEnabled: true,
    offlineBaseRate: 1000,
    offlineBaseDiscountPct: 0,
    offlineSlab2DiscountPct: 10,
    offlineSlab3DiscountPct: 20,
    onlineEnabled: true,
    onlineBaseRate: 800,
    onlineBaseDiscountPct: 5,
  };

  it('uses slab discounts for larger packs', () => {
    expect(rateForModeAndQuantity(card, 'offline', 1)).toBe(1000);
    expect(rateForModeAndQuantity(card, 'offline', 5)).toBe(900);
    expect(rateForModeAndQuantity(card, 'offline', 11)).toBe(800);
    expect(rateForModeAndQuantity(card, 'online', 3)).toBe(760);
  });
});
