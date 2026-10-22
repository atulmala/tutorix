import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassBookingCancellationTutorEvent1779500000000 implements MigrationInterface {
  name = 'AddClassBookingCancellationTutorEvent1779500000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'CLASS_BOOKING_CANCELLATION_TUTOR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
