import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserBankDetails1775000000000 implements MigrationInterface {
  name = 'CreateUserBankDetails1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_bank_details" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "bank_name" character varying NOT NULL,
        "account_number" character varying NOT NULL,
        "ifsc_code" character varying(11) NOT NULL,
        "gst_number" character varying,
        CONSTRAINT "PK_user_bank_details" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_bank_details_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_bank_details"
      ADD CONSTRAINT "FK_user_bank_details_user_id"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_bank_details_deleted" ON "user_bank_details" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_bank_details_user_id" ON "user_bank_details" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_user_bank_details_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_bank_details_deleted"`);
    await queryRunner.query(
      `ALTER TABLE "user_bank_details" DROP CONSTRAINT "FK_user_bank_details_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_bank_details"`);
  }
}
