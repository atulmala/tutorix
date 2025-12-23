# Migration Workflow - Step-by-Step Guide

This guide walks you through the complete migration process from creating/updating entities to running migrations.

## 📋 Complete Workflow Overview

```
1. Create/Update Entity
   ↓
2. Generate Migration
   ↓
3. Review Migration File
   ↓
4. Run Migration
   ↓
5. Verify Changes
```

---

## 🆕 Scenario 1: Creating a New Entity

Let's create a `Tutor` entity as an example.

### Step 1: Create the Entity File

**Location**: `apps/api/src/app/tutor/entities/tutor.entity.ts`

```typescript
import { Entity, Column } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../common/base-entities/base.entity';

@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio: string;

  @Field()
  @Column({ default: false })
  isVerified: boolean;
}
```

**What happens:**
- Entity extends `QBaseEntity` (gets `id`, `version`, `createdDate`, `updatedDate`, etc.)
- `@Entity('tutor')` defines the table name
- `@ObjectType()` makes it a GraphQL type
- `@Field()` decorators expose fields to GraphQL
- `@Column()` decorators define database columns

### Step 2: Generate the Migration

**Command:**
```bash
npm run migration:generate -- apps/api/src/migrations/CreateTutorTable
```

**What TypeORM does:**
1. Scans all entities in `apps/api/src/app/**/*.entity.ts`
2. Compares with current database schema
3. Detects that `tutor` table doesn't exist
4. Generates migration file with SQL to create the table

**Output:**
```
Migration /Users/atulmala/tutor-student/tutorix/apps/api/src/migrations/1234567890123-CreateTutorTable.ts has been generated successfully.
```

### Step 3: Review the Generated Migration

**File**: `apps/api/src/migrations/1234567890123-CreateTutorTable.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorTable1234567890123 implements MigrationInterface {
  name = 'CreateTutorTable1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 0,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "bio" character varying,
        "isVerified" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_tutor" PRIMARY KEY ("id")
      )
    `);
    
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tutor_email" ON "tutor" ("email")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_tutor_deleted" ON "tutor" ("deleted")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_tutor_active" ON "tutor" ("active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tutor_active"`);
    await queryRunner.query(`DROP INDEX "IDX_tutor_deleted"`);
    await queryRunner.query(`DROP INDEX "IDX_tutor_email"`);
    await queryRunner.query(`DROP TABLE "tutor"`);
  }
}
```

**Review Checklist:**
- ✅ Table name is correct (`tutor`)
- ✅ All columns from entity are present
- ✅ Base entity fields are included (`id`, `version`, `deleted`, `active`, etc.)
- ✅ Indexes are created (for `deleted`, `active`, and unique `email`)
- ✅ Default values match entity definitions
- ✅ `down()` method properly reverses all changes

### Step 4: Run the Migration

**Command:**
```bash
npm run migration:run
```

**What happens:**
1. TypeORM connects to database
2. Checks `migrations` table for executed migrations
3. Finds `CreateTutorTable1234567890123` is pending
4. Executes the `up()` method
5. Records migration in `migrations` table

**Output:**
```
query: SELECT * FROM "migrations" ORDER BY "id" DESC
query: CREATE TABLE "tutor" (...)
query: CREATE UNIQUE INDEX "IDX_tutor_email" ON "tutor" ("email")
query: CREATE INDEX "IDX_tutor_deleted" ON "tutor" ("deleted")
query: CREATE INDEX "IDX_tutor_active" ON "tutor" ("active")
query: INSERT INTO "migrations"("timestamp", "name") VALUES (1234567890123, 'CreateTutorTable1234567890123')
Migration CreateTutorTable1234567890123 has been executed successfully.
```

### Step 5: Verify the Changes

**Option 1: Check Migration Status**
```bash
npm run migration:show
```

**Output:**
```
[X] CreateTutorTable1234567890123
```

**Option 2: Query Database Directly**
```bash
psql -U postgres -d tutorix -c "\d tutor"
```

**Output:**
```
                                    Table "public.tutor"
    Column     |            Type             | Collation | Nullable | Default
---------------+-----------------------------+-----------+----------+---------
 id            | integer                     |           | not null | nextval('tutor_id_seq'::regclass)
 version       | integer                     |           | not null | 0
 deleted       | boolean                     |           | not null | false
 active        | boolean                     |           | not null | true
 createdDate   | timestamp without time zone |           | not null | now()
 updatedDate   | timestamp without time zone |           | not null | now()
 m_id          | character varying          |           |          |
 email         | character varying          |           | not null |
 firstName     | character varying          |           | not null |
 lastName      | character varying          |           | not null |
 bio           | character varying          |           |          |
 isVerified    | boolean                     |           | not null | false
Indexes:
    "PK_tutor" PRIMARY KEY, btree (id)
    "IDX_tutor_email" UNIQUE, btree (email)
    "IDX_tutor_deleted" btree (deleted)
    "IDX_tutor_active" btree (active)
```

**Option 3: Test via Application**
Start your API and verify the entity works:
```bash
npm run serve:api
```

The GraphQL schema should now include the `Tutor` type with all fields.

---

## 🔄 Scenario 2: Updating an Existing Entity

Let's add a new field to the `Tutor` entity.

### Step 1: Update the Entity

**File**: `apps/api/src/app/tutor/entities/tutor.entity.ts`

Add a new field:
```typescript
@Field()
@Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
hourlyRate: number;
```

**Updated entity:**
```typescript
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  // ... existing fields ...
  
  @Field()
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hourlyRate: number;
}
```

### Step 2: Generate the Migration

**Command:**
```bash
npm run migration:generate -- apps/api/src/migrations/AddHourlyRateToTutor
```

**What TypeORM does:**
1. Compares updated entity with current database schema
2. Detects new `hourlyRate` column
3. Generates migration to add the column

### Step 3: Review the Generated Migration

**File**: `apps/api/src/migrations/1234567890456-AddHourlyRateToTutor.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHourlyRateToTutor1234567890456 implements MigrationInterface {
  name = 'AddHourlyRateToTutor1234567890456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor" 
      ADD "hourlyRate" numeric(5,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor" 
      DROP COLUMN "hourlyRate"
    `);
  }
}
```

**Review:**
- ✅ Column type is correct (`numeric(5,2)`)
- ✅ Default value matches entity (`0`)
- ✅ `down()` properly removes the column

### Step 4: Run the Migration

```bash
npm run migration:run
```

**Output:**
```
query: ALTER TABLE "tutor" ADD "hourlyRate" numeric(5,2) NOT NULL DEFAULT 0
Migration AddHourlyRateToTutor1234567890456 has been executed successfully.
```

### Step 5: Verify

```bash
psql -U postgres -d tutorix -c "\d tutor"
```

You should see the new `hourlyRate` column.

---

## 🔄 Scenario 3: Modifying Existing Column

Let's change the `bio` field from nullable to required.

### Step 1: Update Entity

**Before:**
```typescript
@Field({ nullable: true })
@Column({ nullable: true })
bio: string;
```

**After:**
```typescript
@Field()
@Column()
bio: string;
```

### Step 2: Generate Migration

```bash
npm run migration:generate -- apps/api/src/migrations/MakeBioRequiredInTutor
```

### Step 3: Review Migration

**Generated migration:**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // First, update existing NULL values (if any)
  await queryRunner.query(`
    UPDATE "tutor" SET "bio" = '' WHERE "bio" IS NULL
  `);
  
  // Then make column NOT NULL
  await queryRunner.query(`
    ALTER TABLE "tutor" 
    ALTER COLUMN "bio" SET NOT NULL
  `);
}
```

**Important:** Review this carefully! If you have existing NULL values, you need to handle them.

### Step 4: Run Migration

```bash
npm run migration:run
```

---

## 🚨 Common Scenarios & Solutions

### Scenario: Adding a Relationship

**Entity Update:**
```typescript
import { ManyToOne, JoinColumn } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { Subject } from '../../subject/entities/subject.entity';

@ManyToOne(() => Subject)
@JoinColumn({ name: 'subjectId' })
@Field(() => Subject)
subject: Subject;
```

**Migration will include:**
- Foreign key constraint
- `subjectId` column
- Index on foreign key

### Scenario: Removing a Field

**Entity Update:**
```typescript
// Remove the field entirely
```

**Migration will:**
- Drop the column
- Handle data loss warning (if column has data)

**⚠️ Warning:** This will delete data! Consider:
1. Backing up data first
2. Creating a data migration to export data
3. Or marking as deprecated first, then removing later

### Scenario: Renaming a Column

**Entity Update:**
```typescript
@Column({ name: 'old_name' })  // Keep old DB name
newName: string;               // New entity property name
```

Or use a migration to rename:
```typescript
await queryRunner.query(`
  ALTER TABLE "tutor" 
  RENAME COLUMN "oldName" TO "newName"
`);
```

---

## 📝 Best Practices

### ✅ DO:

1. **Always review migrations** before running
2. **Test migrations on development** database first
3. **One logical change per migration** (easier to review and revert)
4. **Use descriptive migration names** (e.g., `AddEmailVerificationToUser`)
5. **Commit migrations to git** (they're part of your codebase)
6. **Backup production database** before running migrations
7. **Run migrations in order** (TypeORM handles this automatically)

### ❌ DON'T:

1. **Don't edit executed migrations** - create a new one instead
2. **Don't skip reviewing** - always check the SQL
3. **Don't run migrations manually** - use the CLI commands
4. **Don't delete migration files** that have been executed
5. **Don't use `synchronize: true`** in production (it's disabled in our config)

---

## 🔄 Reverting Migrations

If you need to undo a migration:

```bash
npm run migration:revert
```

This will:
- Revert the last executed migration
- Run the `down()` method
- Remove the migration record

**⚠️ Warning:** Only revert if you're sure - this can cause data loss!

---

## 📊 Migration Status

Check which migrations have been run:

```bash
npm run migration:show
```

**Output:**
```
[X] CreateTutorTable1234567890123
[X] AddHourlyRateToTutor1234567890456
[ ] MakeBioRequiredInTutor1234567890789  ← Pending
```

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Generate migration | `npm run migration:generate -- apps/api/src/migrations/MigrationName` |
| Create empty migration | `npm run migration:create -- apps/api/src/migrations/MigrationName` |
| Run migrations | `npm run migration:run` |
| Revert last migration | `npm run migration:revert` |
| Show migration status | `npm run migration:show` |

---

## 🔍 Troubleshooting

### Error: "No changes in database schema were found"

**Cause:** Entity changes don't match what TypeORM expects.

**Solutions:**
- Ensure entity file is in correct location (`**/*.entity.ts`)
- Check entity decorators are correct
- Verify database connection is working
- Make sure you've saved the entity file

### Error: "Migration already executed"

**Cause:** Migration was already run.

**Solutions:**
- Check `migration:show` to see status
- If migration failed partway, you may need to manually fix database state
- Or mark migration as executed manually (not recommended)

### Error: "Cannot find module" when running migrations

**Cause:** TypeScript compilation issue.

**Solutions:**
- Ensure `ts-node` is installed
- Check `tsconfig.json` includes migration files
- Try building the project first: `npm run build:api`

---

## 📚 Related Documentation

- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Detailed migration reference
- [MIGRATION_SETUP_SUMMARY.md](./MIGRATION_SETUP_SUMMARY.md) - Setup overview
- [AWS_SECRETS_MANAGER.md](./AWS_SECRETS_MANAGER.md) - Production credential management

