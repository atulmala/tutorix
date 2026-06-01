export const RATE_CARD_SLABS = [
  { id: 1 as const, label: '1–4 classes', minClasses: 1, maxClasses: 4 },
  { id: 2 as const, label: '5–10 classes', minClasses: 5, maxClasses: 10 },
  { id: 3 as const, label: '11+ classes', minClasses: 11, maxClasses: null },
] as const;

export type RateCardModeValues = {
  enabled: boolean;
  baseRate: string;
  baseDiscountPct: string;
  slab2DiscountPct: string;
  slab3DiscountPct: string;
};

export type RateCardFormInput = {
  freeDemoOffered: boolean;
  offline: RateCardModeValues;
  online: RateCardModeValues;
};

export type RateCardFormValues = {
  freeDemoOffered: boolean;
  offlineEnabled: boolean;
  offlineBaseRate: number;
  offlineBaseDiscountPct: number;
  offlineSlab2DiscountPct: number | null;
  offlineSlab3DiscountPct: number | null;
  onlineEnabled: boolean;
  onlineBaseRate: number;
  onlineBaseDiscountPct: number;
  onlineSlab2DiscountPct: number | null;
  onlineSlab3DiscountPct: number | null;
};

export type RateCardLike = {
  freeDemoOffered?: boolean | null;
  offlineEnabled?: boolean | null;
  offlineBaseRate?: number | null;
  offlineBaseDiscountPct?: number | null;
  offlineSlab2DiscountPct?: number | null;
  offlineSlab3DiscountPct?: number | null;
  onlineEnabled?: boolean | null;
  onlineBaseRate?: number | null;
  onlineBaseDiscountPct?: number | null;
  onlineSlab2DiscountPct?: number | null;
  onlineSlab3DiscountPct?: number | null;
};

export function calculateEffectiveRate(
  baseRate: number,
  discountPercent?: number | null,
): number {
  const discount = discountPercent ?? 0;
  return Math.round(baseRate * (1 - discount / 100));
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function isRateCardComplete(rateCard: RateCardLike | null | undefined): boolean {
  if (!rateCard) {
    return false;
  }
  const offlineOk =
    rateCard.offlineEnabled === true &&
    typeof rateCard.offlineBaseRate === 'number' &&
    rateCard.offlineBaseRate >= 1;
  const onlineOk =
    rateCard.onlineEnabled === true &&
    typeof rateCard.onlineBaseRate === 'number' &&
    rateCard.onlineBaseRate >= 1;
  return offlineOk || onlineOk;
}

function parseOptionalDiscount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

function parseBaseDiscount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

type ModeValidationSuccess = {
  ok: true;
  baseRate: number;
  baseDiscount: number;
  slab2: number | null;
  slab3: number | null;
};

type ModeValidationFailure = {
  ok: false;
  message: string;
};

type ModeValidationResult = ModeValidationSuccess | ModeValidationFailure;

function validateMode(
  modeLabel: string,
  enabled: boolean,
  baseRate: string,
  baseDiscountPct: string,
  slab2DiscountPct: string,
  slab3DiscountPct: string,
): ModeValidationResult {
  if (!enabled) {
    return { ok: true, baseRate: 0, baseDiscount: 0, slab2: null, slab3: null };
  }

  const parsedBase = Number.parseInt(baseRate.trim(), 10);
  if (Number.isNaN(parsedBase) || parsedBase < 1) {
    return { ok: false, message: `${modeLabel}: enter a base rate of at least ₹1.` };
  }

  const baseDiscount = parseBaseDiscount(baseDiscountPct);
  if (Number.isNaN(baseDiscount)) {
    return { ok: false, message: `${modeLabel}: enter a valid base discount.` };
  }
  if (baseDiscount < 0 || baseDiscount > 99) {
    return { ok: false, message: `${modeLabel}: base discount must be between 0 and 99%.` };
  }

  const slab2 = parseOptionalDiscount(slab2DiscountPct);
  if (Number.isNaN(slab2)) {
    return { ok: false, message: `${modeLabel}: enter a valid discount for 5–10 classes.` };
  }
  if (slab2 != null && (slab2 < 0 || slab2 > 99)) {
    return { ok: false, message: `${modeLabel}: 5–10 class discount must be between 0 and 99%.` };
  }

  const slab3 = parseOptionalDiscount(slab3DiscountPct);
  if (Number.isNaN(slab3)) {
    return { ok: false, message: `${modeLabel}: enter a valid discount for 11+ classes.` };
  }
  if (slab3 != null && (slab3 < 0 || slab3 > 99)) {
    return { ok: false, message: `${modeLabel}: 11+ class discount must be between 0 and 99%.` };
  }

  if (slab2 != null && baseDiscount > slab2) {
    return {
      ok: false,
      message: `${modeLabel}: 5–10 class discount must be at least the base discount.`,
    };
  }

  if (slab2 != null && slab3 != null && slab3 < slab2) {
    return {
      ok: false,
      message: `${modeLabel}: 11+ class discount must be at least the 5–10 class discount.`,
    };
  }

  return { ok: true, baseRate: parsedBase, baseDiscount, slab2, slab3 };
}

export function validateRateCardForm(
  values: RateCardFormInput,
):
  | { ok: true; normalized: RateCardFormValues }
  | { ok: false; message: string } {
  const offline = validateMode(
    'Offline',
    values.offline.enabled,
    values.offline.baseRate,
    values.offline.baseDiscountPct,
    values.offline.slab2DiscountPct,
    values.offline.slab3DiscountPct,
  );
  if (offline.ok === false) {
    return { ok: false, message: offline.message };
  }

  const online = validateMode(
    'Online',
    values.online.enabled,
    values.online.baseRate,
    values.online.baseDiscountPct,
    values.online.slab2DiscountPct,
    values.online.slab3DiscountPct,
  );
  if (online.ok === false) {
    return { ok: false, message: online.message };
  }

  if (!values.offline.enabled && !values.online.enabled) {
    return { ok: false, message: 'Enable at least one of offline or online classes.' };
  }

  return {
    ok: true,
    normalized: {
      freeDemoOffered: values.freeDemoOffered,
      offlineEnabled: values.offline.enabled,
      offlineBaseRate: offline.baseRate,
      offlineBaseDiscountPct: offline.baseDiscount,
      offlineSlab2DiscountPct: offline.slab2,
      offlineSlab3DiscountPct: offline.slab3,
      onlineEnabled: values.online.enabled,
      onlineBaseRate: online.baseRate,
      onlineBaseDiscountPct: online.baseDiscount,
      onlineSlab2DiscountPct: online.slab2,
      onlineSlab3DiscountPct: online.slab3,
    },
  };
}

export function formatRateCardSummary(rateCard: RateCardLike | null | undefined): string | null {
  if (!isRateCardComplete(rateCard)) {
    return null;
  }

  const parts: string[] = [];
  if (rateCard?.offlineEnabled && rateCard.offlineBaseRate) {
    const effective = calculateEffectiveRate(
      rateCard.offlineBaseRate,
      rateCard.offlineBaseDiscountPct ?? 0,
    );
    parts.push(`${formatInr(effective)}/class offline`);
  }
  if (rateCard?.onlineEnabled && rateCard.onlineBaseRate) {
    const effective = calculateEffectiveRate(
      rateCard.onlineBaseRate,
      rateCard.onlineBaseDiscountPct ?? 0,
    );
    parts.push(`${formatInr(effective)}/class online`);
  }
  if (rateCard?.freeDemoOffered) {
    parts.push('Demo: Yes');
  }
  return parts.join(' · ');
}

export function rateCardToFormInput(rateCard: RateCardLike | null | undefined): RateCardFormInput {
  return {
    freeDemoOffered: rateCard?.freeDemoOffered ?? false,
    offline: {
      enabled: rateCard?.offlineEnabled ?? true,
      baseRate:
        rateCard?.offlineEnabled && rateCard.offlineBaseRate
          ? String(rateCard.offlineBaseRate)
          : '',
      baseDiscountPct:
        rateCard?.offlineBaseDiscountPct != null && rateCard.offlineBaseDiscountPct > 0
          ? String(rateCard.offlineBaseDiscountPct)
          : '',
      slab2DiscountPct:
        rateCard?.offlineSlab2DiscountPct != null
          ? String(rateCard.offlineSlab2DiscountPct)
          : '',
      slab3DiscountPct:
        rateCard?.offlineSlab3DiscountPct != null
          ? String(rateCard.offlineSlab3DiscountPct)
          : '',
    },
    online: {
      enabled: rateCard?.onlineEnabled ?? false,
      baseRate:
        rateCard?.onlineEnabled && rateCard.onlineBaseRate
          ? String(rateCard.onlineBaseRate)
          : '',
      baseDiscountPct:
        rateCard?.onlineBaseDiscountPct != null && rateCard.onlineBaseDiscountPct > 0
          ? String(rateCard.onlineBaseDiscountPct)
          : '',
      slab2DiscountPct:
        rateCard?.onlineSlab2DiscountPct != null
          ? String(rateCard.onlineSlab2DiscountPct)
          : '',
      slab3DiscountPct:
        rateCard?.onlineSlab3DiscountPct != null
          ? String(rateCard.onlineSlab3DiscountPct)
          : '',
    },
  };
}
