import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassPricingSettings1779300000000
  implements MigrationInterface
{
  name = 'CreateClassPricingSettings1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "class_pricing_settings" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "minimum_online_price_per_class_inr" smallint NOT NULL DEFAULT 0,
        "minimum_offline_price_per_class_inr" smallint NOT NULL DEFAULT 0,
        "commission_slab_threshold_inr" smallint NOT NULL DEFAULT 600,
        "tutor_commission_percent_up_to_slab" smallint NOT NULL DEFAULT 0,
        "tutor_commission_percent_above_slab" smallint NOT NULL DEFAULT 0,
        "platform_fee_per_participant_inr" smallint NOT NULL DEFAULT 0,
        CONSTRAINT "PK_class_pricing_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_class_pricing_settings_deleted" ON "class_pricing_settings" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_pricing_settings_active" ON "class_pricing_settings" ("active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_pricing_settings_createdDate" ON "class_pricing_settings" ("createdDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_pricing_settings_updatedDate" ON "class_pricing_settings" ("updatedDate")`,
    );

    await queryRunner.query(`
      INSERT INTO "class_pricing_settings" (
        "id",
        "minimum_online_price_per_class_inr",
        "minimum_offline_price_per_class_inr",
        "commission_slab_threshold_inr",
        "tutor_commission_percent_up_to_slab",
        "tutor_commission_percent_above_slab",
        "platform_fee_per_participant_inr"
      ) VALUES (1, 0, 0, 600, 0, 0, 0)
    `);

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('class_pricing_settings', 'id'),
        GREATEST((SELECT MAX(id) FROM class_pricing_settings), 1)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_class_pricing_settings_updatedDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_class_pricing_settings_createdDate"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_class_pricing_settings_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_class_pricing_settings_deleted"`,
    );
    await queryRunner.query(`DROP TABLE "class_pricing_settings"`);
  }
}
