---
title: Tutor earnings experience
status: done
jira: null
created: 2026-11-02
---

# Tutor earnings experience

## Summary

Tutor-facing earnings hub (mobile tab + web header): estimated next payout and in-hold totals, period breakdown aligned with admin payout calculation, paid transfers placeholder, home summary card.

## API

- `myTutorEarningsSummary`
- `myTutorPayoutPeriodDetail(input: TutorPayoutPeriodInput!)`
- `myTutorPayoutTransfers` (empty until payout records exist)

## Key files

- [`apps/api/src/app/modules/student-cart/services/tutor-earnings.service.ts`](apps/api/src/app/modules/student-cart/services/tutor-earnings.service.ts)
- [`libs/shared-graphql/src/queries/tutor-earnings.queries.ts`](libs/shared-graphql/src/queries/tutor-earnings.queries.ts)
- [`apps/web/src/app/components/tutor-earnings/TutorEarningsPage.tsx`](apps/web/src/app/components/tutor-earnings/TutorEarningsPage.tsx)
- [`apps/mobile/src/app/components/tutor-earnings/TutorEarningsScreen.tsx`](apps/mobile/src/app/components/tutor-earnings/TutorEarningsScreen.tsx)
