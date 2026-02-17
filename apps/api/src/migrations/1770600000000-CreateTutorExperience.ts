import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates tutor_experience table and adds experience_id to document table.
 */
export class CreateTutorExperience1770600000000 implements MigrationInterface {
  name = 'CreateTutorExperience1770600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor_experience" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_id" integer NOT NULL,
        "job_title" character varying NOT NULL,
        "employer_name" character varying,
        "employer_address" text,
        "employment_type" smallint NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "is_current" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_tutor_experience" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_experience"
      ADD CONSTRAINT "FK_tutor_experience_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_experience_deleted" ON "tutor_experience" ("deleted")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_experience_tutor_id" ON "tutor_experience" ("tutor_id")`
    );

    await queryRunner.query(`
      ALTER TABLE "document"
      ADD COLUMN "experience_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "document"
      ADD CONSTRAINT "FK_document_experience_id"
      FOREIGN KEY ("experience_id") REFERENCES "tutor_experience"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_document_experience_id" ON "document" ("experience_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_document_experience_id"`);
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_document_experience_id"`
    );
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "experience_id"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_experience_tutor_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_experience_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_experience" DROP CONSTRAINT "FK_tutor_experience_tutor_id"`
    );
    await queryRunner.query(`DROP TABLE "tutor_experience"`);
  }
}
