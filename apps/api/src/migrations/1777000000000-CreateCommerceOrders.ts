import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommerceOrders1777000000000 implements MigrationInterface {
  name = 'CreateCommerceOrders1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_payer_role_enum" AS ENUM ('student', 'tutor')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_status_enum" AS ENUM (
        'draft', 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_payment_method_enum" AS ENUM (
        'waived', 'gateway', 'points', 'mixed'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_source_enum" AS ENUM ('onboarding', 'cart', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_item_type_enum" AS ENUM (
        'TUTOR_REGISTRATION', 'STUDENT_REGISTRATION', 'PROFICIENCY_TEST', 'CLASS_BOOKING'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_item_reference_type_enum" AS ENUM (
        'tutor', 'student', 'tutor_offering', 'class_session', 'calendar_slot'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_order_item_fulfillment_status_enum" AS ENUM (
        'pending', 'fulfilled', 'failed'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."commerce_payment_attempt_status_enum" AS ENUM (
        'pending', 'paid', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commerce_order" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "order_number" character varying(32) NOT NULL,
        "user_id" integer NOT NULL,
        "payer_role" "public"."commerce_order_payer_role_enum" NOT NULL,
        "status" "public"."commerce_order_status_enum" NOT NULL DEFAULT 'draft',
        "subtotal_inr" integer NOT NULL DEFAULT 0,
        "discount_inr" integer NOT NULL DEFAULT 0,
        "tax_inr" integer NOT NULL DEFAULT 0,
        "points_redeemed" integer NOT NULL DEFAULT 0,
        "points_value_inr" integer NOT NULL DEFAULT 0,
        "amount_due_inr" integer NOT NULL DEFAULT 0,
        "amount_paid_inr" integer NOT NULL DEFAULT 0,
        "billing_name" character varying,
        "billing_email" character varying,
        "billing_phone" character varying,
        "billing_state_code" character varying(8),
        "payment_method" "public"."commerce_order_payment_method_enum",
        "source" "public"."commerce_order_source_enum" NOT NULL DEFAULT 'onboarding',
        "paid_at" TIMESTAMP,
        CONSTRAINT "PK_commerce_order" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_commerce_order_order_number" UNIQUE ("order_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commerce_order_item" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "order_id" integer NOT NULL,
        "item_type" "public"."commerce_order_item_type_enum" NOT NULL,
        "description" text NOT NULL,
        "quantity" smallint NOT NULL DEFAULT 1,
        "unit_rate_inr" integer NOT NULL,
        "line_subtotal_inr" integer NOT NULL,
        "discount_inr" integer NOT NULL DEFAULT 0,
        "waiver_applied" boolean NOT NULL DEFAULT false,
        "cgst_inr" integer NOT NULL DEFAULT 0,
        "sgst_inr" integer NOT NULL DEFAULT 0,
        "igst_inr" integer NOT NULL DEFAULT 0,
        "gst_rate_percent" numeric(5,2) NOT NULL DEFAULT 0,
        "reference_type" "public"."commerce_order_item_reference_type_enum" NOT NULL,
        "reference_id" integer NOT NULL,
        "fulfillment_status" "public"."commerce_order_item_fulfillment_status_enum" NOT NULL DEFAULT 'pending',
        CONSTRAINT "PK_commerce_order_item" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commerce_order_item_order" FOREIGN KEY ("order_id")
          REFERENCES "commerce_order"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commerce_payment_attempt" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "order_id" integer NOT NULL,
        "provider" "public"."platform_fee_payment_gateway_provider_enum" NOT NULL,
        "gateway_order_id" character varying NOT NULL,
        "gateway_payment_id" character varying,
        "amount_inr" integer NOT NULL,
        "status" "public"."commerce_payment_attempt_status_enum" NOT NULL DEFAULT 'pending',
        CONSTRAINT "PK_commerce_payment_attempt" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commerce_payment_attempt_order" FOREIGN KEY ("order_id")
          REFERENCES "commerce_order"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commerce_invoice" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "invoice_number" character varying(32) NOT NULL,
        "order_id" integer NOT NULL,
        "order_number" character varying(32) NOT NULL,
        "user_id" integer NOT NULL,
        "subtotal_inr" integer NOT NULL,
        "discount_inr" integer NOT NULL,
        "tax_inr" integer NOT NULL,
        "points_value_inr" integer NOT NULL DEFAULT 0,
        "amount_due_inr" integer NOT NULL,
        "amount_paid_inr" integer NOT NULL,
        "payment_method" "public"."commerce_order_payment_method_enum" NOT NULL,
        "issued_at" TIMESTAMP NOT NULL,
        "pdf_storage_key" character varying,
        CONSTRAINT "PK_commerce_invoice" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_commerce_invoice_invoice_number" UNIQUE ("invoice_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commerce_invoice_line" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "invoice_id" integer NOT NULL,
        "item_type" "public"."commerce_order_item_type_enum" NOT NULL,
        "description" text NOT NULL,
        "quantity" smallint NOT NULL DEFAULT 1,
        "unit_rate_inr" integer NOT NULL,
        "discount_inr" integer NOT NULL DEFAULT 0,
        "waiver_applied" boolean NOT NULL DEFAULT false,
        "cgst_inr" integer NOT NULL DEFAULT 0,
        "sgst_inr" integer NOT NULL DEFAULT 0,
        "igst_inr" integer NOT NULL DEFAULT 0,
        "gst_rate_percent" numeric(5,2) NOT NULL DEFAULT 0,
        "line_total_inr" integer NOT NULL,
        CONSTRAINT "PK_commerce_invoice_line" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commerce_invoice_line_invoice" FOREIGN KEY ("invoice_id")
          REFERENCES "commerce_invoice"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_order_user_id" ON "commerce_order" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_order_status" ON "commerce_order" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_order_item_order_id" ON "commerce_order_item" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_order_item_reference" ON "commerce_order_item" ("reference_type", "reference_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_payment_attempt_order_id" ON "commerce_payment_attempt" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_payment_attempt_gateway_order_id" ON "commerce_payment_attempt" ("gateway_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_invoice_order_id" ON "commerce_invoice" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_invoice_user_id" ON "commerce_invoice" ("user_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "platform_fee_payment"
      ADD COLUMN "commerce_order_id" integer
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_fee_payment_commerce_order_id" ON "platform_fee_payment" ("commerce_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_fee_payment_commerce_order_id"`);
    await queryRunner.query(`ALTER TABLE "platform_fee_payment" DROP COLUMN "commerce_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_invoice_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_invoice_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_payment_attempt_gateway_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_payment_attempt_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_order_item_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_order_item_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_order_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commerce_order_user_id"`);
    await queryRunner.query(`DROP TABLE "commerce_invoice_line"`);
    await queryRunner.query(`DROP TABLE "commerce_invoice"`);
    await queryRunner.query(`DROP TABLE "commerce_payment_attempt"`);
    await queryRunner.query(`DROP TABLE "commerce_order_item"`);
    await queryRunner.query(`DROP TABLE "commerce_order"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_payment_attempt_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_item_fulfillment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_item_reference_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_item_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commerce_order_payer_role_enum"`);
  }
}
