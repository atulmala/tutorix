---
title: Communication engine (events, admin, FCM)
status: planned
jira: null
created: 2026-08-17
labels:
  - cursor-plan
  - implementation-plan
---

# Communication engine (events, admin, FCM)

New plan (do not extend TUTORIX-68).

**This slice:** event catalog, rules, **file-based templates** (DB stores path only), dispatcher, admin UI, email OTP via `emit()`, wallet top-up `emit()`, FCM + mobile device tokens. SMS/WhatsApp are console-only so admin can configure them without a vendor.

**Out of scope:** DLT/WhatsApp providers, class-booking emit (fulfillment is still a no-op), reminder cron, web push, user mute/quiet hours, Redis/Bull.

## Architecture

Domain services call `CommunicationService.emit()` after a successful commit. They never import `EmailService` or `NotificationService`. The dispatcher loads admin rules, renders templates, and fans out to channel providers. OTP **awaits** send (mutation fails if delivery fails, same as today). Informational events (wallet) are fire-and-forget and never fail the mutation.

## Event catalog (code-owned)

- `EMAIL_VERIFICATION` — audience `ACTOR`, mandatory, **email** on by default.
- `MOBILE_VERIFICATION` — audience `ACTOR`, mandatory, **SMS** on by default.
- `WALLET_TOP_UP` — audience `ACTOR`, **email + push** on by default.
- `CLASS_BOOKED` — audiences `STUDENT` + `TUTOR`, **email + push** on by default. No emit yet.
- `CLASS_STARTING_SOON` — same audiences, **push** on by default. No emit yet.

Templates live under `apps/api/src/app/modules/communication/templates/` (`email`, `notification`, `sms`, `whatsapp`). DB stores `template_path` only. Seed all 7 event/audience pairs × 4 channels (28 files + rows).

## Implementation

1. Enums, entities, bundled starter files, migration, catalog, file store, renderer, dispatcher, console SMS/WA
2. Rewire OTP
3. Admin GraphQL + Communication page
4. Device tokens + FCM + mobile register
5. Wallet `emit` (fire-and-forget)
