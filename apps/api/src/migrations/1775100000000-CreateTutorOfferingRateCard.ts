import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorOfferingRateCard1775100000000 implements MigrationInterface {
  name = 'CreateTutorOfferingRateCard1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tutor_offering_rate_card" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_offering_id" integer NOT NULL,
        "free_demo_offered" boolean NOT NULL DEFAULT false,
        "offline_enabled" boolean NOT NULL DEFAULT true,
        "offline_base_rate" integer,
        "offline_slab2_discount_pct" smallint,
        "offline_slab3_discount_pct" smallint,
        "online_enabled" boolean NOT NULL DEFAULT false,
        "online_base_rate" integer,
        "online_slab2_discount_pct" smallint,
        "online_slab3_discount_pct" smallint,
        CONSTRAINT "PK_tutor_offering_rate_card" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_offering_rate_card_tutor_offering_id" UNIQUE ("tutor_offering_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor_offering_rate_card"
      ADD CONSTRAINT "FK_tutor_offering_rate_card_tutor_offering_id"
      FOREIGN KEY ("tutor_offering_id") REFERENCES "tutor_offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_offering_rate_card_deleted" ON "tutor_offering_rate_card" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_offering_rate_card_tutor_offering_id" ON "tutor_offering_rate_card" ("tutor_offering_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tutor_offering_rate_card_tutor_offering_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_offering_rate_card_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_offering_rate_card" DROP CONSTRAINT "FK_tutor_offering_rate_card_tutor_offering_id"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_offering_rate_card"`);
  }
}
