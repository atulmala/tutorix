---
title: Admin tutor payout calculation
status: done
jira: null
created: 2026-10-30
---

# Admin tutor payout calculation

## Summary

Read-only admin report: IST date range, one row per order line with concluded classes in range. Rate = allocated student-paid per class; commission from class pricing slabs; online charges = platform fee per participant × concluded online classes.

## Key files

- [`libs/shared-utils/src/tutor-payout-calculation.ts`](libs/shared-utils/src/tutor-payout-calculation.ts)
- [`apps/api/src/app/modules/student-cart/services/admin-tutor-payout-calculation.service.ts`](apps/api/src/app/modules/student-cart/services/admin-tutor-payout-calculation.service.ts)
- [`apps/web-admin/src/app/pages/TutorPayoutCalculationPage.tsx`](apps/web-admin/src/app/pages/TutorPayoutCalculationPage.tsx)

## GraphQL

- Query `adminTutorPayoutCalculation(input: AdminTutorPayoutCalculationInput!)`
