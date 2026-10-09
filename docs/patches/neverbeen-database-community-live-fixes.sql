-- Circle cover photos are uploaded as data URLs (up to 1 MB). The column was varchar(1024),
-- so the insert failed and the Circle was never saved. Converting a text column to text is a no-op.
ALTER TABLE "Circles" ALTER COLUMN "PhotoUrl" TYPE text;

-- Looks up the companionship request a member sent (answered on accept / reject / cancel).
CREATE INDEX IF NOT EXISTS "IX_Notifications_User_From_Type" ON "Notifications" ("UserId", "FromUserId", "Type");
