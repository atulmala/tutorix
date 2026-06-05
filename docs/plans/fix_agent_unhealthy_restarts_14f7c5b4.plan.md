---
name: Fix agent unhealthy restarts
overview: The agent container goes unhealthy because SQLite migrations are re-applied on every boot; `002_submission.sql` uses non-idempotent `ALTER TABLE ADD COLUMN`, which fails on the second start when the Docker volume persists. Fix by tracking applied migration files, with a one-time backfill for existing databases, plus short troubleshooting steps (`docker logs`, volume reset).
todos:
  - id: ledger-migrations
    content: Add _schema_migrations ledger + skip-applied logic in store._apply_migrations
    status: completed
  - id: legacy-backfill
    content: Backfill ledger for existing DBs (PRAGMA table_info decisions)
    status: completed
  - id: test-double-open
    content: "Add unit test: Store opens twice on same DB path without error"
    status: completed
  - id: verify-manual
    content: pytest agent + optional docker restart smoke
    status: completed
isProject: false
---

# Fix `bridge-agent` unhealthy (dependency failed to start)

## What is going wrong

[`agent/app/db/store.py`](agent/app/db/store.py) runs **every** `*.sql` file under [`agent/app/db/migrations/`](agent/app/db/migrations/) on **every** `Store` initialization:

```77:82:agent/app/db/store.py
    def _apply_migrations(self) -> None:
        mig_pkg = resources.files("app.db.migrations")
        for item in sorted(p.name for p in mig_pkg.iterdir() if p.name.endswith(".sql")):
            sql = (mig_pkg / item).read_text(encoding="utf-8")
            with self._lock:
                self._conn.executescript(sql)
```

[`001_init.sql`](agent/app/db/migrations/001_init.sql) is mostly idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

[`002_submission.sql`](agent/app/db/migrations/002_submission.sql) is **not** idempotent: it runs `ALTER TABLE decisions ADD COLUMN ...` every time. The **first** boot after a fresh volume succeeds; the **second** boot (restart container or `compose down` + `compose up` **without** `-v`) raises SQLite `OperationalError: duplicate column name`, startup never reaches `lifespan` `yield`, and [`docker-compose.yml`](docker-compose.yml) healthcheck (`curl ... /health`) never gets a healthy process — hence **dependency agent failed to start** / **container bridge-agent is unhealthy**.

This matches the “same error as earlier” pattern (SQLite / volume), but the underlying bug is **repeatable on every non-destructive restart**, not only old schema drift.

## What to do right now (no code)

1. Confirm in logs: `docker compose logs bridge-agent` (or `docker logs bridge-agent`) — expect a traceback mentioning `duplicate column` or `OperationalError` during migration/store init.
2. **Temporary** unstick: `docker compose down -v` then `make up` — only helps until the **next** restart unless the code is fixed.

## Code fix (required for correct behavior)

Implement **run-once migrations** in [`agent/app/db/store.py`](agent/app/db/store.py):

1. Create a ledger table, e.g. `_schema_migrations(filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`, with `CREATE TABLE IF NOT EXISTS` before applying files.
2. For each sorted `*.sql` migration file: if `filename` is already in the ledger, **skip**; else `executescript(sql)` and `INSERT` the filename.
3. **Backfill for existing DBs** created before the ledger: if the ledger is empty but `decisions` already exists, infer applied migrations from `PRAGMA table_info(decisions)` (e.g. if `submission_status` exists, treat `002_submission.sql` as already applied) and insert those rows so `002` is not re-run.

Optional: add a short comment in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) or README “Troubleshooting” that persistent SQLite + non-idempotent migrations require a ledger (single sentence).

## Verification

- **Unit test**: in-memory or temp-file `Store`, open twice (two `Store(path)` instances in sequence, or close and reopen) — second open must not raise and `/health` semantics unchanged.
- **Manual**: `make up`, `docker restart bridge-agent`, wait for health — container should become healthy again.
- Run full `pytest` in `agent/`.

## Mermaid (startup failure path)

```mermaid
flowchart LR
  start[Container start]
  store[Store.__init__]
  mig[_apply_migrations]
  alter002[002 ALTER ADD COLUMN]
  crash[OperationalError]
  nohealth[No HTTP /health]
  unhealthy[Compose unhealthy]

  start --> store --> mig --> alter002
  alter002 --> crash --> nohealth --> unhealthy
```
