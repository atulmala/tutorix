import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentRegistrationPayment1776000000002 implements MigrationInterface {
  name = 'StudentRegistrationPayment1776000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."student_onboarding_stage_enum"
      ADD VALUE IF NOT EXISTS 'registrationPayment'
    `);

    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN IF NOT EXISTS "reg_fee_paid" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN IF NOT EXISTS "reg_fee_amount" numeric(8,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN IF NOT EXISTS "reg_fee_amount_to_be_paid" numeric(8,2) NOT NULL DEFAULT 499
    `);
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN IF NOT EXISTS "reg_fee_date" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN IF EXISTS "reg_fee_date"`);
    await queryRunner.query(
      `ALTER TABLE "student" DROP COLUMN IF EXISTS "reg_fee_amount_to_be_paid"`,
    );
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN IF EXISTS "reg_fee_amount"`);
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN IF EXISTS "reg_fee_paid"`);
  }
}
