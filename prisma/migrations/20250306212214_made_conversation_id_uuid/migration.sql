/*
  Warnings:

  - The primary key for the `conversations` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "api_requests" DROP CONSTRAINT "api_requests_conversation_id_fkey";

-- AlterTable
ALTER TABLE "api_requests" ALTER COLUMN "conversation_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "conversations_id_seq";

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
