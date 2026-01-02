import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1767275545317Migration implements MigrationInterface {
    name = 'Migration1767275545317Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "mobile_country_code" character varying DEFAULT '+91'`);
        await queryRunner.query(`ALTER TABLE "user" ADD "mobile_number" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "tutor" ADD "whatsapp_country_code" character varying DEFAULT '+91'`);
        await queryRunner.query(`ALTER TABLE "tutor" ADD "whatsapp_number" character varying(10)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "whatsapp_number"`);
        await queryRunner.query(`ALTER TABLE "tutor" DROP COLUMN "whatsapp_country_code"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "mobile_number"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "mobile_country_code"`);
    }

}
