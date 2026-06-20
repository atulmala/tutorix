import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePlatformFeePromoMessages1776000000003
  implements MigrationInterface
{
  name = 'UpdatePlatformFeePromoMessages1776000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_fee_config"
      SET "promo_message" = 'Registration fee is not being charged for a limited time. Tap Continue to proceed.'
      WHERE "code" = 'TUTOR_REGISTRATION'
        AND "promo_message" LIKE '%₹999%'
    `);

    await queryRunner.query(`
      UPDATE "platform_fee_config"
      SET "promo_message" = 'Proficiency test fee is not being charged for a limited time.'
      WHERE "code" = 'PROFICIENCY_TEST'
        AND "promo_message" LIKE '%not being charged for a limited time%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_fee_config"
      SET "promo_message" = 'The one-time registration fee of ₹999 is not being charged for a limited time. Tap Continue to proceed.'
      WHERE "code" = 'TUTOR_REGISTRATION'
    `);

    await queryRunner.query(`
      UPDATE "platform_fee_config"
      SET "promo_message" = 'The one-time student registration fee is not being charged for a limited time. Tap Continue to proceed.'
      WHERE "code" = 'STUDENT_REGISTRATION'
    `);
  }
}
