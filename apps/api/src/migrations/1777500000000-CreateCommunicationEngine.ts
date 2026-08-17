import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommunicationEngine1777500000000
  implements MigrationInterface
{
  name = 'CreateCommunicationEngine1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."communication_event_enum" AS ENUM (
        'EMAIL_VERIFICATION',
        'MOBILE_VERIFICATION',
        'WALLET_TOP_UP',
        'CLASS_BOOKED',
        'CLASS_STARTING_SOON'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."communication_audience_enum" AS ENUM (
        'ACTOR',
        'STUDENT',
        'TUTOR'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."communication_channel_enum" AS ENUM (
        'EMAIL',
        'SMS',
        'PUSH',
        'WHATSAPP'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."communication_send_status_enum" AS ENUM (
        'SENT',
        'FAILED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."device_platform_enum" AS ENUM (
        'ios',
        'android'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "communication_rule" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "event" "public"."communication_event_enum" NOT NULL,
        "audience" "public"."communication_audience_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "mandatory" boolean NOT NULL DEFAULT false,
        "email_enabled" boolean NOT NULL DEFAULT false,
        "sms_enabled" boolean NOT NULL DEFAULT false,
        "push_enabled" boolean NOT NULL DEFAULT false,
        "whatsapp_enabled" boolean NOT NULL DEFAULT false,
        "offset_minutes" smallint,
        CONSTRAINT "PK_communication_rule" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_communication_rule_event_audience" UNIQUE ("event", "audience")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_rule_deleted" ON "communication_rule" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_rule_active" ON "communication_rule" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_rule_createdDate" ON "communication_rule" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_rule_updatedDate" ON "communication_rule" ("updatedDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_rule_event" ON "communication_rule" ("event")`,
    );

    await queryRunner.query(`
      CREATE TABLE "communication_template" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "event" "public"."communication_event_enum" NOT NULL,
        "audience" "public"."communication_audience_enum" NOT NULL,
        "channel" "public"."communication_channel_enum" NOT NULL,
        "template_path" character varying NOT NULL,
        CONSTRAINT "PK_communication_template" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_communication_template_event_audience_channel"
          UNIQUE ("event", "audience", "channel")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_template_deleted" ON "communication_template" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_template_active" ON "communication_template" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_template_createdDate" ON "communication_template" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_template_updatedDate" ON "communication_template" ("updatedDate")`,
    );

    await queryRunner.query(`
      CREATE TABLE "communication_send" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "event" "public"."communication_event_enum" NOT NULL,
        "audience" "public"."communication_audience_enum" NOT NULL,
        "channel" "public"."communication_channel_enum" NOT NULL,
        "user_id" integer,
        "to" character varying,
        "provider" character varying(32) NOT NULL,
        "provider_message_id" character varying,
        "status" "public"."communication_send_status_enum" NOT NULL,
        "error_message" character varying(500),
        "idempotency_key" character varying,
        CONSTRAINT "PK_communication_send" PRIMARY KEY ("id"),
        CONSTRAINT "FK_communication_send_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_deleted" ON "communication_send" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_active" ON "communication_send" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_createdDate" ON "communication_send" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_updatedDate" ON "communication_send" ("updatedDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_event_createdDate" ON "communication_send" ("event", "createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_send_user_id_createdDate" ON "communication_send" ("user_id", "createdDate")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_communication_send_idempotency_key" ON "communication_send" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_device_token" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "token" character varying(512) NOT NULL,
        "platform" "public"."device_platform_enum" NOT NULL,
        CONSTRAINT "PK_user_device_token" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_device_token_token" UNIQUE ("token"),
        CONSTRAINT "FK_user_device_token_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_device_token_deleted" ON "user_device_token" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_device_token_active" ON "user_device_token" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_device_token_createdDate" ON "user_device_token" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_device_token_updatedDate" ON "user_device_token" ("updatedDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_device_token_user_id" ON "user_device_token" ("user_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "id", "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "offset_minutes"
      ) VALUES
        (1, 'EMAIL_VERIFICATION', 'ACTOR', true, true, true, false, false, false, NULL),
        (2, 'MOBILE_VERIFICATION', 'ACTOR', true, true, false, true, false, false, NULL),
        (3, 'WALLET_TOP_UP', 'ACTOR', true, false, true, false, true, false, NULL),
        (4, 'CLASS_BOOKED', 'STUDENT', true, false, true, false, true, false, NULL),
        (5, 'CLASS_BOOKED', 'TUTOR', true, false, true, false, true, false, NULL),
        (6, 'CLASS_STARTING_SOON', 'STUDENT', true, false, false, false, true, false, 15),
        (7, 'CLASS_STARTING_SOON', 'TUTOR', true, false, false, false, true, false, 15)
    `);
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('communication_rule', 'id'),
        GREATEST((SELECT MAX(id) FROM communication_rule), 1)
      )
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "id", "event", "audience", "channel", "template_path"
      ) VALUES
        (1, 'EMAIL_VERIFICATION', 'ACTOR', 'EMAIL', 'email/EMAIL_VERIFICATION.ACTOR.html'),
        (2, 'EMAIL_VERIFICATION', 'ACTOR', 'SMS', 'sms/EMAIL_VERIFICATION.ACTOR.txt'),
        (3, 'EMAIL_VERIFICATION', 'ACTOR', 'PUSH', 'notification/EMAIL_VERIFICATION.ACTOR.txt'),
        (4, 'EMAIL_VERIFICATION', 'ACTOR', 'WHATSAPP', 'whatsapp/EMAIL_VERIFICATION.ACTOR.txt'),
        (5, 'MOBILE_VERIFICATION', 'ACTOR', 'EMAIL', 'email/MOBILE_VERIFICATION.ACTOR.html'),
        (6, 'MOBILE_VERIFICATION', 'ACTOR', 'SMS', 'sms/MOBILE_VERIFICATION.ACTOR.txt'),
        (7, 'MOBILE_VERIFICATION', 'ACTOR', 'PUSH', 'notification/MOBILE_VERIFICATION.ACTOR.txt'),
        (8, 'MOBILE_VERIFICATION', 'ACTOR', 'WHATSAPP', 'whatsapp/MOBILE_VERIFICATION.ACTOR.txt'),
        (9, 'WALLET_TOP_UP', 'ACTOR', 'EMAIL', 'email/WALLET_TOP_UP.ACTOR.html'),
        (10, 'WALLET_TOP_UP', 'ACTOR', 'SMS', 'sms/WALLET_TOP_UP.ACTOR.txt'),
        (11, 'WALLET_TOP_UP', 'ACTOR', 'PUSH', 'notification/WALLET_TOP_UP.ACTOR.txt'),
        (12, 'WALLET_TOP_UP', 'ACTOR', 'WHATSAPP', 'whatsapp/WALLET_TOP_UP.ACTOR.txt'),
        (13, 'CLASS_BOOKED', 'STUDENT', 'EMAIL', 'email/CLASS_BOOKED.STUDENT.html'),
        (14, 'CLASS_BOOKED', 'STUDENT', 'SMS', 'sms/CLASS_BOOKED.STUDENT.txt'),
        (15, 'CLASS_BOOKED', 'STUDENT', 'PUSH', 'notification/CLASS_BOOKED.STUDENT.txt'),
        (16, 'CLASS_BOOKED', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_BOOKED.STUDENT.txt'),
        (17, 'CLASS_BOOKED', 'TUTOR', 'EMAIL', 'email/CLASS_BOOKED.TUTOR.html'),
        (18, 'CLASS_BOOKED', 'TUTOR', 'SMS', 'sms/CLASS_BOOKED.TUTOR.txt'),
        (19, 'CLASS_BOOKED', 'TUTOR', 'PUSH', 'notification/CLASS_BOOKED.TUTOR.txt'),
        (20, 'CLASS_BOOKED', 'TUTOR', 'WHATSAPP', 'whatsapp/CLASS_BOOKED.TUTOR.txt'),
        (21, 'CLASS_STARTING_SOON', 'STUDENT', 'EMAIL', 'email/CLASS_STARTING_SOON.STUDENT.html'),
        (22, 'CLASS_STARTING_SOON', 'STUDENT', 'SMS', 'sms/CLASS_STARTING_SOON.STUDENT.txt'),
        (23, 'CLASS_STARTING_SOON', 'STUDENT', 'PUSH', 'notification/CLASS_STARTING_SOON.STUDENT.txt'),
        (24, 'CLASS_STARTING_SOON', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_STARTING_SOON.STUDENT.txt'),
        (25, 'CLASS_STARTING_SOON', 'TUTOR', 'EMAIL', 'email/CLASS_STARTING_SOON.TUTOR.html'),
        (26, 'CLASS_STARTING_SOON', 'TUTOR', 'SMS', 'sms/CLASS_STARTING_SOON.TUTOR.txt'),
        (27, 'CLASS_STARTING_SOON', 'TUTOR', 'PUSH', 'notification/CLASS_STARTING_SOON.TUTOR.txt'),
        (28, 'CLASS_STARTING_SOON', 'TUTOR', 'WHATSAPP', 'whatsapp/CLASS_STARTING_SOON.TUTOR.txt')
    `);
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('communication_template', 'id'),
        GREATEST((SELECT MAX(id) FROM communication_template), 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_device_token"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "communication_send"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "communication_template"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "communication_rule"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."device_platform_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."communication_send_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."communication_channel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."communication_audience_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."communication_event_enum"`,
    );
  }
}
