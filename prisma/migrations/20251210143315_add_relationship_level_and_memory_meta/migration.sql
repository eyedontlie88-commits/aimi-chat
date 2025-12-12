-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importanceScore" INTEGER NOT NULL DEFAULT 5,
    "sourceMessageId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'fact',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Memory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Memory" ("characterId", "content", "createdAt", "id", "importanceScore", "sourceMessageId", "type") SELECT "characterId", "content", "createdAt", "id", "importanceScore", "sourceMessageId", "type" FROM "Memory";
DROP TABLE "Memory";
ALTER TABLE "new_Memory" RENAME TO "Memory";
CREATE INDEX "Memory_characterId_importanceScore_idx" ON "Memory"("characterId", "importanceScore");
CREATE TABLE "new_RelationshipConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" DATETIME,
    "specialNotes" TEXT,
    "intimacyLevel" INTEGER NOT NULL DEFAULT 0,
    "affectionPoints" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RelationshipConfig_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelationshipConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RelationshipConfig" ("characterId", "createdAt", "id", "specialNotes", "startDate", "status", "updatedAt", "userId") SELECT "characterId", "createdAt", "id", "specialNotes", "startDate", "status", "updatedAt", "userId" FROM "RelationshipConfig";
DROP TABLE "RelationshipConfig";
ALTER TABLE "new_RelationshipConfig" RENAME TO "RelationshipConfig";
CREATE UNIQUE INDEX "RelationshipConfig_characterId_key" ON "RelationshipConfig"("characterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
