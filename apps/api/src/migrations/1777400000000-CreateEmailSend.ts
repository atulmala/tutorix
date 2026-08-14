import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailSend1777400000000 implements MigrationInterface {
  name = 'CreateEmailSend1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."email_purpose_enum" AS ENUM (
        'EMAIL_OTP',
        'CLASS_BOOKING',
        'CLASS_REMINDER',
        'PAYMENT_CREDITED',
        'WALLET_TOP_UP',
        'ADMIN_TEST',
        'OTHER'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."email_send_status_enum" AS ENUM (
        'SENT',
        'FAILED',
        'DELIVERED',
        'BOUNCED',
        'COMPLAINED',
        'REJECTED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "email_send" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer,
        "to_email" character varying NOT NULL,
        "recipient_name" character varying,
        "recipient_role" "public"."user_role_enum",
        "purpose" "public"."email_purpose_enum" NOT NULL,
        "subject" character varying(200) NOT NULL,
        "provider" character varying(16) NOT NULL,
        "ses_message_id" character varying,
        "status" "public"."email_send_status_enum" NOT NULL,
        "error_message" character varying(500),
        "sent_at" TIMESTAMP NOT NULL,
        "status_updated_at" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_email_send" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_send_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_deleted" ON "email_send" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_active" ON "email_send" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_createdDate" ON "email_send" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_updatedDate" ON "email_send" ("updatedDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_user_id_createdDate" ON "email_send" ("user_id", "createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_send_purpose_createdDate" ON "email_send" ("purpose", "createdDate")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_email_send_ses_message_id" ON "email_send" ("ses_message_id") WHERE "ses_message_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_email_send_ses_message_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_email_send_purpose_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_email_send_user_id_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_email_send_updatedDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_email_send_createdDate"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_send_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_send_deleted"`);
    await queryRunner.query(`DROP TABLE "email_send"`);
    await queryRunner.query(`DROP TYPE "public"."email_send_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."email_purpose_enum"`);
  }
}
