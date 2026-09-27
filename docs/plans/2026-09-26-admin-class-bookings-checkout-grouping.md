---
title: Admin class bookings grouped by checkout
status: done
jira: null
created: 2026-09-26
---

# Admin class bookings grouped by checkout

## Goal

Admin **Class bookings** lists one row per cart checkout (commerce order), not one row per class credit. Expanding a row shows all class hours in that checkout with tutor, subject, mode, status, and slot.

## Implementation

- GraphQL `adminClassBookings` returns `AdminClassBookingCheckoutItem` with nested `AdminClassBookingCreditLine` entries.
- [`AdminClassBookingService`](../../apps/api/src/app/modules/student-cart/services/admin-class-booking.service.ts) paginates `COUNT(DISTINCT credit.order_id)`, loads all credits for orders on the page (full checkout lines; filters only affect which orders appear).
- [`ClassBookingsPage`](../../apps/web-admin/src/app/pages/ClassBookingsPage.tsx) expandable summary table; link to order and student/tutor detail pages.

## Related

- Original list: [`2026-09-26-admin-class-bookings.md`](./2026-09-26-admin-class-bookings.md)
