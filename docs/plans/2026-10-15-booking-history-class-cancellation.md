---
title: Booking history class cancellation (slab-aware refunds)
status: done
jira: null
created: 2026-10-15
---

# Booking history class cancellation (slab-aware refunds)

## Summary

Students cancel classes from **booking history** (one card per order line) on a dedicated **Class cancellation** screen. Refunds use **bulk slab repricing** so remaining classes are priced at the correct tier. Wallet refunds are instant; gateway refunds show a 3 working day message.

## Key files

- [`libs/shared-utils/src/class-credit-cancellation-refund.ts`](../../libs/shared-utils/src/class-credit-cancellation-refund.ts) — refund math, credit pick order, cancellable rules
- [`apps/api/src/app/modules/student-cart/services/class-credit-cancellation.service.ts`](../../apps/api/src/app/modules/student-cart/services/class-credit-cancellation.service.ts) — preview + `cancelClassBooking`
- [`apps/web/src/app/components/student-home/StudentClassCancellationPage.tsx`](../../apps/web/src/app/components/student-home/StudentClassCancellationPage.tsx)
- [`apps/mobile/src/app/components/student-home/StudentClassCancellationScreen.tsx`](../../apps/mobile/src/app/components/student-home/StudentClassCancellationScreen.tsx)

## API

- `previewClassBookingCancellation(orderItemId, cancelCount)`
- `cancelClassBooking(orderItemId, cancelCount, refundMethod)`
- `studentClassBookings` rows include `cancellableCount` and `canCancel`

## Data

- `commerce_order_item.class_pricing_snapshot` (jsonb) set at cart checkout for slab-accurate repricing
