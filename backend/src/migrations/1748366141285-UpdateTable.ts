import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTable1748366141285 implements MigrationInterface {
    name = 'UpdateTable1748366141285'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "novel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" character varying NOT NULL, "sourceId" character varying NOT NULL, "title" character varying NOT NULL, "author" character varying, "description" text, "coverUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "novelUpdatedAt" TIMESTAMP, CONSTRAINT "PK_b0fea0838ae7d287445c53d6139" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "epub_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "userId" uuid, "status" character varying NOT NULL DEFAULT 'queued', "publicUrl" character varying, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, "startedAt" TIMESTAMP, CONSTRAINT "PK_5be0563863831d26514e7c873b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "kindle_delivery" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "epubJobId" uuid NOT NULL, "userId" uuid NOT NULL, "toEmail" character varying(320) NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "errorMessage" text, "sentAt" TIMESTAMP, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_645a5bf3a7adf8800cd4bda0a70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "googleId" character varying NOT NULL, "email" character varying NOT NULL, "displayName" character varying NOT NULL, "kindleEmail" character varying(320), "dailyEmailQuota" integer NOT NULL DEFAULT '0', "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_470355432cc67b2c470c30bef7c" UNIQUE ("googleId"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_1baa439b0746f9a1c4101452f81" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_fbff863a9847d05d62f0335345f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" ADD CONSTRAINT "FK_c81e6a26b742ff3311c9a73e4eb" FOREIGN KEY ("epubJobId") REFERENCES "epub_job"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" ADD CONSTRAINT "FK_f71fd4c82b39667b2e02f6799d4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "kindle_delivery" DROP CONSTRAINT "FK_f71fd4c82b39667b2e02f6799d4"`);
        await queryRunner.query(`ALTER TABLE "kindle_delivery" DROP CONSTRAINT "FK_c81e6a26b742ff3311c9a73e4eb"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_fbff863a9847d05d62f0335345f"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_1baa439b0746f9a1c4101452f81"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "kindle_delivery"`);
        await queryRunner.query(`DROP TABLE "epub_job"`);
        await queryRunner.query(`DROP TABLE "novel"`);
    }

}
