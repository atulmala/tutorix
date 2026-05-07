import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772167238307Migration implements MigrationInterface {
    name = 'Migration1772167238307Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pt_answer" RENAME COLUMN "isCorrect" TO "answer"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pt_answer" RENAME COLUMN "answer" TO "isCorrect"`);
    }

}
