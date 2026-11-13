import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashfreePayoutColumns1780000000000 implements MigrationInterface {
  name = 'AddCashfreePayoutColumns1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      ADD COLUMN IF NOT EXISTS "cashfree_beneficiary_id" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement"
      ADD COLUMN IF NOT EXISTS "payout_provider" character varying(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement" DROP COLUMN IF EXISTS "payout_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_bank_details" DROP COLUMN IF EXISTS "cashfree_beneficiary_id"
    `);
  }
}
