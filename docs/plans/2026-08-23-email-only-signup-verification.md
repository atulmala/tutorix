---
title: Skip mobile OTP by default
status: in-progress
jira: TUTORIX-70
created: 2026-08-23
labels:
  - cursor-plan
  - implementation-plan
---

# Skip mobile OTP by default

Signup notes `basic details → verify email` unless Communication → **Mobile verification** is On. Phone OTP components, mutations, and templates stay in the repo.

## Decision

Reuse the existing admin toggle: `communication_rule.enabled` for `MOBILE_VERIFICATION` / `ACTOR`. Do not add a new `mobileverification_to_be_done` column.

- **Off (default after this work):** skip phone screen; email OTP also sets `isMobileVerified`.
- **On (later):** original phone then email; email OTP does not auto-verify mobile.

The server is the source of truth. Hiding the screen in React alone is not enough.

## Backend

1. Migration sets `communication_rule.enabled = false` for `MOBILE_VERIFICATION` / `ACTOR`.
2. `CommunicationService.isMobileVerificationRequired()` reads that rule (`false` if missing).
3. Public query `signupVerificationPolicy { mobileVerificationRequired }`.
4. Email OTP success also sets `isMobileVerified` when the policy is off.
5. Incomplete-signup login error JSON includes `mobileVerificationRequired`.

## Clients

Web and mobile signup fetch the policy, skip the phone step when it is off, and keep `PhoneVerification` for when admin turns the rule On. Login incomplete UX hides the mobile row when the policy is off.

## Out of scope

- Wiring a real SMS provider.
- Deleting phone OTP UI/API.
- Changing tutor/student post-login onboarding stages.
- Backfilling or un-verifying existing users when the toggle flips.
