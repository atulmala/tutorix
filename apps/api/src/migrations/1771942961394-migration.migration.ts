import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1771942961394Migration implements MigrationInterface {
    name = 'Migration1771942961394Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tutor_proficiency_test" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "name" character varying NOT NULL, "time" integer NOT NULL DEFAULT '0', "score" integer NOT NULL DEFAULT '0', "passPercentage" integer NOT NULL DEFAULT '65', CONSTRAINT "PK_92767a00b299d64670bf89ad241" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c1357b46faa3b84ac285280632" ON "tutor_proficiency_test" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_9bccbc8e6b9beb354edc8bdea4" ON "tutor_proficiency_test" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_9871a0fb0c6a3fea719675db54" ON "tutor_proficiency_test" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_8637b2ade4465a4c9f2ef2c066" ON "tutor_proficiency_test" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7e0db5cbb1be90982b1da79e9" ON "tutor_proficiency_test" ("m_id") `);
        await queryRunner.query(`CREATE TABLE "pt_answer" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "text" text NOT NULL, "isCorrect" boolean NOT NULL DEFAULT false, "questionId" integer, CONSTRAINT "PK_106e5ed21e7634f51ace8ec4cc6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_aac187c4ecbe02848244d17dc5" ON "pt_answer" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_51d2310eb213818046b42ad992" ON "pt_answer" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f26311abedc8452014af407ee" ON "pt_answer" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc9c44f7d49635b05efbbc5223" ON "pt_answer" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f0158ba7817de354ddedcf0a9" ON "pt_answer" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5761ea66c6f3edb7a557fe4263" ON "pt_answer" ("questionId") `);
        await queryRunner.query(`CREATE TYPE "public"."pt_question_questiontype_enum" AS ENUM('1', '2')`);
        await queryRunner.query(`CREATE TYPE "public"."pt_question_difficulty_enum" AS ENUM('1', '2', '3')`);
        await queryRunner.query(`CREATE TABLE "pt_question" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "questionType" "public"."pt_question_questiontype_enum" NOT NULL DEFAULT '1', "difficulty" "public"."pt_question_difficulty_enum" NOT NULL DEFAULT '2', "question" text NOT NULL, "proficiencyTestId" integer, CONSTRAINT "PK_b981e92bfa97b496529fe6da809" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4daf2da01eba8e664c106027f6" ON "pt_question" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_10225db288e0bc11e750e6eb1b" ON "pt_question" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_03bfb5211b750e8a4e7aec549b" ON "pt_question" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_536ad7a1a81fafa8193294f6a2" ON "pt_question" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_729117581d912d3231c56890ed" ON "pt_question" ("m_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc1af6628a3a43d10a2cde9dae" ON "pt_question" ("proficiencyTestId") `);
        await queryRunner.query(`CREATE TABLE "tutor_proficiency_test_offerings_offering" ("tutorProficiencyTestId" integer NOT NULL, "offeringId" integer NOT NULL, CONSTRAINT "PK_93c3e519b2f17b87e473bbc76e0" PRIMARY KEY ("tutorProficiencyTestId", "offeringId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bae3cc85408b513b6eb4bbd78f" ON "tutor_proficiency_test_offerings_offering" ("tutorProficiencyTestId") `);
        await queryRunner.query(`CREATE INDEX "IDX_32420e29e39a5331a386d4c4bd" ON "tutor_proficiency_test_offerings_offering" ("offeringId") `);
        await queryRunner.query(`ALTER TABLE "pt_answer" ADD CONSTRAINT "FK_5761ea66c6f3edb7a557fe4263e" FOREIGN KEY ("questionId") REFERENCES "pt_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pt_question" ADD CONSTRAINT "FK_fc1af6628a3a43d10a2cde9dae5" FOREIGN KEY ("proficiencyTestId") REFERENCES "tutor_proficiency_test"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tutor_proficiency_test_offerings_offering" ADD CONSTRAINT "FK_bae3cc85408b513b6eb4bbd78f0" FOREIGN KEY ("tutorProficiencyTestId") REFERENCES "tutor_proficiency_test"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "tutor_proficiency_test_offerings_offering" ADD CONSTRAINT "FK_32420e29e39a5331a386d4c4bd9" FOREIGN KEY ("offeringId") REFERENCES "offering"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor_proficiency_test_offerings_offering" DROP CONSTRAINT "FK_32420e29e39a5331a386d4c4bd9"`);
        await queryRunner.query(`ALTER TABLE "tutor_proficiency_test_offerings_offering" DROP CONSTRAINT "FK_bae3cc85408b513b6eb4bbd78f0"`);
        await queryRunner.query(`ALTER TABLE "pt_question" DROP CONSTRAINT "FK_fc1af6628a3a43d10a2cde9dae5"`);
        await queryRunner.query(`ALTER TABLE "pt_answer" DROP CONSTRAINT "FK_5761ea66c6f3edb7a557fe4263e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32420e29e39a5331a386d4c4bd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bae3cc85408b513b6eb4bbd78f"`);
        await queryRunner.query(`DROP TABLE "tutor_proficiency_test_offerings_offering"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc1af6628a3a43d10a2cde9dae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_729117581d912d3231c56890ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_536ad7a1a81fafa8193294f6a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_03bfb5211b750e8a4e7aec549b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_10225db288e0bc11e750e6eb1b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4daf2da01eba8e664c106027f6"`);
        await queryRunner.query(`DROP TABLE "pt_question"`);
        await queryRunner.query(`DROP TYPE "public"."pt_question_difficulty_enum"`);
        await queryRunner.query(`DROP TYPE "public"."pt_question_questiontype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5761ea66c6f3edb7a557fe4263"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f0158ba7817de354ddedcf0a9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc9c44f7d49635b05efbbc5223"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f26311abedc8452014af407ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_51d2310eb213818046b42ad992"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aac187c4ecbe02848244d17dc5"`);
        await queryRunner.query(`DROP TABLE "pt_answer"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7e0db5cbb1be90982b1da79e9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8637b2ade4465a4c9f2ef2c066"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9871a0fb0c6a3fea719675db54"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bccbc8e6b9beb354edc8bdea4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c1357b46faa3b84ac285280632"`);
        await queryRunner.query(`DROP TABLE "tutor_proficiency_test"`);
    }

}
