import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRegistrationSettings1777300000000
  implements MigrationInterface
{
  name = 'CreateRegistrationSettings1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "registration_settings" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_registration_enabled" boolean NOT NULL DEFAULT true,
        "student_registration_enabled" boolean NOT NULL DEFAULT true,
        "disabled_message" character varying(500) NOT NULL DEFAULT 'Registration for this role is temporarily unavailable. Please try again later.',
        CONSTRAINT "PK_registration_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_registration_settings_deleted" ON "registration_settings" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registration_settings_active" ON "registration_settings" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registration_settings_createdDate" ON "registration_settings" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registration_settings_updatedDate" ON "registration_settings" ("updatedDate")`,
    );

    await queryRunner.query(`
      INSERT INTO "registration_settings" (
        "id",
        "tutor_registration_enabled",
        "student_registration_enabled",
        "disabled_message"
      ) VALUES (
        1,
        true,
        true,
        'Registration for this role is temporarily unavailable. Please try again later.'
      )
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('registration_settings', 'id'),
        GREATEST((SELECT MAX(id) FROM registration_settings), 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_registration_settings_updatedDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_registration_settings_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_registration_settings_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_registration_settings_deleted"`,
    );
    await queryRunner.query(`DROP TABLE "registration_settings"`);
  }
}
