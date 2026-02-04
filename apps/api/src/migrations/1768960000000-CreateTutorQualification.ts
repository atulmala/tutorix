import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates tutor_qualification table for storing tutor educational qualifications.
 * Each tutor can have multiple qualifications (Higher Secondary mandatory).
 */
export class CreateTutorQualification1768960000000 implements MigrationInterface {
  name = 'CreateTutorQualification1768960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_qualification_qualification_type_enum" AS ENUM (
        'HIGHER_SECONDARY', 'DIPLOMA', 'BACHELORS', 'PG_DIPLOMA',
        'MASTERS', 'MPHIL', 'PHD'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_qualification_grade_type_enum" AS ENUM (
        'CGPA', 'PERCENTAGE', 'DIVISION'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tutor_qualification" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_id" integer NOT NULL,
        "qualificationType" "public"."tutor_qualification_qualification_type_enum" NOT NULL,
        "boardOrUniversity" character varying NOT NULL,
        "gradeType" "public"."tutor_qualification_grade_type_enum" NOT NULL,
        "gradeValue" character varying NOT NULL,
        "yearObtained" smallint NOT NULL,
        "fieldOfStudy" character varying,
        "displayOrder" smallint DEFAULT 0,
        CONSTRAINT "PK_tutor_qualification" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_qualification"
      ADD CONSTRAINT "FK_tutor_qualification_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tutor_qualification_tutor_type" ON "tutor_qualification" ("tutor_id", "qualificationType") WHERE deleted = false`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_qualification_deleted" ON "tutor_qualification" ("deleted")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_qualification_tutor_id" ON "tutor_qualification" ("tutor_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_qualification_tutor_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_qualification_deleted"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_tutor_qualification_tutor_type"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_qualification" DROP CONSTRAINT "FK_tutor_qualification_tutor_id"`
    );
    await queryRunner.query(`DROP TABLE "tutor_qualification"`);
    await queryRunner.query(`DROP TYPE "public"."tutor_qualification_grade_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tutor_qualification_qualification_type_enum"`);
  }
}
