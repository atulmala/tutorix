---
title: Tutor home and mandatory rate card
status: done
jira: TUTORIX-83
created: 2026-09-16
labels:
  - cursor-plan
  - implementation-plan
---

# Tutor home and mandatory rate card

Certified tutors land on a real home schedule. If none of their passed offerings have a complete rate card, they must set one before home.

## Product rules

- After onboarding celebration and bank setup, route to **Rate card** setup when no passed offering has a complete rate card (`isRateCardComplete`).
- At least one offering is enough. Later offerings stay optional on profile.
- The screen is not dismissible: no skip, close, back, profile, or wallet. Logout remains.
- Copy: **Rate card** / “Please set up a rate card for at least one offering. Students can find you once you set how you charge.”
- If there is no `pt_passed` offering, skip the gate (a rate card cannot be saved yet).
- After a successful save, go to tutor home.

## Routing

Extend `tutorViewAfterProfile` (web + mobile):

1. Incomplete onboarding or unseen celebration → onboarding
2. Incomplete bank details → account setup
3. Bank complete and no complete rate card on any `pt_passed` offering → rate card setup
4. Else → tutor home

Compute the rate-card flag from existing `GET_MY_TUTOR_DETAIL.offerings` (same pattern as bank `isComplete`). Do not add a new GraphQL field.

## UI

- Reuse RateCardModal (web `libs/tutor-detail-ui`, mobile `RateCardModal`) as a required in-page variant.
- If several passed offerings lack a card, let the tutor pick one, then save.
- Tutor home becomes a schedule hub matching student home: week strip, today’s classes, teaching hours, empty upcoming/concluded copy. No booking yet.

## Tests

- Routing: bank missing → bank; rate card missing → rate card setup; both complete → home
- Setup screen shows required copy and has no dismiss control
- Home shows My schedule without the old coming-soon placeholder
