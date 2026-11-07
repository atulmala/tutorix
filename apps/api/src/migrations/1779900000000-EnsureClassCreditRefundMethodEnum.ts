import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline drift or DB_SYNCHRONIZE can record AddClassRefundWalletType without
 * creating `class_credit_refund_method_enum`, or use TypeORM's auto-named
 * `class_credit_cancellation_refund_method_enum` on class_credit_cancellation.
 * Later migrations (refund request, disbursement) require the canonical type.
 */
export class EnsureClassCreditRefundMethodEnum1779900000000
  implements MigrationInterface
{
  name = 'EnsureClassCreditRefundMethodEnum1779900000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."class_credit_refund_method_enum" AS ENUM ('wallet', 'gateway');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        col_udt text;
      BEGIN
        SELECT c.udt_name
        INTO col_udt
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'class_credit_cancellation'
          AND c.column_name = 'refund_method';

        IF col_udt = 'class_credit_cancellation_refund_method_enum' THEN
          ALTER TABLE "class_credit_cancellation"
            ALTER COLUMN "refund_method" TYPE "public"."class_credit_refund_method_enum"
            USING "refund_method"::text::"public"."class_credit_refund_method_enum";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
