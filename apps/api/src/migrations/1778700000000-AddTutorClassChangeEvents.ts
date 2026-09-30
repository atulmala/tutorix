import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorClassChangeEvents1778700000000 implements MigrationInterface {
  name = 'AddTutorClassChangeEvents1778700000000';
  // ADD VALUE cannot be used in the same transaction that later inserts those labels.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'CLASS_CANCELLED_BY_TUTOR'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'CLASS_RESCHEDULE_REQUESTED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
