---
title: Student class cart, order, and schedule-after-pay
status: in-progress
jira: TUTORIX-91
created: 2026-09-25
labels:
  - cursor-plan
  - implementation-plan
---

# Student class cart, order, and schedule-after-pay

Students buy **classes from a tutor** (quantity + Online/Offline), not a single calendar slot. Payment happens at cart checkout. Slot picking is a later step (now or after login).

This is **Phase 4 of commerce** (`docs/plans/2026-06-15-unified-commerce-orders-invoicing.md`) with one product change: **do not hold slots in the cart**. The old Phase 4 sketch assumed `tutor_calendar_id` on `cart_item`. That does not match this flow.

Do **not** edit that existing plan file. This plan is the implementation source of truth.

## What already exists (reuse)

- **Orders / items / invoices:** `commerce_order`, `commerce_order_item` (`CLASS_BOOKING`, `quantity`, `tutor_offering` / `calendar_slot` refs), `OrderService.createOrderWithItems`, `InvoiceService`, `OrderSourceEnum.cart`, `OrderPaymentMethodEnum.wallet | gateway`.
- **Wallet + silent top-up pattern:** `WalletCheckoutService` + `runWalletAwarePurchaseCheckout`. Today: gateway **top-up order** (`WALLET_TOP_UP` / `top_up_credit` in history), then **wallet debit** for the purchase. `mixed` is unused — keep this two-step model.
- **Slots / sessions:** `listBookableSlots` and lock/capacity logic inside `bookTutorClass`.
- **Search / preview:** unchanged. Entry is still tutor preview after study area → board → test → subject.

## Domain

**Cart (one open cart per student, survives logout):**

- `student_cart`: `student_id` unique (open cart).
- `student_cart_item`: `tutor_offering_id`, `delivery_mode` (`online` | `offline`), `quantity`, `unit_rate_inr` snapshot.
- Same student + offering + mode **merges quantity**.
- Reprice on qty change using rate-card slabs (1–4 / 5–10 / 11+) for that mode.

**Purchase (fulfillment after pay):** one **class credit** row per purchased hour. Fields: student, order + order_item, tutor, offering, delivery_mode, status `unscheduled | scheduled | cancelled`, nullable `enrollment_id`.

**Schedule (no second charge):** bind a credit to `tutorCalendarId`. Create/join session + confirmed enrollment. Reschedule: release old enrollment/capacity, assign a new bookable slot.

Clear cart only after the purchase order is **paid**. Failed Razorpay leaves cart intact.

## Payment

1. Price cart on the server.
2. If wallet is enough → create order, debit wallet, fulfill credits, invoice, clear cart.
3. If short → Razorpay shortfall top-up (student sees `top_up_credit`), then wallet debit for the full order.

Do **not** send the student to the wallet top-up screen.

## GraphQL (student)

- `myCart` / `addToCart` / `updateCartItem` / `removeFromCart`
- `prepareCartCheckout`
- Complete via wallet mutations + cart purchase resolution
- `myClassCredits`
- `scheduleClassCredit` / `rescheduleClassCredit`
- Keep `tutorBookableSlots` and `studentBookedClassSessions`

## UI (web + mobile)

- Preview: quantity + Online/Offline + Add to cart
- Cart page, checkout Pay
- Schedule now / later
- Home: upcoming + N classes to schedule

## Out of scope

Refunds, cancellations (except reschedule), GST on class lines, tutor payout, video join, points, changing the existing platform-fee checkout path.
