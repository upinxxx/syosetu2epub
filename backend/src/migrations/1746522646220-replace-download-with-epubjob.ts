import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceDownloadWithEpubjob1746522646220 implements MigrationInterface {
    name = 'ReplaceDownloadWithEpubjob1746522646220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_log" DROP CONSTRAINT "FK_487890a0825f50fdb530954dcea"`);
        await queryRunner.query(`ALTER TABLE "email_log" RENAME COLUMN "downloadId" TO "epubJobId"`);
        await queryRunner.query(`CREATE TABLE "epub_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "publicUrl" character varying NOT NULL, "ip" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "novelId" uuid, CONSTRAINT "PK_5be0563863831d26514e7c873b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_fbff863a9847d05d62f0335345f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "epub_job" ADD CONSTRAINT "FK_1baa439b0746f9a1c4101452f81" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_log" ADD CONSTRAINT "FK_a169f34a840ecd60f572cac672a" FOREIGN KEY ("epubJobId") REFERENCES "epub_job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_log" DROP CONSTRAINT "FK_a169f34a840ecd60f572cac672a"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_1baa439b0746f9a1c4101452f81"`);
        await queryRunner.query(`ALTER TABLE "epub_job" DROP CONSTRAINT "FK_fbff863a9847d05d62f0335345f"`);
        await queryRunner.query(`DROP TABLE "epub_job"`);
        await queryRunner.query(`ALTER TABLE "email_log" RENAME COLUMN "epubJobId" TO "downloadId"`);
        await queryRunner.query(`ALTER TABLE "email_log" ADD CONSTRAINT "FK_487890a0825f50fdb530954dcea" FOREIGN KEY ("downloadId") REFERENCES "download"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
