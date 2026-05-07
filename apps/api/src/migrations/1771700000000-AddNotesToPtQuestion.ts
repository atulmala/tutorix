import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds notes column to pt_question (text, default blank).
 */
export class AddNotesToPtQuestion1771700000000 implements MigrationInterface {
  name = 'AddNotesToPtQuestion1771700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pt_question"
      ADD COLUMN "notes" text NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pt_question" DROP COLUMN "notes"
    `);
  }
}
