import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1770399765012Migration implements MigrationInterface {
    name = 'Migration1770399765012Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor_qualification" DROP CONSTRAINT "FK_tutor_qualification_tutor_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_token_platform"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tutor_qualification_tutor_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tutor_qualification_deleted"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tutor_qualification_tutor_id"`);
        await queryRunner.query(`CREATE TABLE "document" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "deleted" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "m_id" character varying, "name" character varying NOT NULL, "description" character varying, "document_type" smallint NOT NULL DEFAULT '1', "document_for_type" smallint NOT NULL DEFAULT '1', "verified" boolean NOT NULL DEFAULT false, "verified_date" TIMESTAMP, "tutor_id" integer, "user_id" integer, "filename" character varying, "mime_type" character varying(100), "size" integer NOT NULL DEFAULT '0', "storage_key" character varying, "thumbnail_small" character varying, "thumbnail_medium" character varying, "thumbnail_large" character varying, "original_url" character varying, "average_color" character varying, "width" integer NOT NULL DEFAULT '0', "height" integer NOT NULL DEFAULT '0', "verified_by_id" integer, CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2e01d043726e021781b234faf7" ON "document" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_a911a5944d5a8edf3b82ee48ca" ON "document" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_328c23f5490c1166ac1cc23550" ON "document" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_aeffa213b7606aa7c54172ca51" ON "document" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_d9f78e3e5aa2b57fec82b98145" ON "document" ("m_id") `);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "version" DROP DEFAULT`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_qualification_qualification_type_enum" RENAME TO "tutor_qualification_qualification_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_qualification_qualificationtype_enum" AS ENUM('HIGHER_SECONDARY', 'DIPLOMA', 'BACHELORS', 'PG_DIPLOMA', 'MASTERS', 'MPHIL', 'PHD')`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "qualificationType" TYPE "public"."tutor_qualification_qualificationtype_enum" USING "qualificationType"::"text"::"public"."tutor_qualification_qualificationtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tutor_qualification_qualification_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_qualification_grade_type_enum" RENAME TO "tutor_qualification_grade_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_qualification_gradetype_enum" AS ENUM('CGPA', 'PERCENTAGE', 'DIVISION')`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "gradeType" TYPE "public"."tutor_qualification_gradetype_enum" USING "gradeType"::"text"::"public"."tutor_qualification_gradetype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tutor_qualification_grade_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "displayOrder" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_certification_stage_enum" RENAME TO "tutor_certification_stage_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_certificationstage_enum" AS ENUM('address', 'qualificationExperience', 'offerings', 'pt', 'registrationPayment', 'docs', 'interview', 'complete')`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" TYPE "public"."tutor_certificationstage_enum" USING "certificationStage"::"text"::"public"."tutor_certificationstage_enum"`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'address'`);
        await queryRunner.query(`DROP TYPE "public"."tutor_certification_stage_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_149ea9d64157a5241bb9e29795" ON "tutor_qualification" ("deleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_cfe25c8f74db083fc758501522" ON "tutor_qualification" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_f6c5949eb0f78989cd082771d2" ON "tutor_qualification" ("createdDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_ccf77d0cf62d9d31a1c9b5f5b8" ON "tutor_qualification" ("updatedDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_29dfde7be4a1d715bdc43f8bf8" ON "tutor_qualification" ("m_id") `);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ADD CONSTRAINT "FK_4a4a1be608eec5e459c437364fe" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document" ADD CONSTRAINT "FK_2a536aa3e133f9d0f28fa8325ed" FOREIGN KEY ("verified_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document" ADD CONSTRAINT "FK_7809324056d20e7492feaf3a054" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document" ADD CONSTRAINT "FK_a24176a40152f41c98c09d8057d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document" DROP CONSTRAINT "FK_a24176a40152f41c98c09d8057d"`);
        await queryRunner.query(`ALTER TABLE "document" DROP CONSTRAINT "FK_7809324056d20e7492feaf3a054"`);
        await queryRunner.query(`ALTER TABLE "document" DROP CONSTRAINT "FK_2a536aa3e133f9d0f28fa8325ed"`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" DROP CONSTRAINT "FK_4a4a1be608eec5e459c437364fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29dfde7be4a1d715bdc43f8bf8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ccf77d0cf62d9d31a1c9b5f5b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6c5949eb0f78989cd082771d2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfe25c8f74db083fc758501522"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_149ea9d64157a5241bb9e29795"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_certification_stage_enum_old" AS ENUM('address', 'qualificationExperience', 'offerings', 'pt', 'registrationPayment', 'docs', 'interview', 'complete')`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" TYPE "public"."tutor_certification_stage_enum_old" USING "certificationStage"::"text"::"public"."tutor_certification_stage_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'address'`);
        await queryRunner.query(`DROP TYPE "public"."tutor_certificationstage_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_certification_stage_enum_old" RENAME TO "tutor_certification_stage_enum"`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "displayOrder" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_qualification_grade_type_enum_old" AS ENUM('CGPA', 'PERCENTAGE', 'DIVISION')`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "gradeType" TYPE "public"."tutor_qualification_grade_type_enum_old" USING "gradeType"::"text"::"public"."tutor_qualification_grade_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."tutor_qualification_gradetype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_qualification_grade_type_enum_old" RENAME TO "tutor_qualification_grade_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_qualification_qualification_type_enum_old" AS ENUM('HIGHER_SECONDARY', 'DIPLOMA', 'BACHELORS', 'PG_DIPLOMA', 'MASTERS', 'MPHIL', 'PHD')`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "qualificationType" TYPE "public"."tutor_qualification_qualification_type_enum_old" USING "qualificationType"::"text"::"public"."tutor_qualification_qualification_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."tutor_qualification_qualificationtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_qualification_qualification_type_enum_old" RENAME TO "tutor_qualification_qualification_type_enum"`);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ALTER COLUMN "version" SET DEFAULT '1'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9f78e3e5aa2b57fec82b98145"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aeffa213b7606aa7c54172ca51"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_328c23f5490c1166ac1cc23550"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a911a5944d5a8edf3b82ee48ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2e01d043726e021781b234faf7"`);
        await queryRunner.query(`DROP TABLE "document"`);
        await queryRunner.query(`CREATE INDEX "IDX_tutor_qualification_tutor_id" ON "tutor_qualification" ("tutor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_tutor_qualification_deleted" ON "tutor_qualification" ("deleted") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tutor_qualification_tutor_type" ON "tutor_qualification" ("tutor_id", "qualificationType") WHERE (deleted = false)`);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_token_platform" ON "refresh_token" ("platform") `);
        await queryRunner.query(`ALTER TABLE "tutor_qualification" ADD CONSTRAINT "FK_tutor_qualification_tutor_id" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
