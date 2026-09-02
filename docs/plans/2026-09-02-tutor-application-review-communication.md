---
title: Tutor application review on-screen communication
status: in-progress
jira: TUTORIX-75
created: 2026-09-02
labels:
  - cursor-plan
  - implementation-plan
---

# Tutor application review on-screen communication

After documents pass and the tutor reaches application review, the waiting copy is hardcoded. Handle it through the communication engine so admin can edit it. Only the on-screen channel is on by default.

## Event

- `TUTOR_APPLICATION_REVIEW`
- Audience: ACTOR
- Default channels: on-screen only (email / SMS / push / WhatsApp templates exist for admin to enable later)
- Variables: `firstName`
- Emit once from `completeDocsStep` (idempotent on tutor id)

## Clients

Replace hardcoded `APPLICATION_REVIEW_MESSAGE` on web interview and mobile application-review screens with `onScreenCopy` / latest in-app message for this event. Keep the constant only as a last-resort fallback.

## Out of scope

- Enabling email / SMS / push / WhatsApp for this event
- Documents-under-review banner (`DOCUMENTS_ALL_UPLOADED`)
