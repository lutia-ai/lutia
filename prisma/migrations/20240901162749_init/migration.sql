-- CreateEnum
CREATE TYPE "ApiProvider" AS ENUM ('openAI', 'anthropic', 'google');

-- CreateEnum
CREATE TYPE "ApiModel" AS ENUM ('GPT_4o', 'GPT_4o_mini', 'GPT_4_Turbo', 'GPT_4', 'GPT_3_5_Turbo', 'Claude_3_5_Sonnet', 'Claude_3_Opus', 'Claude_3_Sonnet', 'Claude_3_Haiku', 'Gemini_1_5_Pro', 'Gemini_1_5_Flash', 'Gemini_1_0_Pro');

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "pictures" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "oauth" TEXT,
    "oauth_link_token" TEXT,
    "stripe_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "api_provider" "ApiProvider" NOT NULL,
    "api_model" "ApiModel" NOT NULL,
    "request_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "input_tokens" INTEGER NOT NULL,
    "input_cost" DECIMAL(15,10) NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "output_cost" DECIMAL(15,10) NOT NULL,
    "total_cost" DECIMAL(15,10) NOT NULL,
    "message_id" INTEGER,

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MessageReferences" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_requests_message_id_key" ON "api_requests"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "_MessageReferences_AB_unique" ON "_MessageReferences"("A", "B");

-- CreateIndex
CREATE INDEX "_MessageReferences_B_index" ON "_MessageReferences"("B");

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageReferences" ADD CONSTRAINT "_MessageReferences_A_fkey" FOREIGN KEY ("A") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageReferences" ADD CONSTRAINT "_MessageReferences_B_fkey" FOREIGN KEY ("B") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
