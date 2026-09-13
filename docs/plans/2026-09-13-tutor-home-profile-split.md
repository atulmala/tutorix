---
title: Tutor home vs profile (mobile)
status: done
jira: TUTORIX-79
created: 2026-09-13
labels:
  - cursor-plan
  - implementation-plan
---

# Tutor home vs profile (mobile)

Mirror the student home/profile split for onboarded tutors. Profile is no longer the landing screen.

- Add `tutorHome` and land completed tutors there (including after onboarding).
- Nav: left avatar opens profile; wallet chip before logout.
- Profile keeps `TutorDetailScreen` with back to home. Photo change stays on the profile hero.
- Home is welcome + coming-soon (students/bookings), no in-body avatar upload.
- Wallet opened from tutor home/profile returns to that screen.
