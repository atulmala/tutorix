import {
  calculateEffectiveRate,
  getBatchSizeForMode,
  isRateCardComplete,
  RATE_CARD_SLABS,
  type RateCardLike,
} from './rate-card';
import { MIN_SLOTS_THIS_WEEK } from './tutor-calendar';

export type TutorSearchDeliveryMode = 'ONLINE' | 'OFFLINE' | 'ANY';
export type TutorSearchClassFormat = 'INDIVIDUAL' | 'GROUP' | 'ANY';
export type TutorSearchSort = 'BEST_MATCH' | 'DISTANCE' | 'RATE';

export type TutorSearchFilters = {
  deliveryMode: TutorSearchDeliveryMode;
  classFormat: TutorSearchClassFormat;
  maxRateInr?: number | null;
  radiusKm: number;
  originHasCoordinates: boolean;
  sortBy: TutorSearchSort;
};

export type TutorSearchCandidate = {
  tutorId: number;
  displayName: string;
  photoUrl?: string | null;
  yearsOfExperienceRank: number;
  offeringLabel: string;
  matchingOfferingId: number;
  rateCard: RateCardLike;
  distanceKm: number | null;
  city?: string | null;
  slotsThisWeek: number;
};

export type RankedTutorSearchHit = {
  tutorId: number;
  displayName: string;
  photoUrl?: string | null;
  yearsOfExperienceRank: number;
  offeringLabel: string;
  matchingOfferingId: number;
  onlineEnabled: boolean;
  offlineEnabled: boolean;
  individualAvailable: boolean;
  groupAvailable: boolean;
  groupSize: number;
  rateInr: number;
  deliveryModeShown: Exclude<TutorSearchDeliveryMode, 'ANY'>;
  distanceKm: number | null;
  city?: string | null;
  freeDemoOffered: boolean;
  hasAvailabilityThisWeek: boolean;
  slotsThisWeek: number;
  inBudget: boolean;
};

export function hasUsableCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (latitude == null || longitude == null) {
    return false;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return !(lat === 0 && lng === 0);
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function starterRateForMode(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
): number | null {
  return rateForModeAndQuantity(rateCard, mode, 1);
}

export function rateForModeAndQuantity(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
  quantity: number,
): number | null {
  const qty = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
  if (qty < 1) {
    return null;
  }
  if (mode === 'offline') {
    if (rateCard.offlineEnabled !== true || rateCard.offlineBaseRate == null) {
      return null;
    }
    return calculateEffectiveRate(
      rateCard.offlineBaseRate,
      discountForQuantity(
        qty,
        rateCard.offlineBaseDiscountPct,
        rateCard.offlineSlab2DiscountPct,
        rateCard.offlineSlab3DiscountPct,
      ),
    );
  }
  if (rateCard.onlineEnabled !== true || rateCard.onlineBaseRate == null) {
    return null;
  }
  return calculateEffectiveRate(
    rateCard.onlineBaseRate,
    discountForQuantity(
      qty,
      rateCard.onlineBaseDiscountPct,
      rateCard.onlineSlab2DiscountPct,
      rateCard.onlineSlab3DiscountPct,
    ),
  );
}

function discountForQuantity(
  quantity: number,
  baseDiscount?: number | null,
  slab2Discount?: number | null,
  slab3Discount?: number | null,
): number | null | undefined {
  if (quantity >= 11) {
    return slab3Discount ?? slab2Discount ?? baseDiscount;
  }
  if (quantity >= 5) {
    return slab2Discount ?? baseDiscount;
  }
  return baseDiscount;
}

export type ClassPackSlabLine = {
  label: string;
  minClasses: number;
  maxClasses: number | null;
  unitRateInr: number;
  discountPct: number | null;
};

export function classPackSlabLinesForMode(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
): ClassPackSlabLine[] {
  if (mode === 'offline') {
    if (rateCard.offlineEnabled !== true || rateCard.offlineBaseRate == null) {
      return [];
    }
  } else if (rateCard.onlineEnabled !== true || rateCard.onlineBaseRate == null) {
    return [];
  }

  const lines: ClassPackSlabLine[] = [];
  for (const slab of RATE_CARD_SLABS) {
    const qty = slab.minClasses;
    const unitRateInr = rateForModeAndQuantity(rateCard, mode, qty);
    if (unitRateInr == null) {
      continue;
    }
    const rawDiscount =
      mode === 'offline'
        ? discountForQuantity(
            qty,
            rateCard.offlineBaseDiscountPct,
            rateCard.offlineSlab2DiscountPct,
            rateCard.offlineSlab3DiscountPct,
          )
        : discountForQuantity(
            qty,
            rateCard.onlineBaseDiscountPct,
            rateCard.onlineSlab2DiscountPct,
            rateCard.onlineSlab3DiscountPct,
          );
    const discountPct =
      rawDiscount != null && rawDiscount > 0 ? Math.round(rawDiscount) : null;
    lines.push({
      label: slab.label,
      minClasses: slab.minClasses,
      maxClasses: slab.maxClasses,
      unitRateInr,
      discountPct,
    });
  }
  return lines;
}

export function unitRateFromPackSlabs(
  slabs: ClassPackSlabLine[],
  quantity: number,
): number | null {
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1 || slabs.length === 0) {
    return null;
  }
  const tier = qty >= 11 ? 2 : qty >= 5 ? 1 : 0;
  return slabs[tier]?.unitRateInr ?? null;
}

export function packSlabsHaveDiscount(slabs: ClassPackSlabLine[]): boolean {
  return slabs.some((row) => (row.discountPct ?? 0) > 0);
}

function classFormatMatches(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
  classFormat: TutorSearchClassFormat,
): boolean {
  const size = getBatchSizeForMode(rateCard, mode);
  if (classFormat === 'INDIVIDUAL') {
    return size === 1;
  }
  if (classFormat === 'GROUP') {
    return size > 1;
  }
  return true;
}

function modeEligible(
  rateCard: RateCardLike,
  mode: 'online' | 'offline',
  filters: TutorSearchFilters,
): boolean {
  if (!isRateCardComplete(rateCard)) {
    return false;
  }
  if (mode === 'offline') {
    if (rateCard.offlineEnabled !== true) {
      return false;
    }
    if (!classFormatMatches(rateCard, 'offline', filters.classFormat)) {
      return false;
    }
    return true;
  }
  return (
    rateCard.onlineEnabled === true &&
    classFormatMatches(rateCard, 'online', filters.classFormat)
  );
}

export function resolveShownMode(
  candidate: TutorSearchCandidate,
  filters: TutorSearchFilters,
): Exclude<TutorSearchDeliveryMode, 'ANY'> | null {
  const forceOnline =
    !filters.originHasCoordinates || filters.deliveryMode === 'ONLINE';
  const allowOffline =
    !forceOnline &&
    (filters.deliveryMode === 'OFFLINE' || filters.deliveryMode === 'ANY');
  const allowOnline =
    filters.deliveryMode === 'ONLINE' ||
    filters.deliveryMode === 'ANY' ||
    forceOnline;

  const offlineOk =
    allowOffline &&
    modeEligible(candidate.rateCard, 'offline', filters) &&
    candidate.distanceKm != null &&
    candidate.distanceKm <= filters.radiusKm;
  const onlineOk =
    allowOnline && modeEligible(candidate.rateCard, 'online', filters);

  if (offlineOk) {
    return 'OFFLINE';
  }
  if (onlineOk) {
    return 'ONLINE';
  }
  return null;
}

export function toRankedHit(
  candidate: TutorSearchCandidate,
  filters: TutorSearchFilters,
): RankedTutorSearchHit | null {
  const shown = resolveShownMode(candidate, filters);
  if (!shown) {
    return null;
  }
  const mode = shown === 'OFFLINE' ? 'offline' : 'online';
  const rateInr = starterRateForMode(candidate.rateCard, mode);
  if (rateInr == null) {
    return null;
  }
  const offlineSize = getBatchSizeForMode(candidate.rateCard, 'offline');
  const onlineSize = getBatchSizeForMode(candidate.rateCard, 'online');
  const groupSize = shown === 'OFFLINE' ? offlineSize : onlineSize;
  const inBudget =
    filters.maxRateInr == null || rateInr <= filters.maxRateInr;
  return {
    tutorId: candidate.tutorId,
    displayName: candidate.displayName,
    photoUrl: candidate.photoUrl ?? null,
    yearsOfExperienceRank: candidate.yearsOfExperienceRank,
    offeringLabel: candidate.offeringLabel,
    matchingOfferingId: candidate.matchingOfferingId,
    onlineEnabled: candidate.rateCard.onlineEnabled === true,
    offlineEnabled: candidate.rateCard.offlineEnabled === true,
    individualAvailable: offlineSize === 1 || onlineSize === 1,
    groupAvailable: offlineSize > 1 || onlineSize > 1,
    groupSize,
    rateInr,
    deliveryModeShown: shown,
    distanceKm: shown === 'OFFLINE' ? candidate.distanceKm : null,
    city: candidate.city ?? null,
    freeDemoOffered: candidate.rateCard.freeDemoOffered === true,
    hasAvailabilityThisWeek: candidate.slotsThisWeek >= MIN_SLOTS_THIS_WEEK,
    slotsThisWeek: candidate.slotsThisWeek,
    inBudget,
  };
}

function compareHits(
  a: RankedTutorSearchHit,
  b: RankedTutorSearchHit,
  sortBy: TutorSearchSort,
): number {
  if (sortBy === 'DISTANCE') {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.rateInr - b.rateInr;
  }
  if (sortBy === 'RATE') {
    if (a.rateInr !== b.rateInr) return a.rateInr - b.rateInr;
    return b.slotsThisWeek - a.slotsThisWeek;
  }
  if (a.hasAvailabilityThisWeek !== b.hasAvailabilityThisWeek) {
    return a.hasAvailabilityThisWeek ? -1 : 1;
  }
  if (a.inBudget !== b.inBudget) {
    return a.inBudget ? -1 : 1;
  }
  if (a.freeDemoOffered !== b.freeDemoOffered) {
    return a.freeDemoOffered ? -1 : 1;
  }
  if (a.deliveryModeShown === 'OFFLINE' && b.deliveryModeShown === 'OFFLINE') {
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
  } else if (a.rateInr !== b.rateInr) {
    return a.rateInr - b.rateInr;
  }
  if (a.slotsThisWeek !== b.slotsThisWeek) {
    return b.slotsThisWeek - a.slotsThisWeek;
  }
  if (a.yearsOfExperienceRank !== b.yearsOfExperienceRank) {
    return b.yearsOfExperienceRank - a.yearsOfExperienceRank;
  }
  return a.tutorId - b.tutorId;
}

export function rankTutorSearchHits(
  candidates: TutorSearchCandidate[],
  filters: TutorSearchFilters,
): RankedTutorSearchHit[] {
  const hits = candidates
    .map((candidate) => toRankedHit(candidate, filters))
    .filter((hit): hit is RankedTutorSearchHit => hit != null);
  return hits.sort((a, b) => compareHits(a, b, filters.sortBy));
}

export function paginateHits<T>(
  items: T[],
  cursor: string | null | undefined,
  limit: number,
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const page = items.slice(start, start + limit);
  const nextOffset = start + page.length;
  const hasMore = nextOffset < items.length;
  return {
    items: page,
    nextCursor: hasMore ? String(nextOffset) : null,
    hasMore,
  };
}
