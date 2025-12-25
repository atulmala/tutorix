import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1766678400000 implements MigrationInterface {
    name = 'Migration1766678400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type for TutorCertificationStageEnum
        await queryRunner.query(`CREATE TYPE "public"."tutor_certification_stage_enum" AS ENUM(
            'REGISTERED',
            'OFFERING_PENDING',
            'SUBJECT_CHANGE',
            'PROFICIENCY_TEST_PENDING',
            'REGISTRATION_FEE_PENDING',
            'THANKS',
            'PROFILE_COMPLETION_PENDING',
            'INTERVIEW_PENDING',
            'BACKGROUND_CHECK_PENDING',
            'CERTIFICATION_PROCESS_COMPLETED'
        )`);
        
        // Add the certificationStage column to the tutor table
        await queryRunner.query(`ALTER TABLE "tutor" ADD COLUMN "certificationStage" "public"."tutor_certification_stage_enum" DEFAULT 'REGISTERED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the column
        await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "certificationStage"`);
        
        // Drop the enum type
        await queryRunner.query(`DROP TYPE "public"."tutor_certification_stage_enum"`);
    }
}

