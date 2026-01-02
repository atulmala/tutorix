import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

export class Migration1767362419840Migration implements MigrationInterface {
  name = 'Migration1767362419840Migration';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add a temporary nullable column for hashes
    await queryRunner.query(
      `ALTER TABLE "otp" ADD COLUMN "otp_hash_tmp" character varying(64)`,
    );

    // 2) Fetch existing OTPs and backfill hashes
    const rows: Array<{ id: number; otp: string | null }> =
      await queryRunner.query(`SELECT id, otp FROM "otp"`);
    for (const row of rows) {
      const otp = row.otp ?? '';
      const hash = crypto.createHash('sha256').update(otp).digest('hex');
      await queryRunner.query(
        `UPDATE "otp" SET "otp_hash_tmp" = $1 WHERE id = $2`,
        [hash, row.id],
      );
    }

    // 3) Drop old column and rename temp column
    await queryRunner.query(`ALTER TABLE "otp" DROP COLUMN "otp"`);
    await queryRunner.query(
      `ALTER TABLE "otp" RENAME COLUMN "otp_hash_tmp" TO "otp_hash"`,
    );

    // 4) Enforce NOT NULL
    await queryRunner.query(
      `ALTER TABLE "otp" ALTER COLUMN "otp_hash" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: add back plaintext column (lossy – hashes cannot be reversed)
    await queryRunner.query(
      `ALTER TABLE "otp" ADD COLUMN "otp" character varying(4) NOT NULL DEFAULT '0000'`,
    );
    await queryRunner.query(`ALTER TABLE "otp" DROP COLUMN "otp_hash"`);
  }

}
