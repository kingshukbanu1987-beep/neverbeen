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
    Biography/              ← this model's separate fictional biography assets
      .gitkeep
      biography.json        ← created by BiographyScript.mjs
      photo-prompts.json    ← ten individual AI-image prompts
      01-childhood-home.jpg ← generated memory images (kept out of the portfolio grid)
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
