# Community presence: Active, Away, Inactive and last seen

## Rules

| When | Status | Notes |
|---|---|---|
| The member signs in | **Active** | Set by the Web API on OAuth sign-in (`POST /api/auth/oauth/login`). |
| The member signs out | **Inactive** | Whatever status they had. Set by `POST /api/presence/sign-out`. |
| The member is not using the community for more than **15 minutes** | **Away** | Automatic, not a choice. Closing the browser, switching tab or app, or sitting idle all count as not using it. |
| The member uses the community again | Their chosen status returns | Away does not overwrite the chosen status (for example Busy comes back). |

"Using the community" means the page is visible, the window is focused, and the member has given input (pointer,
keyboard, touch or scroll) within the last 15 minutes.

**Last seen** (`Users.LastSeenUtc`) is shown beside Away and Inactive everywhere a status is shown: profile
pages, post and comment authors, the companions lists, chats, the hover card and the presence dot tooltip.
A member with no recorded last-seen time is shown as "last seen recently".

The status a member chooses (Active, Busy, Don't Disturb or Custom) is what they see on their own profile. The
choice of Away is removed from the dropdown because Away is now automatic. Inactive is still a choice.

## Who is in “Online Now” and who is in “Offline Companions”

**Every status except Inactive is online.** A member whose status is Active, Busy, Don't Disturb, Away or any
Custom status appears in the **Online Now** list of the Messenger page and in the **Online Companions** panel on
the right of the profile home page, with that status beside their name (and the matching dot colour). The moment
their status is Inactive — because they chose it, or because signing out set it — they leave both lists and are
listed under **Offline Companions** on the Messenger page with their last-seen time.

The rule is `status !== 'Inactive'` on the effective status (so Away counts as online):

- **Browser** — `CommunityService.companionIsOnline()`, used by the `onlineCompanions` / `offlineCompanions`
  computed lists in `src/app/services/community.service.ts`. Both the Messenger page and the profile right rail
  read those two lists, so they can never disagree.
- **Web API** (`neverbeen-api`, patch `docs/patches/neverbeen-api-community-online-status.patch`) —
  `PresenceRules.IsOnline(status)` is now `status != "Inactive"`, and `CompanionsController.ToCompanionDto`
  uses it for `CompanionDto.IsOnline`. Before this patch the API answered `IsOnline = presence == "Active"`,
  which pushed Busy, Don't Disturb, Away and Custom members into the offline list even though the website
  showed them as online.

The Admin Console keeps its own seeded presence and is not part of this rule.

## How it is kept up to date

- **Browser** (`src/app/services/community.service.ts`, `community-presence.ts`): while the page is in use it
  reports the member's last input to `POST /api/presence/heartbeat` about once a minute, on the first input
  after a pause, and when the page is hidden or loses focus (sent with `keepalive`, so it survives closing the tab).
  The browser also re-evaluates Away every 30 seconds, so the wording is current between API reads.
- **Web API** (`neverbeen-api`, patch `docs/patches/neverbeen-api-community-presence.patch`): `Common/PresenceRules.cs`
  holds the rules. Other members see the effective status (for example in companion lists and author cards). The
  member's own `GET /api/profile/me` returns their stored choice.
- **Database** (`neverbeen-database`, patch `docs/patches/neverbeen-database-community-presence.patch`, and the
  standalone `neverbeen-database-community-presence.sql`): adds the nullable `Users.LastSeenUtc timestamptz` column.

## Applying the API and database changes

The API and database repositories are separate. Apply the patches to checkouts at the commits they were made
against (`neverbeen-api` `e68f5eb`, `neverbeen-database` `4f892e8`):

```bash
git -C neverbeen-api apply docs/patches/neverbeen-api-community-presence.patch
git -C neverbeen-database apply docs/patches/neverbeen-database-community-presence.patch
# run the migration on existing databases (idempotent):
psql "$DATABASE_URL" -f docs/patches/neverbeen-database-community-presence.sql
```

The “Online Now” rule above is a second, later API patch, made against `neverbeen-api` `94fa5fb` (which already
contains the presence patch). It changes only `Common/PresenceRules.cs` and `Controllers/CompanionsController.cs`
and needs **no database change** — `Users.ActiveStatus` and `Users.LastSeenUtc` already hold everything it reads:

```bash
git -C neverbeen-api apply docs/patches/neverbeen-api-community-online-status.patch
python3 docs/patches/neverbeen-api-community-online-status-verification.py /path/to/neverbeen-api
```

Until it is applied the website still lists Busy, Don't Disturb, Away and Custom members as online — it decides
from `ActiveStatus` and `LastSeenUtc`, not from `IsOnline` — but any list that reads `IsOnline` (the member
directory search, once the API ships it) would answer the old, narrower rule.

Each patch has a verification script that checks it applies, parses the C# (tree-sitter), checks the rules and the
SQL against a live PostgreSQL:

```bash
python3 docs/patches/neverbeen-api-community-presence-verification.py /path/to/neverbeen-api
python3 docs/patches/neverbeen-database-community-presence-verification.py /path/to/neverbeen-database
```

The database script needs `pip install pgserver "psycopg[binary]"`; without them the live checks are skipped.
The API script needs `pip install tree-sitter tree-sitter-c-sharp`. No .NET SDK was available when these were
written, so the C# was checked by parsing and by a line-for-line port of the rules, not by a compile.

## Not covered

- The user search endpoint (`GET /api/users/search`) is not on the API's `main` branch yet. When it is added, its
  result should use `PresenceRules.Effective` and return `LastSeenUtc`, like the companion DTO.
- The admin console uses its own seeded presence and is not changed.
