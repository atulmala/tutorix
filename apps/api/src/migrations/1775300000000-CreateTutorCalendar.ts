import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorCalendar1775300000000 implements MigrationInterface {
  name = 'CreateTutorCalendar1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor_calendar" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_id" integer NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration_minutes" smallint NOT NULL DEFAULT 60,
        CONSTRAINT "PK_tutor_calendar" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_calendar_tutor_starts_at" UNIQUE ("tutor_id", "starts_at")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_calendar"
      ADD CONSTRAINT "FK_tutor_calendar_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_calendar_tutor_id" ON "tutor_calendar" ("tutor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_calendar_starts_at" ON "tutor_calendar" ("starts_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_calendar_deleted" ON "tutor_calendar" ("deleted")`,
    );
    await queryRunner.query(`
      ALTER TABLE "tutor"
      ADD COLUMN "availability_configured_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tutor" DROP COLUMN "availability_configured_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_calendar_deleted"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_calendar_starts_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_calendar_tutor_id"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_calendar" DROP CONSTRAINT "FK_tutor_calendar_tutor_id"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_calendar"`);
  }
}
