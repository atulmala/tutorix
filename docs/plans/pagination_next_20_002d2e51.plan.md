---
name: Pagination Next 20
overview: Add Microsoft Graph-style cursor pagination to the Teams message client, persist the next-page URL in app state, extend `/api/process` with explicit first vs next page semantics, reset pagination on state reset, and add a Next button plus clearer history display in the dashboard.
todos:
  - id: mock-client-page
    content: Add TeamsMessagesPage + get_teams_messages_page(limit, next_url) with @odata.nextLink and absolute next URL GET
    status: completed
  - id: api-process-pages
    content: Add app.state.teams_next_link; extend POST /api/process with page=first|next; has_more; clear link in reset-state
    status: completed
  - id: ui-next-button
    content: "index.html: First vs Next fetches; disable Next when !has_more; render from /api/results or append batches"
    status: completed
isProject: false
---

# Paginated processing (20 per page + Next)

## Problem

[`MockAPIClient.get_teams_messages`](app/clients/mock_api.py) only calls the list endpoint with `$top` and ignores [`@odata.nextLink`](https://learn.microsoft.com/en-us/graph/paging). Every `/api/process` request therefore sees the **same first page** of messages (up to 20), not “the next 20” in the full 70-message dataset.

## Approach

Use **cursor pagination** (not `$skip`): follow `@odata.nextLink` from the JSON body when the user asks for the next page. Store the **next link URL** on the server between clicks so the UI does not need to hold long URLs.

```mermaid
sequenceDiagram
  participant UI
  participant API as FastAPI
  participant Client as MockAPIClient
  participant Graph as Mock Graph API
  UI->>API: POST /api/process?page=first&limit=20
  API->>Client: GET list URL + $top=20
  Client->>Graph: GET
  Graph-->>Client: value[], nextLink?
  Client-->>API: messages, next_link
  API->>API: save next_link; process batch
  API-->>UI: results, has_more
  UI->>API: POST /api/process?page=next&limit=20
  API->>Client: GET next_link (absolute URL)
  Client->>Graph: GET next page
  Graph-->>Client: value[], nextLink?
  API-->>UI: results, has_more
```

## Backend changes

1. **[`app/clients/mock_api.py`](app/clients/mock_api.py)**  
   - Add a small result type (e.g. `TeamsMessagesPage` dataclass or named tuple) with `messages: list[TeamsMessage]` and `next_link: str | None` from `payload.get("@odata.nextLink")`.  
   - Refactor fetching into something like `get_teams_messages_page(limit: int, next_url: str | None = None)`:
     - If `next_url` is set: `GET` that URL with the same `Authorization` header (full URL; do not prefix with `base_url`).  
     - Else: current behavior (list URL + `$top=limit`).  
   - Keep a thin `get_teams_messages(limit)` wrapper that only returns `messages` if you want minimal churn at other call sites, or update call sites to use the page type.

2. **[`app/main.py`](app/main.py)**  
   - In `lifespan`, initialize `app.state.teams_next_link: str | None = None`.  
   - Extend `POST /api/process`:
     - Query params: keep `limit` (default 20, cap e.g. 100); add **`page: Literal["first", "next"]`** (or `first_page: bool`) — **default `first`** for backward compatibility is wrong for two-button UX; prefer explicit:
       - `page=first`: set `teams_next_link = None`, then fetch first page with `get_teams_messages_page(limit, next_url=None)`.
       - `page=next`: if `teams_next_link` is `None`, return **400** with a clear error (`no_next_page`); else fetch with `next_url=teams_next_link`.
     - After a successful fetch, set `app.state.teams_next_link` to the **new** `next_link` from the response (may be `None` at end of list).
     - Response JSON: add **`has_more: bool`** (`teams_next_link is not None`), and optionally **`next_available: bool`** for clarity.  
   - **[`POST /api/reset-state`](app/main.py)**: clear `teams_next_link` together with processed IDs and history (when reset is allowed).

3. **[`app/services/processor.py`](app/services/processor.py)**  
   - If `process_messages()` calls `get_teams_messages`, update it to use the new API or pass through pagination explicitly (only if this helper is still used).

## Mock / Graph compatibility note

The bridge can only paginate if the **mock Graph server** returns `@odata.nextLink` when more messages exist than `$top`. If the mock does not implement this yet, “Next” will always show **no more pages** after the first batch. Plan should include a quick verification step against your mock; add mock support there if missing (may be outside this repo).

## UI changes ([`app/templates/index.html`](app/templates/index.html))

- Add a **Next** button, disabled when the last `/api/process` response had `has_more: false` (or after an error).
- **Process / first page** button: `POST /api/process?page=first&limit=20` (label e.g. “Process first 20” or keep “Process New Messages” but document it resets to page 1).
- **Next** button: `POST /api/process?page=next&limit=20`.
- **Display**: After each successful run, render either:
  - **This batch only** (current behavior for non-empty `results`), or  
  - **Full history** from `GET /api/results` (recommended) so the table grows as you page through batches—avoids losing prior rows when processing page 2+. Align `renderRows` to use full history sorted as today, or append batch rows; simplest is `fetch /api/results` after each process and render all rows (with a reasonable max or scroll).
- Status line: show something like `Processed N in this batch; more pages: yes/no`.

## Testing

- Manual: with a mock that returns `nextLink`, run `page=first` then `page=next` and confirm different message IDs and `has_more` toggles correctly at the end.
- Optional: small unit test for parsing `next_link` from a fake JSON payload if you add tests later.
