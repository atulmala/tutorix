---
title: Tutor home pending tasks
status: done
jira: TUTORIX-84
created: 2026-09-17
labels:
  - cursor-plan
  - implementation-plan
---

# Tutor home pending tasks

After a tutor reaches home (at least one complete rate card), show remaining setup work as optional prompts with CTAs.

## Product rules

- **Rate card:** If any `pt_passed` offering still lacks a complete rate card, show: “You have not set up the rate card for your offerings. Unless you do this, you will not get class bookings for these offerings” plus a button to the rate-card screen.
- This is not the mandatory gate. Tutors with zero complete cards still cannot reach home.
- **Calendar:** If availability is not updated through the coming Sunday (IST), show: “Your availability calendar is not updated. With updated calendar you have higer chances of getting bookings” plus a button to a calendar page.
- Coverage uses `myTutorCalendarUpdatedTill` (latest saved slot start). Prompt when there is no slot, or the latest slot is before coming Sunday 00:00 IST. If today is Sunday, that day is the coming Sunday.

## UI

- Place pending-task cards above the schedule hub on web and mobile tutor home.
- Rate-card CTA reuses the existing rate-card setup screen; skip/complete only when no pending offerings remain (so remaining offerings can be completed after the gate).
- Calendar CTA opens a dedicated calendar view wrapping the existing availability calendar, with back to home.

## Tests

- Helpers: incomplete remaining rate cards; calendar through coming Sunday.
- Home shows both prompts when incomplete, and hides them when complete.
- Rate-card setup stays open when some (not all) passed offerings lack a card.
