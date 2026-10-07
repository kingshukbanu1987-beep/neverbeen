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

### How the website reaches the API

`src/environments/environment.ts` holds the API base URL. The default `/neverbeen-api` path is
same-origin, and both the dev server and the Cloudflare Worker forward it to the deployed API:

| Where           | Forwarded by                                               | Target                                                                         |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm start`     | `proxy.conf.json` (`/neverbeen-api`)                       | `https://neverbeen-api-kingshuk.azurewebsites.net`                             |
| Deployed Worker | `worker/index.ts` (`/neverbeen-api/*`, `run_worker_first`) | `NEVERBEEN_API_URL` (defaults to the same Azure host, set in `wrangler.jsonc`) |

Point `apiBaseUrl` (or the Worker's `NEVERBEEN_API_URL`) at another host when the API moves; the
site never needs CORS changes because the browser only ever calls its own origin.

### Member sign-up (Create Neverbeen Account)

Signing up a new member is a two-step round trip to the Web API, and the browser only shows the
community profile once the database has answered:

1. **Sign in with Google / Facebook** on `/community` → the browser is sent to the provider with
   the authorization-code flow (`redirect_uri = <site origin>/auth/callback`). The provider returns
   to `/auth/callback`, and the app calls `POST /api/auth/oauth/login` with `{ provider, code }`.
   The API exchanges the code (its client secret stays server-side) and answers with a JWT — a
   brand-new account is created with the `Pending` status and the page continues to `/community/register`.
2. **Create Neverbeen Account** (`/community/register`) posts the form to `POST /api/registration` as
   `multipart/form-data` with `Authorization: Bearer <jwt>` — full name, gender, date of birth,
   country/city ids, email, profession and the profile photograph. The API stores the row in
   PostgreSQL, flips the member to `Active` and returns the stored profile, which the page shows.

The Country / State / City cascade, gender and profession lists are filled from
`GET /api/lookup/...` (with the generated seed data as the offline fallback), so every value the
form offers is one the API accepts.

When the API cannot be reached — offline development, the sandbox preview, or a visitor who never
signed in with Google/Facebook — the account is created in the browser only and the header/notice
says so (`service.accountSaveNotice()`); nothing is ever reported as saved to the database unless it was.

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
