---
title: Rate card later for additional offerings
status: done
jira: TUTORIX-88
created: 2026-09-17
labels:
  - cursor-plan
  - implementation-plan
---

# Rate card later for additional offerings

The first rate card after bank setup is mandatory. Additional offerings can be skipped with a warning, then the tutor returns to profile.

## Product rules

- After onboarding bank details, the first rate card has no skip, no back, and only logout in the nav bar.
- When the tutor already has at least one complete rate card and is setting a card for another offering, show **I will do later**.
- Later shows a popup: “Unless you set the rate card, you will not be searched by students to book classes for this offering”
- Confirming that popup returns them to profile. Cancel stays on the form.
- Additional setup also shows a nav back control that uses the same popup and destination.

## Tests

- Helper: first incomplete card cannot defer; remaining cards after one complete card can.
- Web and mobile setup hide later on the first card and show it for additional offerings.
- Confirming later calls the profile callback; cancelling does not.
