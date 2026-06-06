# Implementation Plans

This folder stores implementation plans that should be tracked in Git and can be linked to Jira.

## File Naming

Use descriptive lowercase filenames with hyphens or the existing Cursor plan filename:

```text
docs/plans/2026-06-05-compact-offering-cards.md
docs/plans/compact_offering_cards_40fd0c3f.plan.md
```

## Frontmatter

Plans should include frontmatter when they are intended to sync with Jira:

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

Required fields:

- `title`: Human-readable Jira summary. If omitted, tooling derives a title from `name` or the filename.
- `jira`: Jira issue key once created, for example `TUTORIX-123`. Leave as `null` before sync.
- `status`: Planning status such as `planned`, `in-progress`, or `done`.

## Jira Mapping

When creating a Jira issue from a plan:

- Jira project: read from `JIRA_DEFAULT_PROJECT` or pass via command flag.
- Jira issue type: `Task` by default.
- Jira summary: `title`, `name`, or filename-derived title.
- Jira description: markdown body of the plan.
- Jira labels: `cursor-plan`, `implementation-plan`, plus any frontmatter labels.
- Jira key: write back into the plan frontmatter as `jira: TUTORIX-123`.

## Safety Rules

- Do not put secrets, API tokens, private credentials, or machine-local config in plan files.
- Do not create a new Jira issue when `jira:` already contains an issue key.
- Prefer manual Jira sync first; only add automatic sync once the workflow is proven.
