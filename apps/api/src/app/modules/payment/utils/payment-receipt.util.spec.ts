import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import {
  buildRazorpayReceipt,
  buildRazorpayReceiptFromOrderNumber,
  RAZORPAY_RECEIPT_MAX_LENGTH,
} from './payment-receipt.util';

describe('buildRazorpayReceipt', () => {
  it('stays within Razorpay 40 character limit for tutor registration', () => {
    const receipt = buildRazorpayReceipt(
      PlatformFeeCodeEnum.TUTOR_REGISTRATION,
      73,
    );
    expect(receipt.length).toBeLessThanOrEqual(RAZORPAY_RECEIPT_MAX_LENGTH);
    expect(receipt.startsWith('tr-73-')).toBe(true);
  });

  it('stays within limit for student registration', () => {
    const receipt = buildRazorpayReceipt(
      PlatformFeeCodeEnum.STUDENT_REGISTRATION,
      999999,
    );
    expect(receipt.length).toBeLessThanOrEqual(RAZORPAY_RECEIPT_MAX_LENGTH);
    expect(receipt.startsWith('sr-999999-')).toBe(true);
  });

  it('old format would exceed Razorpay limit', () => {
    const legacy = `${PlatformFeeCodeEnum.TUTOR_REGISTRATION}-tutor-73-${Date.now()}`;
    expect(legacy.length).toBeGreaterThan(RAZORPAY_RECEIPT_MAX_LENGTH);
  });

  it('builds receipt from commerce order number within limit', () => {
    const receipt = buildRazorpayReceiptFromOrderNumber('TX250615A1B2C3');
    expect(receipt.length).toBeLessThanOrEqual(RAZORPAY_RECEIPT_MAX_LENGTH);
    expect(receipt).toBe('TX250615A1B2C3');
  });
});
