# NeverBeen AI Model portfolio data

The `/ai-models` directory and each individual `/ai-models/:slug` portfolio are generated from the
model albums in `public/NeverBeenModels/<ModelNameNoSpaces>` and the metadata below. The legacy
`public/ai-model-assets/portraits` folder is still supported.

Metadata can be added before the photographs; those profiles stay available with a designed
placeholder until images are dropped into the album folder.

## Add photographs and details

1. Keep each model's photographs in their own album folder inside `public/NeverBeenModels/`, named
   after the model with no spaces (for example `NourhanDurrani`). Every image in the folder becomes
   a frame in the Instagram-style portfolio grid; the first image (or the one named `cover.*`) is
   used as the cover and portfolio avatar.
2. Optionally add `<album>/profile.json` for model-specific details:

```json
{
  "name": "Nourhan Durrani",
  "handle": "@nourhan.durrani",
  "location": "Sarajevo, Bosnia and Herzegovina",
  "age": "30",
  "height": "172 cm",
  "weight": "60 kg",
  "bodyShape": "Pear",
  "bio": "A short introduction to the model.",
  "tags": ["Editorial", "Portrait"],
  "availability": "Open for editorial and campaign bookings",
  "illustrative": true,
  "cover": "Nourhan Durrani.png",
  "photos": ["Nourhan Durrani.png", "editorial-01.jpg"],
  "captions": { "editorial-01.jpg": "Old town, golden hour" }
}
```

   Every field is optional. `photos` fixes the grid order (`gallery` is accepted as an alias and as
   the legacy list of gallery paths); without it, the cover comes first and the remaining images
   follow in natural filename order. `illustrative` marks randomized or unverified details, and the
   directory and portfolio show a visible notice until it is removed or set to `false`.

3. Shared metadata for every model can also live in `data/ai-models/profiles.json`, keyed by cover
   filename, model name or album folder. It uses the same fields as `profile.json`, plus the legacy
   `gallery` array of paths relative to `public/ai-model-assets/gallery`. An album's own
   `profile.json` wins over the shared entry.

```json
{
  "Toulene Arslan.png": {
    "location": "Istanbul, Türkiye",
    "age": "27",
    "height": "168 cm",
    "weight": "55 kg",
    "bodyShape": "Hourglass",
    "bio": "A short introduction to the model.",
    "illustrative": true
  }
}
```

4. Run `npm run generate:ai-models`, or use `npm start` / `npm run build` (both regenerate the
   manifest automatically).

The portfolio shows the cover, handle, location, age, height, weight, body shape, tags,
availability and short introduction. Facts that have not been supplied are labelled **Details to be
added** rather than being guessed. The build compiles the data into a typed, static model manifest
for the Angular pages.
