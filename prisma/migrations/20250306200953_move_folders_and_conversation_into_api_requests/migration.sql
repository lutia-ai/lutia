/*
  Warnings:

  - You are about to drop the column `conversation_id` on the `messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- AlterTable
ALTER TABLE "api_requests" ADD COLUMN     "conversation_id" INTEGER;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "conversation_id";

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
