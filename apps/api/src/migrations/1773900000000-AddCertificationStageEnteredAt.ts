import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificationStageEnteredAt1773900000000
  implements MigrationInterface
{
  name = 'AddCertificationStageEnteredAt1773900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      ADD COLUMN "certification_stage_entered_at" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "tutor"
      SET "certification_stage_entered_at" = "updatedDate"
      WHERE "certification_stage_entered_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor"
      DROP COLUMN "certification_stage_entered_at"
    `);
  }
}
