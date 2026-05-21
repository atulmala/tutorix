import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * REJECTED_HUMAN is reserved for human admin rejection after review.
 * Rows previously marked REJECTED_HUMAN by the AI batch had no human reviewer.
 */
export class RemapAutomatedRejectionsToPendingHuman1773700000000
  implements MigrationInterface
{
  name = 'RemapAutomatedRejectionsToPendingHuman1773700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "document_screening"
      SET "status" = 'PENDING_HUMAN'
      WHERE "status" = 'REJECTED_HUMAN'
        AND "reviewed_by_user_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "document_screening"
      SET "status" = 'REJECTED_HUMAN'
      WHERE "status" = 'PENDING_HUMAN'
        AND "reviewed_by_user_id" IS NULL
        AND "automated_at" IS NOT NULL
    `);
  }
}
