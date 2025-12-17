-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "phoneAutoUpdate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneContentJson" TEXT,
ADD COLUMN     "phoneLastUpdated" TIMESTAMP(3),
ADD COLUMN     "phoneMessageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phoneUpdateFrequency" INTEGER NOT NULL DEFAULT 20;
