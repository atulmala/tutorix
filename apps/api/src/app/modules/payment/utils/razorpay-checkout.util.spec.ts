import {
  buildRazorpayCheckoutDescription,
  buildRazorpayCheckoutDisplayName,
  buildRazorpayOrderLineItems,
  paymentForLabel,
  resolveRazorpayCheckoutLogoUrl,
} from './razorpay-checkout.util';

describe('razorpay-checkout.util', () => {
  it('maps fee codes to payment-for labels', () => {
    expect(paymentForLabel('TUTOR_REGISTRATION')).toBe('Tutor Registration');
    expect(paymentForLabel('STUDENT_REGISTRATION')).toBe('Student Registration');
    expect(paymentForLabel('PROFICIENCY_TEST')).toBe('Proficiency Test');
    expect(paymentForLabel('CLASS_BOOKING')).toBe('Class Booking');
  });

  it('falls back to description or platform fee', () => {
    expect(paymentForLabel(undefined, 'Custom fee')).toBe('Custom fee');
    expect(paymentForLabel('UNKNOWN')).toBe('Platform fee');
  });

  it('builds checkout purpose from fee code', () => {
    expect(
      buildRazorpayCheckoutDescription({
        feeCode: 'TUTOR_REGISTRATION',
        commerceOrderNumber: 'TX260623ABC',
      }),
    ).toBe('Tutor Registration Fee');
  });

  it('builds checkout purpose for other fee codes', () => {
    expect(
      buildRazorpayCheckoutDescription({
        feeCode: 'STUDENT_REGISTRATION',
      }),
    ).toBe('Student Registration Fee');
  });

  it('title-cases display name fallback', () => {
    expect(
      buildRazorpayCheckoutDescription({
        description: 'Tutor registration fee',
      }),
    ).toBe('Tutor Registration Fee');
  });

  it('uses checkout purpose as display name for Razorpay sidebar', () => {
    expect(buildRazorpayCheckoutDisplayName('Tutor Registration Fee')).toBe(
      'Tutor Registration Fee',
    );
  });

  it('builds line items for Price Summary', () => {
    expect(
      buildRazorpayOrderLineItems({
        amountInr: 150,
        checkoutPurpose: 'Tutor Registration Fee',
        notes: { feeCode: 'TUTOR_REGISTRATION', listPriceInr: '199' },
      }),
    ).toEqual({
      line_items_total: 15000,
      line_items: [
        {
          sku: 'TUTOR_REGISTRATION',
          variant_id: 'TUTOR_REGISTRATION',
          name: 'Tutor Registration Fee',
          description: 'Tutor Registration Fee',
          price: 19900,
          offer_price: 15000,
          quantity: 1,
        },
      ],
    });
  });

  it('falls back to default logo url', () => {
    expect(resolveRazorpayCheckoutLogoUrl(undefined)).toBe(
      'https://www.tutorix.com/favicon.ico',
    );
    expect(resolveRazorpayCheckoutLogoUrl('https://cdn.example/logo.png')).toBe(
      'https://cdn.example/logo.png',
    );
  });
});
