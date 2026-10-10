-- Standalone DDL for the Community follow-feed / device-details / chat-notification
-- changes (see neverbeen-database-community-follow-feed-devices-chat.patch).
-- Safe to run on an existing NeverBeen database: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Requirement B — "Devices used" on the Settings page shows the exact device
-- model, browser, IP address, location (country, city, locality) and the
-- coordinates. The browser reports them on POST /api/devices; the LoginDevices
-- table stores them. Existing databases get the columns (no-op when present).
-- ---------------------------------------------------------------------------
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "Model"      varchar(120);
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "Country"    varchar(100);
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "City"       varchar(120);
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "Locality"   varchar(120);
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "Latitude"   double precision;
ALTER TABLE "LoginDevices" ADD COLUMN IF NOT EXISTS "Longitude"  double precision;

-- ---------------------------------------------------------------------------
-- Requirement A — the Journey feed includes the posts of the members the feed
-- owner follows; the feed query joins Follows on FollowerId = <feed owner>.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "IX_Follows_FollowerId" ON "Follows" ("FollowerId");

-- ---------------------------------------------------------------------------
-- Requirement C — the messenger writes one 'message' notification per received
-- message (Notifications page + header bell badge, one item per message).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "IX_Notifications_User_Type" ON "Notifications" ("UserId", "Type", "CreatedAtUtc" DESC);
