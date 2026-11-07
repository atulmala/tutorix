import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentDisbursement1779800000000 implements MigrationInterface {
  name = 'CreatePaymentDisbursement1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."payment_disbursement_kind_enum" AS ENUM(
        'student_refund_wallet',
        'student_refund_gateway',
        'tutor_bank_payout'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."payment_disbursement_status_enum" AS ENUM(
        'ready',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."payment_disbursement_source_type_enum" AS ENUM(
        'class_cancellation_refund_request',
        'tutor_payout_period'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_disbursement" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "kind" "public"."payment_disbursement_kind_enum" NOT NULL,
        "status" "public"."payment_disbursement_status_enum" NOT NULL DEFAULT 'ready',
        "payee_user_id" integer NOT NULL,
        "amount_inr" integer NOT NULL,
        "source_type" "public"."payment_disbursement_source_type_enum" NOT NULL,
        "source_id" integer NOT NULL,
        "class_cancellation_refund_request_id" integer,
        "tutor_id" integer,
        "period_start_date" date,
        "period_end_date" date,
        "calculation_snapshot_json" jsonb,
        "processed_by_user_id" integer,
        "processed_at" TIMESTAMP,
        "failure_reason" text,
        "wallet_transaction_id" integer,
        "gateway_payout_id" character varying,
        "gateway_utr" character varying,
        CONSTRAINT "PK_payment_disbursement" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_disbursement_status"
      ON "payment_disbursement" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_disbursement_payee_user_id"
      ON "payment_disbursement" ("payee_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_disbursement_refund_request_id"
      ON "payment_disbursement" ("class_cancellation_refund_request_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_disbursement_tutor_id"
      ON "payment_disbursement" ("tutor_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_payment_disbursement_refund_request_active"
      ON "payment_disbursement" ("class_cancellation_refund_request_id")
      WHERE "deleted" = false
        AND "status" <> 'cancelled'
        AND "class_cancellation_refund_request_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_payment_disbursement_tutor_period_active"
      ON "payment_disbursement" ("tutor_id", "period_start_date", "period_end_date")
      WHERE "deleted" = false
        AND "kind" = 'tutor_bank_payout'
        AND "status" <> 'cancelled'
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_disbursement"
      ADD CONSTRAINT "FK_payment_disbursement_payee_user_id"
      FOREIGN KEY ("payee_user_id") REFERENCES "user"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement"
      ADD CONSTRAINT "FK_payment_disbursement_refund_request_id"
      FOREIGN KEY ("class_cancellation_refund_request_id")
      REFERENCES "class_cancellation_refund_request"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement"
      ADD CONSTRAINT "FK_payment_disbursement_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "tutor_payout_transfer" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_id" integer NOT NULL,
        "period_start_date" date NOT NULL,
        "period_end_date" date NOT NULL,
        "amount_inr" integer NOT NULL,
        "paid_at" TIMESTAMP NOT NULL,
        "bank_account_last4" character varying(4),
        "utr_reference" character varying,
        "payment_disbursement_id" integer NOT NULL,
        "razorpay_payout_id" character varying,
        CONSTRAINT "PK_tutor_payout_transfer" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tutor_payout_transfer_tutor_id"
      ON "tutor_payout_transfer" ("tutor_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_payout_transfer"
      ADD CONSTRAINT "FK_tutor_payout_transfer_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_payout_transfer"
      ADD CONSTRAINT "FK_tutor_payout_transfer_disbursement_id"
      FOREIGN KEY ("payment_disbursement_id") REFERENCES "payment_disbursement"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      ADD COLUMN "razorpay_contact_id" character varying,
      ADD COLUMN "razorpay_fund_account_id" character varying
    `);

    await queryRunner.query(`
      INSERT INTO "payment_disbursement" (
        "kind",
        "status",
        "payee_user_id",
        "amount_inr",
        "source_type",
        "source_id",
        "class_cancellation_refund_request_id"
      )
      SELECT
        CASE
          WHEN r.refund_method = 'wallet' THEN 'student_refund_wallet'::payment_disbursement_kind_enum
          ELSE 'student_refund_gateway'::payment_disbursement_kind_enum
        END,
        'ready'::payment_disbursement_status_enum,
        s.user_id,
        r.amount_inr,
        'class_cancellation_refund_request'::payment_disbursement_source_type_enum,
        r.id,
        r.id
      FROM "class_cancellation_refund_request" r
      INNER JOIN "student" s ON s.id = r.student_id
      WHERE r.deleted = false
        AND r.ai_status = 'approved'
        AND r.payout_status = 'pending'
        AND r.amount_inr > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      DROP COLUMN "razorpay_fund_account_id",
      DROP COLUMN "razorpay_contact_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_payout_transfer" DROP CONSTRAINT "FK_tutor_payout_transfer_disbursement_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_payout_transfer" DROP CONSTRAINT "FK_tutor_payout_transfer_tutor_id"
    `);
    await queryRunner.query(`DROP TABLE "tutor_payout_transfer"`);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement" DROP CONSTRAINT "FK_payment_disbursement_tutor_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement" DROP CONSTRAINT "FK_payment_disbursement_refund_request_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_disbursement" DROP CONSTRAINT "FK_payment_disbursement_payee_user_id"
    `);
    await queryRunner.query(`DROP TABLE "payment_disbursement"`);
    await queryRunner.query(`DROP TYPE "public"."payment_disbursement_source_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_disbursement_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_disbursement_kind_enum"`);
  }
}
