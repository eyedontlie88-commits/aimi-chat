-- Add isDevOnly column to Character table
ALTER TABLE "Character" ADD COLUMN "isDevOnly" BOOLEAN NOT NULL DEFAULT false;

-- Update existing test characters
UPDATE "Character" SET "isDevOnly" = true WHERE name IN ('Koo Bon Hyuk', 'Minh');
