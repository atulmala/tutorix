import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentCommunicationRules1777700000001
  implements MigrationInterface
{
  name = 'AddDocumentCommunicationRules1777700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "communication_rule"
      ADD COLUMN IF NOT EXISTS "on_screen_enabled" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "in_app_message" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "event" "public"."communication_event_enum" NOT NULL,
        "title" character varying(200),
        "body" text NOT NULL,
        "read_at" TIMESTAMP,
        CONSTRAINT "PK_in_app_message" PRIMARY KEY ("id"),
        CONSTRAINT "FK_in_app_message_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_deleted" ON "in_app_message" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_active" ON "in_app_message" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_createdDate" ON "in_app_message" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_updatedDate" ON "in_app_message" ("updatedDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_user_id_createdDate" ON "in_app_message" ("user_id", "createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_in_app_message_user_id_event" ON "in_app_message" ("user_id", "event")`,
    );

    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "id", "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (8, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', true, false, false, false, false, false, true, NULL),
        (9, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', true, false, true, false, false, false, false, NULL),
        (10, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
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
        (29, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', 'EMAIL', 'email/DOCUMENTS_ALL_UPLOADED.ACTOR.html'),
        (30, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', 'SMS', 'sms/DOCUMENTS_ALL_UPLOADED.ACTOR.txt'),
        (31, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', 'PUSH', 'notification/DOCUMENTS_ALL_UPLOADED.ACTOR.txt'),
        (32, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', 'WHATSAPP', 'whatsapp/DOCUMENTS_ALL_UPLOADED.ACTOR.txt'),
        (33, 'DOCUMENTS_ALL_UPLOADED', 'ACTOR', 'ON_SCREEN', 'on-screen/DOCUMENTS_ALL_UPLOADED.ACTOR.txt'),
        (34, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', 'EMAIL', 'email/DOCUMENTS_VERIFICATION_PASSED.ACTOR.html'),
        (35, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', 'SMS', 'sms/DOCUMENTS_VERIFICATION_PASSED.ACTOR.txt'),
        (36, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', 'PUSH', 'notification/DOCUMENTS_VERIFICATION_PASSED.ACTOR.txt'),
        (37, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', 'WHATSAPP', 'whatsapp/DOCUMENTS_VERIFICATION_PASSED.ACTOR.txt'),
        (38, 'DOCUMENTS_VERIFICATION_PASSED', 'ACTOR', 'ON_SCREEN', 'on-screen/DOCUMENTS_VERIFICATION_PASSED.ACTOR.txt'),
        (39, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', 'EMAIL', 'email/DOCUMENTS_VERIFICATION_FAILED.ACTOR.html'),
        (40, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', 'SMS', 'sms/DOCUMENTS_VERIFICATION_FAILED.ACTOR.txt'),
        (41, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', 'PUSH', 'notification/DOCUMENTS_VERIFICATION_FAILED.ACTOR.txt'),
        (42, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', 'WHATSAPP', 'whatsapp/DOCUMENTS_VERIFICATION_FAILED.ACTOR.txt'),
        (43, 'DOCUMENTS_VERIFICATION_FAILED', 'ACTOR', 'ON_SCREEN', 'on-screen/DOCUMENTS_VERIFICATION_FAILED.ACTOR.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('communication_template', 'id'),
        GREATEST((SELECT MAX(id) FROM communication_template), 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" IN (
        'DOCUMENTS_ALL_UPLOADED',
        'DOCUMENTS_VERIFICATION_PASSED',
        'DOCUMENTS_VERIFICATION_FAILED'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" IN (
        'DOCUMENTS_ALL_UPLOADED',
        'DOCUMENTS_VERIFICATION_PASSED',
        'DOCUMENTS_VERIFICATION_FAILED'
      )
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "in_app_message"`);
    await queryRunner.query(`
      ALTER TABLE "communication_rule" DROP COLUMN IF EXISTS "on_screen_enabled"
    `);
  }
}
