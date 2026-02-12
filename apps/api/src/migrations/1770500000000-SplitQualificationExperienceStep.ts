import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits qualificationExperience into two separate steps: qualification and experience.
 * Maps existing qualificationExperience -> qualification.
 */
export class SplitQualificationExperienceStep1770500000000
  implements MigrationInterface
{
  name = 'SplitQualificationExperienceStep1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newType = 'tutor_certificationstage_enum_v2';

    // Create new enum with qualification and experience (replacing qualificationExperience)
    await queryRunner.query(`
      CREATE TYPE "public"."${newType}" AS ENUM(
        'address', 'qualification', 'experience', 'offerings', 'pt',
        'registrationPayment', 'docs', 'interview', 'complete'
      )
    `);

    // Add temp column
    await queryRunner.query(`
      ALTER TABLE "tutor" ADD COLUMN "certificationStageNew" "public"."${newType}" DEFAULT 'address'
    `);

    // Migrate data: qualificationExperience -> qualification, others 1:1
    await queryRunner.query(`
      UPDATE "tutor" SET "certificationStageNew" = CASE "certificationStage"::text
        WHEN 'address' THEN 'address'::"${newType}"
        WHEN 'qualificationExperience' THEN 'qualification'::"${newType}"
        WHEN 'offerings' THEN 'offerings'::"${newType}"
        WHEN 'pt' THEN 'pt'::"${newType}"
        WHEN 'registrationPayment' THEN 'registrationPayment'::"${newType}"
        WHEN 'docs' THEN 'docs'::"${newType}"
        WHEN 'interview' THEN 'interview'::"${newType}"
        WHEN 'complete' THEN 'complete'::"${newType}"
        ELSE 'address'::"${newType}"
      END
    `);

    // Drop old column, rename new
    await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "certificationStage"`);
    await queryRunner.query(`
      ALTER TABLE "tutor" RENAME COLUMN "certificationStageNew" TO "certificationStage"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'address'::"${newType}"
    `);

    // Drop old enum, rename new to standard name
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tutor_certificationstage_enum" CASCADE`
    );
    await queryRunner.query(`
      ALTER TYPE "public"."${newType}" RENAME TO "tutor_certificationstage_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const oldType = 'tutor_certificationstage_enum_old';

    await queryRunner.query(`
      CREATE TYPE "public"."${oldType}" AS ENUM(
        'address', 'qualificationExperience', 'offerings', 'pt',
        'registrationPayment', 'docs', 'interview', 'complete'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tutor" ADD COLUMN "certificationStageOld" "public"."${oldType}" DEFAULT 'address'
    `);

    // qualification and experience -> qualificationExperience
    await queryRunner.query(`
      UPDATE "tutor" SET "certificationStageOld" = CASE "certificationStage"::text
        WHEN 'address' THEN 'address'::"${oldType}"
        WHEN 'qualification' THEN 'qualificationExperience'::"${oldType}"
        WHEN 'experience' THEN 'qualificationExperience'::"${oldType}"
        WHEN 'offerings' THEN 'offerings'::"${oldType}"
        WHEN 'pt' THEN 'pt'::"${oldType}"
        WHEN 'registrationPayment' THEN 'registrationPayment'::"${oldType}"
        WHEN 'docs' THEN 'docs'::"${oldType}"
        WHEN 'interview' THEN 'interview'::"${oldType}"
        WHEN 'complete' THEN 'complete'::"${oldType}"
        ELSE 'address'::"${oldType}"
      END
    `);

    await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "certificationStage"`);
    await queryRunner.query(`
      ALTER TABLE "tutor" RENAME COLUMN "certificationStageOld" TO "certificationStage"
    `);
    await queryRunner.query(`
      ALTER TABLE "tutor" ALTER COLUMN "certificationStage" SET DEFAULT 'address'::"${oldType}"
    `);

    await queryRunner.query(
      `DROP TYPE "public"."tutor_certificationstage_enum" CASCADE`
    );
    await queryRunner.query(`
      ALTER TYPE "public"."${oldType}" RENAME TO "tutor_certificationstage_enum"
    `);
  }
}
