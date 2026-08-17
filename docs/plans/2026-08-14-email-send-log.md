---
title: Email send log (sent/failed)
status: in-progress
jira: TUTORIX-67
created: 2026-08-14
labels:
  - cursor-plan
  - implementation-plan
---

# Email send log (step 1)

Persist a metadata row for every email `EmailService.send()` attempts. No full body, no OTP. Status is `SENT` or `FAILED` only; bounce/complaint updates come later.

## Store

`email_send` table (QBaseEntity): `userId` (nullable FK, SET NULL), `toEmail`, `recipientName`, `recipientRole`, `purpose`, `subject`, `provider`, `sesMessageId`, `status`, `errorMessage`, `sentAt`, `statusUpdatedAt`.

Purpose enum includes current and upcoming types: `EMAIL_OTP`, `CLASS_BOOKING`, `CLASS_REMINDER`, `PAYMENT_CREDITED`, `WALLET_TOP_UP`, `ADMIN_TEST`, `OTHER`.

## Write path

`EmailService.send()` requires `purpose`. Callers pass optional `userId` / name / role; service fills snapshots from User when missing. Persist after SES/console returns; on provider error persist `FAILED` then rethrow. Persist errors after a successful send are logged, not thrown.

OTP and admin test send pass purpose. No admin list UI in this step.
