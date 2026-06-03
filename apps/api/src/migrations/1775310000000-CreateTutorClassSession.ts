import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorClassSession1775310000000 implements MigrationInterface {
  name = 'CreateTutorClassSession1775310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_class_session_delivery_mode_enum" AS ENUM ('offline', 'online')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_class_session_status_enum" AS ENUM ('open', 'full', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_class_session_enrollment_status_enum" AS ENUM ('confirmed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "tutor_class_session" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_calendar_id" integer NOT NULL,
        "tutor_offering_id" integer NOT NULL,
        "delivery_mode" "public"."tutor_class_session_delivery_mode_enum" NOT NULL,
        "batch_size" smallint NOT NULL,
        "status" "public"."tutor_class_session_status_enum" NOT NULL DEFAULT 'open',
        CONSTRAINT "PK_tutor_class_session" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_class_session_tutor_calendar_id" UNIQUE ("tutor_calendar_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session"
      ADD CONSTRAINT "FK_tutor_class_session_tutor_calendar_id"
      FOREIGN KEY ("tutor_calendar_id") REFERENCES "tutor_calendar"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session"
      ADD CONSTRAINT "FK_tutor_class_session_tutor_offering_id"
      FOREIGN KEY ("tutor_offering_id") REFERENCES "tutor_offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_deleted" ON "tutor_class_session" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_tutor_offering_id" ON "tutor_class_session" ("tutor_offering_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_status" ON "tutor_class_session" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tutor_class_session_enrollment" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "session_id" integer NOT NULL,
        "student_id" integer NOT NULL,
        "status" "public"."tutor_class_session_enrollment_status_enum" NOT NULL DEFAULT 'confirmed',
        CONSTRAINT "PK_tutor_class_session_enrollment" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_class_session_enrollment_session_student" UNIQUE ("session_id", "student_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_class_session_enrollment"
      ADD CONSTRAINT "FK_tutor_class_session_enrollment_session_id"
      FOREIGN KEY ("session_id") REFERENCES "tutor_class_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_enrollment_deleted" ON "tutor_class_session_enrollment" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_enrollment_session_id" ON "tutor_class_session_enrollment" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_enrollment_student_id" ON "tutor_class_session_enrollment" ("student_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_class_session_enrollment_status" ON "tutor_class_session_enrollment" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_session_enrollment_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_session_enrollment_student_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_session_enrollment_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_session_enrollment_deleted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tutor_class_session_enrollment" DROP CONSTRAINT "FK_tutor_class_session_enrollment_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_class_session_enrollment"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_class_session_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_class_session_tutor_offering_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_class_session_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_class_session" DROP CONSTRAINT "FK_tutor_class_session_tutor_offering_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tutor_class_session" DROP CONSTRAINT "FK_tutor_class_session_tutor_calendar_id"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_class_session"`);

    await queryRunner.query(`DROP TYPE "public"."tutor_class_session_enrollment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tutor_class_session_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tutor_class_session_delivery_mode_enum"`);
  }
}
