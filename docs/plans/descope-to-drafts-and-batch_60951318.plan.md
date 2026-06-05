---
name: descope-to-drafts-and-batch
overview: "Descope the Bridge Agent to drafts-only (no approve/reject, no write-back to Jira/Teams mocks) and introduce batched processing with Next/Previous pagination. The UI becomes a read-only reviewer: per-page glance chips by decision kind and per-card serial numbers, with stable 1..70 ordering so Previous never reprocesses."
todos:
  - id: 1-remove-write-path
    content: Delete submitter service, approve/reject/patch routes + tests, and narrow Decision model to kind-only (CREATE/UPDATE/SKIP/ERROR)
    status: completed
  - id: 2-message-ordering
    content: Add message_order table and migration; backfill seq 1..N on first process call using Teams createdDateTime ASC
    status: completed
  - id: 3-paged-endpoints
    content: Add POST /api/process/next, GET /api/pages, and page-filtered GET /api/decisions?page=N; make process-next idempotent
    status: completed
  - id: 4-pipeline-params
    content: Parameterize pipeline by (seq_start, seq_end); ensure runtime-growing backlog loads prior CREATEs at batch start
    status: completed
  - id: 5-ui-pagination
    content: Rewrite App.tsx for Next/Previous + page chips; make DecisionCard read-only with serial number badge; remove status tabs
    status: completed
  - id: 6-tests
    content: Rework 70-msg integration test to drive process-next seven times; add API tests for pages/idempotency; add Vitest tests for pagination state machine
    status: completed
  - id: 7-docs
    content: Update README, ARCHITECTURE.md, DECISIONS.md to reflect drafts-only scope and paged review flow
    status: completed
  - id: 8-quality-gates
    content: Run full ruff/mypy/pytest + eslint/tsc/vitest; manual make up click-through of all 7 pages
    status: completed
isProject: false
---

## Why

The brief only requires: extract → ARR lookup → dedup → draft ticket/comment + Teams reply → show them. We built a whole approve/submit/reject workflow on top of that. Cut it. Also split the 70-message run into 10-message pages with Next/Previous, stable serial numbers, and a greyed-out Next when everything is processed.

## Scope summary

- Drafts-only. The agent **never POSTs** to Jira/Teams mocks (other than the auth token mint on bootstrap). The UI just shows what would be sent.
- **No tabs.** Replace the status tabs with a non-clickable glance row of kind chips per page (e.g. `7 Create · 2 Update · 1 Skip · 0 Error`).
- **Batch of 10**, stable ordering by Teams `createdDateTime` ASC, page = 1..7, serial = 1..70.
- **Next** processes the next unprocessed page, then renders it. **Previous** navigates cached pages only, never reprocesses.
- **Next on page 7** after all 70 are done: rendered but disabled, tooltip "All messages processed".

## Deletions (backend)

- `POST /api/decisions/{id}/approve`, `/reject`, `PATCH /api/decisions/{id}` — delete routes + tests.
- `agent/app/services/submitter.py` + its tests.
- `DecisionStatus.PENDING | SUBMITTED | REJECTED` — replace with a narrower `DecisionKind` (`CREATE | UPDATE | SKIP | ERROR`). The old `action` field already carries this; collapse the two so there is one source of truth.
- `rewrite_provisional_key` is only needed because CREATE submissions used to rewrite provisional keys into real Jira keys. With no submission, provisional keys are the final display value. Keep the runtime-growing backlog logic (we still need it for dedup correctness within a run) but drop the DB rewrite path.
- Any compose/env/CORS knob that only existed to gate the admin write path (`ADMIN_API_KEY` guardrails on approve/reject) — simplify or remove.

## Deletions (UI)

- `Approve`, `Reject`, and `Edit draft` affordances on `DecisionCard`.
- The status-tabs component and its Vitest coverage.
- Anything in `src/api.ts` that hits the removed endpoints.

## Backend changes

1. **Stable message ordering.** On first process call (or on startup), list all channel messages once, sort by `createdDateTime` ASC, and materialize `(teams_message_id, seq)` into a new `message_order` table. `seq` is 1..N and stable across restarts.
2. **Schema tweaks** in `agent/app/db/migrations/`:
   - Add `decisions.message_seq INTEGER NOT NULL` (indexed).
   - Drop `decisions.status`; rely on `kind` enum.
   - New table `message_order(teams_message_id TEXT PK, seq INTEGER UNIQUE)`.
3. **Endpoints** in `agent/app/api/routes.py`:
   - `POST /api/process/next` → picks the next un-processed page `P`, runs the pipeline for messages with `seq` in `[(P-1)*10+1 .. P*10]`, returns `{ run_id, page }`. Idempotent: if page `P` is already fully processed, returns immediately.
   - `GET /api/pages` → `{ total_messages, page_size, total_pages, processed_pages: [...] }` so the UI knows which pages are cached.
   - `GET /api/decisions?page=N` → decisions for that page only, ordered by `message_seq`, each with `seq`, `kind`, `client`, `arr`, `matched_jira_key` (UPDATE) or `provisional_jira_key` (CREATE), `reasoning`, `draft_ticket` / `draft_comment`, and `draft_teams_reply`.
   - Keep `GET /api/runs/{run_id}` for progress polling of the current batch.
4. **Pipeline** in `agent/app/services/pipeline.py`: parameterize with `(seq_start, seq_end)`; everything else stays. The runtime-growing backlog still includes CREATEs drafted in earlier pages of the same deployment, since they're persisted in `decisions` and loaded into the backlog at batch start.

## UI changes

Primary file: `ui/src/App.tsx`. One new component, `PageChips`.

- **State:** `{ currentPage, totalPages, processedPages, decisionsForPage, runId?, runStatus }`. Bootstrap by calling `GET /api/pages`; currentPage defaults to max(processedPages) or 1.
- **Header row:** `[< Previous]   Page X of 7   [Next >]` and, below it, kind-count chips built from `decisionsForPage`.
- **Next behavior:**
  - If `currentPage < max(processedPages)` → purely client-side navigation to `currentPage + 1`.
  - Else if `currentPage == max(processedPages) && currentPage < totalPages` → `POST /api/process/next`, poll `runs/{id}`, then fetch `decisions?page=currentPage+1`.
  - Else (`currentPage == totalPages && all processed`) → disabled, tooltip "All messages processed".
- **Previous:** always client-side, disabled on page 1.
- **DecisionCard** becomes read-only: serial number badge (e.g. `#13`), kind pill, requester + client + ARR, matched/proposed ticket link (mock Jira UI URL), reasoning, draft ticket body or draft comment body, draft Teams reply. No buttons.

## Tests

- Delete submitter/approve/reject tests.
- Rework the 70-message integration test to call `POST /api/process/next` seven times and assert the full oracle from `docs/dry-run-analysis.md` — same assertions on kind/matched key/reasoning, just collected across pages. Verify page 1 rerun is a no-op and that CREATEs drafted on page 1 are visible to page 2's dedup (the runtime-growing backlog invariant, now cross-batch).
- New API tests:
  - `GET /api/pages` before/after processing.
  - `POST /api/process/next` twice in a row without polling → second call is idempotent on the currently-processing page.
  - `GET /api/decisions?page=2` after processing only page 1 → empty list.
- UI: new Vitest cases for Next/Previous enabled/disabled states, chip counts, and that Previous never triggers `POST /api/process/next`.

## Docs

- `README.md`: rewrite "What the agent does" — drop the approve/submit paragraph, add the batched-review paragraph. Update the diagram to remove the "Jira + Teams" arrow at the bottom.
- `docs/ARCHITECTURE.md`: remove submitter and approval endpoints; add a "Scope: drafts-only" section with the rationale ("brief asks the agent to *draft* artefacts, not to mutate Jira/Teams; the admin panel is a viewer, not an approver").
- `docs/DECISIONS.md`: add ADR `Descope: drafts-only, paged review`.
- `PROMPTS.md`: unchanged.

## Quality gates before merge

`make lint && make typecheck && make test && (cd ui && npm run lint && npm run typecheck && npm test)` green, plus a manual `make up` + click-through of all 7 pages.
