# Community — Guest-Mode Parity Analysis & Web-API Integration

This is the complete analysis of the Community pages, comparing how every
feature behaves in **“Explore as Guest”** mode (the seeded demo community) with
how it behaves for a **signed-in member** whose data lives in the NeverBeen Web
API (`neverbeen-api`, ASP.NET Core + PostgreSQL / Supabase). It records the gaps
found, the frontend fixes pushed in this branch, and the **API patch** and
**database patch** that must be applied to the API and database repos so the
signed-in experience matches the guest tour.

---

## 1. How the two modes work

`CommunityService` drives both modes from the same signals; the only difference
is where the data comes from.

| Aspect | Guest mode (`exploreAsGuest()`) | Signed-in member (`apiLive`) |
| ------ | ------------------------------- | ---------------------------- |
| Session flag | `demoSession = true`, no auth cookie | JWT cookie + `token()` set |
| Directory of travelers | Seeded in-browser (founder sample + ~690 demo companions) | Real companions from `GET /api/companions` |
| Journey feed | Seeded posts in `localStorage` | `GET /api/journey` |
| Message Book | Seeded comments | `GET /api/messagebook` |
| Circles / chats | Seeded | `GET /api/circles`, `GET /api/messages/conversations` |
| Notifications | Seeded | `GET /api/notifications` |
| Gallery | Seeded profile gallery | `GET /api/gallery` + `GET /api/gallery/albums` |
| Follows | Seeded graph | `GET /api/follows/followers` / `following` / `counts/{id}` |
| Writes | `localStorage` only | Write-through to the API (optimistic UI + `POST/PUT/DELETE`) |

Because both modes render from the same `companions()`, `journeyPosts()`,
`follows()` signals, a feature “works like guest mode” once the signed-in path
fills those signals from the API **and** the member directory can find members
the user is not yet connected to.

## 2. Feature-by-feature audit

Every section of the Community was audited against the guest tour. Status:
✅ already integrated, 🔧 fixed in this branch, 🩹 needs the API/DB patch.

| Feature | Guest mode | Member mode before | Status |
| ------- | ---------- | ------------------ | ------ |
| Sign-in / registration (OAuth + `POST /api/registration`) | n/a | ✅ | ✅ |
| Profile (About me, Details, presence, lock, settings, photo/cover upload) | seeded | ✅ `GET/PUT /api/profile`, `/settings`, `/photo`, `/cover` | ✅ |
| Journey feed (post, share, edit, react, comment, hide, delete) | seeded | ✅ `POST/PUT/DELETE /api/journey` | ✅ |
| Journey **comment reactions** | local | 🔧 was local-only | 🔧 now writes `POST /api/journey/comments/{id}/reactions` |
| Message Book (post, reply, react, photo, delete) | seeded | ✅ `/api/messagebook` | ✅ |
| Gallery + albums (upload, delete, cover, privacy) | seeded | ✅ `/api/gallery`, `/api/gallery/albums` | ✅ |
| Circles (create, edit, members, admins, archive, group chat) | seeded | ✅ `/api/circles` | ✅ |
| Messenger (1:1 + circle chats, reactions, read receipts) | seeded | ✅ `/api/messages` | ✅ |
| Companions (request / accept / reject / cancel / remove) | seeded | ✅ `/api/companions/{id}/…` | ✅ |
| Follows (follow / unfollow / counts) | seeded | ✅ `/api/follows/{id}` | ✅ |
| Notifications (list, read, read-all) | seeded | ✅ `/api/notifications` | ✅ |
| Devices, blocks, hidden posts, abuse reports | seeded | ✅ `/api/devices`, `/api/moderation/*` | ✅ |
| **Search box → find any traveler** | seeded directory | 🔧 searched only this member's companions | 🩹 frontend 🔧 + API patch |
| **Open any profile from search / URL (`?id=<20-digit uid>`)** | any seeded traveler | 🔧 strangers rendered a fake “Global Traveler” | 🩹 frontend 🔧 + API patch |
| **Send companion request + follow from the search drop-down** | yes | 🔧 could not reach strangers | 🩹 frontend 🔧 + API patch |
| **Visitor profile extras (their wall, gallery, follower counts)** | from seeded companion | 🔧 empty for strangers | 🩹 frontend 🔧 + API patch |

## 3. Gaps found (Requirement A & B)

The guest tour can find **any** traveler because the whole seeded directory is
in the browser. A signed-in member only holds their real companions, so three
things did not work:

1. **Search found nobody new.** The header search box only filtered
   `companions()` — i.e. people the member was already connected to. Typing a
   name that was not already a companion returned “No travelers match”.
2. **Strangers had no profile.** `/profile?id=<20-digit uid>` resolved only
   against `companions()`; any other uid rendered the fabricated
   “Global Traveler” card.
3. **No directory endpoints on the API.** `neverbeen-api` had no way to search
   members or fetch an arbitrary member's public profile, and the database had
   no indexes for a name search.

## 4. Frontend fixes (this branch)

All in `src/app` — communicates with the Web API for every directory lookup:

- **`services/community.service.ts`**
  - `searchUsers(query)` → `GET /api/users/search?query=…&limit=25`; every hit
    is **upserted** into `companions()` (with its follow flag merged into the
    local follow graph) so companion-request / follow / profile-URL all work.
    Falls back to the local directory when the API is unreachable.
  - `loadUserByUid(uid)` → `GET /api/users/uid/{uid}` (or `/api/users/{id}` for
    numeric ids) — resolves any profile URL; upserts the result.
  - `loadUserById(id, force)` → `GET /api/users/{id}` — full `CompanionDto`
    (cover photo, About-me JSON, relationship status, follow state).
  - `loadVisitorExtras(id)` → `GET /api/journey?authorId=`, `GET
    /api/gallery/users/{id}`, `GET /api/follows/counts/{id}` — a visitor's wall
    posts, gallery and follower/following counters.
  - `reactToJourneyComment()` now write-through to
    `POST /api/journey/comments/{id}/reactions`.
  - `CompanionDto.isFollowing` seeds the follow graph on every community load.
- **`layout/community-search/community-search-box.ts`** — debounced directory
  search; each result shows a **Connect / Request Sent / Connected / Respond**
  status *and* a **+ Follow / ✓ Following** button, then opens
  `/profile?id=<uid>` on click.
- **`pages/community/profile/profile.ts` + `.html`** — unknown `?id=` values are
  resolved on the member directory (with a “Looking up this traveler…” state);
  visitor walls / galleries / follow counters hydrate from the API; clicking a
  post author who is not a companion fetches their real profile.

Unit tests: 9 new tests (`services/community-api.spec.ts`,
`layout/community-search/community-search-box.spec.ts`). Full suite: **395
passed** (the 3 pre-existing `ai-models` failures are unrelated to Community).

## 5. API patch — `docs/patches/neverbeen-api-user-search.patch`

Apply in the **neverbeen-api** repo: `git apply neverbeen-api-user-search.patch`.

Adds `Controllers/UsersController.cs` (`api/users`) and extends `CompanionDto`:

- `GET /api/users/search?query=&limit=` — finds **Active** members by first /
  last / full name (and city, country, profession), name hits ranked first.
  Hides the member themself, members who switched off
  `UserSettings.SearchVisibility`, and members blocked in either direction.
  Every hit answers `status`, `isFollowing`, `mutualCompanionsCount` so the
  drop-down needs no second round trip.
- `GET /api/users/{id}` and `GET /api/users/uid/{uniqueId}` — any member's
  public profile as the same `CompanionDto` the companions endpoints answer.
  Privacy: non-public profile → `403`; `WhoCanVisitProfile`
  (`companions`/`none`) → identity cards of a locked profile; a locked profile
  hides About-me from non-companions; Pending accounts are never answered to
  other members.
- `CompanionDto.IsFollowing` is answered by the companions endpoints too.

Verified by `docs/patches/neverbeen-api-user-search-verification.py` (applies
the patch to a clean checkout, parses every `.cs` with a real C# grammar, and
runs a line-for-line port of the search + privacy logic — **all checks pass**).

## 6. Database patch — `docs/patches/neverbeen-database-user-search.patch`

Apply in the **neverbeen-database** repo (or paste the changed block into the
Supabase SQL editor): `git apply neverbeen-database-user-search.patch`.

`schema.sql` gains, next to the other `Users` indexes:

- `IX_Users_Status` (the search filters `Status = 'Active'`).
- GIN **trigram** indexes on `Users.FullName` / `FirstName` / `LastName`
  (`pg_trgm`), so `ILIKE '%query%'` name matches are index-backed.
- Both wrapped in exception-tolerant `DO` blocks and `IF NOT EXISTS` — if
  `pg_trgm` cannot be created the schema still runs and the search degrades to
  sequential scans. Fully idempotent (safe to run twice).

Verified by `docs/patches/neverbeen-database-user-search-verification.py`.

## 7. How to deploy

1. **Database:** apply `neverbeen-database-user-search.patch` (or re-run the
   updated `schema.sql`) against the Supabase project.
2. **API:** apply `neverbeen-api-user-search.patch`, then build & deploy
   `neverbeen-api`.
3. **Website:** this branch already carries the frontend integration; deploy as
   usual. No environment change is required — the frontend keeps using the same
   `/neverbeen-api` proxy.

After deployment, typing a name into the Community search box finds any
registered member; opening their profile and pressing **+ Companion Request** or
**+ Follow** writes straight to the database.
