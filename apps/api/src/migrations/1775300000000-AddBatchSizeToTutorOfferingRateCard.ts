import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchSizeToTutorOfferingRateCard1775300000000
  implements MigrationInterface
{
  name = 'AddBatchSizeToTutorOfferingRateCard1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering_rate_card"
      ADD COLUMN "offline_batch_size" smallint NOT NULL DEFAULT 1,
      ADD COLUMN "online_batch_size" smallint NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tutor_offering_rate_card"
      DROP COLUMN "online_batch_size",
      DROP COLUMN "offline_batch_size"
    `);
  }
}
