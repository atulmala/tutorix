import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1766643760202 implements MigrationInterface {
    name = 'Migration1766643760202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "example" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_608dd5fd6f0783062b07346ed1c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tutor" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "regFeePaid" boolean NOT NULL DEFAULT false, "regFeeAmount" numeric(8,2) NOT NULL DEFAULT '0', "regFeeAmountToBePaid" numeric(8,2) NOT NULL DEFAULT '999', "regFeeDate" TIMESTAMP, CONSTRAINT "PK_984f6d98173bd54eb367e727491" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eb748f40e116850ddedebbeb9f" ON "tutor" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_20880cadbf30fd1d0ec3de79e0" ON "tutor" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_7e8c005dc3a962099ff0395ef0" ON "tutor" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a2f413c62bdc296d092dfd242" ON "tutor" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_98539dbc5e9b3ff7f2de73e712" ON "tutor" ("m_id") `);
        await queryRunner.query(`CREATE TABLE "refresh_token" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, "revokedAt" TIMESTAMP, "deviceInfo" character varying, "ipAddress" character varying, "userId" integer NOT NULL, CONSTRAINT "UQ_c31d0a2f38e6e99110df62ab0af" UNIQUE ("token"), CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9807a3949a9c949bc6d78653b5" ON "refresh_token" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_b76d50d120eefffc825d1c72e7" ON "refresh_token" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_71d0efdd90eae42142083ffdf2" ON "refresh_token" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc153f1cc3ed6f624d107124a4" ON "refresh_token" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_ada9fdc0edae577e75ffdab85b" ON "refresh_token" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c31d0a2f38e6e99110df62ab0a" ON "refresh_token" ("token") `);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('TUTOR', 'STUDENT', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "mobile" character varying, "email" character varying, "password" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'STUDENT', "firstName" character varying, "lastName" character varying, "profilePicture" character varying, "isEmailVerified" boolean NOT NULL DEFAULT false, "isMobileVerified" boolean NOT NULL DEFAULT false, "lastLoginAt" TIMESTAMP, CONSTRAINT "UQ_29fd51e9cf9241d022c5a4e02e6" UNIQUE ("mobile"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b2a33d7f394763e171ef11acc5" ON "user" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_843f46779f60b45032874be95b" ON "user" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_ba08af85fb92a028b0b636c021" ON "user" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_634c2f352b0250709ec24ace06" ON "user" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2e957cf83f02d5fbf6bf9f364" ON "user" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_29fd51e9cf9241d022c5a4e02e" ON "user" ("mobile") `);
        await queryRunner.query(`CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `);
        await queryRunner.query(`ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29fd51e9cf9241d022c5a4e02e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2e957cf83f02d5fbf6bf9f364"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_634c2f352b0250709ec24ace06"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba08af85fb92a028b0b636c021"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_843f46779f60b45032874be95b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2a33d7f394763e171ef11acc5"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c31d0a2f38e6e99110df62ab0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ada9fdc0edae577e75ffdab85b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc153f1cc3ed6f624d107124a4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71d0efdd90eae42142083ffdf2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b76d50d120eefffc825d1c72e7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9807a3949a9c949bc6d78653b5"`);
        await queryRunner.query(`DROP TABLE "refresh_token"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98539dbc5e9b3ff7f2de73e712"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a2f413c62bdc296d092dfd242"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e8c005dc3a962099ff0395ef0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20880cadbf30fd1d0ec3de79e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb748f40e116850ddedebbeb9f"`);
        await queryRunner.query(`DROP TABLE "tutor"`);
        await queryRunner.query(`DROP TABLE "example"`);
    }

}
