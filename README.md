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

The `/ai-models` page is a dark, magenta-accented studio directory. Each cover opens its own
portfolio at `/ai-models/:slug`, with the model's name, location, age, height, weight, body shape,
short introduction and optional photo gallery. No profile details are invented when a field has
not been supplied.

Add cover portraits to `public/ai-model-assets/portraits` and put each model's details in
`data/ai-models/profiles.json`. The cover filename (without its extension) becomes the displayed
model name. Additional images go in `public/ai-model-assets/gallery` and can be referenced in the
matching profile's `gallery` array. See `data/ai-models/README.md` for the metadata format. Refresh the
manifest with `npm run generate:ai-models`; `npm start` and `npm run build` run it automatically.

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

The NeverBeen Community backend is an ASP.NET Core (.NET 7) Web API located in [`NeverBeen.API/`](./NeverBeen.API/README.md). It powers:

- **OAuth (SSO) authentication** with Google, Facebook, and Microsoft Outlook accounts
- **New member registration**
- **User profiles** (About Me, Details, Gallery, Settings)
- **Photo storage** for avatars and galleries
- **Community Message Book** (posts, nested replies, like/dislike reactions)
- **Geographic and profession lookup data**

See the [NeverBeen.API README](./NeverBeen.API/README.md) for architecture, configuration, database options (Azure SQL and SQLite), and API endpoints.

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
