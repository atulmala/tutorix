import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds session tracking columns to refresh_token for:
 * - platform: web | ios | android
 * - lastActivityAt: last interaction timestamp (for inactive-session count)
 */
export class AddSessionTrackingToRefreshToken1768950000000
  implements MigrationInterface
{
  name = 'AddSessionTrackingToRefreshToken1768950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_token"
      ADD COLUMN IF NOT EXISTS "platform" character varying(20),
      ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_token_platform" ON "refresh_token" ("platform")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_platform"`);
    await queryRunner.query(`
      ALTER TABLE "refresh_token"
      DROP COLUMN IF EXISTS "platform",
      DROP COLUMN IF EXISTS "lastActivityAt"
    `);
  }
}
