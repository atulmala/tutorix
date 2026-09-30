import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorClassChangeRules1778700000001 implements MigrationInterface {
  name = 'AddTutorClassChangeRules1778700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'CLASS_CANCELLED_BY_TUTOR', 'STUDENT', true, false, true, false, true, false, false, NULL),
        (1, false, true, 'CLASS_RESCHEDULE_REQUESTED', 'STUDENT', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'CLASS_CANCELLED_BY_TUTOR', 'STUDENT', 'EMAIL', 'email/CLASS_CANCELLED_BY_TUTOR.STUDENT.html'),
        (1, false, true, 'CLASS_CANCELLED_BY_TUTOR', 'STUDENT', 'SMS', 'sms/CLASS_CANCELLED_BY_TUTOR.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLED_BY_TUTOR', 'STUDENT', 'PUSH', 'notification/CLASS_CANCELLED_BY_TUTOR.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLED_BY_TUTOR', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_CANCELLED_BY_TUTOR.STUDENT.txt'),
        (1, false, true, 'CLASS_RESCHEDULE_REQUESTED', 'STUDENT', 'EMAIL', 'email/CLASS_RESCHEDULE_REQUESTED.STUDENT.html'),
        (1, false, true, 'CLASS_RESCHEDULE_REQUESTED', 'STUDENT', 'SMS', 'sms/CLASS_RESCHEDULE_REQUESTED.STUDENT.txt'),
        (1, false, true, 'CLASS_RESCHEDULE_REQUESTED', 'STUDENT', 'PUSH', 'notification/CLASS_RESCHEDULE_REQUESTED.STUDENT.txt'),
        (1, false, true, 'CLASS_RESCHEDULE_REQUESTED', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_RESCHEDULE_REQUESTED.STUDENT.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" IN ('CLASS_CANCELLED_BY_TUTOR', 'CLASS_RESCHEDULE_REQUESTED')
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" IN ('CLASS_CANCELLED_BY_TUTOR', 'CLASS_RESCHEDULE_REQUESTED')
    `);
  }
}
