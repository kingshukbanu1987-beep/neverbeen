# AI Chat: talking to a model

Requirements A–L of the AI model chat, and where each one lives. Everything runs in the website —
the Cloudflare Worker only adds the live OpenAI answer and the Google results for questions from
outside NeverBeen. Without those secrets the chat still works: her own engine answers from the whole
website and from a built-in world fact file.

The requirement letters below are the brief's: **A** who the visitor is, **B** her voice and how she
reads them, **C**/ **D** expression and smileys, **E** selfies, **F** photographs they send,
**G** the contract she asks for, **H** her own initiative, **I** four to five seconds of typing,
**J** the video rule, **K** the session report, **L** never a bot line. The sections further down
that are labelled A–H are the window's own topics from the first delivery and keep their letters.

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
- the conversation, then the composer. The window opens on the conversation itself: no welcome copy
  and no canned starter questions, so the first thing her visitor reads is what she has to say.

In front of it, until the visitor has introduced themselves, the window is covered by the form of
requirement **A** (`chat-identity-prompt.{ts,html,css}`, `.gate`): her portrait with a live dot, a
kicker, **Before we start**, a circular photograph slot (upload or `capture="user"` camera, both
through the shared compressor at `CHAT_IDENTITY_AVATAR_BYTES` — about 100 KB) and a name field that
is checked as it is typed (`chatNameError`: three to fourteen characters, letters required, whitespace
collapsed) with the sentence "She will call you **Rahul**" as soon as the name is good. **Start
chatting** stays disabled until both are there; `(confirmed)` hands `{ name, avatar }` to
`AiModelChatService.setIdentity()`.

Once she knows them:

- their photograph stands, circular, beside every one of their messages
  (`.chat-row-photo.is-visitor`), hers beside hers;
- the header under her name reads `Chatting with Rahul · active now`, and while she is writing it
  reads `Alisha is typing…`;
- her pending bubble carries `Alisha is typing` above the three dots (requirement **I**), and the
  answer starts arriving four to five seconds after the visitor sent theirs
  (`pacing.thinkingMs` 4400 + `pacing.jitterMs` up to 600, revealed at `pacing.revealMs`).

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
   Every turn carries `user: { name, firstName }` and, on the turn that opens the window,
   `opening: true`, and the worker adds both to the system prompt and to the turn it builds.

2. **Her own engine** — without keys the endpoint answers `503 { error: 'ai-unavailable' }` and the
   window says so once, then answers from `chat-replies.ts` and the built-in world file. The capital
   of India is Delhi on both paths.

The endpoint validates every turn (question ≤ 2000 characters, dossier ≤ 12 000, history ≤ 12
messages of ≤ 800 characters, image data URL ≤ 4 MB, body ≤ 6 MB), throttles one client to 30
requests a minute, and answers `400`, `405`, `413`, `429`, `502` and `503` without ever leaking a
key.

## D. Who speaks first, and her introduction

The two hours start when the form is filled in, and she speaks first: `setIdentity()` appends the
line `openingLine()` writes (guarded against a second call, and it sets `introduced` so the visitor's
first question is answered rather than answered with a second introduction).

> Hey Rahul — I saw your photograph come through and I have been waiting for you to say something
> ever since. I am Alisha.

`openingLine` picks from a warm pool for a young or bubbly voice, a measured one for a senior voice,
and adds one of her country's emoji when the roll falls that way. The name is the visitor's **first
name only** — `firstNameOf`, so "Rahul Verma" is Rahul everywhere in the window and in her answers.

The first answer of a _session_ is her introduction, written by `chatIntroduction()` — never by the
model:

> Good evening, Rahul! I am Alisha Bhattacharya — @alisha.bhattacharya — and I am 25, writing to you
> from Darjeeling, India. Everything of me — my story, my photographs, my videos — lives inside the
> NeverBeen Multiverse and nowhere else, and I am not pretending otherwise. That is not a warning, it
> is an invitation: ask me anything.

The greeting follows the clock (`greetingFor`: Good morning before noon, Good afternoon before 17:00,
Good evening after), and the introduction states her full name, her model id, her country and city,
her age, and where the whole of her lives — in her own voice (requirement **L**: the older "I am an
AI model agent" line is gone, the disclosure is not).

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

## The form's rules (requirement A)

`chat-identity.ts` owns the three numbers the whole feature agrees on: `CHAT_NAME_MIN_LENGTH` (3),
`CHAT_NAME_MAX_LENGTH` (14) and `CHAT_IDENTITY_AVATAR_BYTES` (100 KB), plus `cleanChatName`,
`chatNameError`, `isValidChatName`, `firstNameOf` and `shortNameOf`. The form, the window, the
service and the reply engine all import from it, so a name that is too short is refused in the same
words wherever it is typed.

`AiModelChatSession.identity` (`{ name, avatar }`) is the visitor: their photograph is the avatar
beside their messages and in the session report, and their name travels with every turn — to her own
engine as `request.user`, and to the live endpoint as `user: { name, firstName }` in the POST body,
where `worker/ai-chat-core.mjs` turns it into a line of the system prompt ("You are talking to Rahul
Verma. Call them Rahul — their first name only"). Without an identity `sendMessage()` refuses with
"Your name and one photograph first — then I am all yours."

## B. Her voice: her age, her country, and the person she is talking to

`chat-voice.ts` is where her manner comes from:

- `modelVoice(model)` → `{ country, city, band, age, emojiRate, interjection, endearment,
expressiveness, cadence, favourites }`. `COUNTRY_VOICES` has an entry per country she comes from —
  India (`achha`, `yaar`, 😄🥰), Iran (`khob`, `azizam`, 😌🌷), Syria (`yalla`, `habibti`, 😊😂☕🌙),
  Lebanon, Egypt, the Gulf, Türkiye, Georgia, Ireland, the UK, Malaysia, Argentina, Uruguay, Bosnia,
  Morocco and a neutral fallback — so an Indian, an Iranian and a Syrian woman do not sound alike;
  the age bands (young ≤ 25, mid ≤ 32, senior) bend the same country: 23 is bubbly with many emoji,
  40 is measured with few.
- `analyseUserBehaviour(messages, strikes)` → what she has worked out about the visitor: warmth,
  humour, curiosity, emoji, brevity, whether they sent a photograph, whether they talked about
  booking, whether they were rude, and what they keep coming back to (her photographs, her story,
  travel, food, films, the studio…).
- `garnishChatReply()` dresses an answer in that voice: the country's interjection ("achha, …" —
  without eating the capital of a name), a line of feeling, the visitor's name, a warm aside and the
  country's emoji. A one-line writer gets a one-line answer.

## C and D. Expression, and smileys

Every answer she composes is dressed before it is sent: `inVoice()` runs it through
`garnishChatReply`, so even a plain fact arrives with her interjection, a line of feeling, the
visitor's name, a warm aside and one of her own emoji. A message that is nothing but a smiley is a
sentence like any other: `smileyReply()` in `chat-replies.ts` matches a face-only message
(`SMILEY_ONLY_PATTERN`) and answers with one of hers and a question, and a request for a smiley
(`SMILEY_REQUEST_PATTERN` — "send me a smiley") gets three of her country's favourites back. Nothing
about a smiley ever reaches the "I do not know that one" fallback.

## E and F. Selfies, and the pictures they send

`chat-selfie.ts` answers a selfie request (`SELFIE_REQUEST_PATTERN`) with a frame **from her own
album** (`pickChatSelfie`, never the same one twice in a session) plus the moment and the flaw from
`SELFIE_MOMENTS` — "in my room, the lamp is on and it is too warm in here", "no filter, no makeup,
this is the real thing". The window dresses it like a phone photograph (`.chat-bubble.is-selfie`:
portrait crop, a one-degree tilt, grain and a soft-light wash, a `just now` tag) and `selfieCaption()`
writes the caption a person would send with it.

A picture the visitor sends is read first: `chat-photo.ts` draws it into a 96-pixel canvas and turns
the pixels into facts — orientation, brightness, saturation, warmth, dominant colour and the share of
skin-toned pixels (`readChatPhotoFacts`, with a 1.5 s guard so a picture that never loads cannot
freeze her answer). `photoObservation()` then writes what she can see in it ("That came out really
dark — I can just about make you out", "Phone held up over your head too — very flattering angle"),
and the answer goes out with the intent `attachment:photo`.

## G and H. Her own initiative

- **The contract** — `contractPitch()` in `chat-voice.ts` asks the visitor for work in her own words:
  a brand promotion or an editorial set, priced from her own card ("It starts at ₹545 a
  photograph"). `maybePitch()` in the service offers it on the visitor's fifth and thirteenth
  message, at most twice a session, and never after a rudeness strike.
- **The silence** — after `AI_CHAT_IDLE_MIN_MS` (11 s) plus a step (`AI_CHAT_IDLE_MAX_MS` 19 s, +9 s
  each time, capped at a minute) of quiet, `nudge()` appends an `idleChatOpener()`: something about
  her, something about the visitor, something from the world file, or a question — never the same
  topic twice, at most `AI_CHAT_NUDGE_LIMIT` (6) times, and never while she is already writing.

## J. Videos

`videoRefusal()` in `chat-voice.ts` holds the founder's sentence, word for word:

> Sorry actually, NeverBeen Founder Mr. Kingshuk asked me not to send my videos or any videos while I
> am chatting with someone. So, you take his permission next time and show me his permission, then I
> will send. Please don't mind.

`VIDEO_REQUEST_PATTERN` catches "send me a video", "do you have any reels?", "your videos please" and
answers with that sentence and nothing else; it is also the first house rule in the live system
prompt, so the same rule survives on the OpenAI path.

## L. Never a bot line

Her engine is written so that no answer sounds like software: those three lines are the ones the code
never produces, and the same rule is stated to the live model ("Never sound like software: do not say
that you are an AI model, do not mention a dossier, a database, a biography or a knowledge base, and
do not offer to search anything"). The tests assert the absence of the phrases wherever they used to
appear.

## K. The session report

When a session ends — the two hours running out, the third strike, or the visitor starting a new one
over an ended chat — `endSession()` stamps `closedAt` and raises `summaryOpen`, and the window shows
`chat-session-summary.{ts,html,css}` (`.farewell`) over the closed conversation:

- both faces, hers and the visitor's, in circles joined by a heart;
- the headline and the time they spent together (`formatTogether`: "40 seconds", "48 minutes",
  "1 hour 12 minutes") from `buildChatSessionSummary()`;
- three numbers — their messages, the photographs that went back and forth, her rating out of five —
  with the five stars lit to match;
- up to three chips for what the chat was about, and the paragraph she writes about it, derived from
  the session itself: how they wrote, what they kept asking about, whether they sent a photo, whether
  they were rude, whether they talked about booking. A conversation she ended is rated 1 and written
  about in the same breath.

**Close** puts the card away (`dismissSummary()`), leaving the ended window behind it.

## Files

| File                                                               | What it holds                                                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/app/pages/ai-models/chat/ai-model-chat.{ts,html,css}`         | the window: layout, composer, attachments, reactions, the centred reminder, the closed state, both overlays           |
| `src/app/pages/ai-models/chat/chat-identity-prompt.{ts,html,css}`  | the form in front of the window: the photograph and the name (requirement A)                                          |
| `src/app/pages/ai-models/chat/chat-identity.ts`                    | the name rules and the visitor's photograph: 3–14 characters, 100 KB, first name only                                 |
| `src/app/pages/ai-models/chat/chat-session-summary.{ts,html,css}`  | the report card that closes a session (requirement K)                                                                 |
| `src/app/pages/ai-models/chat/chat-summary.ts`                     | what that card says: the minutes, the counts, her rating and her paragraph about the chat                             |
| `src/app/pages/ai-models/chat/chat-voice.ts`                       | her voice by country and age, the visitor's behaviour, the opening line, the idle opener, the pitch, the video line   |
| `src/app/pages/ai-models/chat/chat-selfie.ts`                      | the frames she sends as selfies, their moments and their flaws, and the video-request pattern                         |
| `src/app/pages/ai-models/chat/chat-photo.ts`                       | what she can see in a picture the visitor sends (requirement F)                                                       |
| `src/app/pages/ai-models/chat/chat-random.ts`                      | the seeded pick/roll helpers, so every random choice is still testable                                                |
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
- `ai-model-chat.service.spec.ts` — the session store: two hours, the identity gate that starts the
  clock and speaks first, the silence she fills, the four to five seconds of typing, the selfie and
  the photograph, the contract she asks for, the clock labels, the reminder marks and the timeout,
  the strikes and the report card, the reactions, the live endpoint with its sources, the fallback to
  her own engine, the storage mirror and the closed-window guards;
- `chat-identity.spec.ts`, `chat-identity-prompt.spec.ts` — the form and its rules: 3–14 characters,
  the errors, the camera and the gallery, the 100 KB reduction, the refusal of a file that is not a
  picture, and the `{ name, avatar }` it confirms;
- `chat-voice.spec.ts` — her country and her age, what she works out about the visitor, the opening
  line, the idle opener, the pitch, and the video sentence word for word;
- `chat-selfie.spec.ts`, `chat-photo.spec.ts` — her selfies, the requests that trigger them, and what
  she sees in a picture the visitor sends;
- `chat-summary.spec.ts`, `chat-session-summary.spec.ts` — the report card: the time together, the
  counts, her rating, her paragraph and the Close button.
