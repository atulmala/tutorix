import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostClassRefundClaim1779600000000 implements MigrationInterface {
  name = 'CreatePostClassRefundClaim1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."post_class_refund_claim_reason_enum" AS ENUM (
        'class_did_not_take_place',
        'technical_issue',
        'not_satisfied'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."post_class_refund_claim_method_enum" AS ENUM (
        'gateway',
        'wallet',
        'class_credit'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."post_class_refund_tutor_response_status_enum" AS ENUM (
        'pending',
        'accepted',
        'declined',
        'deemed_accepted'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."post_class_refund_admin_status_enum" AS ENUM (
        'pending',
        'approved',
        'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "post_class_refund_claim" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "enrollment_id" integer NOT NULL,
        "class_credit_id" integer NOT NULL,
        "student_id" integer NOT NULL,
        "tutor_id" integer NOT NULL,
        "tutor_offering_id" integer NOT NULL,
        "order_item_id" integer NOT NULL,
        "class_starts_at" TIMESTAMP NOT NULL,
        "duration_minutes" integer NOT NULL,
        "delivery_mode" "public"."tutor_class_session_delivery_mode_enum" NOT NULL,
        "offering_label" character varying(512) NOT NULL,
        "reason" "public"."post_class_refund_claim_reason_enum" NOT NULL,
        "refund_method" "public"."post_class_refund_claim_method_enum" NOT NULL,
        "preview_amount_inr" integer NOT NULL DEFAULT 0,
        "refund_breakdown_json" jsonb,
        "tutor_response_status" "public"."post_class_refund_tutor_response_status_enum" NOT NULL DEFAULT 'pending',
        "tutor_decline_comment" text,
        "tutor_responded_at" TIMESTAMP,
        "admin_status" "public"."post_class_refund_admin_status_enum" NOT NULL DEFAULT 'pending',
        "admin_comment" text,
        "processed_by_user_id" integer,
        "processed_at" TIMESTAMP,
        "cancellation_refund_request_id" integer,
        "fulfilled_at" TIMESTAMP,
        "tutor_response_deadline_at" TIMESTAMP NOT NULL,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT now(),
        "submitted_by_user_id" integer NOT NULL,
        CONSTRAINT "PK_post_class_refund_claim" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_post_class_refund_claim_enrollment_active"
      ON "post_class_refund_claim" ("enrollment_id")
      WHERE "deleted" = false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_class_refund_claim_student_id"
      ON "post_class_refund_claim" ("student_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_class_refund_claim_tutor_id"
      ON "post_class_refund_claim" ("tutor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_post_class_refund_claim_tutor_response"
      ON "post_class_refund_claim" ("tutor_response_status", "tutor_response_deadline_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "post_class_refund_claim"
      ADD CONSTRAINT "FK_post_class_refund_claim_student_id"
      FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "post_class_refund_claim"
      ADD CONSTRAINT "FK_post_class_refund_claim_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "post_class_refund_claim"
      ADD CONSTRAINT "FK_post_class_refund_claim_credit_id"
      FOREIGN KEY ("class_credit_id") REFERENCES "student_class_credit"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "post_class_refund_claim"
      ADD CONSTRAINT "FK_post_class_refund_claim_cancellation_refund"
      FOREIGN KEY ("cancellation_refund_request_id")
      REFERENCES "class_cancellation_refund_request"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "post_class_refund_claim"`);
    await queryRunner.query(`DROP TYPE "public"."post_class_refund_admin_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."post_class_refund_tutor_response_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."post_class_refund_claim_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."post_class_refund_claim_reason_enum"`);
  }
}
