import {
  orderItemLinePaidTotalInr,
  orderItemPaidInrForCredits,
} from './admin-class-booking-order-item.util';

describe('admin-class-booking-order-item.util', () => {
  it('computes line paid total and per-credit allocation', () => {
    const parts = {
      lineSubtotalInr: 2000,
      discountInr: 200,
      cgstInr: 162,
      sgstInr: 162,
      igstInr: 0,
      quantity: 2,
    };
    expect(orderItemLinePaidTotalInr(parts)).toBe(2124);
    expect(orderItemPaidInrForCredits(parts, 2)).toBe(2124);
    expect(orderItemPaidInrForCredits(parts, 1)).toBe(1062);
  });
});
