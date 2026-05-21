import { MigrationInterface, QueryRunner } from 'typeorm';

export class BatchJobRunAudit1773600000000 implements MigrationInterface {
  name = 'BatchJobRunAudit1773600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "batch_job_name_enum" AS ENUM (
        'document-analysis',
        'class-reminder',
        'feedback-reminder',
        'calendar-update-reminder'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "batch_job_run_status_enum" AS ENUM (
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'PARTIAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "batch_job_trigger_enum" AS ENUM (
        'cron',
        'manual'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "batch_job_run" (
        "id" SERIAL NOT NULL,
        "job_name" "batch_job_name_enum" NOT NULL,
        "status" "batch_job_run_status_enum" NOT NULL DEFAULT 'RUNNING',
        "started_at" TIMESTAMP NOT NULL,
        "finished_at" TIMESTAMP,
        "duration_ms" integer,
        "items_found" integer NOT NULL DEFAULT 0,
        "items_processed" integer NOT NULL DEFAULT 0,
        "items_skipped" integer NOT NULL DEFAULT 0,
        "items_failed" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "triggered_by" "batch_job_trigger_enum" NOT NULL DEFAULT 'cron',
        "metadata" jsonb,
        CONSTRAINT "PK_batch_job_run" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_batch_job_run_job_name_started_at"
      ON "batch_job_run" ("job_name", "started_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_batch_job_run_status" ON "batch_job_run" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "document_screening"
      ADD COLUMN "batch_job_run_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "document_screening"
      ADD CONSTRAINT "FK_document_screening_batch_job_run"
      FOREIGN KEY ("batch_job_run_id") REFERENCES "batch_job_run"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_screening_batch_job_run_id"
      ON "document_screening" ("batch_job_run_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_document_screening_batch_job_run_id"`);
    await queryRunner.query(`
      ALTER TABLE "document_screening" DROP CONSTRAINT "FK_document_screening_batch_job_run"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_screening" DROP COLUMN "batch_job_run_id"
    `);
    await queryRunner.query(`DROP INDEX "public"."IDX_batch_job_run_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_batch_job_run_job_name_started_at"`);
    await queryRunner.query(`DROP TABLE "batch_job_run"`);
    await queryRunner.query(`DROP TYPE "batch_job_trigger_enum"`);
    await queryRunner.query(`DROP TYPE "batch_job_run_status_enum"`);
    await queryRunner.query(`DROP TYPE "batch_job_name_enum"`);
  }
}
