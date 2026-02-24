import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Changes offering.medium_of_instruction from PostgreSQL enum to smallint
 * (1=English, 2=Hindi, 3=Others) for source DB import compatibility.
 */
export class OfferingMediumOfInstructionToSmallint1771600000000
  implements MigrationInterface
{
  name = 'OfferingMediumOfInstructionToSmallint1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "offering" ALTER COLUMN "medium_of_instruction" DROP DEFAULT`
    );
    await queryRunner.query(`
      ALTER TABLE "offering"
      ALTER COLUMN "medium_of_instruction" TYPE smallint
      USING (
        CASE "medium_of_instruction"::text
          WHEN 'English' THEN 1
          WHEN 'Hindi' THEN 2
          ELSE 3
        END
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "offering" ALTER COLUMN "medium_of_instruction" SET DEFAULT 1`
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."offering_medium_of_instruction_enum"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."offering_medium_of_instruction_enum" AS ENUM('English', 'Hindi', 'Others')`
    );
    await queryRunner.query(`
      ALTER TABLE "offering"
      ALTER COLUMN "medium_of_instruction" TYPE "public"."offering_medium_of_instruction_enum"
      USING (
        CASE "medium_of_instruction"
          WHEN 1 THEN 'English'::"public"."offering_medium_of_instruction_enum"
          WHEN 2 THEN 'Hindi'::"public"."offering_medium_of_instruction_enum"
          ELSE 'Others'::"public"."offering_medium_of_instruction_enum"
        END
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "offering" ALTER COLUMN "medium_of_instruction" SET DEFAULT 'English'`
    );
  }
}
