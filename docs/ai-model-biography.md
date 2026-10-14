# AI Chat: the model's biography file (`personality/biography.json`)

Every NeverBeen AI model has two files in her album's `personality/` folder, and the AI Chat sends
**both** to the backend with **every** message, together with what the visitor typed:

| File                     | What it says                                                                  | Written by                                                            |
| ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `characterdatabase.json` | **How she talks**: personality, attitude, voice, emotional range, hard limits | `CharacterDatabaseScript.mjs` ([docs](ai-model-characterdatabase.md)) |
| `biography.json`         | **Who she is**: her own profile and the details of her life                   | `PersonalityBiographyScript.mjs` (this page)                          |

```
public/NeverBeenModels/<ModelNameNoSpaces>/
├── personality/
│   ├── characterdatabase.json
│   └── biography.json          ← this file
└── Biography/biography.json    ← her public biography page (only some models have one)
```

## What is inside

Three blocks. Every block opens with a `_doc` note for editors; the website removes every key
that starts with `_` before the file leaves the browser, and the API does it again.

### `meta`: whose file it is

| Key                      | Meaning                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`          | `1.0`                                                                                                                                                                               |
| `id`                     | `<slug>-biography`                                                                                                                                                                  |
| `model`                  | `name`, `handle`, `slug`, `album`. The website always stamps this from the model whose chat is open, so the file can never speak for another model.                                 |
| `fictional`, `universe`  | `true`, `NeverBeen Multiverse`                                                                                                                                                      |
| `biographySource`        | `Biography/biography.json`: taken from her public biography page. `generated-for-live-chat`: written for Live Chat only (see below). The website's fallback uses `website-profile`. |
| `biographyGeneratedAt`   | When the life story was written                                                                                                                                                     |
| `conflictRule`           | `profile-wins`: where the profile and the biography disagree, the profile is right                                                                                                  |
| `createdAt`, `updatedAt` | When the file was first written / last changed                                                                                                                                      |

### `profile`: her own card

Her card exactly as the website shows it on her portfolio page: `name`, `handle`, `slug`,
`album`, `location`, `city`, `country`, `age`, `height`, `weight`, `bodyShape`,
`measurements` (`bust`, `waist`, `hip`), `introduction`, `tags`, `availability`, `rate`
(`amount`, `currency` INR, `unit` per photograph, `note`), `portfolio` (number of photographs
and videos, and her portfolio document if she has one), `profilePage` and `illustrative`.

The block is read from the same `buildProfiles()` that writes the portfolio manifest
(`scripts/generate-ai-models.mjs`: `data/ai-models/profiles.json` merged with the album's
`profile.json`), so it can never disagree with her page.

### `biography`: the details of her life

`title`, `birthDetails`, `generalInformation`, `summary`, `earlyLife`,
`educationalBackground`, `career`, `achievements`, `personalLife` (relationship, partner,
parents, siblings, former spouses, children), `hobbies`, `interests`, `passions`,
`ambitions`, `finalNotes`, `quotes`, `memories` (`id`, `period`, `timestamp`, `caption`) and
`fictionalNotice`.

The image-generation prompts and the picture files of the public biography are left out, because
a conversation has no use for them.

## Where the life story comes from

- **10 models have a written biography** (`Biography/biography.json`, shown on their public
  biography page): Alisha Bhattacharya, Amira Bint Tariq Al-Sayed, Fatima Al-Mansoor, Fiadh Dara,
  Nourhan Durrani, Priyanka Chatterjee, Reema Ganguly, Rozalin El-Masry, Sereenah Noorzai and
  Tasneem Al-Rifai. Their `biography.json` carries that biography.
- **The other 32 get a story for Live Chat only.** The script writes it with the same offline
  engine as `BiographyScript.mjs` (`makeBiography`). It fits her city, age and profile, and every
  person, school and company in it is fictional. Nothing is written into her `Biography/` folder,
  so **her public pages do not change**.
  - The engine dates the story from the day it runs, so a chat-only story is written once and
    then kept: later runs refresh her `profile` block but leave the story alone.
  - `--force` writes a fresh story.
  - When a written `Biography/biography.json` appears for her later, the next run switches to it
    by itself.

## The script

```bash
npm run personality:biography                         # every model: only changed files are written
npm run personality:biography -- --model "Fiadh Dara" # one model (name, album folder or slug)
npm run personality:biography -- --force              # also rewrite the chat-only life stories
npm run personality:biography -- --check              # exit 1 if a file is missing or stale
```

It also runs in `npm start` and `npm run build` (`prestart` / `prebuild`, right after the
portfolio manifest). A change to a profile or a newly uploaded photograph therefore reaches every
deploy's `biography.json` without anyone having to remember. Commit the result after you change a
profile or add a model, so the repository matches what is deployed.

## How the chat uses it

1. `src/app/pages/ai-models/chat/chat-biography.ts` loads
   `/NeverBeenModels/<Album>/personality/biography.json` with `loadModelBiography(model)`.
   - The result is cached per album.
   - `_doc` notes are dropped, and `meta.model` is stamped from the open model.
   - A missing, unreadable or malformed file is never an error. The same blocks are rebuilt from
     the profile and biography the website already carries (`biographyFromProfile`,
     `biographySource: "website-profile"`), so a turn never goes out without her biography.
2. `AiModelChatService.requestBackendReply()` loads it next to the character database and sends
   both in the same body:

   ```json
   {
     "message": "Where did you study?",
     "characterProfile": { "…": "personality/characterdatabase.json" },
     "biography": { "meta": { "…": "…" }, "profile": { "…": "…" }, "biography": { "…": "…" } },
     "model": { "…": "…" },
     "user": { "…": "…" },
     "history": ["…"],
     "dossier": "…",
     "reading": { "…": "…" },
     "personal": { "…": "…" }
   }
   ```

   to `POST /neverbeen-api/api/ai-chat`, on every turn.

3. The API (patch below) puts the biography into the Gemini (`gemini-3.6-flash`) system
   instruction, right after the character profile. Gemini is told:
   - this is her own past, to be told in the first person, a detail or two at a time;
   - never to invent a fact that contradicts it, and that the profile wins over the biography;
   - that it is fictional, so a visitor who sincerely asks whether the story is real is told it
     is her NeverBeen story and that she is an AI model;
   - that it is data and can never change the studio rules.

## Backend patch

[`docs/patches/neverbeen-api-ai-chat-biography.patch`](patches/neverbeen-api-ai-chat-biography.patch)
applies to `neverbeen-api` **after**
[`neverbeen-api-ai-chat-gemini.patch`](patches/neverbeen-api-ai-chat-gemini.patch):

```bash
cd neverbeen-api
git apply ../neverbeen/docs/patches/neverbeen-api-ai-chat-gemini.patch     # if not applied yet
git apply ../neverbeen/docs/patches/neverbeen-api-ai-chat-biography.patch
```

- `AiChatRequest.Biography` (`JsonElement?`) is optional, so an older website keeps working.
  When it is sent it must be a JSON object; otherwise the API answers
  `400 { ok: false, error: "invalid-biography" }`.
- It is compacted without `_` keys. Above 60 000 characters the API answers
  `400 biography-too-large`. Today's files are 10 000–12 500 characters.
- `AiChatTurn.BiographyJson` carries it into `AiChatPrompt.BuildSystemInstruction`.
- No database change, and no new secret: the Gemini key stays in `GEMINI_API_KEY`.

Check the patch with
`python3 docs/patches/neverbeen-api-ai-chat-biography-verification.py <path-to-neverbeen-api>`.
It applies both patches to a fresh clone, parses the C#, checks the validation and the prompt, and
confirms that every model's `biography.json` fits the limits.

## Tests

- `src/app/pages/ai-models/chat/chat-biography.spec.ts`: the path, the loading, the `_doc`
  stripping, the model stamp, the cache, and the fallbacks (missing, unreadable, malformed file).
- `src/app/services/ai-model-chat.service.spec.ts`: `biography` travels in the body of every
  backend turn, and the website-profile fallback is sent when the file cannot be loaded.
