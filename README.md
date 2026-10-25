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

| Path                      | Page           | Notes                                                                                                |
| ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `/`                       | Home           | Hero, how it works, destinations, gallery (20 random collection stills), pricing, FAQ, contact       |
| `/audience`               | Audience       | Who NeverBeen is for, age note, destination list, privacy promises                                   |
| `/collection`             | Collection     | Mobile-gallery wall of every photograph in `public/collection`; tap to enlarge, tap outside to close |
| `/founder`                | Founder        | Founder profile and expertise                                                                        |
| `/documentation`          | Brochure       | Visitor brochure: 36 pages on how to place a Neverbeen Request, packages and destinations            |
| `/ai-models`                  | AI Models       | Dark studio directory and model portfolios at `/ai-models/:slug` (12 random photographs each)        |
| `/ai-models/:slug/biography`  | Model biography | White encyclopedia-style fictional biography with story-placed images and degree-only education     |
| `/ai-models/:slug/photos`     | AI Model album  | A model's complete album as a mosaic of differently sized, zoomable photographs                      |
| `/ai-models/:slug/portfolio`  | Model portfolio document | The generated 24-page portfolio PDF (Watch / Download); a plain white notice page when none exists |
| `/login`                  | Login          | Sign-in form                                                                                         |

## NeverBeen AI Models

The `/ai-models` page is a dark, magenta-accented studio directory that opens on a short, plain title
bar — no artwork or decorative panels. Portfolios appear in the published order (`order` in
`data/ai-models/profiles.json`) and every cover states, in large bold type, how many photographs that
model has in her portfolio. Opening a model's profile and coming back — with the browser's Back
button or with the profile's own **All AI models** link — returns the directory to the same card at
the same scroll position, with the search, sort and availability filter the visitor had chosen
still applied. Every card keeps its blocks tight on minimum padding — the **Starting
Price / Photograph** row, the photograph and video counts, the **Preview** capsule and the Seen /
Likes / Comments / Shares row read as one compact column rather than a stack of separated panels.
Each cover opens its own
portfolio at `/ai-models/:slug`: an Instagram-style profile header (avatar, handle, photographs
count, location, age, height, weight, body shape, tags and short introduction) above a photo grid of
**12 photographs drawn at random** from the album on every visit — with a **Shuffle** control in the
toolbar for another draw on demand and a grid/feed layout switch. When the album holds more than 12,
the twelfth tile becomes a **View All** tile (`+N`) that opens the complete album at
`/ai-models/:slug/photos`: every photograph, cover first, set in an editorial mosaic of differently
sized tiles (2, 3 or 4 columns depending on the available width), with a floating **Back to
portfolio** button that returns straight to the portfolio grid.

Clicking any photograph — on either page — expands it in a full-screen viewer that can be browsed
with the arrow keys, the on-screen arrows, the thumbnail strip or a swipe on touch screens. Every
photograph zooms up to 5×: with the mouse wheel or a trackpad pinch (zooming in at the cursor), a
two-finger pinch on phones, tablets and touchscreen laptops, a double-click or double-tap, the
on-screen −/+ buttons or the `+`, `-` and `0` keys; once zoomed it can be dragged around (or moved
with the arrow keys), and the zoom readout resets it to fit. Zooming never changes the photograph:
only a single-finger swipe at normal size moves to the next or previous frame, so pinches, pans and
the finger left over after a pinch always stay on the current photograph. The viewer opened from the
portfolio browses the 12 photographs on show and links to the complete album.

**Cinematic Preview:** the viewer on both the portfolio and View All page offers **Preview**, and so
does every card in the `/ai-models` directory — the same transparent capsule, only stretched across
the whole row and set directly under the photograph and video counts, so a visitor can play a
model's album without opening her portfolio first.
It plays the model's **complete public photo album**, not just the 12 visible profile tiles.
Every shuffled loop contains each photograph once, with no repeat at the loop boundary when
there is more than one photo. `PremiumContent/` photos are excluded and the premium viewer does
not offer Preview. Centered, edge-to-edge cover crops fill portrait and landscape viewports
(no letterboxing), alternating a 4-second slow zoom-in with a 5-second zoom-out and soft crossfades.
Photos are decoded ahead of transitions; on a slow connection the current image stays visible
until the next is ready. Unavailable images are skipped. Reduced-motion preferences disable zoom.

Her **city and country** ride a lit glass plate under her name for the whole play: the city in
tracked capitals beside a pulsing marker, then a hairline drawn across to the country and its
two-letter code wherever the directory knows one. The line never breaks, on a phone either — the
longer the place, the smaller the plate's type, tracking, gaps and padding all scale together,
measured against the room the caption has and re-measured whenever that room changes. A model with
no location on file plays under her name alone.

For optional looping background music, place an MP3 **directly in the model's folder** with the
exact display name, including spaces and case, e.g.:

```text
public/NeverBeenModels/AlishaBhattacharya/Alisha Bhattacharya.mp3
```

`npm run generate:ai-models` / `npm run build` discovers it automatically; the development watcher
also picks up MP3 changes. Missing or unplayable tracks leave Preview silent. Playback requests
100% player volume (the device's hardware volume and browser audio policy still apply); the glass
sound button can mute or retry playback if the browser blocks it. Music loops independently of
the photo order. **End Preview** or Escape returns to the same photo viewer, stops and releases
the audio, restores focus and scrolling, and cancels outstanding preview work. Switching tabs
pauses the animation, slide clock and music until the page is visible again.

In the directory, one deck serves every card: it lives at the page level (a card clips and lifts
what it holds, which would trap a full-screen play), the click that arms it also starts it — so the
music and full-screen requests stay inside the gesture — and the directory steps aside (`inert`)
while it plays. A card whose album holds no photograph offers no Preview.

Right below the personal details, a **Videos** reel plays the clips from the model's own
`<album>/video/` folder: tap a clip to open it in the portfolio's player — play, pause, stop, scrub,
volume, playback speed, previous/next clip, picture-in-picture, true full screen (F or a double
click) and a **Download** button for the file. Tapping the picture plays or pauses it, and
Space/K, ←/→, ↑/↓ and M work as shortcuts. The profile header shows the model's city and country.
A text-only **Read full Biography** link sits immediately above **Rent Me**. It opens
`/ai-models/:slug/biography`, a Wikipedia-inspired white article with a biographical infobox,
early life, completed higher-education qualifications only, fictional career history, achievements,
personal life, interests, and photos interleaved through the relevant life sections. Its blue-ink
handwritten-style signature is shown on photographed-looking white paper. If that model has no
`Biography/biography.json`,
the page shows **Biography not Available**. Every published biography and memory image is explicitly
fictional and belongs only to the NeverBeen Multiverse.

**Highlights.** Just above **Read full Biography**, every model may carry an Instagram-style row of
circular covers — her **Highlights**. Each circle is one sub-folder of
`public/NeverBeenModels/<Album>/Highlights/`, and the sub-folder's name is the highlight's name. The
row scrolls horizontally with its own scrollbar and a pair of arrow controls. Tapping a circle opens
the portrait story player: a photograph holds the screen for four seconds and a clip plays for its
own duration before the highlight moves on; tapping the content jumps to the next story, a
press-and-hold pauses, a sideways swipe changes highlight, a downward swipe or Escape closes. The
highlight's own audio plays as background music (the first audio file in its folder), falling back to
the model's album preview music. Highlights never expire, and their frames carry no likes, comments,
seen counts, shares or downloads. The folder format and the optional `highlight.json` are documented
in [`public/NeverBeenModels/README.md`](public/NeverBeenModels/README.md) and
[`docs/ai-model-highlights.md`](docs/ai-model-highlights.md).

Below the portfolio grid, Community members can publish a testimonial with a 10–100 character
headline, 20–2,500 character quote and a full- or half-star rating. Testimonials include linked
Community author cards, presence status, city/country and a localized timestamp; the scrollable feed
loads additional entries as needed. Visitors get the compact Google sign-in option (without guest
mode) and return to the model portfolio after signing in. API/database patch and deployment
instructions are in [`docs/ai-model-testimonials.md`](docs/ai-model-testimonials.md).

Models who only chat with a Registered User (the exclusive models listed in
`src/app/pages/ai-models/chat/live-chat-policy.ts`) carry a blue Instagram-style verified tick after
their name everywhere they appear: the `/ai-models` directory, the portfolio profile, the Live Chat
plan form and its sign-in and review steps, the "Before we start" form, the chat header, profile
panel, information sheet and history, beside every reply the model sends, and on the Chat End
feedback form. The tick is drawn by `app-model-verified-tick` (`src/app/shared/model-verified-tick`)
and appears for no other model.

Both AI-model pages — the `/ai-models` directory and a model's own profile — speak to the Web API
only when the page opens (a visit, a refresh, a return to the page), when the visitor comes back to
the tab, and for what the visitor does with the page: opening a photograph, liking, commenting,
sharing, starting or ending a Live Chat. **Nothing is polled on a timer.** Every request either
page makes, and the tests that hold the rule, are written down in
[`docs/ai-models-api-call-policy.md`](docs/ai-models-api-call-policy.md).

Unspecified fields remain blank; randomized or unverified profile details are marked as illustrative
until verified.

Each model owns one album folder inside `public/NeverBeenModels`, named after the model with no
spaces (for example `public/NeverBeenModels/NourhanDurrani`). Drop the model's photographs into that
folder and they appear in the portfolio grid; the first image (or the one named `cover.*`) is used as
the cover and avatar. Each model's album also holds a `video/` sub-folder — drop the clips in there
and they appear in her portfolio's video reel, in file-name order — and a `Highlights/` sub-folder,
where each sub-folder is one highlight (see **Highlights** above). Nothing needs to be run or edited:
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

### Chatting with a model

**Premium checkout:** an ultra-modern white checkout over one of the model's album photographs
(90% opacity). Members choose Google Pay or PhonePe and click **Pay and Chat** — the button never
shows the amount. On a laptop or desktop they must also enter their own UPI ID; **Pay and Chat** then
shows a UPI QR code with the exact amount to scan with Google Pay or PhonePe on their phone or
tablet, and Live Chat opens ten seconds later (NPCI no longer allows a website to push a collect
request to a typed UPI ID). There is no UTR field, and the page shows the NeverBeen name rather than
the receiver UPI ID. Payment verification is temporarily disabled at the owner's request: returning
from the app (or the desktop timer) automatically opens Live Chat, including after an in-app
cancellation. App-launch failures stay on the payment page with **Payment Failed**, and **Pay and
Chat** retries. See
[`docs/premium-live-chat-payment.md`](docs/premium-live-chat-payment.md) for the device links,
limitations, tests and the merchant verification needed before enforcing paid access.

A green **Live Chat** button (white text, `#74C476`) stands **directly under the model's name** in
every model profile — a quiet pill, 1.7× smaller than the two-and-a-half-times button of the first
brief, with a slow breathing glow, a band of light crossing it every few seconds and a small lift on
hover, all of it switched off for `prefers-reduced-motion`. On the `/ai-models` directory the same
button stands **directly under the name of the model** in every card — no longer in the
`.card-actions` link row — at 1.5× the studio's standard button, with its own motion: a breathing
glow, a band of light crossing the pill and a small white dot pulsing beside the words. It opens an Instagram-style chat window on a white page: her round photograph, her name in bold black type,
her model id in small italic type (`@alisha.bhattacharya`), her city and country, a grey
**View Profile** button, then straight into the conversation and the composer. Her messages are
rounded light grey
bubbles with black text, the visitor's the same shape in violet with white text, each with an
Instagram-style date-and-time stamp and a `Today, 14:32` separator between days. The visitor can
attach a photograph (or take one with the camera) or a document, and can react to her answers with
👍 ❤️ 😂 😮 😢 😡 (a double-click is a ❤️) — and she reacts back on the visitor's own message with
what the message deserves.

On a laptop or a tablet held sideways the window opens landscape and wide (`min(1240px, 95vw)`), with
her photograph, her name, her city and country and **View Profile** moved into a side panel on the
left, and the conversation alone on the right; on a phone it is the same portrait column as before.
The **›** right after her name opens her details — over the conversation on a wide screen, over the
chat on a phone — with **Show Premium Content**, **Chat History** and **Back to chat** at the foot;
on a wide screen **View Profile** opens the same details.

**Premium Content:** every model may carry a `PremiumContent` folder inside her model folder
(`public/NeverBeenModels/<Model>/PremiumContent`); the photographs inside are her Premium Content,
and `npm run ai-models:sync` picks them up like album photographs. They are never shown in the
clear anywhere outside the chat: **Show Premium Content** — enabled only when the visitor added
**Premium Content Coverage** at payment, whatever the model's tier (Premium, Exclusive or any other),
and greyed out otherwise — opens a dark studio gallery page over the chat window with every
frame in a mosaic of differently sized tiles. The page carries all the photograph features — seen,
comments, likes and share with counts, zoom in and out — and a double-tap (or double-click) opens a
full-screen viewer with its close button top right and a download to the visitor's device; a
floating glass dock at the bottom middle of the screen leads back. Outside the chat the frames
appear only as locked teasers: four of them, scattered at random (never side by side, and on the
portfolio grid never in the last, View All slot) through the portfolio's photograph section at an
85% gaussian blur, and through the first rows of the View All mosaic at 75% — each under the same
diagonal watermark, **Premium Content** in bold red with *Only available in Paid Premium Chat*
underneath. In the `/ai-models` directory every Premium-plan model wears a
**✦ NeverBeen Premium Model** hallmark beside her Live Chat button — an obsidian seal edged and
lettered in champagne gold, the brand word in white with the tier in brushed-gold capitals and a
slow sheen of light crossing it. The premium
checkout adds a **Premium Content Coverage** block after the package choice — **None** selected by
default — whose **Access Premium Content** option costs a flat ₹100 for every model, joins the
package subtotal before the Service tax · 5%, SGST · 9% and CGST · 9% are calculated, and appears as
its own _Premium Content Coverage_ line in the price breakdown; the coverage travels into the chat
(and survives a reload) as the key to **Show Premium Content**. The **Make time for connection** and
**Premium Content Coverage** sections are collapsible cards, expanded by default: the whole heading
— the title on one line, its line of help on the next — is the toggle, and a collapsed card shows
the selected option's name in a small chip under it.

**Nothing is answered before it has been read.** Every message — the words, a photograph, a document —
goes through a reading first: her own engine repairs what people actually type (stretched letters,
missing apostrophes, thumb-shortened forms like `u`, `ur`, `pls`, `thnx`, and spelling mistakes one
letter away from what was meant), and when the studio has the keys the message is read properly on the
server by **Google Translate** and then by **Google Gemini** or **OpenAI** (`POST /api/ai-read`) —
what the visitor meant in plain English, the language they wrote in, and what a photograph shows or a
document contains (a PDF brief is read, not thanked for). *"u r sooooo beutifull!!"* is answered as
the compliment it is, warmly and in her own country's words, and never with a list of what she can do.
Visitors who write their own language in Latin letters (Romanised Bengali, Hindi, Urdu, Persian,
Arabic, Turkish, Spanish, Malay) are understood through her own phrase books and through Google
Translate — and **she answers in that same Romanised language and keeps answering in it** for the rest
of the session. Personal questions about her life are answered in the first person, with feeling and a
question back. If none of those keys is configured the window reads the message itself and the chat
behaves exactly as it did before — the conversation never depends on a key.

Before any of that, a glass form asks who she is talking to — it has its own **✕** in the corner — a
name of three to fourteen characters (checked as it is typed, asked for with the words "Write your
name here") and one photograph — uploaded or taken with the front camera and reduced to about 100 KB
automatically. From then on her photograph stands, circular, beside every answer and the
visitor's beside their own messages; she uses their **first name** and opens the conversation herself.
Her answers are never printed out for the visitor: the window shows her name and **typing** for as
long as a person needs to type that many characters (about 34 ms a character, never under two and a
half seconds and never over seven), and then the message arrives **whole**, in one piece — no
word-by-word reveal anywhere. Sometimes the first sign of her is three to seven seconds of nothing at
all (she was not at her phone), and sometimes she stops mid-thought: the typing bubble goes with her
and comes back before the message lands. A long answer arrives as two, three or four **separate
messages**, two to four seconds apart, each one typed in front of the visitor. She talks the way a
woman of her own age and country talks (an Indian of 25 does not sound like an Iranian of 40),
reads the visitor's humour and emoji as the session goes on and settles into their way of writing. A
selfie request makes her **take** one: her own profile photograph goes to Google Gemini's image model
in the studio's own `/api/ai-selfie`, and the picture that comes back is a new selfie of her in the
moment she says she is in — the room behind her, the bad light, the flaw she admits to — dressed as a
phone photograph. (Asking for her *photos* gets a frame from her album, and without a Gemini key the
album answers a selfie too, so a visitor who asks for a photograph always gets one.) A picture the
visitor sends is looked at and answered in words, a
video request is refused with the Founder's own wording, and once the chat has warmed up she asks for
work herself: a brand promotion or an editorial set, priced from her card. When the visitor goes quiet
for ten to twenty seconds she keeps the conversation going on her own — about her, about them, about
the world, or with a question. When the two hours end, or when she ends the chat, an ultra-modern
session report appears: both faces, the time they spent together, her honest paragraph about it and
her rating out of five.

She is grounded in everything NeverBeen knows: her own card, her complete biography, her photographs
and videos, every other model, the website's prices, packages, coupons, policies and destinations,
and the studio's own facts — so "how does the booking work?" and "tell me about Nourhan Durrani" are
answered as well as "who are you?". When the studio has configured its OpenAI and Google keys she
reaches both for any question, and never says so: no "Google", no "OpenAI", no "I searched", no
"I found it" — she knows it, or she remembers it, with an opinion attached.

The opening of a session is her introduction, and it is not one paragraph. Three to five seconds
after the form is filled in she sends **four or five messages**, two to four seconds apart, each one
typed in front of the visitor, and they are written for her own age and country: a woman of 23 in
Shiraz and a woman of 30 in Sarajevo do not open the same conversation, and neither do an Indian of 25
and an Iranian of 25 — in the introduction, or in any answer that follows it. **No two welcomes are
the same**: the words are seeded by the moment the visitor's form was filled in, so the same model
opens the same chat differently every time — a different hello, a different way of saying who she is,
a different line about her age, a different shape for home (sometimes with her own album's count in
it), and a different question back. The first message
carries the visitor's name, the second the good-morning/good-afternoon/good-evening greeting for their
clock, her full name, her model id, her city and country and her age, and with them the plain
statement that everything of her lives inside the NeverBeen Multiverse and nowhere else — said in her
own voice, never as a bot line ("I am an AI model", "I am replying from my biography" and their like
are rewritten out of her answers). She remembers the whole conversation, and a refresh keeps it.

Her tone is seductive, modern, frank and friendly. A swear word is a strike and a warning; sexual
harassment counts double, and after three strikes she says goodbye and the chat window closes for
good — **Start a new 2-hour chat** opens a fresh session. A chat lasts at most two hours, the
remaining time sits in the top-right corner of the window, and reminders appear **in the middle of
the conversation** at fifteen, ten, five and one minutes left as a glowing violet glass pill. At zero
the two hours are up and the window closes.

**Every message the visitor sends** goes from `POST /neverbeen-api/api/ai-chat` (the Worker's
same-origin proxy to the API) to the **NeverBeen Web API** with **Google Gemini `gemini-3.6-flash`**:
the window sends their message together with the model's character profile —
`public/NeverBeenModels/<Album>/personality/characterdatabase.json` — and her biography —
`personality/biography.json`, her own profile plus the details of her life, written by
`npm run personality:biography` ([docs/ai-model-biography.md](docs/ai-model-biography.md)) — and
**the answer the API sends back is what she says**. The API calls Gemini with its secret
**`GEMINI_API_KEY` environment variable** and returns her finished answer, read before she says it:
`AiChatPrompt.InHerVoice()` on the API and `chat-her-voice.ts` in the window take out any line that
reads like a chatbot ("As an AI…", "How can I help you today?", a bulleted list, a database that got
mentioned) — she never answers like an AI bot. Only two kinds of turn stay with the window: a safety
**warning**, which must arrive word for word, and a **photograph** — her open "just a photo, or one
from right now?" question and the selfie service behind it — because those are actions rather than
sentences. The key
is **never** in this repository or in the browser — set it on the API (Azure App Service →
Configuration → Application settings → `GEMINI_API_KEY`). The same request carries the reading of
the visitor's message, so she answers what they meant rather than what they typed. Without the key
the API answers `503 ai-unavailable` and the window answers from her own engine and a built-in world
file instead, so the chat always works — and it keeps asking the API (once a minute,
`AI_CHAT_BACKEND_RETRY_MS`), so the moment the key is set the very next message is Gemini's. The API
changes are
[`docs/patches/neverbeen-api-ai-chat-gemini.patch`](docs/patches/neverbeen-api-ai-chat-gemini.patch),
then [`docs/patches/neverbeen-api-ai-chat-biography.patch`](docs/patches/neverbeen-api-ai-chat-biography.patch),
then [`docs/patches/neverbeen-api-ai-chat-her-voice.patch`](docs/patches/neverbeen-api-ai-chat-her-voice.patch)
(requirement **L** on the server: the rules, the visitor's `language`, and the scrub), each with its
own `*-verification.py`. Then apply
[`docs/patches/neverbeen-api-ai-chat-model-migration.patch`](docs/patches/neverbeen-api-ai-chat-model-migration.patch)
to upgrade existing API installations to Gemini 3.6 (see the Gemini 404 migration notes in
[`docs/ai-model-chat.md`](docs/ai-model-chat.md#gemini-404-migration-2026-10-14)).
The Worker's reading desk (`/api/ai-read`) and camera (`/api/ai-selfie`,
`/api/livechatselfiesandphotos`) read an optional Worker **secret** of the same name
(`npx wrangler secret put GEMINI_API_KEY`), `GOOGLE_TRANSLATE_API_KEY` upgrades the reader to the
Cloud Translation API, and `GEMINI_MODEL` / `GEMINI_IMAGE_MODEL` in `wrangler.jsonc` pick their
models. Locally the Worker endpoints run from `scripts/dev-api.mjs` on port 8787 behind the `/api`
dev proxy, and `/neverbeen-api` is proxied to the deployed API. Full notes and the
requirements-to-code map: [`docs/ai-model-chat.md`](docs/ai-model-chat.md).

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
(`scripts/dev-api.mjs`) writes to the gitignored `booking-outbox.log` when those credentials
are absent. These endpoints are separate from the portfolio form's direct WhatsApp handoff.

### The model portfolio document (Watch & Download)

Every model album carries a `Portfolio/` folder — the home of that model's portfolio document and
everything belonging to it. `CreatePortfolio.mjs` writes a **24-page, A4-portrait, black-finish
fashion portfolio PDF** plus its `portfolio.json` receipt into that folder:

```bash
node CreatePortfolio.mjs --model "Model Name"     # or: npm run portfolio -- --model "Model Name"
node CreatePortfolio.mjs --model "Model Name" --style obsidian-muse --dry-run
node CreatePortfolio.mjs --all                    # every album that has photographs
```

The document is composed from the model's own album photographs (used creatively — full-bleed
frames, diptychs, triptychs, contact-sheet polaroids, duotone plates, a blurred-echo backdrop
behind every contained frame), her personal details (age, height, weight, bust, waist, hip, body
shape, location) in an illustrative ultra-modern treatment, and the personal, educational and
career chapters of her fictional Multiverse biography. The masthead carries the NeverBeen website
logo and every page footer repeats the brochure's copyright line and page number. Text lives in
reserved boxes and framed photographs are never cropped, so nothing overlaps and no face is cut
out of its frame; background photographs sit at 70% opacity over the black finish.

Each model draws her own style from a seed of her name — one of eight style systems
(`obsidian-muse`, `solar-editorial`, `aurora-chrome`, `cobalt-velvet`, `ember-rose`,
`jade-obsidian`, `ultra-violet`, `neon-mango`) with its own palette, type treatment, motifs,
headlines and page variants — so no two portfolios read alike. `--style` pins one explicitly.
Image preparation uses ImageMagick when it is on `PATH` (`magick` / `convert`) to keep the PDF
compact; without it the album files are embedded directly. An existing portfolio is protected —
pass `--force` to replace it.

On the model's portfolio page the retired portfolio button is replaced by two actions:

- **Watch Portfolio** opens `/ai-models/:slug/portfolio`, a dark studio viewer that embeds the PDF
  and offers *Open in new tab* and *Download*.
- **Download Portfolio** saves the PDF (`portfolio.downloadName` from the manifest).

A model whose `Portfolio/` folder holds no document yet sends both actions to the same route, which
then renders a deliberately plain **white page**: *Portfolio not Available — no portfolio is
available for this model yet, please check again later or connect with the NeverBeen support team
to get the Model Portfolio*, with a WhatsApp link to the studio and a way back to the model's page.
The manifest (`npm run generate:ai-models`) publishes the document as `portfolio` on each model, and
the album watcher refreshes it the moment a PDF lands in a `Portfolio/` folder.

### Advertising the models in the Community

The studio advertises itself inside the Community, on the member's own Journey page — the page the
community header's home icon opens:

- **Right rail, under “Online Companions”.** The bottom of the rail (where the member's Circles list
  used to sit) is a dark, magenta-lit advertisement panel that rotates through **15 random
  portfolios** from `/ai-models`. Every card shows the model's portfolio portrait, her name, her
  **city and country**, her **availability status** (`Available for Contract`, `Currently
  Unavailable`, `Looking for Future Contract`) and a **View Portfolio** button that opens
  `/ai-models/<slug>`. The panel header links to the full directory and the rotation is drawn once
  per visit, so the faces stay put while the member reads.
- **Journey feed, between the posts.** Sponsored cards appear at irregular intervals (roughly every
  four to six posts, never on the first two and never two in a row). Each card is clearly labelled
  **ADVERTISEMENT** and shows the model's brand row, **four random photographs from her own album
  folder** — or the single photograph she has when the folder holds fewer than four — her name, city
  and country, her availability status and a **View Portfolio** button. Advertisements are inserted
  between the `displayedJourneyPosts()` cards, so infinite scrolling never reshuffles them.

Both surfaces select from the same generated catalog the studio page uses (`ai-model-data.ts`), so
every model in `data/ai-models/profiles.json` is advertising material. They can be switched off (or
the rail count changed) per site in **Admin Console → Website → Member profile**, under
`community.profile`: `showModelAdsPanel`, `showModelAdsInFeed` and `modelAdCount` (default 15).

The advertisement works offline and for guests. When the member is signed in against the (optional)
Web API it additionally reads the advertising pool from `GET /api/models/ads` — which lets the
Founder pause a model (`IsActive = false`) or rotate one more heavily (`Weight` 1–10) — and reports
impressions and clicks to `POST /api/models/ads/events` so each portfolio's reach is measurable.
Apply `docs/patches/neverbeen-api-model-advertisement.patch` to `neverbeen-api` and
`docs/patches/neverbeen-database-model-advertisement.patch` (or run the standalone
`docs/patches/neverbeen-database-model-advertisement.sql`) to neverbeen-database for the pool
tables — each patch ships with a `*-verification.py` script. Without them the advertisement still
runs: the pool simply answers “everything”, and nothing is recorded.

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

## The hero travel preview (home page slideshow)

The first panel of the home hero — *Go Anywhere. Even Where You've Never Been* — is a five-second
cross-fade slideshow of every photograph in `public/travel`, mirroring the portrait preview in the
second panel (which reads `public/banner`). Drop images in and run:

```bash
npm run generate:travel
```

(or let `npm start` / `npm run build` do it) to rewrite `src/app/home/hero/travel-images.ts`. While
the folder is empty the panel keeps the brochure's closing pages, so it is never blank. Each travel
photograph fills the 16:9 stage edge-to-edge with `object-fit: cover`; mixed source aspect ratios
are centred and cropped as needed instead of leaving blank bands around the slide.

## The Community sign-in at the top of the home page

At the top of the first hero panel — *Go Anywhere. Even Where You've Never Been* — and directly under
its small texts (the eyebrow and the intro paragraph) sits the Community sign-in
(`src/app/home/hero/community-signin`). It is nothing but the Google button: no header line, no copy,
no card and no background — just the button on the page's own surface.

- **Not signed in:** the Google button alone. It is the same trusted Community flow the `/ai-models`
  pages use (`app-community-sign-in-card`, `variant="button"`): OAuth redirect, the official Google
  button fallback and the safe return path. Signing in returns the visitor to `/`.
- **Signed in:** the button is replaced by *“Welcome, <first name>.”* and the plain-text line
  *“Step into the NeverBeen Multiverse”* (plain text only — it does not link to `/community`).

The member welcome line is published from **Admin Console → Website Management → Hero banner**
(`communityWelcomeTitle`); use `{name}` to place the member's first name.

The sign-in reads `CommunityService` — a deliberately lazy runtime on this site — so the hero defers
it with `@defer (on viewport)`. The Community code is its own chunk that loads as the top of the page
renders, and a transparent, footprint-reserving skeleton (`.hero-signin-placeholder`) keeps the copy
from shifting while it arrives.

## The NeverBeen Multiverse Studio (home page slideshow)

Between the hero and **How It Works**, the home page plays the promotion memos: one photograph at a
time, in a random order drawn on every page load, advancing every five seconds. Each memo carries a
big Calibri headline (derived from the same pool as the photograph) over a smaller supporting line,
and the visitor can step back or forward with the on-panel buttons, the arrow keys, or a swipe.

The section is a white, full-bleed studio panel: the photograph container stretches to the screen
edges and the intro copy sits above it. Photographs come from `public/promotion`. Drop images in and
run:

```bash
npm run generate:promotion
```

(or let `npm start` / `npm run build` do it) to rewrite `src/app/home/multiverse/promotion-slides.ts`.
Optional wording per photograph lives in `public/promotion/captions.json`:

```json
{
  "Ads1.jpg": {
    "tag": "The Studio",
    "header": "Every frame is a parallel life you almost lived.",
    "copy": "Somewhere between a photograph and a memory sits NeverBeen."
  }
}
```

Undescribed photographs take the next memo from the curated pool inside the generator, walking it with
a fixed stride so neighbouring slides never repeat the same words. The section itself — heading,
autoplay and seconds per memo — is managed in **Admin Console → Website Management → The NeverBeen
Multiverse Studio**, and can be hidden or moved like any other home section under *Sections & order*.

## How It Works on the home page

The home page runs **The NeverBeen Multiverse Studio → The Storyline of Parallel Universe → The
NeverBeen Brochure** directly under the hero, then **How It Works** immediately before **Pricing**.
`Home.sections()` pins that order even when a previously published section order in Admin Console →
Website Management predates it, so the storyline always reads before the brochure.

**How It Works** explains the four NeverBeen business models one after another, each as four numbered
steps in its own accent-coloured capability card:

| # | Capability | Where it leads |
| - | ---------- | -------------- |
| 01 | Travel photographs of yourself | `/#contact` |
| 02 | Rent NeverBeen AI Models for fashion & editorial photography | `/ai-models` |
| 03 | Live chat with the NeverBeen AI Models | `/ai-models` |
| 04 | Shop NeverBeen merchandise | `/merchandise` |

The shipped copy lives in `howItWorksTracks` (`src/app/models/site-content.ts`). The travel steps are
edited under **How It Works → Travel photography — steps**; the other three capabilities expose their
title, intro copy and steps as their own fields, so each one can be reworded without touching code.

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

## Coming back to an open tab

NeverBeen is a single-page application, so a tab keeps running the JavaScript it downloaded when it
was opened. Browsers keep such a tab for hours (and may restore it from the back-forward cache), and
in that time a deployment can replace the hashed route chunks. Two things used to go wrong, both of
which looked like “the website is broken until I refresh”:

- **A lazy route would not open.** Clicking **NeverBeen AI Models** (or Collection, Community …)
  asked the old document for a chunk that no longer exists; the router rejected the navigation and
  the click did nothing. The **NeverBeen AI Models**, **Brochure** and **Storyline** buttons are now
  plain same-tab links (`<a href>`), so the browser loads a fresh document and fresh chunks. For
  every other lazy route, `SiteRecoveryService` handles a failed navigation the same way: it fetches
  a fresh document for the URL the visitor asked for (once per URL per tab — a guard in
  `sessionStorage`, cleared on every successful navigation, keeps this out of a reload loop).
- **Only the header and the footer were on screen.** When the initial navigation failed (or the tab
  was restored in a dead state), the router outlet stayed empty. `SiteRecoveryService` now watches
  `<main>`: if the routed page never appeared — right after loading, when the visitor returns to the
  tab after a minute or more, or when the browser restores the page from its back-forward cache — it
  rebuilds the tab with one fresh document instead of leaving the visitor with an empty page. Pages
  without `<main>` (the maintenance screen, the stand-alone admin pages) are never touched.

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
