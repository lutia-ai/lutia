/*
  Warnings:

  - Made the column `company_menu_open` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `prompt_pricing_visible` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `context_window` on table `user_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `show_context_window_button` on table `user_settings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "company_menu_open" SET NOT NULL,
ALTER COLUMN "prompt_pricing_visible" SET NOT NULL,
ALTER COLUMN "context_window" SET NOT NULL,
ALTER COLUMN "show_context_window_button" SET NOT NULL;
