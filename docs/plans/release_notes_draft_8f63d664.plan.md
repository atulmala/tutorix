---
name: Release notes draft
overview: A copy-ready RELEASE NOTES draft covering shipped features, production-readiness claims grounded in the codebase, a short "90-minute build" framing, and realistic performance improvement ideas—without making any repo changes yet.
todos:
  - id: copy-notes
    content: Copy plan body into GitHub Release / RELEASE_NOTES.md when ready
    status: completed
  - id: tune-90min
    content: Adjust 90-minute scope bullets to match your actual timeline if needed
    status: completed
isProject: false
jira: TUTORIX-44
status: done
created: 2026-06-05
title: Release notes draft
---

# Release notes (draft)

Use this as the body of a GitHub Release, a `CHANGELOG.md` entry, or a submission cover note. Tone is factual; claims below map to [README.md](/Users/atulmala/workflex/workflexx-case-study/README.md) and [docs/ARCHITECTURE.md](/Users/atulmala/workflex/workflexx-case-study/docs/ARCHITECTURE.md).

---

## Bridge Agent — release notes

### Summary

Bridge Agent turns Microsoft Teams `#feature-requests` traffic into **reviewable** Jira drafts (new issues or comments), enriched with HubSpot company ARR, using Claude tool-use with strict Pydantic validation. Processing is **drafts-first**: the pipeline only reads upstream systems; **Submit** is explicit per decision and writes to Jira and Teams through a dedicated submit path.

### Key features

- **AI-native extraction and drafting** — Claude tool-use for structured extraction, deduplication choice against a backlog, and Jira/Teams draft text; outputs validated to Pydantic models.
- **Deterministic enrichment** — HubSpot company resolution via fuzzy matching; ARR attached from company records.
- **Runtime-growing backlog / cross-page dedup** — Each page re-seeds a backlog from Jira plus all prior CREATE decisions in SQLite so near-duplicates later in the channel become UPDATEs, not duplicate CREATEs.
- **Human-in-the-loop admin UI** — Paged workflow (10 messages per page), kind chips, decision cards with draft content; **Next** runs the pipeline, **Previous** reads cached drafts from SQLite without re-invoking the LLM.
- **Per-decision Submit** — `POST /api/decisions/{id}/submit` creates issues or adds comments in Jira, posts Teams replies, tracks `submission_status`, and **rewrites provisional keys** (`PROV-0001` → `JIRA-1200`) with a **cascade** to dependent UPDATE rows so later pages dedup against the real key. UPDATEs targeting a provisional parent are blocked until the parent CREATE is submitted.
- **Single-command stack** — Docker Compose wires mock API, agent, and UI with healthchecks; [scripts/smoke.sh](/Users/atulmala/workflex/workflexx-case-study/scripts/smoke.sh) exercises drafting and a sample submit against a running stack.
- **Test coverage** — Agent unit/integration tests (including submitter and backlog regressions) and UI tests (Vitest); `make lint`, `make typecheck`, `make test` documented in README.

### Production readiness (what “production-shaped” means here)

- **Clear boundaries** — Pipeline reads only; all Jira/Teams writes go through [services/submitter.py](/Users/atulmala/workflex/workflexx-case-study/agent/app/services/submitter.py) on explicit submit, reducing accidental side effects.
- **Persistence and recovery** — SQLite with WAL, migrations, stable `message_seq` ordering; idempotent `POST /api/process/next`; runs and decisions survive restarts; graceful shutdown on SIGTERM/SIGINT described in architecture.
- **HTTP and resilience** — Shared async HTTP client with timeouts, retries on transient failures (Tenacity), OAuth refresh for Teams.
- **API quality** — RFC 7807 `problem+json` errors; `GET /health`, `GET /ready`, `GET /metrics` (Prometheus-style counters, LLM token usage).
- **Security hygiene** — Structured log redaction for tokens/secrets; explicit CORS allowlist; non-root containers and pinned dependencies called out in project narrative; supply-chain checks mentioned in README/developer workflow where applicable.
- **Observability** — Correlation IDs on requests; JSON logging in production configuration.

*Caveat:* The deployment target today is the **provided mock API**; swapping in real Teams/Jira/HubSpot is mainly configuration and credential management, plus any org-specific auth (e.g. Jira Cloud vs Server, HubSpot scopes).

### Scope note: ~90 minutes of focused build time

This deliverable prioritizes a **coherent end-to-end story** over exhaustive enterprise features. In roughly **90 minutes of focused implementation**, the work emphasized:

- A working **draft → review → optional submit** loop with **correct cross-page dedup** and **provisional-to-real key** behavior.
- **Production-shaped** service design (structured errors, health/readiness/metrics, persistence, tests, smoke script, documentation) rather than a throwaway script.

Intentionally **out of scope** for that window (typical next iterations): full CI/CD, multi-tenant auth for the admin UI, rate-limit budgets per customer, deep Jira workflow automation, analytics warehouse export, and long-run operational runbooks.

### Performance improvements (without breaking core architecture)

The pipeline **sequentially** processes messages **within a page** on purpose: the runtime-growing backlog is order-dependent. Speedups that respect that invariant:

- **Parallelize the “fetch” phase only** — Architecture already notes parallel fetch of Teams messages, HubSpot companies, and Jira backlog at page start; ensure any new I/O (e.g. extra HubSpot fields) stays in that phase or is batched.
- **Reduce LLM round-trips** — Combine steps where safe (e.g. single call for extract + dedup hints), use a smaller/faster model for obvious SKIP cases after a cheap classifier, or cache prior extractions keyed by message hash for idempotent replays.
- **Tune page size vs. latency** — Larger pages amortize HTTP setup but increase time-to-first-card and blast radius on failure; expose `PAGE_SIZE` as an operational knob.
- **Backlog representation** — For very large Jira backlogs, avoid sending the full issue list to the LLM every time (summaries, embeddings + nearest-neighbor pre-filter, or top-K by project/component).
- **Caching and idempotency** — Stronger caching of Teams/HubSpot reads with ETags or short TTLs if APIs allow; keep submit idempotent (already guarded for double-submit on submitted rows).

---

### Optional next step (when you return to git)

Add a `RELEASE_NOTES.md` or GitHub Release with the above, and tag the commit you submit for evaluation. No repository changes are required for you to copy this text as-is.
