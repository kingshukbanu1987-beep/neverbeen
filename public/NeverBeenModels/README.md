# NeverBeen AI model albums

One folder per model, named after the model with no spaces — for example `NourhanDurrani`. Every
photograph inside that folder is published on the model's portfolio page (`/ai-models/<slug>`) in
the Instagram-style grid, where clicking a photograph opens it full screen.

```
public/NeverBeenModels/
  NourhanDurrani/
    .gitkeep
    profile.json            ← optional model details (see data/ai-models/README.md)
    Nourhan Durrani.png     ← cover photograph, also used as the portfolio avatar
    editorial-01.jpg        ← additional frames, shown in the grid in album order
    editorial-02.jpg
    video/                  ← video clips, shown in the reel under the personal details
      reel-01.mp4
      poster-01.jpg         ← optional poster frame for a clip (see below)
    Highlights/             ← the profile's circular Highlights row (never expires)
      Editorial/            ← one sub-folder = one highlight, named after the folder
        01-frame.jpg
        02-frame.jpg
        highlight.json      ← optional name, cover, music, order, captions and item order
      Motion/
        01-cover.jpg
        02-clip.mp4
    Biography/              ← this model's separate fictional biography assets
      .gitkeep
      biography.json        ← created by BiographyScript.mjs
      photo-prompts.json    ← ten individual AI-image prompts
      01-childhood-home.jpg ← generated memory images (kept out of the portfolio grid)
    Portfolio/              ← this model's portfolio document and its receipts
      .gitkeep
      <Album>_Portfolio.pdf ← created by CreatePortfolio.mjs (kept out of the photo grid)
      portfolio.json        ← generation receipt: style, pages, size, timestamp
    personality/            ← this model's static character database for Live Chat
      characterdatabase.json ← created by CharacterDatabaseScript.mjs (see below)
```

## Adding photographs

1. Open the model's folder (create it with the model's name and no spaces if it does not exist yet)
   and drop the images in — `jpg`, `jpeg`, `png`, `webp`, `avif` and `gif` are supported.
2. That is all. Nothing has to be run or edited: the album watcher regenerates the portfolio
   manifest as soon as the files land, and the running site picks them up on its own.
   - While `npm start` is running, the watcher refreshes the manifest and the dev server reloads the
     page — a photograph dropped into a folder appears in that model's grid within seconds.
   - `npm run build` refreshes the manifest in its prebuild step, so a deployment always carries
     whatever is in the folders.
   - To refresh it by hand at any time, run `npm run generate:ai-models`.
   - A brand-new folder with photographs in it becomes a new portfolio page automatically.
3. Optional: keep the cover portrait named exactly as listed in `data/ai-models/profiles.json`
   (for example `Nourhan Durrani.png`), or name it `cover.*`, or point at it with the `cover` field
   of the folder's `profile.json`.

Photographs are recorded cover first, then in natural filename order. Set `photos` in `profile.json`
to choose that order, and use `captions` to give a frame its own caption. The portfolio page shuffles
the album into a fresh random order on every visit, so the grid never opens the same way twice; the
**Shuffle** control in the gallery toolbar deals another arrangement on demand. The cover stays the
model's avatar and the photograph count is unchanged.

The number of photographs in the folder is what the model's cover on `/ai-models` reports, so moving
a file in or out updates that count on the next manifest refresh.

## Naming photographs

Name a model's frames with the frame number first so the folder, the grid and the ingest map all read
in the same order — for example `01-magenta-ruffles-portrait.png`, `12-red-off-shoulder-gaze.png`.
The cover keeps the model's own name (`Nourhan Durrani.png`). Any name works, but numbers keep the
portfolio in sequence and make the folder easy to scan.

## Highlights

Every album folder carries a `Highlights/` sub-folder. Each **sub-folder** inside it is one
highlight, and the sub-folder's name is the highlight's name — `Highlights/Shiraz Diaries/` becomes
the circle labelled **Shiraz Diaries** in the row shown just above **Read full Biography** on the
model's portfolio.

- Drop photographs (`jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`) and clips (`mp4`, `m4v`, `webm`,
  `ogv`/`ogg`, `mov`) into a highlight's sub-folder. They are played in natural file-name order, so
  `01-…`, `02-…` fixes the running order.
- The circle's thumbnail is the first photograph of the highlight. Add a file named `cover.*` to
  choose another picture; `cover.*` is a thumbnail only and never appears in the story.
- Background music: put an audio file (`mp3`, `m4a`, `aac`, `wav`, `ogg`, `opus`, `flac`) in the
  highlight's folder — the first one is used. A highlight without audio borrows the model's
  `<Album>/<Model Name>.mp3` preview music. The clips themselves play muted, under the music.
- Highlights **never expire**. They are shown for as long as their sub-folder exists, and no date or
  view counter is recorded anywhere.
- Their frames are excluded from the portfolio grid, the photo count, the video reel and the
  Seen · Likes · Comments · Shares totals — a highlight is a story, not a post, and its player has no
  like, comment, seen, share or download controls.
- The player is always portrait: four seconds per photograph, the clip's own duration per video, tap
  to jump to the next story, press-and-hold to pause, sideways swipe to change highlight, downward
  swipe, Escape or ✕ to close.
- An empty highlight folder is skipped with a warning, and a model with no highlight sub-folders
  simply shows no Highlights row.

An optional `highlight.json` (any casing) inside a highlight folder customises it; every field is
optional:

```json
{
  "name": "Shiraz Diaries",
  "cover": "01-evening-light.jpg",
  "music": "theme.mp3",
  "order": 1,
  "captions": {
    "01-evening-light.jpg": "The last light on the Eram rooftops.",
    "02-film.mp4": "Six seconds of movement from the studio floor."
  },
  "items": ["02-film.mp4", "01-evening-light.jpg"]
}
```

`order` pins a highlight to the front of the row (lower first); the rest keep folder order. `items`
pins an exact running order. `captions` is keyed by the file name inside the highlight folder. A
`cover` that points at a real frame keeps that frame in the story; only a file literally named
`cover.*` is held out of it.

```bash
npm run generate:ai-models   # or let the watcher / npm run build refresh it
```

Adding a sub-folder is all it takes: the watcher regenerates the manifest and the dev server reloads
the page.

## Adding videos

Every album folder carries its own `video/` sub-folder — create it inside the model's folder if it is
missing. Any clip dropped in there appears in the **Videos** reel directly below her personal details
on `/ai-models/<slug>`:

- `mp4`, `m4v`, `webm`, `ogv`/`ogg` and `mov` are supported. `mp4` (H.264 + AAC) plays in every
  modern browser, so it is the safest format to upload.
- Clips are listed in natural file-name order, so name them `reel-01.mp4`, `reel-02.mp4` to fix the
  running order. Set `videos` in `<album>/profile.json` to choose the order explicitly:
  `"videos": ["reel-02.mp4", { "file": "reel-01.mp4", "caption": "Rooftop, golden hour" }]`.
- A caption is shown under the player and on the tile — either the `caption` in `videos`, or a
  `videoCaptions` map keyed by file name (`{ "reel-01.mp4": "Rooftop, golden hour" }`).
- Optional poster frames: name the still after the clip (`reel-01.jpg` next to `reel-01.mp4`), list it
  as the entry's `poster`, or add a `videoPosters` map. Without one the tile shows the clip's own
  first frame.
- A clip plays in the portfolio's player: play/pause, stop, seek, volume, speed, previous/next clip,
  picture-in-picture, full screen and a **Download** button for the file.
- `videos/` is accepted as an alias of `video/`, and clips are never mixed into the photo grid.

The watcher and `npm run generate:ai-models` refresh the reel exactly as they do for photographs, so
nothing has to be run by hand — drop the file into `video/` and it appears.

Images placed directly in `public/NeverBeenModels` (outside the folders) are still picked up, and
`public/ai-model-assets/portraits` + `public/ai-model-assets/gallery` remain supported as legacy
locations.

## The portfolio document

Every album folder carries its own `Portfolio/` directory — create it inside the model's folder if
it is missing (new albums get one from the studio tooling). The generated portfolio PDF and its
`portfolio.json` receipt live there and nowhere else; images dropped into `Portfolio/` never enter
the portfolio photo grid.

```bash
node CreatePortfolio.mjs --model "Model Name"      # or: npm run portfolio -- --model "Model Name"
```

The run writes `<Album>_Portfolio.pdf` (24 pages, A4 portrait, black finish) and refreshes the
manifest, after which the model's page offers **Watch Portfolio** (the embedded viewer at
`/ai-models/<slug>/portfolio`) and **Download Portfolio**. While the folder holds no PDF, both
actions open a plain white page that says the portfolio is not available yet and points at the
NeverBeen support team. Drop a PDF into the folder by hand and the watcher publishes it too — the
`portfolio.json` receipt is optional but supplies the page count, style name and timestamp.

## Fictional model biographies

Every existing model album has its own `Biography/` directory. The portfolio's **Read full
Biography** link opens `/ai-models/<slug>/biography`; an absent `biography.json` deliberately shows
**Biography not Available**. Biography images are scanned from this sub-folder for the biography
page only and are excluded from the model's regular portfolio grid.

Create a fictional alternate-universe biography and its ten-image prompt queue with:

```bash
node BiographyScript.mjs --model "Nourhan Durrani"
# or
npm run biography -- --model "Nourhan Durrani"
```

Use `--dry-run` to preview the selected model and output paths. An existing biography is protected;
pass `--force` only when replacing it. The script creates `Biography/biography.json` with fictional
early-life, completed higher-education qualifications, career, achievements, personal-life,
interests, ambitions, quotes and signature details, plus `Biography/photo-prompts.json` with ten
tailored mobile-photo scenes. The education list contains degrees earned in the fictional timeline
only; it does not add school history or disclaimers for unearned qualifications. The page presents
the photos alongside the life, education, career and personal-life passages they illustrate rather
than in one gallery. It uses the model's published city and country as inspiration and marks added
biographical details as fictional, never as real records.

The image prompt queue is an input for the available AI image-generation tool; the standalone Node
script cannot call an image-generation service by itself. Generate each prompt as one individual
image, save it in the same `Biography/` folder with the exact `filename` from the queue (for example
`01-childhood-home.jpg`), and run `npm run generate:ai-models`. The manifest publishes those files to
the biography page; until a file exists, its in-story figure remains an explicit image-pending placeholder.
The ten files should be visibly synthetic illustrations and must never be represented as documentary
or factual photos. An optional `signature.jpg` in the same folder is rendered as the signature-on-paper
photo; without one, the page uses its blue-ink handwritten-style fallback. The biography page repeats
the fictional notice in its footer.

## Personality: the model's character database

Every album folder carries its own `personality/` directory with one file,
`personality/characterdatabase.json` — the model's **static character database** and the main rule
engine of her Live Chat (AI Chat). It holds every minute detail of her personality, attitude and
conversational behaviour — her nature, how she responds, what she likes and dislikes in a
conversation, how much flirting she tolerates, whether adult chat is allowed, how many emojis she
uses, how long her answers are, whether she laughs, whether she asks questions — and none of her
personal facts (age, city, body, career), which the chat reads from her profile and Biography.

```bash
node CharacterDatabaseScript.mjs                     # every album that has no file yet
node CharacterDatabaseScript.mjs --model "Fiadh Dara" # one model (name, album folder or slug)
node CharacterDatabaseScript.mjs --force              # rewrite every file from the template
# or: npm run personality
```

New albums start from the same **generic joyful** template. A file that exists is never overwritten
without `--force`, so a character database that has been tuned by hand for one model is safe. When a
value in the file conflicts with a generic studio constraint of the chat, the file wins — except the
`hardLimits` block, which is absolute. The website reads the file through
`src/app/pages/ai-models/chat/character-database.ts`, which deep-merges it over a built-in copy of
the same template, so a missing or partially edited file still yields a complete personality.
Nothing in the folder ever enters the photo grid or the portfolio document.

`docs/ai-model-characterdatabase.md` documents the structure field by field.

## Photographs attached in Arena chat

Arena saves message attachments to `/home/user/uploads/<uuid>.png`. Run

```bash
npm run ingest:model-photos
```

to copy each attachment into its album with a readable filename, set the album's frame order and
captions in `<album>/profile.json` and regenerate the manifest in one step.
`scripts/model-ingest-map.json` holds the album, filename and caption for each attachment; the
script reports anything it could not find and exits with an error listing the missing frames.

Every entry is matched by the upload's UUID, so an upload that has already been filed is left alone
and the script can be run again safely at any time — a later upload only needs its own entry appended
to the map. Files that arrive through the GitHub web uploader land in the album directly; add their
UUIDs to the same map, or simply rename them in place following the naming convention above.
