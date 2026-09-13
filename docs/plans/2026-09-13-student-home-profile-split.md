---
title: Student home vs profile (mobile)
status: done
jira: TUTORIX-78
created: 2026-09-13
labels:
  - cursor-plan
  - implementation-plan
---

# Student home vs profile (mobile)

Onboarded students land on a real home screen. Profile moves behind a tappable nav-bar avatar. Wallet chip sits in the nav bar before logout. Tutors stay unchanged.

## Current behavior

Onboarded students are routed to `studentProfile` in [`apps/mobile/src/app/App.tsx`](apps/mobile/src/app/App.tsx): `NavHeader` titled “My profile” plus [`StudentDetailScreen`](apps/mobile/src/app/components/student-profile/StudentDetailScreen.tsx) (full profile + wallet chip in the hero). Tutors use the same pattern; leave that path alone.

[`StudentHomeScreen`](apps/mobile/src/app/components/student-home/StudentHomeScreen.tsx) already exists (welcome + coming soon) but is not wired. [`NavHeader`](apps/mobile/src/app/components/NavHeader.tsx) has a right-side initials circle (unused on student profile) and logout; it does not accept a photo or a wallet slot. Left slot is back-or-empty.

## Routing

Add `'studentHome'` to `AppView`. Extend `WalletReturnView` to include `'studentHome'`.

Send onboarded students to home, not profile:

- `routeStudentAfterProfile` when `onBoardingComplete`
- `handleStudentOnboardingComplete`
- wallet-from-push while on student home/onboarding: return to `studentHome`

Keep `studentProfile` as a pushed screen: `onBack` returns to `studentHome`. Tutor routing and `tutorProfile` stay as they are.

## Nav bar (student home + student profile + student wallet)

Extend `NavHeader` (additive props so tutor/onboarding keep working):

- `avatarUrl` / `userInitials` / `onProfilePress` — left 36px circle (image or initials). Shown when there is no `onBack`.
- `rightBeforeLogout?: React.ReactNode` — wallet chip before logout.

Student home header: title `Home`, left avatar, right `WalletBalanceChip` then logout.

Student profile header: title `My profile`, left **back**, right wallet then logout.

Widen the left slot so a 36px avatar fits (today `left` is `width: 40`).

## Home screen

Wire [`StudentHomeScreen`](apps/mobile/src/app/components/student-home/StudentHomeScreen.tsx) as the landing body.

Strip the large in-body avatar / upload from that screen. Nav avatar opens profile; photo change stays on the profile hero. Home keeps welcome + the existing “coming soon” tutors/booking placeholder.

Load avatar for the header with `GET_MY_STUDENT_PROFILE` in `App.tsx` or a tiny wrapper so `NavHeader` gets `profilePictureAvatarUrl` + `initialsFromProfileName`.

## Profile screen

Reuse `StudentDetailScreen` for parent/address/education/timeline/legal. Remove the hero `WalletBalanceChip` (it lives in the nav now). Hero avatar tap still uploads/changes photo.

## Tests

- `NavHeader`: left avatar press, wallet slot before logout, back hides avatar
- Student routing: onboarded → `studentHome`; avatar → profile; back → home; tutor still → `tutorProfile`

## Out of scope

- Tutor home/profile split
- React Navigation
- New student home features beyond the existing welcome/coming-soon card
