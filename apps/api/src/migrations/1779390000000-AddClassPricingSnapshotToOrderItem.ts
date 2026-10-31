import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassPricingSnapshotToOrderItem1779390000000
  implements MigrationInterface
{
  name = 'AddClassPricingSnapshotToOrderItem1779390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commerce_order_item"
      ADD COLUMN IF NOT EXISTS "class_pricing_snapshot" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commerce_order_item"
      DROP COLUMN IF EXISTS "class_pricing_snapshot"
    `);
  }
}
