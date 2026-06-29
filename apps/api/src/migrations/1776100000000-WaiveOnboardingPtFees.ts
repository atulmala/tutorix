import { MigrationInterface, QueryRunner } from 'typeorm';

export class WaiveOnboardingPtFees1776100000000 implements MigrationInterface {
  name = 'WaiveOnboardingPtFees1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE tutor_offering_pt_fee f
      SET amount_due_inr = 0, payment_status = 'waived'
      FROM tutor_offering o
      WHERE f.tutor_offering_id = o.id
        AND o.is_initial_onboarding = true
        AND (f.amount_due_inr > 0 OR f.payment_status = 'pending')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    // Non-reversible: prior pending amounts are unknown after waiver.
  }
}
