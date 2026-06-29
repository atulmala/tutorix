import {
  formatFeePaymentStageMessage,
  formatPlatformFeeSummary,
  formatProficiencyTestFeeMessage,
} from './payment-checkout';

describe('payment-checkout fee messages', () => {
  it('formats fixed discount for payment stage', () => {
    expect(
      formatFeePaymentStageMessage({
        feeName: 'Tutor Registration',
        amountInr: 199,
        discountAmountInr: 49,
        discountType: 'FIXED_INR',
        discountValue: 49,
        netAmountInr: 150,
      }),
    ).toBe(
      'Tutor Registration fee ₹199, discount ₹49, net amount payable: ₹150',
    );
  });

  it('formats percent discount for payment stage', () => {
    expect(
      formatFeePaymentStageMessage({
        feeName: 'Student Registration',
        amountInr: 200,
        discountAmountInr: 50,
        discountType: 'PERCENT',
        discountValue: 25,
        netAmountInr: 150,
      }),
    ).toBe(
      'Student Registration fee ₹200, discount 25%, net amount payable: ₹150',
    );
  });

  it('includes discount breakdown in platform fee summary', () => {
    const summary = formatPlatformFeeSummary({
      displayName: 'Tutor registration fee',
      amountInr: 199,
      discountType: 'FIXED_INR',
      discountValue: 49,
      discountAmountInr: 49,
      effectiveAmountInr: 150,
      waived: false,
      displayLabel: '₹150',
    });

    expect(summary.message).toBe(
      'Tutor registration fee ₹199, discount ₹49, net amount payable: ₹150',
    );
    expect(summary.requiresPayment).toBe(true);
  });

  it('infers PT fee discount from list and due amounts', () => {
    expect(
      formatProficiencyTestFeeMessage({
        listPriceInr: 99,
        amountDueInr: 79,
        displayName: 'Proficiency test fee',
      }),
    ).toBe('Proficiency test fee ₹99, discount ₹20, net amount payable: ₹79');
  });

  it('ignores stale waived promo when PT fee is chargeable at full price', () => {
    expect(
      formatProficiencyTestFeeMessage({
        listPriceInr: 99,
        amountDueInr: 99,
        effectiveAmountInr: 99,
        discountAmountInr: 0,
        displayName: 'Proficiency test fee',
        promoMessage:
          'Proficiency test fee is not being charged for a limited time.',
      }),
    ).toBe('Amount due before the test: ₹99.');
  });

  it('uses promo message only when PT fee is waived', () => {
    expect(
      formatProficiencyTestFeeMessage({
        listPriceInr: 99,
        amountDueInr: 0,
        effectiveAmountInr: 0,
        discountAmountInr: 0,
        promoMessage:
          'Proficiency test fee is not being charged for a limited time.',
      }),
    ).toBe('Proficiency test fee is not being charged for a limited time.');
  });

  it('uses promo message for chargeable platform fee when configured', () => {
    const summary = formatPlatformFeeSummary({
      displayName: 'Tutor registration fee',
      amountInr: 11,
      discountAmountInr: 0,
      effectiveAmountInr: 11,
      waived: false,
      displayLabel: '₹11',
      promoMessage: 'Heavy Discount on Registration Fee for very limited time.',
    });

    expect(summary.message).toBe(
      'Heavy Discount on Registration Fee for very limited time.',
    );
  });

  it('prefers promo message over discount breakdown when both are set', () => {
    const summary = formatPlatformFeeSummary({
      displayName: 'Tutor registration fee',
      amountInr: 199,
      discountType: 'FIXED_INR',
      discountValue: 49,
      discountAmountInr: 49,
      effectiveAmountInr: 150,
      waived: false,
      displayLabel: '₹150',
      promoMessage: 'Heavy Discount on Registration Fee for very limited time.',
    });

    expect(summary.message).toBe(
      'Heavy Discount on Registration Fee for very limited time.',
    );
  });

  it('uses promo message when platform fee is waived', () => {
    const summary = formatPlatformFeeSummary({
      displayName: 'Tutor registration fee',
      amountInr: 999,
      discountAmountInr: 999,
      effectiveAmountInr: 0,
      waived: true,
      displayLabel: '₹999 — Free for now',
      promoMessage:
        'The one-time registration fee is not being charged for a limited time.',
    });

    expect(summary.message).toBe(
      'The one-time registration fee is not being charged for a limited time.',
    );
  });

  it('ignores stale promo on chargeable platform fee summary', () => {
    const summary = formatPlatformFeeSummary({
      displayName: 'Proficiency test fee',
      amountInr: 99,
      discountAmountInr: 0,
      effectiveAmountInr: 99,
      waived: false,
      displayLabel: '₹99',
      promoMessage:
        'Proficiency test fee is not being charged for a limited time.',
    });

    expect(summary.message).toBe('Amount due: ₹99.');
    expect(summary.requiresPayment).toBe(true);
  });
});
