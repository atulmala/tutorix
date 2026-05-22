import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentScreeningAiTokenUsage1773800000000
  implements MigrationInterface
{
  name = 'DocumentScreeningAiTokenUsage1773800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_screening"
      ADD COLUMN "ai_input_tokens" integer,
      ADD COLUMN "ai_output_tokens" integer,
      ADD COLUMN "ai_cache_creation_input_tokens" integer,
      ADD COLUMN "ai_cache_read_input_tokens" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_screening"
      DROP COLUMN "ai_cache_read_input_tokens",
      DROP COLUMN "ai_cache_creation_input_tokens",
      DROP COLUMN "ai_output_tokens",
      DROP COLUMN "ai_input_tokens"
    `);
  }
}
