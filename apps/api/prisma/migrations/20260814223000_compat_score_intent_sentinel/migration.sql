-- Fix: intent must be a non-null sentinel ("") for the neutral row, not
-- NULL. Prisma's compound-unique where-input rejects null for a key field,
-- and Postgres doesn't enforce uniqueness across NULLs in a composite
-- unique index (each NULL is treated as distinct), so NULL couldn't
-- guarantee "exactly one neutral row per pair" the way this cache depends
-- on. Backfill existing NULLs (all neutral rows computed before this fix)
-- to the sentinel, then make the column NOT NULL with that default.
UPDATE "CompatibilityScore" SET "intent" = '' WHERE "intent" IS NULL;
ALTER TABLE "CompatibilityScore" ALTER COLUMN "intent" SET NOT NULL;
ALTER TABLE "CompatibilityScore" ALTER COLUMN "intent" SET DEFAULT '';
