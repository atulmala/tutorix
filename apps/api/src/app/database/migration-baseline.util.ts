export type MigrationHistoryRow = { count: number };

export type PublicTableCountRow = { count: number };

/** True when the DB already has app tables but no migration history (legacy sync deploy). */
export function shouldRequireMigrationBaseline(
  migrationHistory: MigrationHistoryRow,
  publicTableCount: PublicTableCountRow,
  options?: { minPublicTables?: number },
): boolean {
  const minPublicTables = options?.minPublicTables ?? 5;
  return migrationHistory.count === 0 && publicTableCount.count >= minPublicTables;
}

export function shouldBaselineMigrations(
  migrationHistory: MigrationHistoryRow,
  publicTableCount: PublicTableCountRow,
): boolean {
  return (
    process.env.BASELINE_MIGRATIONS === 'true' &&
    shouldRequireMigrationBaseline(migrationHistory, publicTableCount)
  );
}

export function baselineRequiredErrorMessage(): string {
  return (
    'Database has an existing schema but the migrations table is empty. ' +
    'Run once with BASELINE_MIGRATIONS=true to record already-applied migrations without ' +
    'replaying them, then redeploy with BASELINE_MIGRATIONS unset so only new migrations run.'
  );
}
