import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostClassRefundClaimCommunication1779600000001 implements MigrationInterface {
  name = 'AddPostClassRefundClaimCommunication1779600000001';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'POST_CLASS_REFUND_CLAIM_RAISED'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'POST_CLASS_REFUND_CLAIM_TUTOR_ALERT'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
