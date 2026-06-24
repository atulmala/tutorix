const FEE_CODE_PAYMENT_FOR_LABEL: Record<string, string> = {
  TUTOR_REGISTRATION: 'Tutor Registration',
  STUDENT_REGISTRATION: 'Student Registration',
  PROFICIENCY_TEST: 'Proficiency Test',
  CLASS_BOOKING: 'Class Booking',
};

const FEE_CODE_CHECKOUT_PURPOSE: Record<string, string> = {
  TUTOR_REGISTRATION: 'Tutor Registration Fee',
  STUDENT_REGISTRATION: 'Student Registration Fee',
  PROFICIENCY_TEST: 'Proficiency Test Fee',
  CLASS_BOOKING: 'Class Booking Fee',
};

const DEFAULT_CHECKOUT_LOGO_URL = 'https://www.tutorix.com/favicon.ico';

function parseNoteInt(value?: string): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export type RazorpayOrderLineItem = {
  sku: string;
  variant_id: string;
  name: string;
  description: string;
  price: number;
  offer_price: number;
  quantity: number;
  image_url?: string;
};

function titleCaseWords(value: string): string {
  return value.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

export function paymentForLabel(
  feeCode?: string,
  fallbackDescription?: string,
): string {
  if (feeCode && FEE_CODE_PAYMENT_FOR_LABEL[feeCode]) {
    return FEE_CODE_PAYMENT_FOR_LABEL[feeCode];
  }
  if (fallbackDescription?.trim()) {
    return fallbackDescription.trim();
  }
  return 'Platform fee';
}

export function resolveRazorpayCheckoutLogoUrl(configuredUrl?: string): string {
  const trimmed = configuredUrl?.trim();
  return trimmed || DEFAULT_CHECKOUT_LOGO_URL;
}

/** Short label stored on the order and sent as checkout description. */
export function buildRazorpayCheckoutDescription(
  notes?: Record<string, string>,
): string {
  if (notes?.feeCode && FEE_CODE_CHECKOUT_PURPOSE[notes.feeCode]) {
    return FEE_CODE_CHECKOUT_PURPOSE[notes.feeCode];
  }
  if (notes?.description?.trim()) {
    return titleCaseWords(notes.description.trim());
  }
  return 'Platform Fee';
}

/**
 * Razorpay's redesigned checkout shows `name` beside the logo.
 * `description` is ignored when checkout opens with an order_id.
 */
export function buildRazorpayCheckoutDisplayName(
  checkoutPurpose: string,
): string {
  return checkoutPurpose;
}

/** Line items for Razorpay Price Summary (purpose-of-charges display). */
export function buildRazorpayOrderLineItems(params: {
  amountInr: number;
  checkoutPurpose: string;
  notes?: Record<string, string>;
  imageUrl?: string;
}): { line_items_total: number; line_items: RazorpayOrderLineItem[] } {
  const amountPaise = params.amountInr * 100;
  const listPriceInr =
    parseNoteInt(params.notes?.listPriceInr) ?? params.amountInr;
  const sku = params.notes?.feeCode?.trim() || 'PLATFORM_FEE';

  return {
    line_items_total: amountPaise,
    line_items: [
      {
        sku,
        variant_id: sku,
        name: params.checkoutPurpose,
        description: params.checkoutPurpose,
        price: listPriceInr * 100,
        offer_price: amountPaise,
        quantity: 1,
        ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      },
    ],
  };
}
