import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1771507510205Migration implements MigrationInterface {
    name = 'Migration1771507510205Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor_experience" DROP CONSTRAINT "FK_tutor_experience_tutor_id"`);
        await queryRunner.query(`ALTER TABLE "document" DROP CONSTRAINT "FK_document_experience_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tutor_experience_deleted"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tutor_experience_tutor_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_document_experience_id"`);
        await queryRunner.query(`CREATE TYPE "public"."offering_medium_of_instruction_enum" AS ENUM('English', 'Hindi', 'Others')`);
        await queryRunner.query(`CREATE TABLE "offering" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "name" character varying NOT NULL, "display_name" character varying NOT NULL, "level" integer NOT NULL DEFAULT '0', "display_order" integer NOT NULL DEFAULT '99', "medium_of_instruction" "public"."offering_medium_of_instruction_enum" DEFAULT 'English', "parent_offering_id" integer, "root_offering_id" integer, CONSTRAINT "PK_d42d2720ff82f75aae518b9347c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ed4cc320fe632770ce3dab293" ON "offering" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_a754dca3313b321c151d0aaef2" ON "offering" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_d27293d0d0110b467a1f773776" ON "offering" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_ef5ef7a20dfd0219ea853270d5" ON "offering" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_f589d3dd71f8aaced6a3c6c038" ON "offering" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_804c7ed31bf6b22eaff2fc9123" ON "offering" ("level") `);
        await queryRunner.query(`CREATE INDEX "IDX_98bc10c287ac50269e900f2bad" ON "offering" ("parent_offering_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_804c7c8cbae6f703c2cc115bc7" ON "offering" ("root_offering_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_96280547a7ac52f2417d03d8e4" ON "offering" ("medium_of_instruction") `);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ALTER COLUMN "version" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ALTER COLUMN "tutor_id" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_70fb953813253a8b657dac4233" ON "tutor_experience" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_3dc5d9dcc2511260bcc742d5b8" ON "tutor_experience" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_d47ca2c7416ae56ee31f982d89" ON "tutor_experience" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_ece528391cd8151c9bb0809e94" ON "tutor_experience" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_da8a673919cb7199d95e2a8c62" ON "tutor_experience" ("m_id") `);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ADD CONSTRAINT "FK_5565fca7abd581fc4bac4fcf0fc" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document" ADD CONSTRAINT "FK_022b5480c79da14b74c894f523b" FOREIGN KEY ("experience_id") REFERENCES "tutor_experience"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offering" ADD CONSTRAINT "FK_98bc10c287ac50269e900f2bad9" FOREIGN KEY ("parent_offering_id") REFERENCES "offering"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offering" ADD CONSTRAINT "FK_804c7c8cbae6f703c2cc115bc7e" FOREIGN KEY ("root_offering_id") REFERENCES "offering"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "offering" DROP CONSTRAINT "FK_804c7c8cbae6f703c2cc115bc7e"`);
        await queryRunner.query(`ALTER TABLE "offering" DROP CONSTRAINT "FK_98bc10c287ac50269e900f2bad9"`);
        await queryRunner.query(`ALTER TABLE "document" DROP CONSTRAINT "FK_022b5480c79da14b74c894f523b"`);
        await queryRunner.query(`ALTER TABLE "tutor_experience" DROP CONSTRAINT "FK_5565fca7abd581fc4bac4fcf0fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da8a673919cb7199d95e2a8c62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ece528391cd8151c9bb0809e94"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d47ca2c7416ae56ee31f982d89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3dc5d9dcc2511260bcc742d5b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_70fb953813253a8b657dac4233"`);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ALTER COLUMN "tutor_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ALTER COLUMN "version" SET DEFAULT '1'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96280547a7ac52f2417d03d8e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_804c7c8cbae6f703c2cc115bc7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98bc10c287ac50269e900f2bad"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_804c7ed31bf6b22eaff2fc9123"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f589d3dd71f8aaced6a3c6c038"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ef5ef7a20dfd0219ea853270d5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d27293d0d0110b467a1f773776"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a754dca3313b321c151d0aaef2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ed4cc320fe632770ce3dab293"`);
        await queryRunner.query(`DROP TABLE "offering"`);
        await queryRunner.query(`DROP TYPE "public"."offering_medium_of_instruction_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_document_experience_id" ON "document" ("experience_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tutor_experience_tutor_id" ON "tutor_experience" ("tutor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tutor_experience_deleted" ON "tutor_experience" ("deleted") `);
        await queryRunner.query(`ALTER TABLE "document" ADD CONSTRAINT "FK_document_experience_id" FOREIGN KEY ("experience_id") REFERENCES "tutor_experience"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tutor_experience" ADD CONSTRAINT "FK_tutor_experience_tutor_id" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
