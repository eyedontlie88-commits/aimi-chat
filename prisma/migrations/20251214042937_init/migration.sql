-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "speakingStyle" TEXT NOT NULL,
    "boundaries" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'default',
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL DEFAULT 'me',
    "displayName" TEXT NOT NULL,
    "nicknameForUser" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "occupation" TEXT,
    "personalityDescription" TEXT,
    "likes" TEXT,
    "dislikes" TEXT,
    "chatTheme" TEXT DEFAULT 'midnight',
    "chatTextTone" TEXT DEFAULT 'auto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipConfig" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "specialNotes" TEXT,
    "intimacyLevel" INTEGER NOT NULL DEFAULT 0,
    "affectionPoints" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'UNDEFINED',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastStageChangeAt" INTEGER NOT NULL DEFAULT 0,
    "trustDebt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "emotionalMomentum" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "apologyCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sceneState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyToMessageId" TEXT,
    "reactionType" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importanceScore" INTEGER NOT NULL DEFAULT 5,
    "sourceMessageId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'fact',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipConfig_characterId_key" ON "RelationshipConfig"("characterId");

-- CreateIndex
CREATE INDEX "Memory_characterId_importanceScore_idx" ON "Memory"("characterId", "importanceScore");

-- AddForeignKey
ALTER TABLE "RelationshipConfig" ADD CONSTRAINT "RelationshipConfig_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipConfig" ADD CONSTRAINT "RelationshipConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
