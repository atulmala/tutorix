import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorOnboardingApprovedEvent1777800000000
  implements MigrationInterface
{
  name = 'AddTutorOnboardingApprovedEvent1777800000000';
  // ADD VALUE cannot be used in the same transaction that later inserts those labels.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'TUTOR_ONBOARDING_APPROVED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
