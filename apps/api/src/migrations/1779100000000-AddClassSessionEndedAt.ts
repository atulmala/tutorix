import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassSessionEndedAt1779100000000 implements MigrationInterface {
  name = 'AddClassSessionEndedAt1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session"
      ADD COLUMN "ended_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session" DROP COLUMN "ended_at"
    `);
  }
}
