import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAttemptSettlementFields1777100000000
  implements MigrationInterface
{
  name = 'AddPaymentAttemptSettlementFields1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "commerce_payment_attempt"
      ADD COLUMN "gateway_settlement_id" character varying,
      ADD COLUMN "settlement_utr" character varying,
      ADD COLUMN "settled_at" TIMESTAMP
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_commerce_payment_attempt_settlement_pending"
      ON "commerce_payment_attempt" ("status", "provider")
      WHERE "deleted" = false
        AND "gateway_payment_id" IS NOT NULL
        AND "gateway_settlement_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commerce_payment_attempt_settlement_pending"`,
    );
    await queryRunner.query(`
      ALTER TABLE "commerce_payment_attempt"
      DROP COLUMN "settled_at",
      DROP COLUMN "settlement_utr",
      DROP COLUMN "gateway_settlement_id"
    `);
  }
}
