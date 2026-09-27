import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogOfferingIdToCartAndCredit1778300000000
  implements MigrationInterface
{
  name = 'AddCatalogOfferingIdToCartAndCredit1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_cart_item"
      ADD COLUMN "catalog_offering_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD COLUMN "catalog_offering_id" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      DROP COLUMN "catalog_offering_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_cart_item"
      DROP COLUMN "catalog_offering_id"
    `);
  }
}
