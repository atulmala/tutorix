---
title: Communication module (email under communication)
status: in-progress
jira: TUTORIX-68
created: 2026-08-14
labels:
  - cursor-plan
  - implementation-plan
---

# Communication module refactor

Move the existing NestJS email module under `communication/` so SMS, WhatsApp, and Firebase push notifications can be added later as sibling channels. No send-behavior change, no SMS/WhatsApp/FCM providers, no `email_send` schema change.

## Layout

```text
apps/api/src/app/modules/communication/
  communication.module.ts
  email/           # SES transactional email
  notification/    # Firebase Cloud Messaging (scaffold; send is no-op until FCM)
```

`CommunicationModule` imports and re-exports channel modules. `AppModule`, `AuthModule`, and `AdminModule` import `CommunicationModule` only.

Callers inject `EmailService` or `NotificationService`. Firebase Analytics/Crashlytics stay in `libs/common/analytics`.
