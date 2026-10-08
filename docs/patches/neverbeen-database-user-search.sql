-- ============================================================================
-- NeverBeen — member search indexes (Supabase / PostgreSQL)
--
-- Live-database half of docs/patches/neverbeen-database-user-search.patch.
-- The patch updates schema.sql in the neverbeen-database repo; this file is
-- the exact same SQL, ready to paste into Supabase for an existing project.
--
-- Apply: Supabase dashboard → SQL Editor → New query → paste this → Run.
-- Safe to run more than once (IF NOT EXISTS + exception-tolerant DO blocks).
-- ============================================================================

-- The community search (GET /api/users/search) filters Status = 'Active'.
CREATE INDEX IF NOT EXISTS "IX_Users_Status" ON "Users" ("Status");

-- Trigram matching for ILIKE '%query%' over the member name columns.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm could not be created (%). Name search works without the trigram indexes.', SQLERRM;
END
$$;

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "IX_Users_FullName_Trgm"  ON "Users" USING gin ("FullName"  gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "IX_Users_FirstName_Trgm" ON "Users" USING gin ("FirstName" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "IX_Users_LastName_Trgm"  ON "Users" USING gin ("LastName"  gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
    -- Most commonly: pg_trgm is not available, so gin_trgm_ops does not exist.
    RAISE NOTICE 'Trigram name indexes skipped (%). Name search falls back to sequential scans.', SQLERRM;
END
$$;

-- Verify (should list the four new indexes):
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'Users' AND indexname LIKE 'IX_Users_%';
