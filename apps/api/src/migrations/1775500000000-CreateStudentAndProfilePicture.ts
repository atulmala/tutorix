import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentAndProfilePicture1775500000000 implements MigrationInterface {
  name = 'CreateStudentAndProfilePicture1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."student_onboarding_stage_enum" AS ENUM ('parent', 'address', 'education')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."parent_relation_enum" AS ENUM ('FATHER', 'MOTHER')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."student_type_enum" AS ENUM ('SCHOOL', 'COLLEGE', 'NOT_STUDYING', 'COMPLETED')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."school_board_enum" AS ENUM ('CBSE', 'ICSE', 'IB', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TABLE "student" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "user_id" integer NOT NULL,
        "onboarding_stage" "public"."student_onboarding_stage_enum" DEFAULT 'parent',
        "on_boarding_complete" boolean NOT NULL DEFAULT false,
        "parent_relation" "public"."parent_relation_enum",
        "parent_name" character varying,
        "student_type" "public"."student_type_enum",
        "school_class" smallint,
        "board" "public"."school_board_enum",
        "board_other" character varying,
        CONSTRAINT "PK_student" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_student_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "address" ADD COLUMN "student_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "address"
      ADD CONSTRAINT "FK_address_student_id"
      FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_address_student_id" ON "address" ("student_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_storage_key" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_thumbnail_medium" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_thumbnail_large" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_original_url" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_average_color" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_width" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "profile_picture_height" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_height"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_width"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_average_color"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_original_url"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_thumbnail_large"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_thumbnail_medium"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile_picture_storage_key"`);

    await queryRunner.query(`ALTER TABLE "address" DROP CONSTRAINT "FK_address_student_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_address_student_id"`);
    await queryRunner.query(`ALTER TABLE "address" DROP COLUMN "student_id"`);

    await queryRunner.query(`DROP TABLE "student"`);
    await queryRunner.query(`DROP TYPE "public"."school_board_enum"`);
    await queryRunner.query(`DROP TYPE "public"."student_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."parent_relation_enum"`);
    await queryRunner.query(`DROP TYPE "public"."student_onboarding_stage_enum"`);
  }
}
