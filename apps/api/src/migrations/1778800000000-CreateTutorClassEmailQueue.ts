import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorClassEmailQueue1778800000000 implements MigrationInterface {
  name = 'CreateTutorClassEmailQueue1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor_class_email_queue" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_user_id" integer NOT NULL,
        "tutor_name" character varying(200) NOT NULL,
        "kind" character varying(20) NOT NULL,
        "student_name" character varying(200) NOT NULL,
        "offering_label" character varying(300) NOT NULL,
        "delivery_mode" character varying(20) NOT NULL,
        "class_count" integer,
        "amount_inr" integer,
        "starts_at" TIMESTAMP WITH TIME ZONE,
        "duration_minutes" integer,
        "enrollment_id" integer,
        "source_key" character varying(200) NOT NULL,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_tutor_class_email_queue" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_email_queue_deleted" ON "tutor_class_email_queue" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_email_queue_tutor_user_id" ON "tutor_class_email_queue" ("tutor_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_email_queue_source_key" ON "tutor_class_email_queue" ("source_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_email_queue_tutor_kind_sent" ON "tutor_class_email_queue" ("tutor_user_id", "kind", "sent_at")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tutor_class_email_queue_unsent_source"
      ON "tutor_class_email_queue" ("source_key")
      WHERE "sent_at" IS NULL AND "deleted" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_tutor_class_email_queue_unsent_source"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_email_queue_tutor_kind_sent"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_email_queue_source_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_email_queue_tutor_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_email_queue_deleted"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_class_email_queue"`);
  }
}
