import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentGatewayFeeConfig1779700000000
  implements MigrationInterface
{
  name = 'CreatePaymentGatewayFeeConfig1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_gateway_fee_settings" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "gst_rate_percent" numeric(5,2) NOT NULL DEFAULT 18,
        CONSTRAINT "PK_payment_gateway_fee_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_settings_deleted"
      ON "payment_gateway_fee_settings" ("deleted")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_settings_active"
      ON "payment_gateway_fee_settings" ("active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_settings_createdDate"
      ON "payment_gateway_fee_settings" ("createdDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_settings_updatedDate"
      ON "payment_gateway_fee_settings" ("updatedDate")
    `);

    await queryRunner.query(`
      INSERT INTO "payment_gateway_fee_settings" ("id", "gst_rate_percent")
      VALUES (1, 18)
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_gateway_fee_config" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "provider" "public"."platform_fee_payment_gateway_provider_enum" NOT NULL,
        "display_name" character varying(128) NOT NULL,
        "charge_percent" numeric(5,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_payment_gateway_fee_config" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_gateway_fee_config_provider" UNIQUE ("provider")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_config_deleted"
      ON "payment_gateway_fee_config" ("deleted")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_config_active"
      ON "payment_gateway_fee_config" ("active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_config_createdDate"
      ON "payment_gateway_fee_config" ("createdDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_gateway_fee_config_updatedDate"
      ON "payment_gateway_fee_config" ("updatedDate")
    `);

    await queryRunner.query(`
      INSERT INTO "payment_gateway_fee_config" ("provider", "display_name", "charge_percent")
      VALUES
        ('razorpay', 'Razorpay', 2.00),
        ('cashfree', 'Cashfree', 1.60)
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('payment_gateway_fee_settings', 'id'),
        GREATEST((SELECT MAX(id) FROM payment_gateway_fee_settings), 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_config_updatedDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_config_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_config_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_config_deleted"`,
    );
    await queryRunner.query(`DROP TABLE "payment_gateway_fee_config"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_settings_updatedDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_settings_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_settings_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_gateway_fee_settings_deleted"`,
    );
    await queryRunner.query(`DROP TABLE "payment_gateway_fee_settings"`);
  }
}
