import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds years_of_experience column to tutor table.
 * Default: 1 (0 to 2 years)
 */
export class AddYearsOfExperienceToTutor1770610000000 implements MigrationInterface {
  name = 'AddYearsOfExperienceToTutor1770610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      ADD COLUMN "years_of_experience" smallint NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor" DROP COLUMN "years_of_experience"
    `);
  }
}
