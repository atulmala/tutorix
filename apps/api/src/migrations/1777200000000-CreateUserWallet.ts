import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserWallet1777200000000 implements MigrationInterface {
  name = 'CreateUserWallet1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."commerce_order_payment_method_enum"
      ADD VALUE IF NOT EXISTS 'wallet'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."commerce_order_source_enum"
      ADD VALUE IF NOT EXISTS 'wallet'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."commerce_order_item_type_enum"
      ADD VALUE IF NOT EXISTS 'WALLET_TOP_UP'
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."wallet_transaction_type_enum" AS ENUM (
        'top_up_credit', 'purchase_debit'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_wallet" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "balance_inr" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_user_wallet" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_wallet_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_wallet_user_id" ON "user_wallet" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "wallet_transaction" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "wallet_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "type" "public"."wallet_transaction_type_enum" NOT NULL,
        "amount_inr" integer NOT NULL,
        "balance_after_inr" integer NOT NULL,
        "commerce_order_id" integer,
        "reference_type" character varying(32),
        "reference_id" integer,
        "description" character varying(255) NOT NULL,
        CONSTRAINT "PK_wallet_transaction" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_transaction_wallet_id" ON "wallet_transaction" ("wallet_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_transaction_user_id" ON "wallet_transaction" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_transaction_createdDate" ON "wallet_transaction" ("createdDate")
    `);

    await queryRunner.query(`
      INSERT INTO "user_wallet" ("user_id", "balance_inr")
      SELECT u.id, 0
      FROM "user" u
      LEFT JOIN "tutor" t ON t."user_id" = u.id AND t.deleted = false AND t."on_boarding_complete" = true
      LEFT JOIN "student" s ON s."user_id" = u.id AND s.deleted = false AND s."on_boarding_complete" = true
      WHERE (t.id IS NOT NULL OR s.id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM "user_wallet" w WHERE w.user_id = u.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wallet_transaction"`);
    await queryRunner.query(`DROP TABLE "user_wallet"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_transaction_type_enum"`);
  }
}
