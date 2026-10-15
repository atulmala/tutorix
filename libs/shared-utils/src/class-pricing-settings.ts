import type {
  RateCardDeliveryMode,
  RateCardFormInput,
  RateCardFormValues,
  RateCardModeValues,
} from './rate-card';
import {
  calculateEffectiveRate,
  formatInr,
  RATE_CARD_SLABS,
  validateRateCardForm,
} from './rate-card';
import { discountPercentForQuantity, rateForModeAndQuantity } from './tutor-search';

export type ClassPricingMinimumFloors = {
  onlineMinimumPricePerClassInr?: number;
  offlineMinimumPricePerClassInr?: number;
};

export type ClassPricingSettingsLike = {
  minimumOnlinePricePerClassInr: number;
  minimumOfflinePricePerClassInr: number;
};

export function classPricingMinimumFloorsFromSettings(
  settings: ClassPricingSettingsLike | null | undefined,
): ClassPricingMinimumFloors | undefined {
  if (!settings) {
    return undefined;
  }
  return {
    onlineMinimumPricePerClassInr: settings.minimumOnlinePricePerClassInr,
    offlineMinimumPricePerClassInr: settings.minimumOfflinePricePerClassInr,
  };
}

export type ClassPricingCommissionSettings = {
  commissionSlabThresholdInr: number;
  tutorCommissionPercentUpToSlab: number;
  tutorCommissionPercentAboveSlab: number;
};

const SLAB_CHECK_QUANTITIES = [1, 5, 11] as const;

export function getRateCardModeFloorInr(
  mode: RateCardDeliveryMode,
  floors: ClassPricingMinimumFloors,
): number {
  const value =
    mode === 'online'
      ? floors.onlineMinimumPricePerClassInr
      : floors.offlineMinimumPricePerClassInr;
  return value ?? 0;
}

export function rateCardMinimumPriceUserMessage(
  mode: RateCardDeliveryMode,
  floorInr: number,
): string {
  const modeName = mode === 'online' ? 'online' : 'offline';
  return `Minimum pricing for ${modeName} classes is ${formatInr(floorInr)}. Please enter price accordingly.`;
}

function parseDiscountPercent(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Minimum base rate (INR) so effective per-class rate can meet the floor with current discounts. */
export function minimumBaseRateInrForFloor(
  modeValues: RateCardModeValues,
  floorInr: number,
): number {
  if (floorInr <= 0) {
    return 1;
  }
  const maxDiscount = Math.max(
    parseDiscountPercent(modeValues.baseDiscountPct),
    parseDiscountPercent(modeValues.slab2DiscountPct),
    parseDiscountPercent(modeValues.slab3DiscountPct),
  );
  const capped = Math.min(Math.max(maxDiscount, 0), 99);
  return Math.ceil(floorInr / (1 - capped / 100));
}

export function canAcceptBaseRateString(
  newBaseRate: string,
  modeValues: RateCardModeValues,
  floorInr: number,
): boolean {
  if (floorInr <= 0) {
    return true;
  }
  const trimmed = newBaseRate.trim();
  if (!trimmed) {
    return true;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return true;
  }
  const minBase = minimumBaseRateInrForFloor(
    { ...modeValues, baseRate: trimmed },
    floorInr,
  );
  if (parsed >= minBase) {
    return true;
  }
  if (trimmed.length < String(minBase).length) {
    return true;
  }
  return false;
}

export function wouldViolateRateCardMinimumPrice(
  form: RateCardFormInput,
  mode: RateCardDeliveryMode,
  floors: ClassPricingMinimumFloors,
): boolean {
  const floor = getRateCardModeFloorInr(mode, floors);
  if (floor <= 0) {
    return false;
  }
  const enabled = mode === 'online' ? form.online.enabled : form.offline.enabled;
  if (!enabled) {
    return false;
  }
  const result = validateRateCardForm(form);
  if (result.ok === false) {
    return false;
  }
  const lowest = lowestPerClassRateInr(result.normalized, mode);
  return lowest != null && lowest < floor;
}

export type RateCardModeChangeCheck =
  | { allowed: true }
  | { allowed: false; message: string };

export function checkRateCardModeChangeAllowed(
  form: RateCardFormInput,
  mode: RateCardDeliveryMode,
  nextModeValues: RateCardModeValues,
  floors: ClassPricingMinimumFloors,
  previousModeValues: RateCardModeValues,
): RateCardModeChangeCheck {
  const floor = getRateCardModeFloorInr(mode, floors);
  if (floor <= 0 || !nextModeValues.enabled) {
    return { allowed: true };
  }

  if (nextModeValues.baseRate !== previousModeValues.baseRate) {
    if (!canAcceptBaseRateString(nextModeValues.baseRate, nextModeValues, floor)) {
      return { allowed: false, message: rateCardMinimumPriceUserMessage(mode, floor) };
    }
    const trimmed = nextModeValues.baseRate.trim();
    const minBase = minimumBaseRateInrForFloor(nextModeValues, floor);
    let stillTypingPrefix = false;
    if (trimmed) {
      const parsed = Number.parseInt(trimmed, 10);
      if (
        !Number.isNaN(parsed) &&
        parsed < minBase &&
        trimmed.length < String(minBase).length
      ) {
        stillTypingPrefix = true;
      }
      if (
        !Number.isNaN(parsed) &&
        trimmed.length >= String(minBase).length &&
        parsed < minBase
      ) {
        return { allowed: false, message: rateCardMinimumPriceUserMessage(mode, floor) };
      }
    }
    if (!stillTypingPrefix) {
      const nextForm: RateCardFormInput = {
        ...form,
        [mode]: nextModeValues,
      };
      if (wouldViolateRateCardMinimumPrice(nextForm, mode, floors)) {
        return { allowed: false, message: rateCardMinimumPriceUserMessage(mode, floor) };
      }
    }
  } else {
    const nextForm: RateCardFormInput = {
      ...form,
      [mode]: nextModeValues,
    };
    if (wouldViolateRateCardMinimumPrice(nextForm, mode, floors)) {
      return { allowed: false, message: rateCardMinimumPriceUserMessage(mode, floor) };
    }
  }

  return { allowed: true };
}

/** Lowest effective per-class INR for a mode (across bulk slab repricing quantities). */
export function lowestPerClassRateInr(
  values: RateCardFormValues,
  mode: RateCardDeliveryMode,
): number | null {
  const enabled = mode === 'online' ? values.onlineEnabled : values.offlineEnabled;
  if (!enabled) {
    return null;
  }
  let lowest: number | null = null;
  for (const qty of SLAB_CHECK_QUANTITIES) {
    const rate = rateForModeAndQuantity(values, mode, qty);
    if (rate == null) {
      continue;
    }
    if (lowest == null || rate < lowest) {
      lowest = rate;
    }
  }
  return lowest;
}

/** True when the form is valid and an enabled mode’s lowest rate is below the admin floor. */
export function isRateCardBelowMinimumPrice(
  form: RateCardFormInput,
  floors: ClassPricingMinimumFloors,
): boolean {
  return rateCardMinimumPriceWarning(form, floors) != null;
}

/** User-facing minimum warning when the form is valid but below an admin floor; otherwise null. */
export function rateCardMinimumPriceWarning(
  form: RateCardFormInput,
  floors: ClassPricingMinimumFloors,
): string | null {
  const result = validateRateCardForm(form);
  if (result.ok === false) {
    return null;
  }
  const check = validateRateCardMinimumPrices(result.normalized, floors);
  return check.ok === false ? check.message : null;
}

/** Round suggested base rate up to the nearest ₹5 (e.g. 421 → 425, 426 → 430). */
export function roundSuggestedBaseRateInr(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 5;
  }
  return Math.ceil(value / 5) * 5;
}

export function suggestedBaseRateForMinimumAndDiscount(
  minimumPerClassInr: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) {
    return roundSuggestedBaseRateInr(minimumPerClassInr);
  }
  const raw = minimumPerClassInr / (1 - discountPercent / 100);
  return roundSuggestedBaseRateInr(raw);
}

type MinimumViolationDetail = {
  mode: RateCardDeliveryMode;
  floorInr: number;
  discountPercent: number;
  effectiveRateInr: number;
};

function discountPercentsForMode(
  values: RateCardFormValues,
  mode: RateCardDeliveryMode,
): {
  base: number;
  slab2: number | null;
  slab3: number | null;
} {
  if (mode === 'online') {
    return {
      base: values.onlineBaseDiscountPct,
      slab2: values.onlineSlab2DiscountPct,
      slab3: values.onlineSlab3DiscountPct,
    };
  }
  return {
    base: values.offlineBaseDiscountPct,
    slab2: values.offlineSlab2DiscountPct,
    slab3: values.offlineSlab3DiscountPct,
  };
}

function findWorstMinimumViolation(
  normalized: RateCardFormValues,
  floors: ClassPricingMinimumFloors,
): MinimumViolationDetail | null {
  let worst: MinimumViolationDetail | null = null;

  for (const mode of ['online', 'offline'] as const) {
    const floorInr = getRateCardModeFloorInr(mode, floors);
    if (floorInr <= 0) {
      continue;
    }
    const discounts = discountPercentsForMode(normalized, mode);
    for (const slab of RATE_CARD_SLABS) {
      const qty = slab.minClasses;
      const effectiveRateInr = rateForModeAndQuantity(normalized, mode, qty);
      if (effectiveRateInr == null || effectiveRateInr >= floorInr) {
        continue;
      }
      const discountPercent = discountPercentForQuantity(
        qty,
        discounts.base,
        discounts.slab2,
        discounts.slab3,
      );
      const detail: MinimumViolationDetail = {
        mode,
        floorInr,
        discountPercent,
        effectiveRateInr,
      };
      if (!worst || effectiveRateInr < worst.effectiveRateInr) {
        worst = detail;
      }
    }
  }

  return worst;
}

export function rateCardMinimumPriceViolationMessage(
  normalized: RateCardFormValues,
  floors: ClassPricingMinimumFloors,
): string | null {
  const violation = findWorstMinimumViolation(normalized, floors);
  if (!violation) {
    return null;
  }
  const { floorInr, discountPercent, effectiveRateInr } = violation;
  const suggestedBase = suggestedBaseRateForMinimumAndDiscount(floorInr, discountPercent);

  if (discountPercent > 0) {
    return `After offering a discount of ${discountPercent}% the effective rate would be ${formatInr(
      effectiveRateInr,
    )} which is less than the minimum rate of ${formatInr(
      floorInr,
    )}. Your base rate should be at least ${formatInr(
      suggestedBase,
    )} in order to offer this discount.`;
  }

  return `The effective rate of ${formatInr(
    effectiveRateInr,
  )} is less than the minimum rate of ${formatInr(
    floorInr,
  )}. Your base rate should be at least ${formatInr(suggestedBase)}.`;
}

export function validateRateCardMinimumPrices(
  normalized: RateCardFormValues,
  floors: ClassPricingMinimumFloors,
): { ok: true } | { ok: false; message: string } {
  const message = rateCardMinimumPriceViolationMessage(normalized, floors);
  if (message) {
    return { ok: false, message };
  }
  return { ok: true };
}

/** Commission percent for a booking effective per-class rate (payout use). */
export function tutorCommissionPercentForClassRate(
  effectivePerClassRateInr: number,
  settings: ClassPricingCommissionSettings,
): number {
  const threshold = settings.commissionSlabThresholdInr;
  if (effectivePerClassRateInr <= threshold) {
    return settings.tutorCommissionPercentUpToSlab;
  }
  return settings.tutorCommissionPercentAboveSlab;
}
