/*
  Warnings:

  - A unique constraint covering the columns `[request_id]` on the table `api_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "api_requests_request_id_key" ON "api_requests"("request_id");
