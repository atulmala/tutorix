---
name: Assessment Hardening Audit
overview: Audit current code against the assessment feedback and outline targeted refactors to improve production hardening, type safety, and review quality while avoiding unnecessary churn.
todos:
  - id: reuse-httpx-clients
    content: Refactor client lifecycle to shared AsyncClient instances managed by app lifespan and injected into API clients
    status: completed
  - id: replace-json-repair
    content: Implement strict structured Anthropic output path and retire brittle JSON repair fallback for normal flow
    status: completed
  - id: tighten-pydantic-contracts
    content: Add API response models and external payload models where currently parsed as raw dicts
    status: completed
  - id: add-test-suite
    content: Add pytest unit/integration coverage for processor behavior, pagination, and API endpoints
    status: completed
  - id: cors-safety-check
    content: Keep CORS absent or add explicit safe origins config if required
    status: completed
isProject: false
jira: TUTORIX-14
status: done
created: 2026-06-05
title: Assessment Hardening Audit
---

# Assessment hardening refactor plan

## Current status vs critique

- **No Gemini sleep/backoff hallucination found**: there is no `wait = 50 * (attempt + 1)` or long blocking sleep loop in this repo.
- **Custom JSON repair exists** in [`/Users/atulmala/workflex/submission/app/clients/anthropic_client.py`](/Users/atulmala/workflex/submission/app/clients/anthropic_client.py): `_parse_json()` strips fences and falls back to `{...}` substring extraction.
- **HTTP client lifecycle needs hardening**: `httpx.AsyncClient` is recreated per request across [`/Users/atulmala/workflex/submission/app/clients/mock_api.py`](/Users/atulmala/workflex/submission/app/clients/mock_api.py) and [`/Users/atulmala/workflex/submission/app/clients/anthropic_client.py`](/Users/atulmala/workflex/submission/app/clients/anthropic_client.py).
- **Type safety is partial**: internal/domain models are Pydantic-based, but API route responses are raw `dict`s and external responses are mostly parsed as dictionaries before selective model conversion.
- **CORS anti-pattern is not present**: there is no current CORS middleware config in [`/Users/atulmala/workflex/submission/app/main.py`](/Users/atulmala/workflex/submission/app/main.py).
- **Automated tests are missing**: no test suite/framework is present.

## Refactor priorities (highest assessment impact)

1. **Reusable HTTP clients (connection pooling)**
   - Add shared clients initialized in app lifespan and injected into service clients.
   - Keep one client for internal mock APIs and one for Anthropic (with `trust_env=False` preserved for Anthropic).
   - Close both clients in lifespan shutdown.
   - Files: [`/Users/atulmala/workflex/submission/app/main.py`](/Users/atulmala/workflex/submission/app/main.py), [`/Users/atulmala/workflex/submission/app/clients/mock_api.py`](/Users/atulmala/workflex/submission/app/clients/mock_api.py), [`/Users/atulmala/workflex/submission/app/clients/anthropic_client.py`](/Users/atulmala/workflex/submission/app/clients/anthropic_client.py).

2. **Structured LLM output without brittle JSON repair**
   - Replace free-text JSON parsing flow in `AnthropicClient` with strict structured output approach (Anthropic tool schema / forced tool call style).
   - Remove or minimize `_parse_json()` fallback path once structured output is stable.
   - Add validation failure telemetry with safe error text.
   - File: [`/Users/atulmala/workflex/submission/app/clients/anthropic_client.py`](/Users/atulmala/workflex/submission/app/clients/anthropic_client.py).

3. **FastAPI response typing + external payload models**
   - Introduce response models for `/api/process`, `/api/results`, `/api/reset-state`.
   - Convert known external payload sections into dedicated Pydantic models (at least Teams page envelope and Anthropic message envelope).
   - Keep permissive fields where mock APIs vary, but validate shape before business logic.
   - Files: [`/Users/atulmala/workflex/submission/app/models.py`](/Users/atulmala/workflex/submission/app/models.py), [`/Users/atulmala/workflex/submission/app/main.py`](/Users/atulmala/workflex/submission/app/main.py), [`/Users/atulmala/workflex/submission/app/clients/mock_api.py`](/Users/atulmala/workflex/submission/app/clients/mock_api.py), [`/Users/atulmala/workflex/submission/app/clients/anthropic_client.py`](/Users/atulmala/workflex/submission/app/clients/anthropic_client.py).

4. **Testing baseline (unit + integration)**
   - Add `pytest` and minimal fixtures.
   - Unit tests:
     - decision validation/fallback behavior in processor
     - pagination next-link parsing
     - requester/client invariants in comment formatting
   - API integration tests for `/api/process?page=first|next` happy path and `no_next_page` failure.
   - New files under `/tests` plus test config.

5. **CORS policy (explicit, safe, optional)**
   - Keep current no-CORS state for local if not needed.
   - If enabling CORS later, use explicit origins list and avoid `"*" + credentials` combination.
   - File: [`/Users/atulmala/workflex/submission/app/main.py`](/Users/atulmala/workflex/submission/app/main.py).

## Suggested sequencing

- Phase 1: shared `AsyncClient` lifecycle (lowest behavior risk, highest infra credibility).
- Phase 2: structured Anthropic output and remove repair parser dependency.
- Phase 3: typed response contracts + external payload models.
- Phase 4: tests to lock behavior and prevent regressions.

## Acceptance criteria

- No per-call `AsyncClient` instantiation in hot paths.
- Anthropic decision/extract paths no longer depend on regex/substring JSON repair for normal execution.
- FastAPI endpoints expose typed response models.
- Test suite runs and covers key request-processing + pagination paths.
- CORS remains absent or explicitly safe-configured.
