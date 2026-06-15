import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformFeeConfig1776000000000 implements MigrationInterface {
  name = 'CreatePlatformFeeConfig1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."platform_fee_config_code_enum" AS ENUM (
        'TUTOR_REGISTRATION',
        'PROFICIENCY_TEST',
        'STUDENT_REGISTRATION'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."platform_fee_config_discount_type_enum" AS ENUM (
        'NONE',
        'FIXED_INR',
        'PERCENT'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "platform_fee_config" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "code" "public"."platform_fee_config_code_enum" NOT NULL,
        "display_name" character varying(120) NOT NULL,
        "amount_inr" smallint NOT NULL,
        "discount_type" "public"."platform_fee_config_discount_type_enum" NOT NULL DEFAULT 'NONE',
        "discount_value" smallint NOT NULL DEFAULT 0,
        "waived" boolean NOT NULL DEFAULT false,
        "promo_message" text,
        CONSTRAINT "PK_platform_fee_config" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_fee_config_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_config_deleted" ON "platform_fee_config" ("deleted")`,
    );

    await queryRunner.query(`
      INSERT INTO "platform_fee_config" (
        "code", "display_name", "amount_inr", "discount_type", "discount_value", "waived", "promo_message"
      ) VALUES
      (
        'TUTOR_REGISTRATION',
        'Tutor registration fee',
        999,
        'NONE',
        0,
        true,
        'The one-time registration fee of ₹999 is not being charged for a limited time. Tap Continue to proceed.'
      ),
      (
        'PROFICIENCY_TEST',
        'Proficiency Test Fee',
        99,
        'NONE',
        0,
        true,
        'The proficiency test fee is not being charged for a limited time.'
      ),
      (
        'STUDENT_REGISTRATION',
        'Student registration fee',
        499,
        'NONE',
        0,
        true,
        'The one-time student registration fee is not being charged for a limited time. Tap Continue to proceed.'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_config_deleted"`);
    await queryRunner.query(`DROP TABLE "platform_fee_config"`);
    await queryRunner.query(
      `DROP TYPE "public"."platform_fee_config_discount_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."platform_fee_config_code_enum"`);
  }
}
