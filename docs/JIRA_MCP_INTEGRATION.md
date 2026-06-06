# Jira MCP Integration

This repo uses `docs/plans/*.md` as the tracked source for implementation plans. Jira integration happens through a local Cursor MCP server so credentials stay out of Git.

Default project key: **TUTORIX**.

## MCP Tools

The Jira MCP server exposes:

- `jira_list_issue_types` — discover issue types for a project
- `jira_create_issue` — create a task from a plan
- `jira_add_comment` — add a completion note
- `jira_transition_issue` — move an issue (e.g. In Progress, Done)

## Environment Variables

```text
JIRA_BASE_URL=https://tutorix.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-atlassian-api-token
JIRA_DEFAULT_PROJECT=TUTORIX
```

Configure these in `~/.cursor/mcp.json`, not in this repository.

## Workflow

### 1. Plan mode — create Jira task

When a new plan is written under `docs/plans/`:

```bash
npm run jira:create-from-plan -- docs/plans/my-feature.plan.md --project TUTORIX
```

Use the printed JSON with Jira MCP `jira_create_issue`, then write the key back:

```bash
npm run jira:create-from-plan -- docs/plans/my-feature.plan.md --issue TUTORIX-123
```

### 2. Agent mode — implement

Set plan `status: in-progress`. Optionally transition the Jira issue:

```json
{ "issue_key": "TUTORIX-123", "transition_name": "In Progress" }
```

### 3. User acknowledges — complete

Add a comment and mark Done via MCP:

```json
{ "issue_key": "TUTORIX-123", "comment": "Implemented compact offering cards in TutorDetailScreen." }
```

```json
{ "issue_key": "TUTORIX-123", "transition_name": "Done" }
```

Update plan frontmatter: `status: done`.

## Plan Frontmatter

```yaml
---
title: Compact Offering Cards
status: planned
jira: null
created: 2026-06-05
labels:
  - cursor-plan
  - implementation-plan
---
```

Status values: `planned`, `in-progress`, `done`.

## Safety Rules

- Do not create a new Jira issue when `jira:` already contains a key (unless `--force`).
- Do not commit API tokens or MCP credentials.
- Reload Cursor after changing `~/.cursor/mcp.json`.

## Verification

1. Cursor shows all four Jira MCP tools.
2. `jira_list_issue_types` works for project `TUTORIX`.
3. A scratch task can be created, commented on, and transitioned to Done.
4. Plan frontmatter is updated with the issue key.
