# TypeORM Migrations Guide

This guide explains how to use TypeORM migrations in the Tutorix project.

## Overview

Migrations allow you to version control your database schema changes. Instead of using `synchronize: true` (which can cause data loss), migrations provide a safe, reviewable way to manage database schema evolution.

## Workflow

1. **Create Entities** - Define your TypeORM entities
2. **Generate Migration** - Auto-generate migration from entity changes
3. **Review Migration** - Check the generated SQL before running
4. **Run Migration** - Apply the migration to update the database schema

## Folder Structure

```
apps/api/src/
├── app/
│   └── entities/          # Entity files (*.entity.ts)
│       └── user.entity.ts
├── migrations/            # Migration files (*.ts)
│   └── 1234567890123-CreateUser.ts
└── data-source.ts         # TypeORM CLI configuration
```

## Commands

### 1. Generate Migration (Auto-detect changes)

After creating or modifying entities, generate a migration:

```bash
npm run migration:generate -- apps/api/src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:generate -- apps/api/src/migrations/CreateUserTable
```

This will:
- Compare your entities with the current database schema
- Generate a migration file with the necessary SQL changes
- Save it to `apps/api/src/migrations/`

### 2. Create Empty Migration (Manual)

If you need to write custom SQL:

```bash
npm run migration:create -- apps/api/src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:create -- apps/api/src/migrations/AddCustomIndex
```

### 3. Review Migration

Before running, always review the generated migration file:

```typescript
// Example: apps/api/src/migrations/1234567890123-CreateUser.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUser1234567890123 implements MigrationInterface {
  name = 'CreateUser1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
```

**Check:**
- ✅ SQL syntax is correct
- ✅ Column types match your needs
- ✅ Indexes and constraints are included
- ✅ `down()` method properly reverses the migration

### 4. Run Migrations

Apply all pending migrations:

```bash
npm run migration:run
```

This will:
- Connect to the database
- Check which migrations have been run (stored in `migrations` table)
- Execute pending migrations in order
- Update the `migrations` table

### 5. Show Migration Status

Check which migrations have been run:

```bash
npm run migration:show
```

### 6. Revert Last Migration

Undo the most recent migration:

```bash
npm run migration:revert
```

⚠️ **Warning**: Only revert if you're sure - this can cause data loss if the migration created data.

## Step-by-Step Example

### Step 1: Create an Entity

Create `apps/api/src/app/entities/user.entity.ts`:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Step 2: Register Entity in DatabaseModule

Update `apps/api/src/app/database/database.module.ts` to include the entity (or use auto-loading with the entities path pattern).

The current configuration uses:
```typescript
entities: [join(__dirname, '..', '**', '*.entity.ts')]
```

This automatically loads all `*.entity.ts` files, so you don't need to manually register them.

### Step 3: Generate Migration

```bash
npm run migration:generate -- apps/api/src/migrations/CreateUserTable
```

This creates a file like: `apps/api/src/migrations/1234567890123-CreateUserTable.ts`

### Step 4: Review the Migration

Open the generated file and verify:
- Table name is correct
- Columns match your entity
- Data types are appropriate
- Indexes/constraints are included

### Step 5: Run the Migration

```bash
npm run migration:run
```

You should see:
```
Migration CreateUserTable1234567890123 has been executed successfully.
```

### Step 6: Verify

Check your database:
- The `user` table should exist
- The `migrations` table should have a new entry

## Best Practices

### ✅ DO

1. **Always review migrations** before running them
2. **Test migrations** on a development database first
3. **Commit migrations** to version control
4. **Use descriptive names** for migrations
5. **Keep migrations small** - one logical change per migration
6. **Test the `down()` method** to ensure reversibility

### ❌ DON'T

1. **Don't edit executed migrations** - create a new migration instead
2. **Don't use `synchronize: true`** in production (it's disabled in our config)
3. **Don't delete migration files** that have been run
4. **Don't run migrations manually** - always use the CLI commands
5. **Don't skip reviewing** generated migrations

## Environment Variables

Migrations use the same database connection as the application:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=tutorix
```

## Auto-Running Migrations on Startup

You can optionally run migrations automatically when the app starts by setting:

```env
AUTO_RUN_MIGRATIONS=true
```

⚠️ **Warning**: Only enable this in controlled environments (like Docker containers). In production, run migrations manually or via CI/CD.

## Troubleshooting

### Migration Generation Fails

**Error**: "No changes in database schema were found"

**Solution**: 
- Make sure your entities are in the correct location (`apps/api/src/app/**/*.entity.ts`)
- Check that entity decorators are correct
- Ensure the database connection is working

### Migration Run Fails

**Error**: "Migration already executed"

**Solution**: 
- Check `migration:show` to see status
- If migration failed partway, you may need to manually fix the database state

### Can't Connect to Database

**Error**: Connection refused or authentication failed

**Solution**:
- Verify `.env` file has correct credentials
- Check PostgreSQL is running: `pg_isready -h localhost`
- Test connection: `psql -U postgres -h localhost -d tutorix`

## Migration File Naming

TypeORM automatically prefixes migrations with a timestamp:
- Format: `{timestamp}-{MigrationName}.ts`
- Example: `1234567890123-CreateUserTable.ts`

The timestamp ensures migrations run in the correct order.

## Production Deployment

1. **Backup database** before running migrations
2. **Test migrations** on staging first
3. **Run migrations** before deploying new code
4. **Monitor** migration execution
5. **Have a rollback plan** ready

## Related Files

- `apps/api/src/data-source.ts` - TypeORM CLI configuration
- `apps/api/src/app/database/database.module.ts` - NestJS TypeORM module
- `apps/api/src/migrations/` - Migration files directory
- `apps/api/src/app/entities/` - Entity files directory

