export type GatewayRefundSource = {
  paymentAttemptId: number;
  gatewayPaymentId: string;
  amountInr: number;
  refundedInr: number;
};

export type GatewayRefundSlice = {
  paymentAttemptId: number;
  gatewayPaymentId: string;
  amountInr: number;
};

export function allocateGatewayRefund(
  amountInr: number,
  sources: GatewayRefundSource[],
): GatewayRefundSlice[] {
  if (amountInr <= 0) {
    return [];
  }
  let remaining = amountInr;
  const slices: GatewayRefundSlice[] = [];
  for (const source of sources) {
    if (remaining <= 0) {
      break;
    }
    const capacity = source.amountInr - source.refundedInr;
    if (capacity <= 0 || !source.gatewayPaymentId) {
      continue;
    }
    const slice = Math.min(capacity, remaining);
    slices.push({
      paymentAttemptId: source.paymentAttemptId,
      gatewayPaymentId: source.gatewayPaymentId,
      amountInr: slice,
    });
    remaining -= slice;
  }
  if (remaining > 0) {
    return [];
  }
  return slices;
}
