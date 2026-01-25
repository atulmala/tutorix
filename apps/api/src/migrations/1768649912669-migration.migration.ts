import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768649912669Migration implements MigrationInterface {
    name = 'Migration1768649912669Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_token" DROP CONSTRAINT "FK_password_reset_token_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_deleted"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_createdDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_updatedDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_m_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_user_id"`);
        await queryRunner.query(`CREATE TYPE "public"."address_type_enum" AS ENUM('1', '2', '3', '4', '5', '6', '7')`);
        await queryRunner.query(`CREATE TABLE "address" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "type" "public"."address_type_enum" NOT NULL DEFAULT '1', "street" character varying, "subArea" character varying, "city" character varying, "state" character varying, "country" character varying, "landmark" character varying, "postalCode" integer, "fullAddress" character varying, "latitude" numeric(12,8) NOT NULL DEFAULT '0', "longitude" numeric(12,8) NOT NULL DEFAULT '0', "verified" boolean NOT NULL DEFAULT false, "primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a1e724c3b90f2287ec31f36f14" ON "address" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_5bea8a56aae4f2c71e40161c24" ON "address" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_449a0c37b4bd7d72f81411785b" ON "address" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_c1d04431d3e2d35e2571560938" ON "address" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_8e6a73dcb2e62f4aa168572381" ON "address" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_195c561c723d037d26bd60ff22" ON "address" ("postalCode") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac04b9cae62f40c876982dba9f" ON "password_reset_token" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_f759be3d4ba64b75beb578ccbe" ON "password_reset_token" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_9e92a3c07e3815e8dd4a11540d" ON "password_reset_token" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_a051bf1c093be7c345b47043db" ON "password_reset_token" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_aec4f5db57a855d06b391a7e4b" ON "password_reset_token" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7eabb22ed38459ffc24dc8b415" ON "password_reset_token" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a802f319abf4af2432d629dfe5" ON "password_reset_token" ("token_hash") `);
        await queryRunner.query(`ALTER TABLE "password_reset_token" ADD CONSTRAINT "FK_7eabb22ed38459ffc24dc8b415d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_token" DROP CONSTRAINT "FK_7eabb22ed38459ffc24dc8b415d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a802f319abf4af2432d629dfe5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7eabb22ed38459ffc24dc8b415"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aec4f5db57a855d06b391a7e4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a051bf1c093be7c345b47043db"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9e92a3c07e3815e8dd4a11540d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f759be3d4ba64b75beb578ccbe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac04b9cae62f40c876982dba9f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_195c561c723d037d26bd60ff22"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e6a73dcb2e62f4aa168572381"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c1d04431d3e2d35e2571560938"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_449a0c37b4bd7d72f81411785b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5bea8a56aae4f2c71e40161c24"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a1e724c3b90f2287ec31f36f14"`);
        await queryRunner.query(`DROP TABLE "address"`);
        await queryRunner.query(`DROP TYPE "public"."address_type_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_user_id" ON "password_reset_token" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_m_id" ON "password_reset_token" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_updatedDate" ON "password_reset_token" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_createdDate" ON "password_reset_token" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_active" ON "password_reset_token" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_deleted" ON "password_reset_token" ("deleted") `);
        await queryRunner.query(`ALTER TABLE "password_reset_token" ADD CONSTRAINT "FK_password_reset_token_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
