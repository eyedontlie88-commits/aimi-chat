-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RelationshipConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" DATETIME,
    "specialNotes" TEXT,
    "intimacyLevel" INTEGER NOT NULL DEFAULT 0,
    "affectionPoints" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'UNDEFINED',
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastStageChangeAt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RelationshipConfig_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelationshipConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RelationshipConfig" ("affectionPoints", "characterId", "createdAt", "id", "intimacyLevel", "lastActiveAt", "messageCount", "specialNotes", "stage", "startDate", "status", "updatedAt", "userId") SELECT "affectionPoints", "characterId", "createdAt", "id", "intimacyLevel", "lastActiveAt", "messageCount", "specialNotes", "stage", "startDate", "status", "updatedAt", "userId" FROM "RelationshipConfig";
DROP TABLE "RelationshipConfig";
ALTER TABLE "new_RelationshipConfig" RENAME TO "RelationshipConfig";
CREATE UNIQUE INDEX "RelationshipConfig_characterId_key" ON "RelationshipConfig"("characterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
