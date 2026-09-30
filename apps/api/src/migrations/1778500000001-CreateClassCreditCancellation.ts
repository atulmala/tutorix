import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassCreditCancellation1778500000001 implements MigrationInterface {
  name = 'CreateClassCreditCancellation1778500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "class_credit_cancellation" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "credit_id" integer NOT NULL,
        "student_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "amount_inr" integer NOT NULL,
        "refund_method" "public"."class_credit_refund_method_enum" NOT NULL,
        CONSTRAINT "PK_class_credit_cancellation" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_class_credit_cancellation_credit_id" UNIQUE ("credit_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "class_credit_cancellation"
      ADD CONSTRAINT "FK_class_credit_cancellation_credit_id"
      FOREIGN KEY ("credit_id") REFERENCES "student_class_credit"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_credit_cancellation_user_id"
      ON "class_credit_cancellation" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "class_credit_gateway_refund" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "payment_attempt_id" integer NOT NULL,
        "gateway_payment_id" character varying NOT NULL,
        "gateway_refund_id" character varying NOT NULL,
        "amount_inr" integer NOT NULL,
        CONSTRAINT "PK_class_credit_gateway_refund" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "class_credit_gateway_refund"
      ADD CONSTRAINT "FK_class_credit_gateway_refund_payment_attempt_id"
      FOREIGN KEY ("payment_attempt_id") REFERENCES "commerce_payment_attempt"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_class_credit_gateway_refund_payment_attempt_id"
      ON "class_credit_gateway_refund" ("payment_attempt_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_credit_gateway_refund"`);
    await queryRunner.query(`DROP TABLE "class_credit_cancellation"`);
  }
}
