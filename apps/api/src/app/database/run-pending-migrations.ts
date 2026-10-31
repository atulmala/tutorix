import { Logger } from '@nestjs/common';
import { DataSource, MigrationExecutor } from 'typeorm';
import { loadAppSecrets } from '../config/app-secrets.loader';
import { loadDatabaseCredentials } from './database-credentials.loader';
import { createDatabaseOptions } from './database.config';
import {
  baselineRequiredErrorMessage,
  shouldBaselineMigrations,
  shouldRequireMigrationBaseline,
} from './migration-baseline.util';

const logger = new Logger('RunPendingMigrations');

async function readMigrationHistoryCount(dataSource: DataSource): Promise<number> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'migrations'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      return 0;
    }
    const rows = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM migrations`);
    return Number(rows[0]?.count ?? 0);
  } finally {
    await queryRunner.release();
  }
}

async function readPublicTableCount(dataSource: DataSource): Promise<number> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const rows = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'migrations'
    `);
    return Number(rows[0]?.count ?? 0);
  } finally {
    await queryRunner.release();
  }
}

async function ensureMigrationsTable(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL NOT NULL,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
      )
    `);
  } finally {
    await queryRunner.release();
  }
}

async function insertMigrationRecordsWithoutRunning(
  dataSource: DataSource,
): Promise<number> {
  await ensureMigrationsTable(dataSource);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  const migrationExecutor = new MigrationExecutor(dataSource, queryRunner);

  try {
    const allMigrations = await migrationExecutor.getAllMigrations();
    const executed = await migrationExecutor.getExecutedMigrations();
    const executedNames = new Set(executed.map((row) => row.name));
    let inserted = 0;

    for (const migration of allMigrations) {
      if (executedNames.has(migration.name)) {
        continue;
      }
      await migrationExecutor.insertMigration(migration);
      inserted += 1;
    }

    return inserted;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Runs pending TypeORM migrations (Docker entrypoint / MIGRATIONS_ONLY mode).
 * Legacy databases with schema but empty `migrations` require a one-time baseline.
 */
export async function runPendingMigrations(): Promise<void> {
  await loadAppSecrets();
  const credentials = await loadDatabaseCredentials();
  const options = createDatabaseOptions(credentials);

  const dataSource = new DataSource({
    ...options,
    synchronize: false,
    migrationsRun: false,
  });

  await dataSource.initialize();

  try {
    const migrationHistoryCount = await readMigrationHistoryCount(dataSource);
    const publicTableCount = await readPublicTableCount(dataSource);

    if (
      shouldRequireMigrationBaseline(
        { count: migrationHistoryCount },
        { count: publicTableCount },
      )
    ) {
      if (
        shouldBaselineMigrations(
          { count: migrationHistoryCount },
          { count: publicTableCount },
        )
      ) {
        const recorded = await insertMigrationRecordsWithoutRunning(dataSource);
        logger.warn(
          `Baselined ${recorded} migration(s) without replaying SQL (BASELINE_MIGRATIONS=true).`,
        );
      } else {
        throw new Error(baselineRequiredErrorMessage());
      }
    }

    const executed = await dataSource.runMigrations({ transaction: 'each' });
    if (executed.length === 0) {
      logger.log('No pending migrations.');
    } else {
      logger.log(
        `Applied ${executed.length} migration(s): ${executed.map((m) => m.name).join(', ')}`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}
