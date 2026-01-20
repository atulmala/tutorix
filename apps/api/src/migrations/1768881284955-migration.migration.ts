import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768881284955Migration implements MigrationInterface {
    name = 'Migration1768881284955Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "dob" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dob"`);
    }

}
