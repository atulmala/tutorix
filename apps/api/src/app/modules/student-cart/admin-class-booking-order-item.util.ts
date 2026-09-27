export type OrderItemPaidParts = {
  lineSubtotalInr: number;
  discountInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  quantity: number;
};

export function orderItemLinePaidTotalInr(parts: OrderItemPaidParts): number {
  return Math.max(
    0,
    parts.lineSubtotalInr -
      parts.discountInr +
      parts.cgstInr +
      parts.sgstInr +
      parts.igstInr,
  );
}

/** Allocates order line total across `creditCount` credits from that line item. */
export function orderItemPaidInrForCredits(
  parts: OrderItemPaidParts,
  creditCount: number,
): number {
  if (creditCount <= 0 || parts.quantity <= 0) {
    return 0;
  }
  const lineTotal = orderItemLinePaidTotalInr(parts);
  return Math.round((lineTotal * creditCount) / parts.quantity);
}

export function orderItemPaidInrPerCredit(parts: OrderItemPaidParts): number {
  return orderItemPaidInrForCredits(parts, 1);
}
