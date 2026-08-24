import { MigrationInterface, QueryRunner } from 'typeorm';

export class DisableMobileVerificationByDefault1777600000000
  implements MigrationInterface
{
  name = 'DisableMobileVerificationByDefault1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "communication_rule"
      SET "enabled" = false,
          "updatedDate" = now()
      WHERE "event" = 'MOBILE_VERIFICATION'
        AND "audience" = 'ACTOR'
        AND "deleted" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "communication_rule"
      SET "enabled" = true,
          "updatedDate" = now()
      WHERE "event" = 'MOBILE_VERIFICATION'
        AND "audience" = 'ACTOR'
        AND "deleted" = false
    `);
  }
}
