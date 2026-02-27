import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772028286581Migration implements MigrationInterface {
    name = 'Migration1772028286581Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pt_question" ADD "text" text NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pt_question" DROP COLUMN "text"`);
    }

}
