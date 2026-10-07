import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnlineClassPresence1779200000000 implements MigrationInterface {
  name = 'CreateOnlineClassPresence1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "online_class_presence" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "join_notice_id" character varying,
        "leave_notice_id" character varying,
        "session_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "joined_at" TIMESTAMP,
        "left_at" TIMESTAMP,
        "duration_seconds" integer,
        "leave_reason" smallint,
        CONSTRAINT "PK_online_class_presence" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_online_class_presence_join_notice_id" ON "online_class_presence" ("join_notice_id") WHERE "join_notice_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_online_class_presence_leave_notice_id" ON "online_class_presence" ("leave_notice_id") WHERE "leave_notice_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_online_class_presence_session_id" ON "online_class_presence" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_online_class_presence_user_id" ON "online_class_presence" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_online_class_presence_deleted" ON "online_class_presence" ("deleted")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "online_class_presence"`);
  }
}
