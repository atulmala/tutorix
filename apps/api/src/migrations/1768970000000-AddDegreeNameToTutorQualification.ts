import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds degreeName column to tutor_qualification to store degree names
 * like \"Higher Secondary\", \"BA\", \"BSc\", \"MSc\", etc.
 */
export class AddDegreeNameToTutorQualification1768970000000
  implements MigrationInterface
{
  name = 'AddDegreeNameToTutorQualification1768970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tutor_qualification" ADD "degreeName" character varying`
    );

    // Backfill existing Higher Secondary rows with a sensible default
    await queryRunner.query(`
      UPDATE "tutor_qualification"
      SET "degreeName" = 'Higher Secondary'
      WHERE "qualificationType" = 'HIGHER_SECONDARY'
        AND "degreeName" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tutor_qualification" DROP COLUMN "degreeName"`
    );
  }
}

