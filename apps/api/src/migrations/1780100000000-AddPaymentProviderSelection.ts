import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentProviderSelection1780100000000 implements MigrationInterface {
  name = 'AddPaymentProviderSelection1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings"
      ADD COLUMN IF NOT EXISTS "active_payment_gateway" character varying(32) NOT NULL DEFAULT 'razorpay'
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings"
      ADD COLUMN IF NOT EXISTS "tutor_payout_provider" character varying(32) NOT NULL DEFAULT 'razorpayx'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings" DROP COLUMN IF EXISTS "tutor_payout_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings" DROP COLUMN IF EXISTS "active_payment_gateway"
    `);
  }
}
