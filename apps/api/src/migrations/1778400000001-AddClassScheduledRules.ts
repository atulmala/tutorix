import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassScheduledRules1778400000001 implements MigrationInterface {
  name = 'AddClassScheduledRules1778400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'CLASS_SCHEDULED', 'STUDENT', true, false, true, false, true, false, false, NULL),
        (1, false, true, 'CLASS_SCHEDULED', 'TUTOR', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'CLASS_SCHEDULED', 'STUDENT', 'EMAIL', 'email/CLASS_SCHEDULED.STUDENT.html'),
        (1, false, true, 'CLASS_SCHEDULED', 'STUDENT', 'SMS', 'sms/CLASS_SCHEDULED.STUDENT.txt'),
        (1, false, true, 'CLASS_SCHEDULED', 'STUDENT', 'PUSH', 'notification/CLASS_SCHEDULED.STUDENT.txt'),
        (1, false, true, 'CLASS_SCHEDULED', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_SCHEDULED.STUDENT.txt'),
        (1, false, true, 'CLASS_SCHEDULED', 'TUTOR', 'EMAIL', 'email/CLASS_SCHEDULED.TUTOR.html'),
        (1, false, true, 'CLASS_SCHEDULED', 'TUTOR', 'SMS', 'sms/CLASS_SCHEDULED.TUTOR.txt'),
        (1, false, true, 'CLASS_SCHEDULED', 'TUTOR', 'PUSH', 'notification/CLASS_SCHEDULED.TUTOR.txt'),
        (1, false, true, 'CLASS_SCHEDULED', 'TUTOR', 'WHATSAPP', 'whatsapp/CLASS_SCHEDULED.TUTOR.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" = 'CLASS_SCHEDULED'
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" = 'CLASS_SCHEDULED'
    `);
  }
}
