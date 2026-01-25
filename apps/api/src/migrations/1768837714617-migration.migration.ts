import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768837714617Migration implements MigrationInterface {
    name = 'Migration1768837714617Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor" ADD "on_boarding_complete" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "on_boarding_complete"`);
    }

}
