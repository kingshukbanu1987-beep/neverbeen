# Neverbeen

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## Install dependencies

Use a supported Node.js release before installing the Angular CLI and project dependencies. Angular 21 requires Node.js 20.19+, 22.12+, or 24+; this repository uses Node 22 by default (see `.nvmrc`). npm 10.8+ or npm 11 is supported.

With `nvm` installed:

```bash
nvm install
nvm use
npm ci
```

If you do not use `nvm`, install Node.js 22 LTS first, then run `npm ci`. Use `npm install` only when you intentionally want to update the lockfile. If npm reports a missing or partially installed package, remove the incomplete install and retry from the lockfile:

```bash
rm -rf node_modules
npm ci --no-audit --no-fund
```

The `engines` entry in `package.json` makes an unsupported Node/npm version visible during installation instead of failing later with an Angular CLI error.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Routes

| Path             | Page       | Notes                                                                                                |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `/`              | Home       | Hero, how it works, destinations, gallery (20 random collection stills), pricing, FAQ, contact       |
| `/audience`      | Audience   | Who NeverBeen is for, age note, destination list, privacy promises                                   |
| `/collection`    | Collection | Mobile-gallery wall of every photograph in `public/collection`; tap to enlarge, tap outside to close |
| `/founder`       | Founder    | Founder profile and expertise                                                                        |
| `/documentation` | Brochure   | Visitor brochure: 36 pages on how to place a Neverbeen Request, packages and destinations            |
| `/ai-models`     | AI Models  | Dark studio directory and individual model portfolios at `/ai-models/:slug`                          |
| `/login`         | Login      | Sign-in form                                                                                         |

## NeverBeen AI Models

The `/ai-models` page is a dark, magenta-accented studio directory that opens on a short, plain title
bar — no artwork or decorative panels. Portfolios appear in the published order (`order` in
`data/ai-models/profiles.json`) and every cover states, in large bold type, how many photographs that
model has in her portfolio. Each cover opens its own
portfolio at `/ai-models/:slug`: an Instagram-style profile header (avatar, handle, photographs
count, location, age, height, weight, body shape, tags and short introduction) above a photo grid that
is shuffled into a fresh random order on every visit — with a **Shuffle** control in the toolbar for
another arrangement on demand.
Clicking any photograph expands it in a full-screen pop-up that can be browsed with the arrow keys,
the on-screen arrows, the thumbnail strip or a swipe on mobile, with a grid/feed layout switch.
Right below the personal details, a **Videos** reel plays the clips from the model's own
`<album>/video/` folder: tap a clip to open it in the portfolio's player — play, pause, stop, scrub,
volume, playback speed, previous/next clip, picture-in-picture, true full screen (F or a double
click) and a **Download** button for the file. Tapping the picture plays or pauses it, and
Space/K, ←/→, ↑/↓ and M work as shortcuts.
Unspecified fields remain blank; randomized or unverified profile details are marked as illustrative
until verified.

Each model owns one album folder inside `public/NeverBeenModels`, named after the model with no
spaces (for example `public/NeverBeenModels/NourhanDurrani`). Drop the model's photographs into that
folder and they appear in the portfolio grid; the first image (or the one named `cover.*`) is used as
the cover and avatar. Each model's album also holds a `video/` sub-folder — drop the clips in there
and they appear in her portfolio's video reel, in file-name order. Nothing needs to be run or edited:
while `npm start` is running an album
watcher regenerates the manifest as the files land and the dev server reloads the page, `npm run
build` refreshes it in its prebuild step, and a brand-new folder becomes a new portfolio page on its
own. Optional details live in `<album>/profile.json` or in `data/ai-models/profiles.json` — see
`data/ai-models/README.md` for the metadata format and `public/NeverBeenModels/README.md` for the
folder layout. The legacy `public/ai-model-assets/portraits` and `public/ai-model-assets/gallery`
folders remain supported.

Uploaded or attached photographs are filed with

```bash
npm run ingest:model-photos -- <source-folder>   # defaults to /home/user/uploads
```

which copies each image into its model album with a readable name and caption
(`scripts/model-ingest-map.json` holds the album, filename and caption for each attachment), records
the album's frame order in its `profile.json` and regenerates the manifest in one step. It is safe to
run repeatedly: a photograph already in the album is never copied twice, and a UUID-named file left
by an upload is renamed in place.

### Renting a model

Every portfolio carries a **Rent this model** button with a `From ₹550 per photograph` hint. It opens
an ultra-modern dark booking pop-up that matches the studio directory: a calendar for the **delivery
date**, the model's booking information, and a **Rate per Photo** in INR. Prices start at ₹550 a
photograph and each model quotes her own rate, published in `data/ai-models/profiles.json`:

```jsonc
"photoRate": 550,
"photoNote": "Rates are in INR per photograph. Ten photographs is the minimum order; travel, styling and usage buyout are quoted separately."
```

The pop-up offers **10 photographs** (the minimum order), **25**, **50** and **100**, each priced at
that model's per-photo rate (10 photographs at ₹550 is ₹5,500, 100 at ₹550 is ₹55,000), plus a
**Customized order** for anything else. A customized order is a selective charge: it carries no price
and the studio quotes it after reading the brief.

The form selects **25 photographs** by default. Priced orders show a **5% service tax** and final
payable total. A validated flat coupon reduces the subtotal before the 5% service tax is calculated;
the payable amount never goes below zero. Add or update codes in
`src/app/pages/ai-models/booking/coupons.json`; each entry
has a `code`, flat `discountInr`, and inclusive `expiresOn` date (`YYYY-MM-DD`, through the end of that
date in India Standard Time).

Submitting a valid form builds a WhatsApp message with the model, order, delivery date and client
information, then opens a prefilled chat to the Founder — the same direct `wa.me` flow used by the
Feedback and homepage request forms. The visitor reviews the message and presses **Send** in WhatsApp
to submit it; if a browser blocks the new tab, the booking confirmation includes a retry button and a
direct link. No WhatsApp Cloud API credentials are needed for this browser flow.

The Worker also retains `POST /api/model-booking` for server-side integrations. That endpoint uses
the WhatsApp Cloud API when configured, and the local development stand-in
(`scripts/dev-booking-api.mjs`) writes to the gitignored `booking-outbox.log` when those credentials
are absent. These endpoints are separate from the portfolio form's direct WhatsApp handoff.

## The Collection page

Photographs shown on `/collection` live in `public/collection`. Drop image files (`jpg`, `jpeg`,
`png`, `webp`, `avif`, `gif`) into that folder — sub-folders become album headings — then run:

```bash
npm run generate:collection
```

This rewrites the generated manifest `src/app/pages/collection/collection-photos.ts`. `npm start`
and `npm run build` run the generator automatically, so photographs added to the folder appear on
the page without any further wiring. Titles are derived from the file names and can be overridden with
an optional `public/collection/captions.json` (see `public/collection/README.md`).

Photographs attached in Arena chat land in `/home/user/uploads` as UUID-named files. Run

```bash
npm run ingest:collection
```

to copy them into `public/collection` with readable names and captions
(`scripts/collection-ingest-map.json` holds the name/caption/album for each attachment) and
regenerate the manifest in one step.

While `public/collection` is empty, the page shows the sample studio photographs from
`public/audience` so it is never blank.

## The Gallery on the home page

The **Explore Gallery** section on `/` is not a hand-picked list: it draws 20 photographs at random
from the Neverbeen Collection on every page load, so each refresh shows a different set of stills.
The sample is a Fisher–Yates draw (`src/app/shared/random-sample.ts`), so a photograph never repeats
inside one view, and the pool is the same generated manifest that powers `/collection` — add
photographs to `public/collection` and they join the rotation automatically. The number twenty lives
in `GALLERY_PHOTO_COUNT` (`src/app/home/gallery/gallery.ts`). Only the section copy stays editable in
Admin Console → Website Management.

## The brochure (`/documentation`)

The Documentation page publishes a single client-facing PDF — the **NeverBeen visitor brochure**
(`public/assets/documentation/NeverBeen_Brochure.pdf`). It is written for people who are thinking
about submitting a NeverBeen Request, not for developers: 51 landscape pages with vibrant
backgrounds and collection photography, covering the idea behind NeverBeen, how to place a request,
the photo kit, verification and privacy, packages and prices, how to use each page of the website,
the destination atlas, FAQs and policies. The opening cover is a full-bleed Lofoten scene with a
single centered headline; the remaining core pages mix graphic layouts with destination photography.

The brochure now includes 24 traveller-quotation slides. Ten existing quotations remain in their
original shuffled positions (`INSERT_AFTER` in `brochure-testimonials.js`). Fourteen additional
stories are inserted after irregularly spaced pages 05–35 of the previous 37-page sequence, bringing
the complete PDF to 51 pages. Their full-bleed travel photographs are rendered at 100% image opacity;
small white quote copy and attributions sit over a separate, restrained navy wash so the scenery stays
prominent. The traveller and group portraits keep phones out of frame; scenes include Marina Bay,
the Petronas Towers, the Eiffel Tower, Netherlands tulips, Innsbruck, Maya Bay, the Black Forest,
Antarctica, Times Square, London, the Burj Khalifa in Downtown Dubai and a Scottish Highlands castle. The 14 new speaker names,
locations and quotes are illustrative placeholders (marked **SAMPLE TESTIMONIAL** in the PDF), not
verified customer reviews; replace them with approved customer feedback before public use. The
questions page prints every question in white and the answer beneath it in yellow over a dark wash.

The remaining pages carry the NeverBeen logo in the header and the copyright line in the footer, and
the back cover holds the studio contact block.

Rebuild it after changing copy, prices or photographs:

```bash
npm run generate:brochure
```

The generator lives in `docs/presentation/generate-neverbeen-brochure.js` with its page content in
`docs/presentation/lib/brochure-pages-1.js` / `brochure-pages-2.js`, the quotation pages in
`brochure-testimonials.js`, its design toolkit in
`brochure-kit.js`, and open-licence fonts (Poppins and Playfair Display, SIL OFL) in
`docs/presentation/fonts`. Photo frames are filled edge to edge — no letterboxing — and
`docs/presentation/lib/photo-focus.json` records where the subject sits in each photograph so the
crop is anchored on the face instead of cutting it off. Regenerate that map after adding or
replacing photographs:

```bash
pip install --break-system-packages "opencv-python-headless==4.10.0.84"
python3 scripts/generate-photo-focus.py
```

The script reads the generated collection manifest, so the stills it prints are the same ones that
appear on `/collection`. PDFKit is a devDependency for exactly this script.

The contact details printed on the pages live in the `CONTACT` object at the top of the generator —
replace the placeholder email, WhatsApp number and domain with the live studio details.

## Community Backend API

The NeverBeen Community backend is the ASP.NET Core Web API in the separate
[`neverbeen-api`](https://github.com/kingshukbanu1987-beep/neverbeen-api) repository, backed by
PostgreSQL on Supabase (deployed to the Azure App Service `neverbeen-api-kingshuk`). It powers:

- **OAuth (SSO) authentication** with Google, Facebook, and Microsoft Outlook accounts
- **New member registration**
- **User profiles** (About Me, Details, Gallery, Settings)
- **Photo storage** for avatars and galleries
- **Community Message Book** (posts, nested replies, like/dislike reactions)
- **Geographic and profession lookup data**
- **The complete community**: companions, circles, the Journey feed (posts, comments,
  reactions, shares, tags, hides), 1:1 and circle chats, notifications, the gallery
  (photos and albums), followers/following, login devices, moderation state and the
  Settings section — signed-in members read and write all of it through the API

### How the website reaches the API

**`apiBaseUrl` in `src/environments/environment.ts` (development) and
`src/environments/environment.prod.ts` (production build) is the API address — change it there and
rebuild.** Both files default to the deployed API:

```
https://neverbeen-api-kingshuk-cqexbcb5hqbqavdb.westus3-01.azurewebsites.net
```

In this mode the browser calls the API directly, so the API must allow this site's origin in
`Cors:AllowedOrigins` (`appsettings.json`):

- deployed site — `https://youneverbeen.kingshukbanu1987.workers.dev` (already listed)
- local development — `http://localhost:4200` (already listed)
- sandbox preview — the preview's own origin, e.g. `https://4200-<sandbox>.e2b.app`

A blocked origin shows up as a failed request with **no** HTTP status in the browser console
(`Access to XMLHttpRequest … has been blocked by CORS policy`); the registration page then reports
the API address and the origin that has to be allowed.

**Alternative — CORS-free same-origin mode.** Set `apiBaseUrl: '/neverbeen-api'` in both environment
files and let a proxy forward the path to the API server-side (no CORS entry needed at all):

| Where           | Forwarded by                                               | Target                                                                                        |
| --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm start`     | `proxy.conf.json` (`/neverbeen-api`)                       | the Azure host above (change it for a local API: `http://localhost:5080`, keep `pathRewrite`) |
| Deployed Worker | `worker/index.ts` (`/neverbeen-api/*`, `run_worker_first`) | `NEVERBEEN_API_URL` in `wrangler.jsonc` (same Azure host by default)                          |

Every API failure is reported with the URL that was called, the reason (timeout / unreachable /
wrong address) and the origin that must be in `Cors:AllowedOrigins`, both in the UI and — with the
technical detail — in the browser console (`[neverbeen] … failed at <url>`).

### Member sign-up (Create Neverbeen Account)

Signing up a new member is a two-step round trip to the Web API, and the browser only shows the
community profile once the database has answered:

1. **Sign in with Google / Facebook** on `/community` → the browser is sent to the provider with
   the authorization-code flow (`redirect_uri = <site origin>/auth/callback`). The provider returns
   to `/auth/callback`, and the app calls `POST /api/auth/oauth/login` with `{ provider, code }`.
   The API exchanges the code (its client secret stays server-side) and answers with a JWT — a
   brand-new account is created with the `Pending` status and the page continues to `/community/register`.
2. **Create Neverbeen Account** (`/community/register`) posts the form to `POST /api/registration` as
   `multipart/form-data` with `Authorization: Bearer <jwt>` — full name, **first name, last name and
   state**, gender, date of birth, country/city ids, email, profession and the profile photograph.
   The API stores the row in PostgreSQL, flips the member to `Active` and returns the stored
   profile, which the page shows.

The Country / State / City cascade, gender and profession lists are filled from
`GET /api/lookup/...` (with the generated seed data as the offline fallback), so every value the
form offers is one the API accepts.

When the API cannot be reached — offline development, the sandbox preview, or a visitor who never
signed in with Google/Facebook — the account is created in the browser only and the header/notice
says so (`service.accountSaveNotice()`); nothing is ever reported as saved to the database unless it was.

### First name, last name and state on the member row

The registration page collects First name, Last name and State, and the member row keeps them in
dedicated columns (`Users.FirstName`, `Users.LastName`, `Users.State`). The page posts them as the
extra multipart fields `firstName`, `lastName` and `state` next to `fullName`, and reads the stored
values back out of the profile DTO (`GET /api/profile/me`, `GET /api/profile/{id}`).

The API half of that change ships as
[`docs/patches/neverbeen-api-registration-names-state.patch`](docs/patches/neverbeen-api-registration-names-state.patch):
apply it to the `neverbeen-api` checkout and redeploy —

```bash
cd neverbeen-api
git am /path/to/neverbeen/docs/patches/neverbeen-api-registration-names-state.patch
```

It adds the three fields to `RegistrationRequest`, writes them on the member row, answers them in
the `ProfileDto`, accepts them in `PUT /api/profile`, fills the name columns of the `Pending` row
from the provider's `given_name` / `family_name`, and splits them out of `fullName`
("Kingshuk Banu" → `Kingshuk` / `Banu`) for clients that only post the full name.
[`docs/patches/neverbeen-api-registration-names-state-verification.py`](docs/patches/neverbeen-api-registration-names-state-verification.py)
checks the patched sources and those split rules (there is no .NET SDK in the build sandbox):

```bash
python3 docs/patches/neverbeen-api-registration-names-state-verification.py /path/to/neverbeen-api
```

Until the API is patched it silently ignores the three extra form fields, so the columns stay empty —
the page still shows the submitted names and state from its own copy of the profile, but nothing is
stored in the database.

### Complete community ↔ API integration

Every community dataset of a signed-in member is loaded from the Web API and every change is
written straight back to it (`CommunityService` → `ensureCommunityLoaded()` / `refreshCommunityFromApi()`
plus the write-through calls in each mutating method). The mapping:

| Community area        | Reads from                                                                                      | Writes to                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Companions            | `GET /api/companions`                                                                            | `POST /api/companions/{id}/request`, `…/accept`, `…/reject`, `DELETE /api/companions/{id}` + `…/request`                                |
| Circles               | `GET /api/circles`, `GET /api/circles/{id}/messages`                                             | `POST/PUT/DELETE /api/circles…`, members, admins, `POST /api/circles/{id}/messages`                                                     |
| Journey feed          | `GET /api/journey?pageSize=…`                                                                    | `POST/PUT/DELETE /api/journey…`, reactions, comments, hide, tags (`taggedCompanionIds`)                                                 |
| Message Book          | `GET /api/messagebook?…&includeReplies=true`                                                     | `POST /api/messagebook`, `POST /api/messagebook/{id}/reactions`, `DELETE /api/messagebook/{id}`                                          |
| Chats                 | `GET /api/messages/conversations`, `GET /api/messages/conversations/{id}`                        | `POST /api/messages/conversations`, `…/messages`, `…/read`, `POST /api/messages/{id}/reactions`                                          |
| Notifications         | `GET /api/notifications`                                                                         | `POST /api/notifications/read-all`, `POST /api/notifications/{id}/read`                                                                  |
| Gallery               | `GET /api/gallery`, `GET /api/gallery/albums`                                                    | `POST /api/gallery` (multipart), `DELETE /api/gallery/{id}`, `POST/PUT/DELETE /api/gallery/albums…`, `PUT /api/gallery/albums/{id}/photos/{photoId}` |
| Followers / Following | `GET /api/follows/counts/{id}`, `/api/follows/followers`, `/api/follows/following`               | `POST /api/follows/{id}`, `DELETE /api/follows/{id}`                                                                                     |
| Devices               | `GET /api/devices`                                                                               | `POST /api/devices/{id}/block?blocked=…`                                                                                                 |
| Moderation            | `GET /api/moderation/blocks`, `/hidden-posts`, `/reports`                                        | `POST /api/moderation/reports`, `POST/DELETE /api/moderation/blocks/{id}`, `POST/DELETE /api/journey/{id}/hide`                           |
| About me & profile    | `GET /api/profile/me`, `GET /api/profile/{id}`                                                   | `PUT /api/profile` (details + structured About-me JSON + presence + lock), `PUT/DELETE /api/profile/photo`, `PUT/DELETE /api/profile/cover` |
| Settings              | `settings` section of the profile DTO                                                            | `PUT /api/profile/settings` (including the blue-tick verification)                                                                        |
| Member directory      | `GET /api/users/search?query=…`, `GET /api/users/{id}`, `GET /api/users/uid/{uniqueId}`, `GET /api/journey?authorId=…`, `GET /api/gallery/users/{id}` | `POST /api/companions/{id}/request` (Companion Request), `POST /api/follows/{id}` (Follow) — straight from the search drop-down            |

The guest tour keeps its seeded demo community in this browser; nothing above runs for it
(`apiLive` is false without a real member session), and when the API cannot be reached the
pages degrade to their local behaviour instead of losing data.

### Member directory — search finds every registered traveler

The guest tour can find any traveler because the whole seeded directory lives in the browser.
A signed-in member holds only their real companions, so the header search box and the
`/profile?id=<20-digit uid>` route now ask the API's member directory
(`searchUsers()`, `loadUserByUid()`, `loadUserById()`, `loadVisitorExtras()` in
`CommunityService`): typing a name finds **any Active member** by first / last / full name (plus
city, country, profession) with a **+ Follow / ✓ Following** button and a Connect / Request Sent /
Connected status on every hit; clicking a hit opens `/profile?id=<uid>`, which resolves that
member on the API (never the fabricated “Global Traveler” card), and the visitor wall, gallery
and follower counters hydrate from it. Companion requests and follows sent from the drop-down or
the profile write straight through to the API.

The API half ships as [`docs/patches/neverbeen-api-user-search.patch`](docs/patches/neverbeen-api-user-search.patch)
and the database half as [`docs/patches/neverbeen-database-user-search.patch`](docs/patches/neverbeen-database-user-search.patch)
— apply them to the `neverbeen-api` and `neverbeen-database` checkouts:

```bash
cd neverbeen-api   && git apply /path/to/neverbeen/docs/patches/neverbeen-api-user-search.patch
cd neverbeen-database && git apply /path/to/neverbeen/docs/patches/neverbeen-database-user-search.patch
```

The API patch adds `api/users` (`UsersController`): the search endpoint (name hits ranked first;
hides the member themself, members who switched off `UserSettings.SearchVisibility`, and members
blocked either way) and `GET /api/users/{id}` / `/uid/{uniqueId}` answering the same
`CompanionDto` the companions endpoints use, with the profile's own privacy rules applied (a
non-public profile answers 403; a locked profile hides the About-me from non-companions; a
Pending account is never answered to other members). The database patch adds `IX_Users_Status`
and GIN trigram indexes on `Users.FullName` / `FirstName` / `LastName` (`pg_trgm`), all
idempotent and exception-tolerant. Both verification scripts check the patched sources (there is
no .NET SDK / PostgreSQL in the build sandbox):

```bash
python3 docs/patches/neverbeen-api-user-search-verification.py /path/to/neverbeen-api
python3 docs/patches/neverbeen-database-user-search-verification.py /path/to/neverbeen-database
```

Until both patches are applied the directory searches degrade to the member's own companions
(the guest-tour behaviour), and unknown profile ids show the local placeholder instead of a
fabricated card. The full parity analysis lives in
[`docs/community-guest-parity-analysis.md`](docs/community-guest-parity-analysis.md).

Five pieces of that table ship as the API patch
[`docs/patches/neverbeen-api-community-complete.patch`](docs/patches/neverbeen-api-community-complete.patch)
— apply it to the `neverbeen-api` checkout and redeploy:

```bash
cd neverbeen-api
git am /path/to/neverbeen/docs/patches/neverbeen-api-community-complete.patch
```

It adds the cover-photo endpoints (`PUT/DELETE /api/profile/cover`, `GET /api/profile/{id}/cover`),
accepts the structured About-me JSON and the presence columns in `PUT /api/profile`, persists the
work/university verification in `PUT /api/profile/settings`, takes `taggedCompanionIds` on Journey
create/update, and stores the attached photograph of a message book entry.
[`docs/patches/neverbeen-api-community-complete-verification.py`](docs/patches/neverbeen-api-community-complete-verification.py)
checks the patched sources and ports the new request-handling rules (there is no .NET SDK in the
build sandbox):

```bash
python3 docs/patches/neverbeen-api-community-complete-verification.py /path/to/neverbeen-api
```

Until the API is patched the affected features fall back gracefully: the cover photo and the
presence change stay on the member's own browser, tagged companions are applied one tag request at
a time by the older endpoint, and message book entries with a picture keep their picture locally.

### Online Now, the chat pop-up and the API “online” rule

The community decides who is online from the member's **status**, not from a heartbeat flag: Active, Busy,
Don't Disturb, Away and any Custom status all appear in **Online Now** (Messenger page) and **Online Companions**
(the profile right rail) with that status beside their name; only **Inactive** — chosen, or set by signing out —
moves them to **Offline Companions**. The chat pop-up always opens on the latest message and follows every
message that arrives, shows both travellers' pictures with `#EBEBEB` (theirs, black text) and `#6829FF` (mine,
white text) bubbles, and heads each chat session with its date and time (`3 Oct 2026, 07:54`). All of that is
described in [`docs/community-messenger-chat.md`](docs/community-messenger-chat.md) and
[`docs/community-presence.md`](docs/community-presence.md).

The website needs no API change for it — it reads `ActiveStatus` and `LastSeenUtc` — but the API answered
`IsOnline = presence == "Active"`, which is narrower than the rule. That ships as
[`docs/patches/neverbeen-api-community-online-status.patch`](docs/patches/neverbeen-api-community-online-status.patch)
(against `neverbeen-api` `94fa5fb`, which already contains the presence patch; no database change is needed):

```bash
cd neverbeen-api
git apply /path/to/neverbeen/docs/patches/neverbeen-api-community-online-status.patch
python3 /path/to/neverbeen/docs/patches/neverbeen-api-community-online-status-verification.py .
```

`PresenceRules.IsOnline(status)` is now `status != "Inactive"` and `CompanionsController.ToCompanionDto` uses it
for `CompanionDto.IsOnline`, so the API and the website give the same answer for every status and last-seen time.

### Real member vs “Explore as Guest” — where the demo data lives

Everything the seeded community holds — the founder's sample profile, the demo travellers, the
travel circles, the Journey feed, the Message Book, the seeded chats, notifications and login
devices — is **demo data for the guest tour**. It is never shown to a member who signed in:

| Session                                            | What the community shows                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| “Explore as Guest” — the button on `/community`     | the complete seeded demo community (profile, travellers, circles, feed, message book, chats)    |
| Signed out, before choosing the tour                | **no demo data** — the sign-in page, or empty states in the areas a member would fill           |
| Signed in with Google / Facebook (or restored from the auth cookie) | **no demo data** — the Web API's own data, or an empty state while a feature has no API call yet |
| The Admin Console (`/admin/**`, a site-owner preview)                 | the seeded community — it manages the seeded members, posts, circles and notifications (`openAdminConsolePreview()`, refused while a real member session is open) |

The gate lives in `src/app/services/community.service.ts`:

- `demoSession` is **only** turned on by `exploreAsGuest()` (plus the specs' test-only
  `community-demo.testing.ts` helper), and the seed loaders (`loadComments`, `loadJourneyPosts`,
  `loadCompanions`, `loadFollows`, `loadCircles`, `loadPendingChats`, `loadNotifications`,
  `loadDevices`) return their seed only when it is set. A signed-out visitor who has not taken the
  tour sees the same empty community a member sees.
- `enterMemberSession()` runs the moment a Google / Facebook / Web-API session starts — and
  `startMemberSession()` when the app is opened with an auth cookie. Guest browsing ends, the demo
  datasets are removed from this browser (`neverbeen_demo_community` marks them) and the in-memory
  lists are re-read, so nothing from the tour can appear beside the member's own data. Signing out
  clears them again.
- Nothing is invented for a member: the sign-in page has no “Account status” preview toggle any
  more, and when the provider cannot hand over an identity the app opens the (empty) registration
  form instead of a demo account.
- A member's own profile is never replaced by the seeded founder profile: a stored profile that came
  from the demo (`isSeedProfile()` — a `@neverbeen.example` address or the bundled founder photo) is
  dropped and the profile is reloaded from `GET /api/profile/me` instead.
- The areas the Web API does not answer yet (Journey feed, Message Book, Companion directory …)
  render an empty state — “Nothing here yet” — instead of being hidden or filled with demo data.

The website, brochure, AI model studio, live travel feeds and the Admin Console are unaffected.

## Deploying to Cloudflare Pages

Create a Pages project connected to this repository with these settings:

- Build command: `npm run build`
- Build output directory: `dist/neverbeen/browser`
- Node.js version: `22`

The `public/_redirects` file is copied into the production output and routes all paths to `index.html`, so Angular routes such as `/login` work when opened directly.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
