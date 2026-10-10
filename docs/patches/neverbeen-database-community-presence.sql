-- Presence of members (patch: community-presence): the Web API records when a member last used
-- the community (presence heartbeat, status change, sign-in or sign-out) and shows them as Away
-- after 15 minutes without use. The column is nullable with no default: a member has no last-seen
-- time until the API records one, and existing members need no backfill.
-- Idempotent: safe to run more than once, and a no-op on a database built from the updated schema.sql.
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastSeenUtc" timestamptz;
