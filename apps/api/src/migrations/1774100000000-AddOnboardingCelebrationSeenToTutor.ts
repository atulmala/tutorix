import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingCelebrationSeenToTutor1774100000000
  implements MigrationInterface
{
  name = 'AddOnboardingCelebrationSeenToTutor1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      ADD COLUMN "onboarding_celebration_seen" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      DROP COLUMN "onboarding_celebration_seen"
    `);
  }
}
