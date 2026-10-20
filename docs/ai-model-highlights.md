# Model Highlights

The Instagram-style Highlights row on a model's portfolio at `/ai-models/:slug`. It sits directly
above **Read full Biography** and opens a portrait story player with background music. Highlights
never expire, and their frames carry no likes, comments, seen counts, shares or downloads.

## The brief, one line at a time

| Requirement                                                                                                         | Where it lives                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Highlights concept inside the model profile, just before **Read full Biography**                                  | `src/app/pages/ai-models/ai-model-portfolio.html` renders `<app-model-highlights>` after the tag list, immediately above `.profile-actions` — whose first child is the biography link.                                  |
| Shown the way Instagram shows it: a circle with a photo, horizontally, with a horizontal scrollbar                  | `highlights/model-highlights.{html,css}` — `overflow-x: auto` rail, styled scrollbar, scroll-snap, circular gradient rings, per-circle cover, name and story count, plus arrow controls for a mouse.                    |
| Clicking a circle shows the stories as a photo preview with background music                                        | `highlights/highlight-viewer.{ts,html,css}` — a full-screen portrait stage; the highlight's audio plays on open and loops.                                                                                              |
| Each model has a `Highlights` folder; each sub-folder is one highlight; the sub-folder name is the highlight's name | `scripts/generate-ai-models.mjs` → `albumHighlights()`; the generated `AiModelHighlight[]` travels in `ai-model-data.ts` as `profile.highlights`.                                                                       |
| Every picture and video inside the sub-folder is shown when the highlight is opened                                 | `albumHighlights()` lists images and clips recursively, in natural file-name order (optionally pinned by `highlight.json`).                                                                                             |
| Highlights never expire                                                                                             | There is no date, expiry or window anywhere in the data or player: a highlight lasts while its folder exists. The player carries a **Never expires** label, and the rail's closing hint says a highlight never expires. |
| Horizontal display with a horizontal scroll bar                                                                     | `.highlights-rail` — `display: flex`, `overflow-x: auto`, thin gradient scrollbar, `scroll-snap-type: x proximity`. The arrow buttons scroll one screenful at a time and disable at each end.                           |
| No likes, comments, seen or share counts                                                                            | The highlight data model has no engagement fields, the player never calls `ModelMediaEngagementService`, and no such control is rendered. Highlight frames are excluded from the portfolio engagement totals.           |
| Always portrait                                                                                                     | `.story-stage` is a 9:16 card on a laptop; on a phone it becomes the full portrait screen (`100dvh`).                                                                                                                   |
| Next content after 4 seconds for photos                                                                             | `HIGHLIGHT_PHOTO_DURATION_MS = 4000`; a 100 ms ticker fills the progress bar and advances the story.                                                                                                                    |
| Videos play for their own duration                                                                                  | The clip's `timeupdate` drives its progress bar and its `ended` event advances to the next frame.                                                                                                                       |
| Tap/click jumps to the next content of the highlight                                                                | `onPointerUp` treats a movement under 12 px as a tap and calls `next()`.                                                                                                                                                |
| Ultra-modern design                                                                                                 | Glass surfaces, conic-gradient rings with an animated `@property` angle, blurred cover atmosphere, film grain, segmented progress bars, animated equaliser, safe-area padding and reduced-motion fallbacks.             |

## Folder format

```text
public/NeverBeenModels/<Album>/
  Highlights/
    Shiraz Diaries/          ← the highlight's name is the folder's name
      01-evening-light.jpg
      02-city-walk.jpg
      03-golden-hour.jpg
      highlight.json         ← optional
    Motion/
      01-runway.jpg
      02-film.mp4
```

- Images and clips in each sub-folder are the highlight's stories. Dot-files (`.gitkeep`) are ignored.
- The circle's cover is, in order: `cover` from `highlight.json`, a file named `cover.*`, the first
  photograph, the first clip's poster, or the fallback glyph.
- Music is, in order: `music` from `highlight.json`, the first audio file in the folder, the model's
  `<Album>/<Model Name>.mp3` preview music, or silence.
- `highlight.json` may set `name`, `cover`, `music`, `order`, `captions` (keyed by file name) and
  `items` (an explicit running order). Every field is optional.
- An empty highlight sub-folder is skipped with a console warning. A model with no sub-folders shows
  no rail at all.

The same rules are written for content editors in
[`public/NeverBeenModels/README.md`](../public/NeverBeenModels/README.md).

## Interactions

| Input                 | Result                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| Tap / click the story | Next frame; after the last frame, the next highlight; after the last highlight, close |
| Press and hold        | Pause; releasing resumes from the same moment                                         |
| Swipe left / right    | Next / previous highlight                                                             |
| Swipe down            | Close                                                                                 |
| `→` / `←`             | Next / previous frame                                                                 |
| `↓` / `↑`             | Next / previous highlight                                                             |
| `Space`               | Pause or resume                                                                       |
| `M`                   | Mute or unmute the music                                                              |
| `Escape` / ✕          | Close and return focus to the circle that opened the player                           |
| Progress segment      | Jump to that story                                                                    |
| Header buttons        | Pause/resume, mute/unmute, close                                                      |

The player locks the page scroll while it is open, pauses when the tab is hidden, restores focus and
scroll on close, and keeps a Tab focus loop inside the dialog.

## Data model

```ts
interface AiModelHighlightItem {
  kind: 'photo' | 'video';
  src: string;
  type: string; // MIME type of a clip; '' for a photograph
  poster: string; // optional clip poster
  caption: string; // optional, from highlight.json
}

interface AiModelHighlight {
  id: string; // URL-safe, derived from the name
  name: string; // the sub-folder name (or highlight.json's name)
  cover: string;
  music: string;
  items: AiModelHighlightItem[];
  photoCount: number;
  videoCount: number;
}
```

`AiModelProfile.highlights` is optional so hand-built profiles in tests and tools stay valid.
Generated profiles always carry the array (possibly empty).

## Tests

- `src/app/pages/ai-models/highlights/highlight-viewer.spec.ts` — portrait stage, music, four-second
  advance, tap to next, hold to pause, clip end to next frame, fallback music, mute, keyboard,
  progress-bar navigation, scroll lock, and the absence of like/comment/seen/share/download.
- `src/app/pages/ai-models/highlights/model-highlights.spec.ts` — one circle per sub-folder, names,
  covers, counts, opening and closing the player, and a model with no highlights.
- `src/app/pages/ai-models/ai-model-portfolio.spec.ts` — the rail renders immediately above
  `.profile-actions` while the biography link stays directly above **Rent Me**.
- `scripts/generate-ai-models.mjs` is exercised by `npm run generate:ai-models`; demo highlights ship
  for Fiadh Dara, Nourhan Durrani and Alisha Bhattacharya.
