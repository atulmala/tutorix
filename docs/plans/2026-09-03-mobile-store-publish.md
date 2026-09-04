---
title: Mobile store publish (Razorpay first)
status: in-progress
jira: TUTORIX-76
created: 2026-09-03
---

# Mobile store publish (Razorpay first, IAP only if rejected)

Get the Tutorix React Native app ready for Google Play and App Store with **Razorpay only**. Complete legal, account deletion, native compliance, and listing work, then submit. Defer Apple IAP and Play Billing unless a store review objection requires them.

Target binary: `apps/mobile` (`com.tutorix.tech`, version `1.0.0`).

## Implementation todos

1. Add `/privacy` and `/terms` on web; `deleteMyAccount` API + mobile Account section and login/signup legal links
2. Remove test-key-only gate in `payment-checkout.native.ts` for production builds; keep gate in `__DEV__`
3. iOS Face ID, location, encryption, production push, PrivacyInfo; Android keystore secrets, camera optional, production ErrorBoundary
4. Production GraphQL in store binaries, Remote Config store URLs, Play/App Store listing + reviewer notes

## Deferred

IAP / Play Billing only if a store objects in review.
