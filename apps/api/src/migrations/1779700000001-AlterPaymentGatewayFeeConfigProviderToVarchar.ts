import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterPaymentGatewayFeeConfigProviderToVarchar1779700000001
  implements MigrationInterface
{
  name = 'AlterPaymentGatewayFeeConfigProviderToVarchar1779700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_config"
      ALTER COLUMN "provider" TYPE varchar(32)
      USING "provider"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_config"
      ALTER COLUMN "provider" TYPE "public"."platform_fee_payment_gateway_provider_enum"
      USING "provider"::"public"."platform_fee_payment_gateway_provider_enum"
    `);
  }
}
