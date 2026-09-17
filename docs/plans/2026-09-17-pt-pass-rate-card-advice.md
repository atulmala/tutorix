---
title: Post-onboarding PT pass rate card advice
status: done
jira: TUTORIX-85
created: 2026-09-17
labels:
  - cursor-plan
  - implementation-plan
---

# Post-onboarding PT pass rate card advice

When a tutor passes a proficiency test after onboarding (profile retry or add-offering), tell them to set a rate card for that offering. Onboarding PT stays on the existing congratulations copy.

## Product rules

- Applies only when `TutorPT` context is `profile` or `addOffering`.
- Pass copy: “Congratulations on passing the proficiency test. Now set up rate card for this offering. Unless you set the rate card, you will not be able to get class bookings from students”
- Primary action: **Set up rate card** opens the rate-card form for the offering just passed.
- Saving the rate card returns them to profile. They can still go back without saving; home pending tasks remain as a reminder.
- Onboarding PT pass copy and Continue are unchanged.

## Tests

- Shared helper returns the post-onboarding copy vs onboarding copy.
- Web and mobile PT result screens show the advice and rate-card CTA after a post-onboarding pass.
