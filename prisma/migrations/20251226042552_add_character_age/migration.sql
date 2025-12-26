-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "age" INTEGER;

-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
