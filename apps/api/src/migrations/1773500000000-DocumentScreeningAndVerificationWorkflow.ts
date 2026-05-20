import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentScreeningAndVerificationWorkflow1773500000000
  implements MigrationInterface
{
  name = 'DocumentScreeningAndVerificationWorkflow1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_screening_status_enum" AS ENUM (
        'PASSED_AUTOMATED',
        'PENDING_HUMAN',
        'APPROVED_HUMAN',
        'REJECTED_HUMAN'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "document_verification_workflow_status_enum" AS ENUM (
        'PENDING',
        'COMPLETED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "document_screening" (
        "id" SERIAL NOT NULL,
        "document_id" integer NOT NULL,
        "status" "document_screening_status_enum" NOT NULL,
        "automated_at" TIMESTAMP,
        "model_id" character varying(128),
        "confidence" double precision,
        "summary_notes" text,
        "reviewed_by_user_id" integer,
        "reviewed_at" TIMESTAMP,
        "reviewer_note" text,
        CONSTRAINT "PK_document_screening" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_document_screening_document_id" UNIQUE ("document_id"),
        CONSTRAINT "FK_document_screening_document" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_screening_reviewer" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_screening_status" ON "document_screening" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "document"
      ADD COLUMN "document_verification_workflow_status" "document_verification_workflow_status_enum" NOT NULL DEFAULT 'COMPLETED'
    `);

    await queryRunner.query(`
      UPDATE "document"
      SET "document_verification_workflow_status" = 'PENDING'
      WHERE "tutor_id" IS NOT NULL
        AND "experience_id" IS NULL
        AND "storage_key" IS NOT NULL
        AND "document_type" IN (5, 6, 14, 15)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document" DROP COLUMN "document_verification_workflow_status"
    `);
    await queryRunner.query(`DROP INDEX "public"."IDX_document_screening_status"`);
    await queryRunner.query(`DROP TABLE "document_screening"`);
    await queryRunner.query(`DROP TYPE "document_screening_status_enum"`);
    await queryRunner.query(`DROP TYPE "document_verification_workflow_status_enum"`);
  }
}
