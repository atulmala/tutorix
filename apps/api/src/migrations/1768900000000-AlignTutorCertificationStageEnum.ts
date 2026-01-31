import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns tutor_certification_stage_enum with onboarding steps.
 * Old values -> New values (matching OnboardingStepId):
 *   REGISTERED -> address
 *   OFFERING_PENDING, SUBJECT_CHANGE -> offerings
 *   PROFICIENCY_TEST_PENDING -> pt
 *   REGISTRATION_FEE_PENDING -> registrationPayment
 *   PROFILE_COMPLETION_PENDING, THANKS -> docs
 *   INTERVIEW_PENDING, BACKGROUND_CHECK_PENDING -> interview
 *   CERTIFICATION_PROCESS_COMPLETED -> complete
 */
export class AlignTutorCertificationStageEnum1768900000000
  implements MigrationInterface
{
  name = 'AlignTutorCertificationStageEnum1768900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Current enum may be tutor_certification_stage_enum or tutor_certificationstage_enum (from prior migrations)
    const currentType = 'tutor_certification_stage_enum';
    const newType = 'tutor_certification_stage_enum_v2';

    // Create new enum with onboarding-step-aligned values
    await queryRunner.query(
      `CREATE TYPE "public"."${newType}" AS ENUM(
        'address', 'qualificationExperience', 'offerings', 'pt',
        'registrationPayment', 'docs', 'interview', 'complete'
      )`
    );

    // Add temp column
    await queryRunner.query(`
      ALTER TABLE "tutor" ADD COLUMN "certificationStageNew" "public"."${newType}" DEFAULT 'address'
    `);

    // Migrate data: map old values to new (handle both possible current enum names)
    await queryRunner.query(`
      UPDATE "tutor" SET "certificationStageNew" = CASE "certificationStage"::text
        WHEN 'REGISTERED' THEN 'address'::"${newType}"
        WHEN 'OFFERING_PENDING' THEN 'offerings'::"${newType}"
        WHEN 'SUBJECT_CHANGE' THEN 'offerings'::"${newType}"
        WHEN 'PROFICIENCY_TEST_PENDING' THEN 'pt'::"${newType}"
        WHEN 'REGISTRATION_FEE_PENDING' THEN 'registrationPayment'::"${newType}"
        WHEN 'PROFILE_COMPLETION_PENDING' THEN 'docs'::"${newType}"
        WHEN 'THANKS' THEN 'docs'::"${newType}"
        WHEN 'INTERVIEW_PENDING' THEN 'interview'::"${newType}"
        WHEN 'BACKGROUND_CHECK_PENDING' THEN 'interview'::"${newType}"
        WHEN 'CERTIFICATION_PROCESS_COMPLETED' THEN 'complete'::"${newType}"
        ELSE 'address'::"${newType}"
      END
    `);

    // Drop old column, rename new
    await queryRunner.query(
      `ALTER TABLE "tutor" DROP COLUMN "certificationStage"`
    );
    await queryRunner.query(`
      ALTER TABLE "tutor" RENAME COLUMN "certificationStageNew" TO "certificationStage"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'address'::"${newType}"
    `);

    // Drop old enum(s) - prior migrations may have created tutor_certificationstage_enum (typo) or tutor_certification_stage_enum
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tutor_certificationstage_enum" CASCADE`
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tutor_certification_stage_enum" CASCADE`
    );

    // Rename new enum to standard name
    await queryRunner.query(`
      ALTER TYPE "public"."${newType}" RENAME TO "${currentType}"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const currentType = 'tutor_certification_stage_enum';
    const oldType = 'tutor_certification_stage_enum_old';

    await queryRunner.query(`
      CREATE TYPE "public"."${oldType}" AS ENUM(
        'REGISTERED', 'OFFERING_PENDING', 'SUBJECT_CHANGE', 'PROFICIENCY_TEST_PENDING',
        'REGISTRATION_FEE_PENDING', 'THANKS', 'PROFILE_COMPLETION_PENDING',
        'INTERVIEW_PENDING', 'BACKGROUND_CHECK_PENDING', 'CERTIFICATION_PROCESS_COMPLETED'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tutor" ADD COLUMN "certificationStageOld" "public"."${oldType}" DEFAULT 'REGISTERED'
    `);

    await queryRunner.query(`
      UPDATE "tutor" SET "certificationStageOld" = CASE "certificationStage"::text
        WHEN 'address' THEN 'REGISTERED'::"${oldType}"
        WHEN 'qualificationExperience' THEN 'REGISTERED'::"${oldType}"
        WHEN 'offerings' THEN 'OFFERING_PENDING'::"${oldType}"
        WHEN 'pt' THEN 'PROFICIENCY_TEST_PENDING'::"${oldType}"
        WHEN 'registrationPayment' THEN 'REGISTRATION_FEE_PENDING'::"${oldType}"
        WHEN 'docs' THEN 'PROFILE_COMPLETION_PENDING'::"${oldType}"
        WHEN 'interview' THEN 'INTERVIEW_PENDING'::"${oldType}"
        WHEN 'complete' THEN 'CERTIFICATION_PROCESS_COMPLETED'::"${oldType}"
        ELSE 'REGISTERED'::"${oldType}"
      END
    `);

    await queryRunner.query(
      `ALTER TABLE "tutor" DROP COLUMN "certificationStage"`
    );
    await queryRunner.query(`
      ALTER TABLE "tutor" RENAME COLUMN "certificationStageOld" TO "certificationStage"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'REGISTERED'::"${oldType}"
    `);

    await queryRunner.query(`DROP TYPE "public"."${currentType}"`);
    await queryRunner.query(`
      ALTER TYPE "public"."${oldType}" RENAME TO "${currentType}"
    `);
  }
}
