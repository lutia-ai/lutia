-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApiModel" ADD VALUE 'GPT_5';
ALTER TYPE "ApiModel" ADD VALUE 'GPT_5_2';
ALTER TYPE "ApiModel" ADD VALUE 'GPT_5_2_Pro';
ALTER TYPE "ApiModel" ADD VALUE 'GPT_5_Mini';
ALTER TYPE "ApiModel" ADD VALUE 'Claude_4_5_Opus';
ALTER TYPE "ApiModel" ADD VALUE 'Claude_4_5_Sonnet';
ALTER TYPE "ApiModel" ADD VALUE 'Claude_4_5_Haiku';
ALTER TYPE "ApiModel" ADD VALUE 'Gemini_3_Pro';
ALTER TYPE "ApiModel" ADD VALUE 'Gemini_3_Flash';
ALTER TYPE "ApiModel" ADD VALUE 'Gemini_3_Pro_Image';
ALTER TYPE "ApiModel" ADD VALUE 'Grok_4';
ALTER TYPE "ApiModel" ADD VALUE 'Grok_4_1_Fast';
ALTER TYPE "ApiModel" ADD VALUE 'Grok_Code_Fast_1';
ALTER TYPE "ApiModel" ADD VALUE 'V3_2';
