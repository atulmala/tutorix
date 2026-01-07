import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1767808604366Migration implements MigrationInterface {
    name = 'Migration1767808604366Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isSignupComplete" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isSignupComplete"`);
    }

}
