# Migration Operations - Complete Guide

This guide explains all migration operations: running, reverting, checking status, and best practices.

## 📋 Available Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `migration:generate` | Auto-generate migration from entity changes | After modifying entities |
| `migration:create` | Create empty migration for custom SQL | For data migrations or custom operations |
| `migration:run` | Execute pending migrations | Deploy changes to database |
| `migration:revert` | Undo the last executed migration | Rollback a problematic migration |
| `migration:show` | Show migration status | Check what's been run |

---

## 🚀 Running Migrations

### Basic Usage

```bash
npm run migration:run
```

**What it does:**
1. Connects to the database
2. Checks the `migrations` table for executed migrations
3. Finds all pending migrations (files that haven't been run)
4. Executes them in order (by timestamp)
5. Records each migration in the `migrations` table

**Example Output:**
```
query: SELECT * FROM "migrations" ORDER BY "id" DESC
query: CREATE TABLE "tutor" (...)
query: CREATE UNIQUE INDEX "IDX_tutor_email" ON "tutor" ("email")
query: INSERT INTO "migrations"("timestamp", "name") VALUES (1734567890123, 'CreateTutorTable1734567890123')
Migration CreateTutorTable1734567890123 has been executed successfully.
```

### How Migrations Are Tracked

TypeORM maintains a `migrations` table in your database:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  name VARCHAR NOT NULL
);
```

**Example data:**
```
id | timestamp      | name
---|----------------|----------------------------------
1  | 1734567890123  | CreateTutorTable1734567890123
2  | 1734567890456  | AddHourlyRateToTutor1734567890456
```

When you run `migration:run`, TypeORM:
- Reads this table to see what's been executed
- Compares with migration files in `apps/api/src/migrations/`
- Runs only the files that aren't in the table

---

## ↩️ Reverting Migrations

### Basic Usage

```bash
npm run migration:revert
```

**What it does:**
1. Finds the last executed migration (most recent in `migrations` table)
2. Runs the `down()` method of that migration
3. Removes the migration record from the `migrations` table

**Example:**
```bash
# Current state: 2 migrations executed
# 1. CreateTutorTable1734567890123
# 2. AddHourlyRateToTutor1734567890456

npm run migration:revert

# Output:
# query: ALTER TABLE "tutor" DROP COLUMN "hourlyRate"
# Migration AddHourlyRateToTutor1734567890456 has been reverted successfully.

# New state: Only 1 migration executed
# 1. CreateTutorTable1734567890123
```

### Important Notes

⚠️ **Warning:** Reverting can cause data loss!

- If you added a column and revert, the column (and its data) will be deleted
- If you created a table and revert, the table (and all data) will be deleted
- Always backup your database before reverting in production

### When to Revert

✅ **Safe to revert:**
- Immediately after running a migration (before other changes)
- In development environment
- When you catch an error right away

❌ **Don't revert:**
- In production (unless absolutely necessary)
- After other migrations have been run
- When other developers have already run the migration
- When the migration has been deployed to multiple environments

### Reverting Multiple Migrations

TypeORM only reverts **one migration at a time** (the most recent). To revert multiple:

```bash
# Revert migration 3
npm run migration:revert

# Revert migration 2
npm run migration:revert

# Revert migration 1
npm run migration:revert
```

---

## 📊 Checking Migration Status

### Basic Usage

```bash
npm run migration:show
```

**What it shows:**
- List of all migration files
- Which ones have been executed (marked with `[X]`)
- Which ones are pending (marked with `[ ]`)

**Example Output:**
```
[X] CreateTutorTable1734567890123
[X] AddHourlyRateToTutor1734567890456
[ ] AddPhoneNumberToTutor1734567890789  ← Pending (not run yet)
```

### Use Cases

1. **Before deployment:** Check what migrations will run
2. **After deployment:** Verify all migrations executed
3. **Troubleshooting:** See if a migration failed partway
4. **Team coordination:** Check if everyone is in sync

---

## 🔄 Complete Workflow Examples

### Example 1: Adding a New Field

```bash
# 1. Modify entity
# Edit: apps/api/src/app/tutor/entities/tutor.entity.ts
# Add: @Column() phoneNumber: string;

# 2. Generate migration
npm run migration:generate -- AddPhoneNumberToTutor

# 3. Review generated file
# Check: apps/api/src/migrations/1734567890789-AddPhoneNumberToTutor.ts

# 4. Check status (optional)
npm run migration:show
# Shows: [ ] AddPhoneNumberToTutor1734567890789

# 5. Run migration
npm run migration:run

# 6. Verify
npm run migration:show
# Shows: [X] AddPhoneNumberToTutor1734567890789
```

### Example 2: Reverting a Bad Migration

```bash
# 1. Run migration
npm run migration:run
# Oops! Migration had an error or wrong SQL

# 2. Check what was executed
npm run migration:show
# Shows: [X] BadMigration1734567890123

# 3. Revert immediately
npm run migration:revert
# Undoes the last migration

# 4. Fix the migration file
# Edit: apps/api/src/migrations/1734567890123-BadMigration.ts

# 5. Run again
npm run migration:run
```

### Example 3: Production Deployment

```bash
# 1. Generate migration locally
npm run migration:generate -- AddNewFeature

# 2. Commit migration file to git
git add apps/api/src/migrations/
git commit -m "Add migration for new feature"
git push

# 3. On production server:
# Pull latest code
git pull

# 4. Check what will run
npm run migration:show

# 5. Backup database (IMPORTANT!)
pg_dump tutorix > backup_$(date +%Y%m%d).sql

# 6. Run migrations
npm run migration:run

# 7. Verify
npm run migration:show
# All should show [X]
```

---

## 🎯 Migration Execution Order

Migrations are executed in **timestamp order** (ascending):

```
1734567890123-CreateTutorTable.ts        ← Runs first
1734567890456-AddHourlyRateToTutor.ts    ← Runs second
1734567890789-AddPhoneNumberToTutor.ts   ← Runs third
```

**Why this matters:**
- Migrations build on each other
- You can't skip migrations
- If migration #2 fails, migration #3 won't run
- The `migrations` table ensures each runs only once

---

## 🔍 Understanding the Migrations Table

The `migrations` table is TypeORM's way of tracking what's been executed:

```sql
-- View all executed migrations
SELECT * FROM migrations ORDER BY timestamp;

-- Check if a specific migration ran
SELECT * FROM migrations WHERE name = 'CreateTutorTable1734567890123';

-- See the last migration executed
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
```

**Important:**
- Don't manually edit this table (unless you know what you're doing)
- Each migration should only appear once
- Timestamps must match the migration file names

---

## ⚠️ Common Scenarios & Solutions

### Scenario 1: Migration File Deleted After Execution

**Problem:** Migration was run, then file was deleted from filesystem.

**Solution:**
```bash
# Option 1: Restore from git
git checkout apps/api/src/migrations/1734567890123-MigrationName.ts

# Option 2: If file is truly gone, manually remove from migrations table
# (Only if you're sure the migration was successful)
DELETE FROM migrations WHERE name = 'MigrationName1734567890123';
```

### Scenario 2: Migration Failed Partway

**Problem:** Migration started but failed (e.g., network issue, constraint violation).

**Solution:**
```bash
# 1. Check migration status
npm run migration:show

# 2. Check database state
# Some changes might have been applied, some not

# 3. Fix the issue (e.g., fix constraint, resolve conflict)

# 4. Manually clean up if needed
# Remove partial changes or fix database state

# 5. Remove failed migration record (if needed)
DELETE FROM migrations WHERE name = 'FailedMigration1734567890123';

# 6. Run migration again
npm run migration:run
```

### Scenario 3: Multiple Developers

**Problem:** Developer A creates migration, Developer B creates another before A's is committed.

**Solution:**
```bash
# Developer A
npm run migration:generate -- AddFieldA
# Timestamp: 1734567890123

# Developer B (before pulling A's changes)
npm run migration:generate -- AddFieldB
# Timestamp: 1734567890124

# When B pulls A's changes:
# - Both migrations exist
# - Both will run in timestamp order
# - No conflict, just run both

npm run migration:run
# Runs: AddFieldA, then AddFieldB
```

### Scenario 4: Migration Already Exists Error

**Problem:** Trying to generate a migration but TypeORM says "no changes detected."

**Possible causes:**
1. Entity changes don't match what TypeORM expects
2. Database is already in sync with entities
3. Entity file not found or not properly decorated

**Solution:**
```bash
# 1. Verify entity file exists and is properly formatted
# Check: apps/api/src/app/**/*.entity.ts

# 2. Check database connection
# Ensure .env has correct DB credentials

# 3. Verify entity is being loaded
# Check database.config.ts entities path

# 4. If truly no changes, that's fine - no migration needed!
```

---

## 🚨 Best Practices

### ✅ DO:

1. **Always review generated migrations** before running
2. **Test migrations on development** database first
3. **Backup production database** before running migrations
4. **One logical change per migration** (easier to review/revert)
5. **Use descriptive migration names** (e.g., `AddEmailVerificationToUser`)
6. **Commit migrations to git** (they're part of your codebase)
7. **Run migrations in order** (TypeORM handles this)
8. **Check migration status** before and after deployment

### ❌ DON'T:

1. **Don't edit executed migrations** - create a new one instead
2. **Don't skip reviewing** - always check the SQL
3. **Don't run migrations manually** - use the CLI commands
4. **Don't delete migration files** that have been executed
5. **Don't use `synchronize: true`** in production
6. **Don't revert in production** unless absolutely necessary
7. **Don't manually edit the migrations table** (let TypeORM manage it)

---

## 📝 Quick Reference

### Generate Migration
```bash
# Auto-generate from entity changes
npm run migration:generate
npm run migration:generate -- CreateTutorTable
```

### Create Empty Migration
```bash
# Create for custom SQL
npm run migration:create
npm run migration:create -- CustomDataMigration
```

### Run Migrations
```bash
# Execute all pending migrations
npm run migration:run
```

### Revert Migration
```bash
# Undo last executed migration
npm run migration:revert
```

### Check Status
```bash
# Show which migrations have run
npm run migration:show
```

---

## 🔗 Related Documentation

- [MIGRATION_WORKFLOW.md](./MIGRATION_WORKFLOW.md) - Step-by-step workflow guide
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Detailed migration reference
- [MIGRATION_SETUP_SUMMARY.md](./MIGRATION_SETUP_SUMMARY.md) - Setup overview

