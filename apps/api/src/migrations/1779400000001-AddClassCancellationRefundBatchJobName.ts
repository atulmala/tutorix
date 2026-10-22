import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassCancellationRefundBatchJobName1779400000001 implements MigrationInterface {
  name = 'AddClassCancellationRefundBatchJobName1779400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "batch_job_name_enum"
      ADD VALUE IF NOT EXISTS 'class-cancellation-refund-analysis'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
