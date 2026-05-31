import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPanNumberToUserBankDetails1774300000000
  implements MigrationInterface
{
  name = 'AddPanNumberToUserBankDetails1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      ADD COLUMN "pan_number" character varying(10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      DROP COLUMN "pan_number"
    `);
  }
}
