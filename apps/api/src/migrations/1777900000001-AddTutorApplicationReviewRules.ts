import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorApplicationReviewRules1777900000001
  implements MigrationInterface
{
  name = 'AddTutorApplicationReviewRules1777900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "version", "deleted", "active",
        "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', true, false, false, false, false, false, true, NULL)
      ON CONFLICT ("event", "audience") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "communication_template" (
        "version", "deleted", "active",
        "event", "audience", "channel", "template_path"
      ) VALUES
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', 'EMAIL', 'email/TUTOR_APPLICATION_REVIEW.ACTOR.html'),
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', 'SMS', 'sms/TUTOR_APPLICATION_REVIEW.ACTOR.txt'),
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', 'PUSH', 'notification/TUTOR_APPLICATION_REVIEW.ACTOR.txt'),
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', 'WHATSAPP', 'whatsapp/TUTOR_APPLICATION_REVIEW.ACTOR.txt'),
        (1, false, true, 'TUTOR_APPLICATION_REVIEW', 'ACTOR', 'ON_SCREEN', 'on-screen/TUTOR_APPLICATION_REVIEW.ACTOR.txt')
      ON CONFLICT ("event", "audience", "channel") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "communication_template"
      WHERE "event" = 'TUTOR_APPLICATION_REVIEW'
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" = 'TUTOR_APPLICATION_REVIEW'
    `);
  }
}
