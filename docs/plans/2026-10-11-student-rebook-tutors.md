---
title: Student re-book tutors
status: in-progress
jira: null
created: 2026-10-11
---

# Student re-book tutors

Students who have paid bookings can re-book from Home and Search via a **Re-book** button. The list shows one card per tutor + catalog subject (same card layout as tutor search), with offering label and total classes booked. Tapping opens the existing tutor preview → cart → wallet checkout flow.

## Backend

- GraphQL query `studentRebookTutors` on student cart resolver
- Aggregation `groupStudentRebookTutors` in `tutor-class-booking.util.ts`

## Mobile

- `StudentRebookTutorsScreen`, `useStudentHasRebookTutors`
- Entry on `StudentHomeScreen` and `StudentTutorSearchScreen`
- `AppView`: `studentRebookTutors` with preview return stack

## Web

- `StudentRebookTutorsPage`, `useStudentHasRebookTutors`
- Entry on `StudentHomePage` and `StudentTutorSearchPage`
- `WebView`: `student-rebook-tutors` with preview return stack
