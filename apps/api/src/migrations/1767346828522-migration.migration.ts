import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1767346828522Migration implements MigrationInterface {
    name = 'Migration1767346828522Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."otp_purpose_enum" AS ENUM('EMAIL_VERIFICATION', 'MOBILE_VERIFICATION', 'WHATSAPP_VERIFICATION', 'PASSWORD_RESET', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "otp" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "user_id" integer NOT NULL, "purpose" "public"."otp_purpose_enum" NOT NULL, "otp" character varying(4) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_32556d9d7b22031d7d0e1fd6723" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d4a8718a2b1eda7cf195b3ad35" ON "otp" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_64b403c3fa2dfd627ffbe9793e" ON "otp" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e036bc0f2d9e62dea35063730" ON "otp" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_27fe34dafb9a21712f95898352" ON "otp" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a3db9f6de3016e42708cd7f19" ON "otp" ("m_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc8bb911647dd3571df8e6b710" ON "otp" ("user_id", "purpose") `);
        await queryRunner.query(`ALTER TABLE "otp" ADD CONSTRAINT "FK_258d028d322ea3b856bf9f12f25" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp" DROP CONSTRAINT "FK_258d028d322ea3b856bf9f12f25"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc8bb911647dd3571df8e6b710"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a3db9f6de3016e42708cd7f19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_27fe34dafb9a21712f95898352"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e036bc0f2d9e62dea35063730"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64b403c3fa2dfd627ffbe9793e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d4a8718a2b1eda7cf195b3ad35"`);
        await queryRunner.query(`DROP TABLE "otp"`);
        await queryRunner.query(`DROP TYPE "public"."otp_purpose_enum"`);
    }

}
