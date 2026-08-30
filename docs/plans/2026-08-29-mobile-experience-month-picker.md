---
title: Mobile experience month-year picker
status: in-progress
jira: TUTORIX-71
created: 2026-08-29
labels:
  - cursor-plan
  - implementation-plan
---

# Mobile experience month-year picker

Replace mobile tutor experience start/end date text fields with a JS-only month-and-year modal (no native datepicker packages). The API still receives a full `YYYY-MM-DD` date, always the 15th of the chosen month. Web stays on a full calendar date picker.

## Current behavior

Mobile tutor experience (onboarding and profile) uses masked `TextInput` fields with `YYYY-MM-DD`. Backend already stores PostgreSQL `date` columns and accepts `@IsDateString()` — no API or schema change is needed.

Surfaces to update:

- [apps/mobile/src/app/components/tutor-onboarding/tutor-experience/TutorExperience.tsx](apps/mobile/src/app/components/tutor-onboarding/tutor-experience/TutorExperience.tsx)
- [apps/mobile/src/app/components/tutor-profile/ExperienceModal.tsx](apps/mobile/src/app/components/tutor-profile/ExperienceModal.tsx)
- [apps/mobile/src/app/components/tutor-profile/TutorDetailScreen.tsx](apps/mobile/src/app/components/tutor-profile/TutorDetailScreen.tsx) (list display)

Web onboarding and [libs/tutor-detail-ui/src/ExperienceModal.tsx](libs/tutor-detail-ui/src/ExperienceModal.tsx) stay as `<input type="date">`.

## Date contract

- Picker collects **month + year only**.
- Shared helper writes **day 15**: `2020-01-15`.
- Existing rows with another day still open as that month/year; the next save rewrites to the 15th.
- End date remains optional when "currently working" is on.

Do **not** change `buildExperienceMutationInput` for all clients, so web can still save a real calendar day.

## Shared helpers

Add to [libs/shared-utils/src/tutor-experience-form.ts](libs/shared-utils/src/tutor-experience-form.ts):

- `EXPERIENCE_MONTH_DAY = 15`
- `toExperienceMonthDate(year, month)` → `'YYYY-MM-15'`
- `parseExperienceMonthYear(value)` → `{ year, month }` from `'YYYY-MM-DD'` / ISO (ignore day)
- `formatExperienceMonthYear(value)` → `'Jan 2020'` by parsing year/month from the string

## Monorepo / native-module risk

Do **not** import `@react-native-community/datetimepicker`. Do **not** add native picker packages. Implement with React Native core APIs only (`Modal`, `ScrollView`, `TouchableOpacity`). Keep the component under `apps/mobile/`.

## Out of scope

- Web date inputs and web/admin experience list
- Backend entity, DTO, and GraphQL
- Sign-up DOB picker
- New npm/native dependencies
