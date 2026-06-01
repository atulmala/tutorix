import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBaseDiscountToTutorOfferingRateCard1775200000000
  implements MigrationInterface
{
  name = 'AddBaseDiscountToTutorOfferingRateCard1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering_rate_card"
      ADD COLUMN "offline_base_discount_pct" smallint NOT NULL DEFAULT 0,
      ADD COLUMN "online_base_discount_pct" smallint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering_rate_card"
      DROP COLUMN "online_base_discount_pct",
      DROP COLUMN "offline_base_discount_pct"
    `);
  }
}
