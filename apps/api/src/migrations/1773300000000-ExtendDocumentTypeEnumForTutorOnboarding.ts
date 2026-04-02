import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DocumentTypeEnum was extended in application code with CLASS_XII_MARKSHEET (14) and
 * HIGHEST_DEGREE_CERTIFICATE (15) for tutor onboarding uploads.
 *
 * The `document.document_type` column is `smallint` with no DB-level enum or CHECK
 * constraint; new values require no DDL.
 */
export class ExtendDocumentTypeEnumForTutorOnboarding1773300000000
  implements MigrationInterface
{
  name = 'ExtendDocumentTypeEnumForTutorOnboarding1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    // No-op: enum semantics live in TypeScript / GraphQL only.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
