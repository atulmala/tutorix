import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentSettlementSyncBatchJobName1777100000001
  implements MigrationInterface
{
  name = 'AddPaymentSettlementSyncBatchJobName1777100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "batch_job_name_enum"
      ADD VALUE IF NOT EXISTS 'payment-settlement-sync'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
