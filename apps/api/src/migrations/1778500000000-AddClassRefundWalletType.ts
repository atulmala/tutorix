import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassRefundWalletType1778500000000 implements MigrationInterface {
  name = 'AddClassRefundWalletType1778500000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."wallet_transaction_type_enum"
      ADD VALUE IF NOT EXISTS 'class_refund_credit'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."class_credit_refund_method_enum" AS ENUM ('wallet', 'gateway');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
