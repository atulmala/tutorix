---
title: Tutor onboarding approved communication
status: in-progress
jira: TUTORIX-74
created: 2026-09-01
labels:
  - cursor-plan
  - implementation-plan
---

# Tutor onboarding approved communication

When a tutor is accepted, the congratulations copy is hardcoded. Handle on-screen and email through the communication engine so admin can edit both.

## Event

- `TUTOR_ONBOARDING_APPROVED`
- Audience: ACTOR
- Default channels: on-screen + email
- Variables: `firstName`
- Emit once from `approveTutorOnboarding` (idempotent on tutor id)

## Clients

Replace hardcoded `ONBOARDING_APPROVED_MESSAGE` on web/mobile complete and interview/review screens with `onScreenCopy` / latest in-app message for this event. Keep the constant only as a last-resort fallback.

## Out of scope

- Application-review waiting copy (`APPLICATION_REVIEW_MESSAGE`)
- Push / SMS / WhatsApp (templates exist for admin to enable)
