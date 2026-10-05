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
cover stays the model's avatar and the photograph count is unchanged.

The number of photographs in the folder is what the model's cover on `/ai-models` reports, so moving
a file in or out updates that count on the next manifest refresh.

## Naming photographs

Name a model's frames with the frame number first so the folder, the grid and the ingest map all read
in the same order — for example `01-magenta-ruffles-portrait.png`, `12-red-off-shoulder-gaze.png`.
The cover keeps the model's own name (`Nourhan Durrani.png`). Any name works, but numbers keep the
portfolio in sequence and make the folder easy to scan.

Images placed directly in `public/NeverBeenModels` (outside the folders) are still picked up, and
`public/ai-model-assets/portraits` + `public/ai-model-assets/gallery` remain supported as legacy
locations.

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
