import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRegistration1775114576538 implements MigrationInterface {
  name = 'CreateRegistration1775114576538';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."registration_documenttype_enum" AS ENUM('CPF', 'CNPJ')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."registration_currentstep_enum" AS ENUM('IDENTIFICATION', 'DOCUMENT', 'CONTACT', 'ADDRESS', 'REVIEW', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "registration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "email" character varying, "documentType" "public"."registration_documenttype_enum", "document" character varying, "phone" character varying(11), "cep" character varying(8), "street" character varying, "number" character varying, "complement" character varying, "neighborhood" character varying, "city" character varying, "state" character varying(2), "currentStep" "public"."registration_currentstep_enum" NOT NULL DEFAULT 'IDENTIFICATION', "mfaCode" character varying, "mfaCodeExpiresAt" TIMESTAMP WITH TIME ZONE, "mfaVerifiedAt" TIMESTAMP WITH TIME ZONE, "abandonmentEmailSentAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_cb23dc9d28df8801b15e9e2b8d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_registration_email_step" ON "registration" ("email", "currentStep") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_registration_phone_unique" ON "registration" ("phone") WHERE "phone" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_registration_document_unique" ON "registration" ("document") WHERE "document" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_registration_email_unique" ON "registration" ("email") WHERE "email" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registration_email_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registration_document_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registration_phone_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_registration_email_step"`,
    );
    await queryRunner.query(`DROP TABLE "registration"`);
    await queryRunner.query(
      `DROP TYPE "public"."registration_currentstep_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."registration_documenttype_enum"`,
    );
  }
}
