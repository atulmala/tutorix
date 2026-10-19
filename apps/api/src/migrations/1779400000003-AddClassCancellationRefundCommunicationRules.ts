import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassCancellationRefundCommunicationRules1779400000003 implements MigrationInterface {
  name = 'AddClassCancellationRefundCommunicationRules1779400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'CLASS_CANCELLATION_REFUND_INITIATED', 'STUDENT', true, false, true, false, true, false, false, NULL),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_COMPLETED', 'STUDENT', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'CLASS_CANCELLATION_REFUND_INITIATED', 'STUDENT', 'EMAIL', 'email/CLASS_CANCELLATION_REFUND_INITIATED.STUDENT.html'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_INITIATED', 'STUDENT', 'SMS', 'sms/CLASS_CANCELLATION_REFUND_INITIATED.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_INITIATED', 'STUDENT', 'PUSH', 'notification/CLASS_CANCELLATION_REFUND_INITIATED.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_INITIATED', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_CANCELLATION_REFUND_INITIATED.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_COMPLETED', 'STUDENT', 'EMAIL', 'email/CLASS_CANCELLATION_REFUND_COMPLETED.STUDENT.html'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_COMPLETED', 'STUDENT', 'SMS', 'sms/CLASS_CANCELLATION_REFUND_COMPLETED.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_COMPLETED', 'STUDENT', 'PUSH', 'notification/CLASS_CANCELLATION_REFUND_COMPLETED.STUDENT.txt'),
        (1, false, true, 'CLASS_CANCELLATION_REFUND_COMPLETED', 'STUDENT', 'WHATSAPP', 'whatsapp/CLASS_CANCELLATION_REFUND_COMPLETED.STUDENT.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" IN ('CLASS_CANCELLATION_REFUND_INITIATED', 'CLASS_CANCELLATION_REFUND_COMPLETED')
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" IN ('CLASS_CANCELLATION_REFUND_INITIATED', 'CLASS_CANCELLATION_REFUND_COMPLETED')
    `);
  }
}
