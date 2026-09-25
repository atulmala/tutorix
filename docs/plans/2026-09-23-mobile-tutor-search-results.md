---
title: Mobile tutor search results screen
status: in-progress
jira: TUTORIX-89
created: 2026-09-23
labels:
  - cursor-plan
  - implementation-plan
---

# Mobile tutor search results screen

Restart student tutor search. Filters stay on the Search tab. Matching tutors open on a separate screen after the student taps **Search**. Class booking stays a follow-up.

## Product rules

- `studentTutorSearch` is the filter form only: study area cascade, study mode, group preference, distance, optional budget.
- Search does **not** run while the student edits filters.
- A primary **Search** button is enabled only after a leaf subject is chosen.
- Tapping **Search** opens `studentTutorSearchResults` and runs `searchTutors` there.
- Back from results returns to the filter form with the last filters kept.
- Tapping a result still opens `studentTutorPreview`. Back from preview returns to results.
- Wallet from results or preview still returns to student home.

## Mobile

- Add `studentTutorSearchResults` in [`student-navigation.ts`](apps/mobile/src/app/student-navigation.ts) and [`App.tsx`](apps/mobile/src/app/App.tsx).
- Persist the filter draft in the search folder so remounting the form keeps values.
- Pass the applied `SearchTutorsInput` from the form into the results screen.
- Move the existing result cards, empty state, loading copy, and “include online tutors” action onto the results screen.
- Results header: **Tutors** with Back to Search. Search tab stays active.

## Out of scope

Web search layout, API changes, class booking, demo request, ratings, map.

## Verify

- Navigation spec includes the new results view and wallet return.
- Search screen spec: Search stays disabled without a subject; clicking Search does not query until navigation.
- Results screen spec: loading, empty, and card tap to preview.
- Manual: student home → Search tab → choose subject → Search → cards → preview → back → filters still there.
