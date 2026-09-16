---
title: Mandatory tutor bank account setup
status: in-progress
jira: null
created: 2026-09-16
labels:
  - cursor-plan
  - implementation-plan
---

# Mandatory tutor bank account setup

Certified tutors cannot use the dashboard until bank details are complete. This applies on the first visit after onboarding celebration, and on every later login if details are still missing.

## Product rules

- After `onBoardingComplete` and the celebration CTA, route to an **Account setup** screen instead of home when bank details are incomplete.
- Any tutor login/session restore with incomplete (or missing) bank details uses the same gate.
- The screen is not dismissible: no skip, close, back, profile, or wallet. Logout remains available.
- Copy:

  > Please set up your bank account. Its where you will receive your payments

- Completeness is the existing rule in [`isBankDetailsComplete`](libs/shared-utils/src/bank-details-formatters.ts): bank name, account number, IFSC, PAN. After a successful save, go to tutor home.
- Profile still allows later edits. Rate-card gating stays as-is.

## Routing

Extend [`tutorViewAfterProfile`](apps/web/src/app/web-navigation.ts) (web + mobile):

1. Incomplete onboarding or unseen celebration → onboarding
2. Celebration seen and `bankDetailsComplete !== true` → account setup
3. Else → tutor home

Expose `bankDetailsComplete` on `myTutorProfile` (ResolveField on `Tutor`). After celebration, refetch profile instead of hard-coding home.

## UI

Reuse the existing bank form (web [`BankDetailsModal`](libs/tutor-detail-ui/src/BankDetailsModal.tsx), mobile [`BankDetailsModal`](apps/mobile/src/app/components/tutor-profile/BankDetailsModal.tsx)) in a required, in-page variant: title **Account setup**, the message above, Save only.

## Tests

- Routing unit tests for the new view
- Bank-details completeness helper used by the resolver
- Setup screen shows the required copy and has no dismiss control
