import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorOfferingPtFee1775400000000 implements MigrationInterface {
  name = 'CreateTutorOfferingPtFee1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."tutor_offering_pt_fee_payment_status_enum" AS ENUM ('waived', 'pending', 'paid')
    `);

    await queryRunner.query(`
      CREATE TABLE "tutor_offering_pt_fee" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "tutor_offering_id" integer NOT NULL,
        "list_price_inr" smallint NOT NULL DEFAULT 99,
        "amount_due_inr" smallint NOT NULL DEFAULT 0,
        "payment_status" "public"."tutor_offering_pt_fee_payment_status_enum" NOT NULL DEFAULT 'waived',
        "gateway_order_id" character varying,
        "paid_at" TIMESTAMP,
        CONSTRAINT "PK_tutor_offering_pt_fee" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tutor_offering_pt_fee_tutor_offering_id" UNIQUE ("tutor_offering_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tutor_offering_pt_fee"
      ADD CONSTRAINT "FK_tutor_offering_pt_fee_tutor_offering_id"
      FOREIGN KEY ("tutor_offering_id") REFERENCES "tutor_offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tutor_offering_pt_fee_deleted" ON "tutor_offering_pt_fee" ("deleted")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_tutor_offering_pt_fee_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "tutor_offering_pt_fee" DROP CONSTRAINT "FK_tutor_offering_pt_fee_tutor_offering_id"`,
    );
    await queryRunner.query(`DROP TABLE "tutor_offering_pt_fee"`);
    await queryRunner.query(
      `DROP TYPE "public"."tutor_offering_pt_fee_payment_status_enum"`,
    );
  }
}
