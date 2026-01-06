-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "lastChatAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "phone_conversations" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactAvatar" TEXT,
    "lastMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastGeneratedAt" TIMESTAMP(3),
    "unread" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phone_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_conversations_characterId_userId_contactName_key" ON "phone_conversations"("characterId", "userId", "contactName");

-- AddForeignKey
ALTER TABLE "phone_conversations" ADD CONSTRAINT "phone_conversations_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_messages" ADD CONSTRAINT "phone_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "phone_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
