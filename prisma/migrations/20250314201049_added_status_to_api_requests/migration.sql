-- CreateEnum
CREATE TYPE "ApiRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'ABORTED');

-- AlterTable
ALTER TABLE "api_requests" ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "status" "ApiRequestStatus";
