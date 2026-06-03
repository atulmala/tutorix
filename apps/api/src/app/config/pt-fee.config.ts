export const PT_ATTEMPT_LIST_PRICE_INR = 99;

export function isPtFeeCollectionEnabled(): boolean {
  return process.env.PT_FEE_COLLECTION_ENABLED === 'true';
}
