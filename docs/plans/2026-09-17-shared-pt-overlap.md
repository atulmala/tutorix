---
title: Shared proficiency test overlap
status: done
jira: TUTORIX-86
created: 2026-09-17
labels:
  - cursor-plan
  - implementation-plan
---

# Shared proficiency test overlap

One proficiency test can cover several leaf offerings (for example CBSE Class XI and Class XII Mathematics). Passing any of those offerings clears the PT for the others.

## Product rules

- Overlap is the same `proficiencyTestId` on the tutor’s offerings.
- If the tutor already passed that PT and tries to take it again for another covered offering, show: “PT for this offering has already been cleared.”
- Check this when they start a PT (profile Take proficiency test, add-offering PT, or Start Test).
- After they acknowledge, credit the pending offering as `pt_passed` (copy score/pass from the sibling) so they can set a rate card without sitting the test.
- Passing a PT also credits any other current offerings that share that test.
- The API refuses `proficiencyTestForTaker` / submit when a sibling offering is already passed.

## Tests

- Helper: overlapping passed PT vs unrelated offering.
- API: submit pass credits sibling; take-PT is blocked when a sibling already passed; credit mutation copies pass.
- Web/mobile: Take PT on an overlapping offering shows the already-cleared prompt.
