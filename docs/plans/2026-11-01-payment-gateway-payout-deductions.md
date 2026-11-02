---
title: Payment gateway charges in tutor payout
status: in-progress
jira: null
created: 2026-11-01
---

# Payment gateway charges in tutor payout

## Summary

Admin-configurable payment gateway fee percentages (per provider) and a shared GST rate on gateway charges. Tutor payout report deducts PG fee + GST from gross on concluded classes; provider comes from paid `commerce_payment_attempt` on the order, defaulting to Razorpay.

## Key files

- [`libs/shared-utils/src/tutor-payout-calculation.ts`](libs/shared-utils/src/tutor-payout-calculation.ts)
- [`apps/api/src/app/modules/payment-gateway-fee/`](apps/api/src/app/modules/payment-gateway-fee/)
- [`apps/api/src/app/modules/student-cart/services/admin-tutor-payout-calculation.service.ts`](apps/api/src/app/modules/student-cart/services/admin-tutor-payout-calculation.service.ts)
- [`apps/web-admin/src/app/pages/FeesAndChargesPage.tsx`](apps/web-admin/src/app/pages/FeesAndChargesPage.tsx)
- [`apps/web-admin/src/app/pages/TutorPayoutCalculationPage.tsx`](apps/web-admin/src/app/pages/TutorPayoutCalculationPage.tsx)

## GraphQL

- `adminPaymentGatewayFeeConfig`, `adminUpdatePaymentGatewayFeeSettings`, `adminUpdatePaymentGatewayFee`, `adminCreatePaymentGatewayFee`
- Extended `adminTutorPayoutCalculation` row/total fields for PG deductions
