import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentOnboardingStageEnteredAt1775600000000
  implements MigrationInterface
{
  name = 'AddStudentOnboardingStageEnteredAt1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN "onboarding_stage_entered_at" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "student"
      SET "onboarding_stage_entered_at" = "updatedDate"
      WHERE "onboarding_stage_entered_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student"
      DROP COLUMN "onboarding_stage_entered_at"
    `);
  }
}
