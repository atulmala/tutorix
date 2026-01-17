import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768659201147Migration implements MigrationInterface {
    name = 'Migration1768659201147Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "address" ADD "tutor_id" integer`);
        await queryRunner.query(`ALTER TABLE "address" ADD CONSTRAINT "FK_b0d25610a45d9823290d1095d82" FOREIGN KEY ("tutor_id") REFERENCES "tutor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "address" DROP CONSTRAINT "FK_b0d25610a45d9823290d1095d82"`);
        await queryRunner.query(`ALTER TABLE "address" DROP COLUMN "tutor_id"`);
    }

}
