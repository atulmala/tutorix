import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDemoFlagToTutorClassEmailQueue1778900000000
  implements MigrationInterface
{
  name = 'AddDemoFlagToTutorClassEmailQueue1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_email_queue"
      ADD COLUMN "is_demo" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_email_queue"
      DROP COLUMN "is_demo"
    `);
  }
}
