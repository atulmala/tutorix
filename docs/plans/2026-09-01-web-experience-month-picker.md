---
title: Web tutor experience month-year picker
status: in-progress
jira: TUTORIX-73
created: 2026-09-01
labels:
  - cursor-plan
  - implementation-plan
---

# Web tutor experience month-year picker

Match mobile: tutor employment start/end capture month and year only. Persist day 15 (`YYYY-MM-15`). People often do not remember the exact calendar day.

## Surfaces

- Web onboarding: `apps/web/src/app/components/tutor-onboarding/tutor-experience/TutorExperience.tsx`
- Shared profile/admin modal: `libs/tutor-detail-ui/src/ExperienceModal.tsx`
- List display: `libs/tutor-detail-ui/src/TutorDetailView.tsx` (`Jan 2020` via `formatExperienceMonthYear`)

## Contract

- Two `<select>`s (month + year). No `<input type="date">` and no `type="month"` (Firefox).
- Write `toExperienceMonthDate(year, month)` → `YYYY-MM-15`.
- Pin with `pinExperienceRowToMonthDay` on validate/save.
- Existing rows keep their month/year; next save rewrites the day to 15.
- Sign-up DOB stays a full date picker.
- No API or schema change.

## Out of scope

- Mobile (already shipped)
- Backend entity, DTO, GraphQL
- Sign-up date of birth
