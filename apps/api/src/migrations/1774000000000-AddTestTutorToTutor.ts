import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestTutorToTutor1774000000000 implements MigrationInterface {
  name = 'AddTestTutorToTutor1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      ADD COLUMN "test_tutor" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      DROP COLUMN "test_tutor"
    `);
  }
}
