---
title: Extend communication events for document status
status: in-progress
jira: TUTORIX-72
created: 2026-08-30
labels:
  - cursor-plan
  - implementation-plan
---

# Extend communication events for document status

Extend the existing communication engine (catalog, admin rules/templates, emit → dispatcher) with an ON_SCREEN channel and three tutor-document events. Admin continues to choose channels and copy; the fail email gets a pre-built document list because the renderer has no loops.

## Events

- `DOCUMENTS_ALL_UPLOADED` — on-screen by default; emit when confirm upload first makes all four required types present
- `DOCUMENTS_VERIFICATION_PASSED` — email by default; emit once when every latest required doc has a final screening status and none are `REJECTED_HUMAN`
- `DOCUMENTS_VERIFICATION_FAILED` — email + push by default; emit once when the same completeness check holds and at least one is `REJECTED_HUMAN`

Final statuses: `PASSED_AUTOMATED`, `APPROVED_HUMAN`, `REJECTED_HUMAN`. `PENDING_HUMAN` is not final.

## Engine

- Add `ON_SCREEN` channel and `communication_rule.on_screen_enabled`
- Persist `in_app_message` on ON_SCREEN dispatch
- Triple-brace `{{{name}}}` for trusted HTML fragments (`failedDocumentsHtml`)
- Idempotency via `tutor-docs-outcome` fingerprint of document ids + statuses

## Clients

Replace hardcoded web/mobile “under review” banners with the ON_SCREEN template for `DOCUMENTS_ALL_UPLOADED`.
