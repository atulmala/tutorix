import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDemoClassCredit1778600000000 implements MigrationInterface {
  name = 'AddDemoClassCredit1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD COLUMN "is_demo" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      DROP COLUMN "is_demo"
    `);
  }
}
