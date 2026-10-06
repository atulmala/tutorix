import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhiteboardRoomUuid1779000000000 implements MigrationInterface {
  name = 'AddWhiteboardRoomUuid1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session"
      ADD COLUMN "whiteboard_room_uuid" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session" DROP COLUMN "whiteboard_room_uuid"
    `);
  }
}
