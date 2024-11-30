-- AlterTable
ALTER TABLE "_MessageReferences" ADD CONSTRAINT "_MessageReferences_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MessageReferences_AB_unique";
