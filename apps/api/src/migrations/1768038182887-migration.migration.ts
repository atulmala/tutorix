import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768038182887Migration implements MigrationInterface {
    name = 'Migration1768038182887Migration'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create password_reset_token table
        await queryRunner.query(`
            CREATE TABLE "password_reset_token" (
                "id" SERIAL NOT NULL,
                "version" integer NOT NULL,
                "deleted" boolean NOT NULL DEFAULT false,
                "active" boolean NOT NULL DEFAULT true,
                "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
                "m_id" character varying,
                "user_id" integer NOT NULL,
                "token_hash" character varying(64) NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "used_at" TIMESTAMP,
                "is_used" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_password_reset_token_token_hash" UNIQUE ("token_hash"),
                CONSTRAINT "PK_password_reset_token" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint (before indexes)
        await queryRunner.query(`
            ALTER TABLE "password_reset_token" 
            ADD CONSTRAINT "FK_password_reset_token_user_id" 
            FOREIGN KEY ("user_id") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

        // Create indexes (token_hash index is automatically created by unique constraint, but we can skip it here)
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_deleted" ON "password_reset_token" ("deleted")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_active" ON "password_reset_token" ("active")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_createdDate" ON "password_reset_token" ("createdDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_updatedDate" ON "password_reset_token" ("updatedDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_m_id" ON "password_reset_token" ("m_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_token_user_id" ON "password_reset_token" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "password_reset_token" DROP CONSTRAINT "FK_password_reset_token_user_id"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_m_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_updatedDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_createdDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_token_deleted"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "password_reset_token"`);
    }
}
