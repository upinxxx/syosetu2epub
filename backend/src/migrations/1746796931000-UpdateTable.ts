import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTable1746796931000 implements MigrationInterface {
    name = 'UpdateTable1746796931000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "googleId" character varying NOT NULL, "email" character varying NOT NULL, "displayName" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'free', "upgradedAt" TIMESTAMP, "dailyEmailQuota" integer NOT NULL DEFAULT '0', "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_470355432cc67b2c470c30bef7c" UNIQUE ("googleId"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "novel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" character varying NOT NULL, "sourceId" character varying NOT NULL, "title" character varying NOT NULL, "author" character varying, "description" text, "coverUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "novelUpdatedAt" TIMESTAMP, CONSTRAINT "PK_b0fea0838ae7d287445c53d6139" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "epub_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "publicUrl" character varying, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, "startedAt" TIMESTAMP, CONSTRAINT "PK_5be0563863831d26514e7c873b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "email_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "toEmail" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'success', "errorMessage" text, "ip" character varying, "sentAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "epubJobId" uuid, CONSTRAINT "PK_edfd3f7225051fc07bdd63a22dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "amount" integer NOT NULL, "transactionId" character varying, "ip" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_1baa439b0746f9a1c4101452f81" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_log" ADD CONSTRAINT "FK_d47ddde257c2b89e2d2be7d6af4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_log" ADD CONSTRAINT "FK_a169f34a840ecd60f572cac672a" FOREIGN KEY ("epubJobId") REFERENCES "epub_job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_caabe91507b3379c7ba73637b84" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_caabe91507b3379c7ba73637b84"`);
        await queryRunner.query(`ALTER TABLE "email_log" DROP CONSTRAINT "FK_a169f34a840ecd60f572cac672a"`);
        await queryRunner.query(`ALTER TABLE "email_log" DROP CONSTRAINT "FK_d47ddde257c2b89e2d2be7d6af4"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_1baa439b0746f9a1c4101452f81"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP TABLE "email_log"`);
        await queryRunner.query(`DROP TABLE "epub_job"`);
        await queryRunner.query(`DROP TABLE "novel"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
