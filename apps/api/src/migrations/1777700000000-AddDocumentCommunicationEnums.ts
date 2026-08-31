import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentCommunicationEnums1777700000000
  implements MigrationInterface
{
  name = 'AddDocumentCommunicationEnums1777700000000';
  // ADD VALUE cannot be used in the same transaction that later inserts those labels.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'DOCUMENTS_ALL_UPLOADED'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'DOCUMENTS_VERIFICATION_PASSED'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_event_enum"
      ADD VALUE IF NOT EXISTS 'DOCUMENTS_VERIFICATION_FAILED'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."communication_channel_enum"
      ADD VALUE IF NOT EXISTS 'ON_SCREEN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
