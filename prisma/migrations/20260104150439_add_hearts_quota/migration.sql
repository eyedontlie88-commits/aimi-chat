-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "heartsRemaining" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "heartsResetAt" TIMESTAMP(3);
