---
title: Monthly tutor payouts
status: done
jira: null
created: 2026-11-18
---

# Monthly tutor payouts

## Summary

Replaced rolling 7-day tutor payout windows with IST calendar months: settlement-eligible classes (undisputed, not already linked to a payout), per-credit `tutor_payout_disbursement_id`, manual admin submit → ready disbursements, tutor monthly earnings buckets, configurable settlement day (messaging only).

## Key changes

- Shared utils: `istMonthBounds`, `defaultSettlementMonthPeriod`, `classEligibleForPayoutView`
- Migration `1780200000000-TutorMonthlyPayoutCreditLink`
- `AdminTutorPayoutCalculationService` settlement mode + bucket totals
- GraphQL: `myTutorMonthlyEarnings`, updated `myTutorEarningsSummary`, `adminTutorPayoutSettings`
- Admin `TutorPayoutCalculationPage` defaults to previous month + settlement day editor
- Web/mobile tutor earnings and home cards

## Supersedes

Weekly “next payout / in hold” UX from [2026-11-02-tutor-earnings-experience.md](2026-11-02-tutor-earnings-experience.md).