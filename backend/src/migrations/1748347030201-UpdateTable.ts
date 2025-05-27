import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTable1748347030201 implements MigrationInterface {
    name = 'UpdateTable1748347030201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "kindle_delivery" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "epubJobId" uuid NOT NULL, "userId" uuid NOT NULL, "toEmail" character varying(320) NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "errorMessage" text, "sentAt" TIMESTAMP, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_645a5bf3a7adf8800cd4bda0a70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "upgradedAt"`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "user" ADD "kindleEmail" character varying(320)`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_fbff863a9847d05d62f0335345f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" ADD CONSTRAINT "FK_c81e6a26b742ff3311c9a73e4eb" FOREIGN KEY ("epubJobId") REFERENCES "epub_job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" ADD CONSTRAINT "FK_f71fd4c82b39667b2e02f6799d4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "kindle_delivery" DROP CONSTRAINT "FK_f71fd4c82b39667b2e02f6799d4"`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" DROP CONSTRAINT "FK_c81e6a26b742ff3311c9a73e4eb"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_fbff863a9847d05d62f0335345f"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "kindleEmail"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "upgradedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user" ADD "role" character varying NOT NULL DEFAULT 'free'`);
        await queryRunner.query(`DROP TABLE "kindle_delivery"`);
    }

}
