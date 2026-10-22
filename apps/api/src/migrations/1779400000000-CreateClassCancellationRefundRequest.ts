import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassCancellationRefundRequest1779400000000 implements MigrationInterface {
  name = 'CreateClassCancellationRefundRequest1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."class_cancellation_refund_initiated_by_enum" AS ENUM('student', 'tutor')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."class_cancellation_refund_payout_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."class_cancellation_refund_ai_status_enum" AS ENUM('pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "class_cancellation_refund_request" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "initiated_by" "public"."class_cancellation_refund_initiated_by_enum" NOT NULL,
        "student_id" integer NOT NULL,
        "tutor_id" integer,
        "tutor_offering_id" integer,
        "order_item_id" integer,
        "order_id" integer,
        "class_count" integer NOT NULL,
        "amount_inr" integer NOT NULL,
        "refund_method" "public"."class_credit_refund_method_enum" NOT NULL,
        "payout_status" "public"."class_cancellation_refund_payout_status_enum" NOT NULL DEFAULT 'pending',
        "refund_breakdown_json" jsonb,
        "initiated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "initiated_by_user_id" integer NOT NULL,
        "processed_at" TIMESTAMP,
        "processed_by_user_id" integer,
        "wallet_transaction_id" integer,
        "failure_reason" text,
        "ai_status" "public"."class_cancellation_refund_ai_status_enum" NOT NULL DEFAULT 'pending',
        "ai_rejection_reason" text,
        "ai_summary" text,
        "ai_confidence" double precision,
        "model_id" character varying(128),
        "batch_job_run_id" integer,
        "ai_analyzed_at" TIMESTAMP,
        "ai_checks_json" jsonb,
        CONSTRAINT "PK_class_cancellation_refund_request" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_class_cancellation_refund_request_student_id"
      ON "class_cancellation_refund_request" ("student_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_cancellation_refund_request_tutor_id"
      ON "class_cancellation_refund_request" ("tutor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_cancellation_refund_request_payout_status"
      ON "class_cancellation_refund_request" ("payout_status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_cancellation_refund_request_ai_status"
      ON "class_cancellation_refund_request" ("ai_status")
    `);

    await queryRunner.query(`
      ALTER TABLE "class_cancellation_refund_request"
      ADD CONSTRAINT "FK_class_cancellation_refund_request_student_id"
      FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "class_cancellation_refund_request"
      ADD CONSTRAINT "FK_class_cancellation_refund_request_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "class_cancellation_refund_request"
      ADD CONSTRAINT "FK_class_cancellation_refund_request_batch_job_run_id"
      FOREIGN KEY ("batch_job_run_id") REFERENCES "batch_job_run"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "class_credit_cancellation"
      ADD COLUMN "refund_request_id" integer
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_credit_cancellation_refund_request_id"
      ON "class_credit_cancellation" ("refund_request_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "class_credit_cancellation"
      ADD CONSTRAINT "FK_class_credit_cancellation_refund_request_id"
      FOREIGN KEY ("refund_request_id") REFERENCES "class_cancellation_refund_request"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "class_credit_gateway_refund"
      ADD COLUMN "refund_request_id" integer
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_credit_gateway_refund_refund_request_id"
      ON "class_credit_gateway_refund" ("refund_request_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "class_credit_gateway_refund"
      ADD CONSTRAINT "FK_class_credit_gateway_refund_refund_request_id"
      FOREIGN KEY ("refund_request_id") REFERENCES "class_cancellation_refund_request"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "class_credit_gateway_refund" DROP CONSTRAINT "FK_class_credit_gateway_refund_refund_request_id"
    `);
    await queryRunner.query(`DROP INDEX "IDX_class_credit_gateway_refund_refund_request_id"`);
    await queryRunner.query(`
      ALTER TABLE "class_credit_gateway_refund" DROP COLUMN "refund_request_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "class_credit_cancellation" DROP CONSTRAINT "FK_class_credit_cancellation_refund_request_id"
    `);
    await queryRunner.query(`DROP INDEX "IDX_class_credit_cancellation_refund_request_id"`);
    await queryRunner.query(`
      ALTER TABLE "class_credit_cancellation" DROP COLUMN "refund_request_id"
    `);

    await queryRunner.query(`DROP TABLE "class_cancellation_refund_request"`);
    await queryRunner.query(`DROP TYPE "public"."class_cancellation_refund_ai_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."class_cancellation_refund_payout_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."class_cancellation_refund_initiated_by_enum"`);
  }
}
