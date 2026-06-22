import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';

const FEE_CODE_PREFIX: Record<PlatformFeeCodeEnum, string> = {
  [PlatformFeeCodeEnum.TUTOR_REGISTRATION]: 'tr',
  [PlatformFeeCodeEnum.STUDENT_REGISTRATION]: 'sr',
  [PlatformFeeCodeEnum.PROFICIENCY_TEST]: 'pt',
};

/** Razorpay receipt max length is 40 characters. */
export const RAZORPAY_RECEIPT_MAX_LENGTH = 40;

export function buildRazorpayReceipt(
  feeCode: PlatformFeeCodeEnum,
  contextId: number,
): string {
  const prefix = FEE_CODE_PREFIX[feeCode] ?? 'pf';
  const receipt = `${prefix}-${contextId}-${Date.now().toString(36)}`;
  return receipt.length > RAZORPAY_RECEIPT_MAX_LENGTH
    ? receipt.slice(0, RAZORPAY_RECEIPT_MAX_LENGTH)
    : receipt;
}

export function buildRazorpayReceiptFromOrderNumber(orderNumber: string): string {
  const receipt = orderNumber.replace(/[^A-Za-z0-9-]/g, '').slice(0, RAZORPAY_RECEIPT_MAX_LENGTH);
  return receipt || `ord-${Date.now().toString(36)}`.slice(0, RAZORPAY_RECEIPT_MAX_LENGTH);
}
