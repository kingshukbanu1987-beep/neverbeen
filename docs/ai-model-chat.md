# AI Chat: talking to a model

Requirements A–H of the AI model chat, and where each one lives. Everything runs in the website —
the Cloudflare Worker only adds the live OpenAI answer and the Google results for questions from
outside NeverBeen. Without those secrets the chat still works: her own engine answers from the whole
website and from a built-in world fact file.

## Where to open it

| Entry point                        | What the visitor presses                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/ai-models/:slug` (model profile) | **Live Chat** — a `#74C476` button with white text in `.rent-action-stack`, immediately before **Rent Me** |
| `/ai-models` (studio directory)    | **Live Chat** in the `.card-actions` row of every model card                                               |

Both mount the same window: `<app-ai-model-chat [model]="…" (closed)="closeChat()" />`, which opens
the two-hour session itself in `ngOnInit` — the pages only render it
(`src/app/pages/ai-models/chat/ai-model-chat.{ts,html,css}`, selector `app-ai-model-chat`). The
window is the booking dialog's own pattern — a `.chat-backdrop` with `role="dialog"`, `z-index` 240, `:host { display: contents }` — no CDK overlay. It closes on the backdrop, on
Escape, on ✕, on **View Profile**, and by itself with `CHAT_AUTO_CLOSE_MS` (7 s) after she ends a
chat (requirement B).

## The window, top to bottom

- her round profile photograph (`.chat-profile-photo`, the same cover and round container as the
  profile header);
- her name in bold, large, black type, and under it her model id in small italic black type
  (`@alisha.bhattacharya` for **Alisha Bhattacharya**) — `model.name` and `model.handle`;
- her country and city in normal small black type, split out of `model.location`;
- **View Profile** — grey `#e6e6ea` background, black text, `routerLink` to `/ai-models/:slug`;
- the conversation, then the composer.

The page behind the window is white; her bubbles are rounded light grey `#ebebeb` with black text,
the visitor's are the same shape in the NeverBeen violet `#4b128f` with white text. Every message
carries an Instagram-style stamp: `HH:MM` under the bubble (with the full date on hover) and a
`Today, 14:32` separator line whenever the calendar day changes
(`daySeparatorFor` / `timeOf` / `stampOf` in `ai-model-chat.ts`). She shows a typing bubble while
thinking, and the newest message is always scrolled into view through the shared
`[nbChatAutoScroll]` directive.

The composer takes text plus one attachment per message:

- **🖼 Attach a photograph** — `accept="image/*"`, up to `AI_CHAT_PHOTO_LIMIT_BYTES` (8 MB); the
  picture is re-encoded to a small preview (about 320 KB) and sent to her so she can look at it;
- **📷 Take a photo** — the same input with `capture="environment"`, which opens the camera on a
  phone;
- **📄 Attach a document** — `.pdf .doc .docx .txt .rtf .csv .xls .xlsx .ppt .pptx .zip`, up to
  `AI_CHAT_DOCUMENT_LIMIT_BYTES` (16 MB).

The draft is shown above the input with its file name and size, and travels with the message.

## A. What she knows

`chat-knowledge.ts` builds the material and `chat-replies.ts` answers from it:

- **her own card** — name, handle, age, city and country, height, weight, body shape, bust/waist/hip,
  tags, photographs, videos;
- **her biography** — every section of `Biography/biography.json` becomes a fact, so family,
  studies, career, achievements and interests are answered from the real article;
- **her portfolio** — the album, the number of photographs, the first frames, the videos and the
  portfolio document;
- **every other model** — the whole `ai-model-data.ts` manifest, so "who else is in the studio?"
  lists them and "tell me about Nourhan Durrani" answers with her card;
- **the whole website** — `NEVERBEEN_SITE_FACTS` plus the pages themselves: what NeverBeen is, how it
  works, pricing plans and the per-photo rate, the minimum order and the coupons, destinations,
  refunds/cancellations, privacy promises, the audience notes, the founder and the WhatsApp details,
  and the rules of the chat itself;
- **the built-in world file** — `world-countries.ts` (every country with its capital, currency and
  continent) and `chat-world.ts` (countries and cities, time zones through `Intl`, arithmetic, dates
  and the everyday facts behind the common questions). Answers are found by scoring the question
  against the fact lines (`searchDossier`), never by a single keyword.

Answers so far are shown as a source strip under her bubble when the live endpoint supplied them
(`message.sources`).

## B. Her tone, and what happens when a visitor is out of line

`CHAT_PERSONA_RULES` in `worker/ai-chat-core.mjs` is her written character — seductive, modern,
frank, warm, short answers, never crude, never claiming to be a real person — and it lives on the
server so a visitor cannot rewrite it. Her own engine follows the same voice.

`chat-moderation.ts` reads every visitor message:

- a swear word is **one strike** (`offensive`);
- sexual harassment is **two strikes** (`harassment`, because it ends a chat faster);
- at `AI_CHAT_STRIKE_LIMIT` (3) she stops answering, says goodbye and the session is closed for
  good: the composer is replaced by "She ended this session", the window closes itself after 7
  seconds, and the only way back is **Start a new 2-hour chat** (a fresh session) or reopening the
  window later.

Masked spellings (`sh1t`, `st*pid`) and simple stems (`damn`, `dammit`) are caught as well.

## C. Questions about the world outside NeverBeen

Two paths, in this order:

1. **The live endpoint** — the window POSTs the turn to `POST /api/ai-chat`
   (`worker/ai-chat-core.mjs`, routed in `worker/index.ts`). With an `OPENAI_API_KEY` the answer is
   streamed back as `text/event-stream` — `data: {"sources":[…]}`, then `data: {"delta":"…"}` per
   fragment, then `data: {"done":true}` — and with `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_CX` the
   question is searched on Google first (`num=3`) and the top results are handed to the model and
   shown under her answer. The system prompt carries her rules, her card and the dossier the window
   sent (her portfolio, her biography, the other models and the website).
2. **Her own engine** — without keys the endpoint answers `503 { error: 'ai-unavailable' }` and the
   window says so once, then answers from `chat-replies.ts` and the built-in world file. The capital
   of India is Delhi on both paths.

The endpoint validates every turn (question ≤ 2000 characters, dossier ≤ 12 000, history ≤ 12
messages of ≤ 800 characters, image data URL ≤ 4 MB, body ≤ 6 MB), throttles one client to 30
requests a minute, and answers `400`, `405`, `413`, `429`, `502` and `503` without ever leaking a
key.

## D. The first message: her introduction

The first thing the visitor sends is answered by `chatIntroduction()` — never by the model:

> Good evening! I am Alisha Bhattacharya — @alisha.bhattacharya, 24, from Darjeeling, India…

The greeting follows the clock (`greetingFor`: Good morning before noon, Good afternoon before 17:00,
Good evening after), and the introduction states her full name, her model id, her country and city,
her age, and that she is an **AI model agent** who does not exist in reality outside the NeverBeen
Multiverse.

## E. She remembers the session

`AiModelChatService` (`src/app/services/ai-model-chat.service.ts`) is the one store behind the
window: `session()` holds the transcript, the strikes, the reminder marks and the clock for the open
model, and every send/reaction is a change to that one object. Her engine is handed the last turns
with the question, and the live endpoint receives the last 12 messages as `history` (`user` /
`assistant`). A refresh does not lose the conversation — the session is mirrored into
`sessionStorage` under `AI_CHAT_STORAGE_KEY` (`nb.ai-model-chat.v1`) and restored, though picture
previews larger than ~180 KB are dropped from the stored copy to keep the tab's storage small.

## F. Two hours, and the reminders

A session is `AI_CHAT_SESSION_MS` (2 h) long. The remaining time is shown in the **top-right** corner
of the window (`formatRemaining`, `02:00:00` down to `0:00`) with a thin progress bar under it. At
`AI_CHAT_REMINDER_MARKS` — 15, 10, 5 and 1 minutes left — a reminder appears **in the middle of the
conversation**, not beside it: a centred glass pill with a violet border and a shimmering light band that sweeps across it, with a
soft drop-in animation — all of it switched off when the visitor prefers reduced motion
(`.chat-reminder` in `ai-model-chat.css`). At zero the session ends with the timeout notice, the
composer is replaced by the closed state and **Start a new 2-hour chat** opens a fresh one.

## G. Instagram-style timestamps

Every bubble carries the time it was sent under it (`HH:MM` through `Intl.DateTimeFormat`), with the
full date of the message in the tooltip (`Today, 14:32` → `13 Oct 2026, 14:32`), and the conversation
opens a new centred day line — `Today, 14:32`, `Yesterday, 09:04`, or the date itself — whenever the
calendar day changes (`daySeparatorFor`, `timeOf`, `stampOf` in `ai-model-chat.ts`). The two-hour
session clock in the top-right corner is the same idea applied to the countdown.

## H. Reactions, both ways

Her messages carry a reaction button that opens the Instagram tray
(`AI_CHAT_REACTIONS`: 👍 ❤️ 😂 😮 😢 😡); a double-click on her bubble is a ❤️. Her answer to a
reaction is written by `reactionAcknowledgement()`, and she reacts **back** on the visitor's own last
message — `reactionForUserMessage()` picks hers from what the visitor wrote, so a sweet message gets
a ❤️ and a rude one an 😡. Both stamps are shown under the bubble (`You reacted ❤️`,
`Alisha reacted ❤️`), and pressing the same emoji again takes the reaction off.

## Files

| File                                                               | What it holds                                                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/app/pages/ai-models/chat/ai-model-chat.{ts,html,css}`         | the window: layout, composer, attachments, reactions, the centred reminder, the closed state                          |
| `src/app/pages/ai-models/chat/chat-types.ts`                       | the session shape and the numbers: 2 h, 400 messages, 8 MB / 16 MB attachments, the six reactions, the reminder marks |
| `src/app/pages/ai-models/chat/chat-moderation.ts`                  | profanity and harassment levels, the strikes, her warning and goodbye texts                                           |
| `src/app/pages/ai-models/chat/chat-knowledge.ts`                   | her persona, the fact lines and the dossier index that answers use                                                    |
| `src/app/pages/ai-models/chat/chat-world.ts`, `world-countries.ts` | the built-in world file behind requirement C                                                                          |
| `src/app/pages/ai-models/chat/chat-replies.ts`                     | her own engine: introduction, every topic, small talk, the cascade of answers                                         |
| `src/app/services/ai-model-chat.service.ts`                        | the session store, the clock, the sent messages, the streaming, the storage mirror                                    |
| `worker/ai-chat-core.mjs` (+ `.d.mts`)                             | the live endpoint: validation, persona, Google search, OpenAI streaming                                               |
| `worker/index.ts`                                                  | `POST /api/ai-chat`, its own throttle, and the optional secrets                                                       |
| `scripts/dev-api.mjs`                                              | the local stand-in for `/api/ai-chat` on port 8787                                                                    |

## Running it locally

```bash
npm start                     # ng serve + the API stand-in on :8787, /api proxied (proxy.conf.json)
```

Without `OPENAI_API_KEY` the window answers from her own engine. To exercise the live path:

```bash
OPENAI_API_KEY=sk-… GOOGLE_SEARCH_API_KEY=… GOOGLE_SEARCH_CX=… npm start
```

In production the same three values are Worker secrets, with `OPENAI_MODEL` as an optional variable
(`gpt-4o-mini` by default):

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GOOGLE_SEARCH_API_KEY
npx wrangler secret put GOOGLE_SEARCH_CX
```

## Tests

```bash
npx ng test --no-watch --include "src/app/pages/ai-models/chat/"
npx ng test --no-watch --include "src/app/services/ai-model-chat.service.spec.ts"
```

- `chat-replies.spec.ts` — the engine: the introduction, her card, her biography, the other models,
  the website, the world file, arithmetic, the small talk and the "outside my bubble" fallback;
- `chat-moderation.spec.ts` — the levels, the strikes, masked words and her goodbye;
- `chat-worker.spec.ts` — the Worker endpoint: the SSE stream with its sources, the persona that
  cannot be rewritten by the caller, photographs and documents, every error status and the throttle;
- `ai-model-chat.spec.ts` — the window itself: her photograph, name, model id, city and country,
  **View Profile**, the countdown, the composer with its camera and attachments, Enter/Shift+Enter,
  both reactions, the centred 15-minute reminder, Escape and the closed state after three strikes;
- `ai-model-chat.service.spec.ts` — the session store: two hours, the clock labels, the reminder
  marks and the timeout, the strikes, the reactions, the live endpoint with its sources, the
  fallback to her own engine, the storage mirror and the closed-window guards.
