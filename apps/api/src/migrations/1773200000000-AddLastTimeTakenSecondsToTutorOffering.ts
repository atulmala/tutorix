import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds last_time_taken_seconds to tutor_offering to store time taken per attempt.
 */
export class AddLastTimeTakenSecondsToTutorOffering1773200000000
  implements MigrationInterface
{
  name = 'AddLastTimeTakenSecondsToTutorOffering1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering"
      ADD COLUMN "last_time_taken_seconds" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering" DROP COLUMN "last_time_taken_seconds"
    `);
  }
}
