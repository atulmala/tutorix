import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostClassRefundClaimCommunicationRules1779600000002 implements MigrationInterface {
  name = 'AddPostClassRefundClaimCommunicationRules1779600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_RAISED', 'TUTOR', true, false, true, false, false, false, false, NULL),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_TUTOR_ALERT', 'TUTOR', true, false, false, false, false, false, true, NULL),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION', 'STUDENT', true, false, true, false, true, false, false, NULL),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION', 'TUTOR', true, false, true, false, true, false, false, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_RAISED', 'TUTOR', 'EMAIL', 'email/POST_CLASS_REFUND_CLAIM_RAISED.TUTOR.html'),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_TUTOR_ALERT', 'TUTOR', 'ON_SCREEN', 'on-screen/POST_CLASS_REFUND_CLAIM_TUTOR_ALERT.TUTOR.txt'),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION', 'STUDENT', 'EMAIL', 'email/POST_CLASS_REFUND_CLAIM_ADMIN_DECISION.STUDENT.html'),
        (1, false, true, 'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION', 'TUTOR', 'EMAIL', 'email/POST_CLASS_REFUND_CLAIM_ADMIN_DECISION.TUTOR.html')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" IN (
        'POST_CLASS_REFUND_CLAIM_RAISED',
        'POST_CLASS_REFUND_CLAIM_TUTOR_ALERT',
        'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" IN (
        'POST_CLASS_REFUND_CLAIM_RAISED',
        'POST_CLASS_REFUND_CLAIM_TUTOR_ALERT',
        'POST_CLASS_REFUND_CLAIM_ADMIN_DECISION'
      )
    `);
  }
}
