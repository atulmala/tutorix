---
title: Persistent mobile bottom navigation
status: done
jira: null
created: 2026-10-12
---

# Persistent mobile bottom navigation

Always-visible bottom tabs for logged-in students and tutors; top headers show back (when stacked), title, cart (students), and logout only.

## Student tabs

Home, Search, Wallet, Profile — on all main student flows plus wallet when opened from student context.

## Tutor tabs

Home, Calendar, Wallet, Profile — on tutor home, calendar, profile, booking history, concluded classes, and tutor wallet.

## Key files

- `apps/mobile/src/app/App.tsx` — `renderStudentShell` / `renderTutorShell`, expanded bottom inset lists
- `apps/mobile/src/app/components/student-nav/StudentTabBar.tsx`
- `apps/mobile/src/app/components/tutor-nav/TutorTabBar.tsx`
- Slimmed `StudentHomeHeader`, `StudentNavHeader`, `TutorNavHeader`

## Excluded

Auth, onboarding, bank/rate-card setup, online class, full-screen cart/checkout overlay.
