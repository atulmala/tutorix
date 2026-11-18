import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorMonthlyPayoutCreditLink1780200000000 implements MigrationInterface {
  name = 'TutorMonthlyPayoutCreditLink1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD COLUMN IF NOT EXISTS "tutor_payout_disbursement_id" integer
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_student_class_credit_tutor_payout_disbursement"
      ON "student_class_credit" ("tutor_payout_disbursement_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      ADD CONSTRAINT "FK_student_class_credit_tutor_payout_disbursement"
      FOREIGN KEY ("tutor_payout_disbursement_id")
      REFERENCES "payment_disbursement"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings"
      ADD COLUMN IF NOT EXISTS "tutor_payout_settlement_day_of_month" smallint NOT NULL DEFAULT 3
    `);

    await queryRunner.query(`
      UPDATE "student_class_credit" AS c
      SET "tutor_payout_disbursement_id" = m."disbursement_id"
      FROM (
        SELECT c2."id" AS credit_id, pd."id" AS disbursement_id
        FROM "student_class_credit" c2
        INNER JOIN "tutor_class_session_enrollment" enr ON enr."id" = c2."enrollment_id"
        INNER JOIN "tutor_class_session" sess ON sess."id" = enr."session_id"
        INNER JOIN "tutor_calendar" cal ON cal."id" = sess."tutor_calendar_id"
        INNER JOIN "payment_disbursement" pd ON pd."tutor_id" = c2."tutor_id"
        WHERE c2."tutor_payout_disbursement_id" IS NULL
          AND c2."deleted" = false
          AND c2."status" = 'scheduled'
          AND c2."is_demo" = false
          AND cal."starts_at" IS NOT NULL
          AND pd."deleted" = false
          AND pd."kind" = 'tutor_bank_payout'
          AND pd."status" NOT IN ('cancelled', 'failed')
          AND pd."period_start_date" IS NOT NULL
          AND pd."period_end_date" IS NOT NULL
          AND (cal."starts_at" + (COALESCE(cal."duration_minutes", 60) * INTERVAL '1 minute'))
              >= (pd."period_start_date"::timestamp AT TIME ZONE 'Asia/Kolkata')
          AND (cal."starts_at" + (COALESCE(cal."duration_minutes", 60) * INTERVAL '1 minute'))
              < ((pd."period_end_date"::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
      ) m
      WHERE c."id" = m."credit_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_gateway_fee_settings"
      DROP COLUMN IF EXISTS "tutor_payout_settlement_day_of_month"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      DROP CONSTRAINT IF EXISTS "FK_student_class_credit_tutor_payout_disbursement"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_student_class_credit_tutor_payout_disbursement"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_class_credit"
      DROP COLUMN IF EXISTS "tutor_payout_disbursement_id"
    `);
  }
}