import type { ClassOrderPricingSnapshot, RateCardLike } from '@tutorix/shared-utils';
import { pricingSnapshotToRateCard } from '@tutorix/shared-utils';
import { OrderItemEntity } from '../commerce/entities/order-item.entity';
import { OrderItemPaidParts } from './admin-class-booking-order-item.util';

export function orderItemToPaidParts(item: OrderItemEntity): OrderItemPaidParts {
  return {
    lineSubtotalInr: item.lineSubtotalInr,
    discountInr: item.discountInr,
    cgstInr: item.cgstInr,
    sgstInr: item.sgstInr,
    igstInr: item.igstInr,
    quantity: item.quantity,
  };
}

export function rateCardForOrderItem(
  orderItem: OrderItemEntity,
  fallbackRateCard: RateCardLike | null | undefined,
): { mode: 'online' | 'offline'; rateCard: RateCardLike } | null {
  const snapshot = orderItem.classPricingSnapshot as ClassOrderPricingSnapshot | null | undefined;
  if (snapshot?.mode) {
    return {
      mode: snapshot.mode,
      rateCard: pricingSnapshotToRateCard(snapshot),
    };
  }
  if (!fallbackRateCard) {
    return null;
  }
  const mode =
    fallbackRateCard.offlineEnabled === true ? 'offline' : 'online';
  return { mode, rateCard: fallbackRateCard };
}
