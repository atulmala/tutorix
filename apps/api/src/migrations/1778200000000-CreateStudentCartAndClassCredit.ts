import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentCartAndClassCredit1778200000000
  implements MigrationInterface
{
  name = 'CreateStudentCartAndClassCredit1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."student_class_credit_status_enum" AS ENUM (
        'unscheduled',
        'scheduled',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "student_cart" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "student_id" integer NOT NULL,
        CONSTRAINT "PK_student_cart" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_cart_student_id" UNIQUE ("student_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "student_cart"
      ADD CONSTRAINT "FK_student_cart_student_id"
      FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_cart_deleted" ON "student_cart" ("deleted")`,
    );

    await queryRunner.query(`
      CREATE TABLE "student_cart_item" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "cart_id" integer NOT NULL,
        "tutor_offering_id" integer NOT NULL,
        "delivery_mode" "public"."tutor_class_session_delivery_mode_enum" NOT NULL,
        "quantity" smallint NOT NULL,
        "unit_rate_inr" integer NOT NULL,
        CONSTRAINT "PK_student_cart_item" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_cart_item_offering_mode" UNIQUE ("cart_id", "tutor_offering_id", "delivery_mode")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "student_cart_item"
      ADD CONSTRAINT "FK_student_cart_item_cart_id"
      FOREIGN KEY ("cart_id") REFERENCES "student_cart"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_cart_item"
      ADD CONSTRAINT "FK_student_cart_item_tutor_offering_id"
      FOREIGN KEY ("tutor_offering_id") REFERENCES "tutor_offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_cart_item_deleted" ON "student_cart_item" ("deleted")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_cart_item_cart_id" ON "student_cart_item" ("cart_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "student_class_credit" (
        "id" SERIAL NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "deleted" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "m_id" character varying,
        "student_id" integer NOT NULL,
        "order_id" integer NOT NULL,
        "order_item_id" integer NOT NULL,
        "tutor_id" integer NOT NULL,
        "tutor_offering_id" integer NOT NULL,
        "delivery_mode" "public"."tutor_class_session_delivery_mode_enum" NOT NULL,
        "status" "public"."student_class_credit_status_enum" NOT NULL DEFAULT 'unscheduled',
        "enrollment_id" integer,
        CONSTRAINT "PK_student_class_credit" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_student_id"
      FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_order_id"
      FOREIGN KEY ("order_id") REFERENCES "commerce_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_order_item_id"
      FOREIGN KEY ("order_item_id") REFERENCES "commerce_order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_tutor_id"
      FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_tutor_offering_id"
      FOREIGN KEY ("tutor_offering_id") REFERENCES "tutor_offering"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_enrollment_id"
      FOREIGN KEY ("enrollment_id") REFERENCES "tutor_class_session_enrollment"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_class_credit_student_id" ON "student_class_credit" ("student_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_class_credit_status" ON "student_class_credit" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "student_class_credit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_cart_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_cart"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."student_class_credit_status_enum"`,
    );
  }
}
