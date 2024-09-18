/*
  Warnings:

  - You are about to drop the column `userId` on the `balances` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `balances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `balances` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "balances" DROP CONSTRAINT "balances_userId_fkey";

-- DropIndex
DROP INDEX "balances_userId_key";

-- AlterTable
ALTER TABLE "balances" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "balances_user_id_key" ON "balances"("user_id");

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
