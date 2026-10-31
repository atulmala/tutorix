---
title: Docker deploy migration runner
status: in-progress
jira: null
created: 2026-10-31
---

# Docker deploy migration runner

## Problem

API Docker images only contained `main.js`; `AUTO_RUN_MIGRATIONS` did not apply schema changes. Production/staging RDS could drift (e.g. missing `class_pricing_snapshot`).

## Solution

- Compile migrations to `/app/migrations/*.js` in [`docker/Dockerfile.api`](../../docker/Dockerfile.api).
- Run migrations in [`docker/docker-api-entrypoint.sh`](../../docker/docker-api-entrypoint.sh) before the server starts.
- [`run-pending-migrations.ts`](../../apps/api/src/app/database/run-pending-migrations.ts) with one-time **`BASELINE_MIGRATIONS=true`** for legacy DBs that already have schema but an empty `migrations` table.
- TypeORM `synchronize` stays off in Docker; Nest **`migrationsRun: false`** so only the entrypoint applies migrations.

See [DEPLOYMENT_EC2.md](../DEPLOYMENT_EC2.md#database-migrations).

## Ship checklist

1. Merge migration-runner PR to **`main`**.
2. **Staging** (`54.243.76.164`): if `migrations` is still empty but schema exists, set **`BASELINE_MIGRATIONS=true`** + **`AUTO_RUN_MIGRATIONS=true`**, `docker compose up -d --build api`, confirm logs show baseline, remove baseline, restart.
3. **Production** (`100.24.243.181`): same one-time baseline if needed, then normal deploys with **`AUTO_RUN_MIGRATIONS=true`** only.
4. Future deploys: pull **`main`**, rebuild API; new migrations run automatically with `transaction: 'each'`.

## Data integrity

- Legacy hosts must baseline once — otherwise TypeORM would replay every migration against an existing schema.
- New migrations should use idempotent SQL where practical (`IF NOT EXISTS`, etc.) for safety after manual fixes.
- **`class_pricing_snapshot`** migration uses `ADD COLUMN IF NOT EXISTS` (column was added manually on prod/staging already).
