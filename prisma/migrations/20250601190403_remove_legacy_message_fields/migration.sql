-- Remove legacy fields from messages table
-- These fields are now consolidated in ordered_content

-- Remove reasoning column
ALTER TABLE "messages" DROP COLUMN "reasoning";

-- Remove web_search_results column  
ALTER TABLE "messages" DROP COLUMN "web_search_results";

-- Remove response column
ALTER TABLE "messages" DROP COLUMN "response"; 