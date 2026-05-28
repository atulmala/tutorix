import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorOnboardingApprovalBatchJobName1774200000000
  implements MigrationInterface
{
  name = 'AddTutorOnboardingApprovalBatchJobName1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "batch_job_name_enum"
      ADD VALUE IF NOT EXISTS 'tutor-onboarding-approval'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    // PostgreSQL does not support removing individual enum values safely.
  }
}
