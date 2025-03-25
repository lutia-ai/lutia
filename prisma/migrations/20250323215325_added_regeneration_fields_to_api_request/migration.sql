-- AlterTable
ALTER TABLE "api_requests" ADD COLUMN     "lastRegeneratedAt" TIMESTAMP(3),
ADD COLUMN     "regeneration_count" INTEGER NOT NULL DEFAULT 0;
