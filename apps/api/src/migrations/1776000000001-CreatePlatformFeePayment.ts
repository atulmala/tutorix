import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformFeePayment1776000000001 implements MigrationInterface {
  name = 'CreatePlatformFeePayment1776000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."platform_fee_payment_gateway_provider_enum" AS ENUM (
        'razorpay',
        'cashfree'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."platform_fee_payment_context_type_enum" AS ENUM (
        'tutor',
        'student',
        'tutor_offering'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."platform_fee_payment_status_enum" AS ENUM (
        'waived',
        'pending',
        'paid',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "platform_fee_payment" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "fee_code" "public"."platform_fee_config_code_enum" NOT NULL,
        "user_id" integer NOT NULL,
        "context_type" "public"."platform_fee_payment_context_type_enum" NOT NULL,
        "context_id" integer NOT NULL,
        "list_price_inr" smallint NOT NULL,
        "discount_type" "public"."platform_fee_config_discount_type_enum" NOT NULL,
        "discount_value" smallint NOT NULL DEFAULT 0,
        "discount_amount_inr" smallint NOT NULL DEFAULT 0,
        "amount_paid_inr" smallint NOT NULL DEFAULT 0,
        "gateway_provider" "public"."platform_fee_payment_gateway_provider_enum",
        "gateway_order_id" character varying,
        "gateway_payment_id" character varying,
        "status" "public"."platform_fee_payment_status_enum" NOT NULL DEFAULT 'pending',
        "paid_at" TIMESTAMP,
        CONSTRAINT "PK_platform_fee_payment" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_payment_user_id" ON "platform_fee_payment" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_payment_fee_code" ON "platform_fee_payment" ("fee_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_payment_context" ON "platform_fee_payment" ("context_type", "context_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_payment_deleted" ON "platform_fee_payment" ("deleted")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_payment_deleted"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_payment_context"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_payment_fee_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_payment_user_id"`);
    await queryRunner.query(`DROP TABLE "platform_fee_payment"`);
    await queryRunner.query(`DROP TYPE "public"."platform_fee_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."platform_fee_payment_context_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."platform_fee_payment_gateway_provider_enum"`);
  }
}
