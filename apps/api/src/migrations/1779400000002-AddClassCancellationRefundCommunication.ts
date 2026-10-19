import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassCancellationRefundCommunication1779400000002 implements MigrationInterface {
  name = 'AddClassCancellationRefundCommunication1779400000002';
  // ADD VALUE cannot be used in the same transaction that later inserts those labels.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'CLASS_CANCELLATION_REFUND_INITIATED'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'CLASS_CANCELLATION_REFUND_COMPLETED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
