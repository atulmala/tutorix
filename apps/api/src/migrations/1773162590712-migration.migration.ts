import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1773162590712Migration implements MigrationInterface {
    name = 'Migration1773162590712Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tutor_offering_status_enum" AS ENUM('pending_pt', 'pt_passed', 'pt_failed')`);
        await queryRunner.query(`CREATE TABLE "tutor_offering" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "tutor_id" integer NOT NULL, "offering_id" integer NOT NULL, "proficiency_test_id" integer NOT NULL, "status" "public"."tutor_offering_status_enum" NOT NULL DEFAULT 'pending_pt', "attempts_used" smallint NOT NULL DEFAULT '0', "last_score" integer, "last_max_score" integer, "passed_at" TIMESTAMP, "last_attempt_at" TIMESTAMP, "is_initial_onboarding" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_tutor_offering_tutor_offering" UNIQUE ("tutor_id", "offering_id"), CONSTRAINT "PK_5ab0073022239d760d3d591dc71" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0438def73327a3174b0b428971" ON "tutor_offering" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb7ec5ff6dce8e1d0b85ceca62" ON "tutor_offering" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cc3945e0afa97e80a608c8ed7" ON "tutor_offering" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_b201a08f53ef66a53d3029404a" ON "tutor_offering" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_6e247715b622f5979714037c48" ON "tutor_offering" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_436ad1bb2529926bd45d20a35a" ON "tutor_offering" ("status") `);
        await queryRunner.query(`ALTER TABLE "tutor_offering" ADD CONSTRAINT "FK_40fd51cc69882606a38b8202b3b" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tutor_offering" ADD CONSTRAINT "FK_eba1698eaac5bd22063ae326769" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tutor_offering" ADD CONSTRAINT "FK_6fcc3b9a35cbd07635169ec1ca3" FOREIGN KEY ("proficiency_test_id") REFERENCES "tutor_proficiency_test"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor_offering" DROP CONSTRAINT "FK_6fcc3b9a35cbd07635169ec1ca3"`);
        await queryRunner.query(`ALTER TABLE "tutor_offering" DROP CONSTRAINT "FK_eba1698eaac5bd22063ae326769"`);
        await queryRunner.query(`ALTER TABLE "tutor_offering" DROP CONSTRAINT "FK_40fd51cc69882606a38b8202b3b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_436ad1bb2529926bd45d20a35a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e247715b622f5979714037c48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b201a08f53ef66a53d3029404a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cc3945e0afa97e80a608c8ed7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cb7ec5ff6dce8e1d0b85ceca62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0438def73327a3174b0b428971"`);
        await queryRunner.query(`DROP TABLE "tutor_offering"`);
        await queryRunner.query(`DROP TYPE "public"."tutor_offering_status_enum"`);
    }

}
