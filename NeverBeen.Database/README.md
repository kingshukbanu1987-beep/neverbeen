# NeverBeen Database — Supabase (PostgreSQL)

The database project for the **NeverBeen Community** platform. It creates every
table the .NET 7 `NeverBeen.API` writes to:

| Area | Tables |
|---|---|
| Sign in / sign up | `Users`, `ExternalIdentities` (Google / Facebook / Microsoft SSO) |
| Profile + About Me | `Users` (details JSON, photos, verification, active status, profile lock) |
| Settings | `UserSettings` (privacy, messaging, tagging, notifications, 2FA …) |
| Login security | `LoginDevices` (phones / laptops used to sign in) |
| Gallery | `GalleryAlbums`, `GalleryPhotos` |
| Journey feed | `JourneyPosts`, `JourneyPostAudienceEntries`, `JourneyPostTags`, `JourneyPostReactions`, `JourneyComments`, `JourneyCommentReactions` |
| Message Book | `CommunityComments`, `CommunityCommentTags`, `CommentReactions` |
| Messenger | `Conversations`, `ConversationParticipants`, `ChatMessages` |
| Companionships | `Companionships` (request / accept / connected) |
| Followers / following | `Follows` |
| Circles | `Circles`, `CircleMembers`, `CircleMessages` |
| Notifications | `Notifications` |
| Moderation | `AbuseReports`, `BlockedUsers`, `HiddenPosts` |
| Lookups | `Countries`, `Cities` |

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Full DDL — tables, foreign keys, indexes, triggers (run this first) |
| `seed.sql` | Optional lookup + demo-member seed |

## Create the database on Supabase

1. Create a Supabase project (https://supabase.com) — it runs PostgreSQL.
2. Open **SQL Editor → New query**, paste `schema.sql`, press **Run**.
3. Optionally paste `seed.sql` and run it as well.
4. Grab the connection string from **Project Settings → Database**:
   - Session pooler (recommended for serverless / local dev):
     `postgresql://postgres.<project-ref>:<db-password>@aws-0.<region>.pooler.supabase.com:5432/postgres`
   - Direct connection also works.

### Alternative: Supabase CLI

```bash
supabase init                       # once, in the target repo
cp schema.sql supabase/migrations/20260929000000_init_community_schema.sql
supabase db push                    # applies the migration to the linked project
```

### Alternative: psql

```bash
psql "$SUPABASE_DB_URL" -f schema.sql
psql "$SUPABASE_DB_URL" -f seed.sql   # optional
```

## Conventions

- **PascalCase quoted identifiers** (`"Users"`, `"FullName"`) — matches the EF Core
  entity and property names used by `NeverBeen.API` one-to-one, so the API works
  against this schema without any mapping configuration.
- `timestamptz` for all `*Utc` timestamps; `timestamp without time zone` for `DateOfBirth`.
- `Users.UniqueId` (the 20-digit public profile id `89201534010000000001`) is derived
  automatically by the `TR_Users_UniqueId` trigger on insert.
- `Companionships` stores one row per pair (`UserId < CompanionId`); the requester
  column gives the direction, `Status` is `pending` or `connected`.
- Complex per-row JSON (About Me details, message reaction maps) is stored as `text`
  columns holding JSON; simple string lists (`TravelStyles`, `Hashtags`, `ImageUrls`)
  are native `text[]` arrays.
- Photos are stored as `bytea` (max 100 KB — enforced by the API) or as URLs
  (`Url`, `PhotoUrl` columns) when you keep binaries in **Supabase Storage**.

## Wiring the API

Point `NeverBeen.API` at this database (appsettings.json):

```json
"ConnectionStrings": {
  "Supabase": "Host=db.<project-ref>.supabase.co;Database=postgres;Username=postgres;Password=<db-password>;SSL Mode=Require;Trust Server Certificate=true"
}
```

The API never re-creates this schema (EF `EnsureCreated` is a no-op on an
existing Supabase database) — `schema.sql` is the single source of truth.
`seed.sql` is optional: the API seeds countries/cities on first start too.
