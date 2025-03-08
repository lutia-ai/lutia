-- CreateEnum
CREATE TYPE "PaymentTier" AS ENUM ('PayAsYouGo', 'Premium');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payment_tier" "PaymentTier" NOT NULL DEFAULT 'PayAsYouGo',
ADD COLUMN     "premium_until" TIMESTAMP(3);
