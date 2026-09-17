---
title: Shared rate card for overlapping PT offerings
status: done
jira: TUTORIX-87
created: 2026-09-17
labels:
  - cursor-plan
  - implementation-plan
---

# Shared rate card for overlapping PT offerings

Offerings that share a proficiency test (for example CBSE Class XI and Class XII Mathematics) share one rate card. Tutors should not set a separate card per class.

## Product rules

- Overlap is the same `proficiencyTestId`.
- Saving a rate card on one passed offering copies it onto the tutor’s other `pt_passed` offerings with that test.
- Crediting an overlapping PT pass also copies an existing sibling rate card onto the new offering.
- Search, profile, home pending tasks, and rate-card setup treat a sibling complete card as covering the offering.
- Setup asks for one card per uncovered PT group, not once per class.

## Tests

- Helper: same-PT sibling with a card is covered; a different PT is not.
- API: save copies to siblings; search includes an offering that only inherits a sibling card.
- Setup: Class XI is skipped when Class XII already has the shared card; Physics still needs its own.
