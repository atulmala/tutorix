import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassBookingCancellationTutorRules1779500000001 implements MigrationInterface {
  name = 'AddClassBookingCancellationTutorRules1779500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'CLASS_BOOKING_CANCELLATION_TUTOR', 'TUTOR', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'CLASS_BOOKING_CANCELLATION_TUTOR', 'TUTOR', 'EMAIL', 'email/CLASS_BOOKING_CANCELLATION_TUTOR.TUTOR.html'),
        (1, false, true, 'CLASS_BOOKING_CANCELLATION_TUTOR', 'TUTOR', 'SMS', 'sms/CLASS_BOOKING_CANCELLATION_TUTOR.TUTOR.txt'),
        (1, false, true, 'CLASS_BOOKING_CANCELLATION_TUTOR', 'TUTOR', 'PUSH', 'notification/CLASS_BOOKING_CANCELLATION_TUTOR.TUTOR.txt'),
        (1, false, true, 'CLASS_BOOKING_CANCELLATION_TUTOR', 'TUTOR', 'WHATSAPP', 'whatsapp/CLASS_BOOKING_CANCELLATION_TUTOR.TUTOR.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" = 'CLASS_BOOKING_CANCELLATION_TUTOR'
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" = 'CLASS_BOOKING_CANCELLATION_TUTOR'
    `);
  }
}
