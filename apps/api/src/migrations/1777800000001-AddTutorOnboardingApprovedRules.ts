import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorOnboardingApprovedRules1777800000001
  implements MigrationInterface
{
  name = 'AddTutorOnboardingApprovedRules1777800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "communication_rule" (
        "id", "event", "audience", "enabled", "mandatory",
        "email_enabled", "sms_enabled", "push_enabled", "whatsapp_enabled",
        "on_screen_enabled", "offset_minutes"
      ) VALUES
        (11, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', true, false, true, false, false, false, true, NULL)
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
        (44, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', 'EMAIL', 'email/TUTOR_ONBOARDING_APPROVED.ACTOR.html'),
        (45, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', 'SMS', 'sms/TUTOR_ONBOARDING_APPROVED.ACTOR.txt'),
        (46, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', 'PUSH', 'notification/TUTOR_ONBOARDING_APPROVED.ACTOR.txt'),
        (47, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', 'WHATSAPP', 'whatsapp/TUTOR_ONBOARDING_APPROVED.ACTOR.txt'),
        (48, 'TUTOR_ONBOARDING_APPROVED', 'ACTOR', 'ON_SCREEN', 'on-screen/TUTOR_ONBOARDING_APPROVED.ACTOR.txt')
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
      WHERE "event" = 'TUTOR_ONBOARDING_APPROVED'
    `);
    await queryRunner.query(`
      DELETE FROM "communication_rule"
      WHERE "event" = 'TUTOR_ONBOARDING_APPROVED'
    `);
  }
}
