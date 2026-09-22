import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorWeeklyUnavailability1778100000000
  implements MigrationInterface
{
  name = 'CreateTutorWeeklyUnavailability1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor_weekly_unavailability" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_id" integer NOT NULL,
        "ist_day_of_week" smallint NOT NULL,
        "start_hour" smallint NOT NULL,
        "start_minute" smallint NOT NULL,
        CONSTRAINT "PK_tutor_weekly_unavailability" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_weekly_unavailability_slot"
          UNIQUE ("tutor_id", "ist_day_of_week", "start_hour", "start_minute")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_weekly_unavailability"
      ADD CONSTRAINT "FK_tutor_weekly_unavailability_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_weekly_unavailability_tutor_id" ON "tutor_weekly_unavailability" ("tutor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_weekly_unavailability_deleted" ON "tutor_weekly_unavailability" ("deleted")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tutor_weekly_unavailability"`);
  }
}
