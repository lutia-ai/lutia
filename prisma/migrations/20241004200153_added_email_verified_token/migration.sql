-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_code" TEXT,
ADD COLUMN     "email_verified" BOOLEAN DEFAULT false;
