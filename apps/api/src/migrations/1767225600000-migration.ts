import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1767225600000 implements MigrationInterface {
    name = 'Migration1767225600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor" ADD "user_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tutor" ADD CONSTRAINT "UQ_debc1e31418e90088d125f90109" UNIQUE ("user_id")`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_certification_stage_enum" RENAME TO "tutor_certification_stage_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_certificationstage_enum" AS ENUM('REGISTERED', 'OFFERING_PENDING', 'SUBJECT_CHANGE', 'PROFICIENCY_TEST_PENDING', 'REGISTRATION_FEE_PENDING', 'THANKS', 'PROFILE_COMPLETION_PENDING', 'INTERVIEW_PENDING', 'BACKGROUND_CHECK_PENDING', 'CERTIFICATION_PROCESS_COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" TYPE "public"."tutor_certificationstage_enum" USING "certificationStage"::"text"::"public"."tutor_certificationstage_enum"`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'REGISTERED'`);
        await queryRunner.query(`DROP TYPE "public"."tutor_certification_stage_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tutor" ADD CONSTRAINT "FK_debc1e31418e90088d125f90109" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor" DROP CONSTRAINT "FK_debc1e31418e90088d125f90109"`);
        await queryRunner.query(`CREATE TYPE "public"."tutor_certification_stage_enum_old" AS ENUM('REGISTERED', 'OFFERING_PENDING', 'SUBJECT_CHANGE', 'PROFICIENCY_TEST_PENDING', 'REGISTRATION_FEE_PENDING', 'THANKS', 'PROFILE_COMPLETION_PENDING', 'INTERVIEW_PENDING', 'BACKGROUND_CHECK_PENDING', 'CERTIFICATION_PROCESS_COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" TYPE "public"."tutor_certification_stage_enum_old" USING "certificationStage"::"text"::"public"."tutor_certification_stage_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'REGISTERED'`);
        await queryRunner.query(`DROP TYPE "public"."tutor_certificationstage_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tutor_certification_stage_enum_old" RENAME TO "tutor_certification_stage_enum"`);
        await queryRunner.query(`ALTER TABLE "tutor" DROP CONSTRAINT "UQ_debc1e31418e90088d125f90109"`);
        await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "user_id"`);
    }

}
