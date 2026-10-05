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
2. Keep the cover portrait named exactly as listed in `data/ai-models/profiles.json`
   (for example `Nourhan Durrani.png`), or name it `cover.*`, or point at it with the `cover` field
   of the folder's `profile.json`.
3. Run `npm run generate:ai-models`. `npm start` and `npm run build` run it automatically.

Photographs are listed cover first, then in natural filename order. Set `photos` in `profile.json`
to choose the exact order, and use `captions` to give a frame its own caption in the pop-up.

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
