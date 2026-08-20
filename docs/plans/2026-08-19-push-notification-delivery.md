---
title: Push notification delivery (iOS + Android FCM)
status: in-progress
jira: null
created: 2026-08-19
labels:
  - cursor-plan
  - implementation-plan
---

# Push notification delivery (iOS + Android FCM)

Finish FCM delivery UX so notifications appear and open Wallet. Token register/send and wallet emit already exist.

**Out of scope:** CLASS_BOOKED emit, CLASS_STARTING_SOON cron, web push, Notifee.

See implementation in `apps/mobile/src/lib/push-notifications.ts`, `apps/mobile/src/app/App.tsx`, `apps/mobile/src/main.tsx`, and `apps/api/src/app/modules/communication/notification/notification.service.ts`.
