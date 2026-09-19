# Collection photographs

Photographs placed in this folder are shown on the **Collection** page (`/collection`).

## Adding photographs

1. Copy your image files (`jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`) into this folder.
   Sub-folders are allowed and become album headings on the page.
2. Run `npm run generate:collection` (or simply `npm start` / `npm run build`, which run it
   first). This rewrites `src/app/pages/collection/collection-photos.ts`.

Titles are derived from the file names — `santorini-sunset.jpg` becomes "Santorini Sunset".

## Optional captions

Create `captions.json` in this folder to control titles, captions and alt text. Every field is
optional and keys may be file names or sub-folder paths:

```json
{
  "santorini-sunset.jpg": {
    "title": "Santorini at sunset",
    "caption": "Blue domes above the caldera",
    "alt": "White houses and blue domes above the Aegean at golden hour"
  },
  "greece/oia-morning.jpg": { "title": "Oia in the morning", "album": "Greece" }
}
```

Until real photographs are added here, the Collection page shows the sample studio photographs
from `public/audience` so it is never empty.
