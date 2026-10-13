# AI Chat: talking to a model

Requirements A–L of the AI model chat, and where each one lives. Everything runs in the website —
the Cloudflare Worker only adds the live OpenAI answer and the Google results for questions from
outside NeverBeen. Without those secrets the chat still works: her own engine answers from the whole
website and from a built-in world fact file.

The requirement letters below are the first brief's: **A** who the visitor is, **B** her voice and how
she reads them, **C**/ **D** expression and smileys, **E** selfies, **F** photographs they send,
**G** the contract she asks for, **H** her own initiative, **I** four to five seconds of typing,
**J** the video rule, **K** her own note about the chat and the form that closes a session, **L**
never a bot line. The sections further down that are labelled A–H are the window's own topics from the
first delivery and keep their letters.

The **second brief** (A–F) rewrote how her answers reach the window, and is described in
[The second brief: A–F](#the-second-brief-af) below: the answer is typed for as long as a person
needs to type it and then arrives **whole** (never word by word), a long answer arrives as several
messages, she sometimes pauses 3–7 s before typing and sometimes stops mid-thought, she never says
where an answer came from, her introduction is four or five messages written by her own age and
country, and the profile's **Live Chat** button stands under her name (the brief asked for 2.5× the
studio's standard button; it is now 1.7× smaller than that, a quiet pill).

The **third brief** (A–F of its own, and the letters below are the brief's) is described in
[The third brief: A–F](#the-third-brief-af): she says her hello and then **waits** for the visitor
(A), she may write on her own only once the session has run five minutes, or a subject is in play, or
the visitor has asked her something (B), she no longer recites her age, her city or the size of her
album until she is asked for it (C), three quiet minutes are read as a visitor who is not interested
and she ends the session herself (D), and the window's ✕ — like every session that ends on its own —
asks the visitor for stars and a few words first (E), in a form that stays until its own **Close**
button is pressed (F).

## Where to open it

| Entry point                        | What the visitor presses                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ai-models/:slug` (model profile) | **Live Chat** — a `#74C476` button with white text, under her name in `.chat-cta`, 1.7× smaller than the two-and-a-half-times button of requirement E and with its quiet animation                                                          |
| `/ai-models` (studio directory)    | **Live Chat** — a `#74C476` pill 1.5× the studio's standard button, directly under the name of the model inside `.card-chat-row` (no longer in the `.card-actions` link row), with a breathing glow, a band of light and a pulsing live dot |

Both mount the same window: `<app-ai-model-chat [model]="…" (closed)="closeChat()" />`, which opens
the two-hour session itself in `ngOnInit` — the pages only render it
(`src/app/pages/ai-models/chat/ai-model-chat.{ts,html,css}`, selector `app-ai-model-chat`). The
window is the booking dialog's own pattern — a `.chat-backdrop` with `role="dialog"`, `z-index` 240, `:host { display: contents }` — no CDK overlay. **A chat that has started is not thrown away
by a stray click**: the backdrop, Escape and ✕ all go through `requestClose()`, which puts the close
form of requirement E up instead of closing — the window only goes when the visitor's own **Close**
button in that form goes (E and F). **View Profile** still leaves for the profile page, and a window
with nothing in it yet (the ✕ on the "Before we start" form) still closes straight away. Nothing
closes itself any more: **F** took the 7 s `CHAT_AUTO_CLOSE_MS` timer that used to take the report
card away, so the form she raises by ending a chat herself stays until the visitor closes it.

## Where the window opens, and how wide

| Screen                                            | The window                                                                                                                                       | Where her information is                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Phone (under 900px wide)                          | one portrait column, `min(480px, 100%)` wide                                                                                                     | the block at the top, as it always was     |
| Laptop, desktop, or a tablet on its side (≥900px) | landscape and wide — `min(1240px, 95vw)` by `min(88vh, 840px)` — with her card moved into a column on the left and the conversation on the right | `.chat-side`, a side panel beside the chat |

The markup is the same on both: `.chat-side` holds the bar (her photograph, her name, the two-hour
clock and the ✕) and her card, and `.chat-conversation` holds the transcript and the composer. On a
phone `.chat-side { display: contents }` lifts those two blocks back into the window's own grid, so
nothing about the small screen changes; from 900px up the side column becomes a real panel — her
photograph, her name, her model id, her city and country, **View Profile** and the AI notice — and the
right-hand column shows **the chat and nothing else**. The form of requirement A and the close form
of requirement E both still cover the whole window, side panel included.

## The window, top to bottom

- her round profile photograph (`.chat-profile-photo`, the same cover and round container as the
  profile header);
- her name in bold, large, black type, and under it her model id in small italic black type
  (`@alisha.bhattacharya` for **Alisha Bhattacharya**) — `model.name` and `model.handle`;
- her country and city in normal small black type, split out of `model.location`;
- **View Profile** — grey `#e6e6ea` background, black text, `routerLink` to `/ai-models/:slug`;
- the conversation, then the composer. The window opens on the conversation itself: no welcome copy
  and no canned starter questions, so the first thing her visitor reads is what she has to say.

On a wide screen the whole block above the conversation line — the bar and her card — sits in the
side panel on the left instead (see _Where the window opens, and how wide_).

In front of it, until the visitor has introduced themselves, the window is covered by the form of
requirement **A** (`chat-identity-prompt.{ts,html,css}`, `.gate`): her portrait with a live dot, a
kicker, **Before we start**, a **✕** in its top-right corner (`.gate-close`, which closes the whole
window without confirming anything — the same way out as the ✕ in the bar), a circular photograph
slot (upload or `capture="user"` camera, both
through the shared compressor at `CHAT_IDENTITY_AVATAR_BYTES` — about 100 KB) and a name field that
is checked as it is typed (`chatNameError`: three to fourteen characters, letters required, whitespace
collapsed) — which asks with the words **“Write your name here”**, never with another model's name —
with the sentence "She will call you **Rahul**" as soon as the name is good. **Start
chatting** stays disabled until both are there; `(confirmed)` hands `{ name, avatar }` to
`AiModelChatService.setIdentity()`.

Once she knows them:

- their photograph stands, circular, beside every one of their messages
  (`.chat-row-photo.is-visitor`), hers beside hers;
- the header under her name reads `Chatting with Rahul · active now`, and while she is writing it
  reads `Alisha is typing…`;
- her pending bubble carries `Alisha is typing` above the three dots, and the header says the same
  thing for exactly as long as an indicator is on screen — no longer, so the seconds in which she was
  away from her phone stay quiet (`chat.away()`, requirement **D** of the second brief);
- the answer itself appears **whole** once she has had the time a person needs to type it
  (`pacing.perCharMs` 34 ms a character, floor `pacing.floorMs` 2.4 s, ceiling `pacing.ceilingMs`
  7.2 s, ± `pacing.jitterMs` 0.5 s) — there is no word-by-word reveal left anywhere in the window
  (`typingTimeFor()` in `chat-types.ts`).

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

**She never says where an answer came from** (requirement B of the second brief). No "I searched",
no "Google", no "OpenAI", no "the NeverBeen AI", no "I found it" — she knows it, or she remembers
it, with an opinion attached. The worker's system prompt says so in as many words, and her own engine
never had a way to say it in the first place.

The endpoint validates every turn (question ≤ 2000 characters, dossier ≤ 12 000, history ≤ 12
messages of ≤ 800 characters, image data URL ≤ 4 MB, body ≤ 6 MB), throttles one client to 30
requests a minute, and answers `400`, `405`, `413`, `429`, `502` and `503` without ever leaking a
key.

## D. Who speaks first, and her introduction

The two hours start when the form is filled in, and she speaks first. `setIdentity()` starts the
clock and hands the introduction to `introduceFirst()`, which waits **three to five seconds**
(`pacing.introMinMs`/`introMaxMs` — the window is on the conversation and she has said nothing), then
sends it **one message at a time**, `pacing.gapMinMs`/`gapMaxMs` (2–4 s) apart, with the typing
indicator in front of each. Five messages, or four for a reserved woman of a certain age — never
fewer, never more, and never one paragraph (requirement **F** of the second brief).

The messages are written by `voiceIntroduction()` in `chat-voice.ts`, and they are hers:

> Hey Rahul — I saw your photograph come through and I have been waiting for you to say something
> ever since. I am Alisha.
>
> Good evening, Rahul. I am Alisha Bhattacharya — @alisha.bhattacharya — and everything else about me
> you will have to ask for. All of it — my story, my photographs, my videos — lives inside the
> NeverBeen Multiverse and nowhere else, and I am not pretending otherwise. That is not a warning, it
> is an invitation: ask me anything.
>
> I am still deciding what I want to be, which is why I am good company for anybody who has not
> decided either.
>
> There is music somewhere in the house and nobody to argue with about it, which is either lovely or
> tragic.
>
> Rahul, what do you eat when nobody is watching?

The four or five messages carry her hello, her card and where the whole of her lives, how she sounds,
the one line about her own evening, and her question back — and **not one fact about her that the
visitor did not ask for** (requirement C of the third brief): no city, no country, no age in years,
no count of the photographs or videos on her card. Those live behind the questions that ask for them
(`chatBioReply()`, her album, her dossier), where they always did.

The greeting follows the clock (`greetingFor`), the first message is `openingLine()` (a warm pool for
a young or bubbly voice, a measured one for a senior voice, plus one of her country's emoji when the
roll falls that way), and the visitor is the **first name only** everywhere in the window
(`firstNameOf` — "Rahul Verma" is Rahul). The introduction states her full name, her model id and
where the whole of her lives — and nothing else she was not asked for (requirement **C**): her city,
her country and her age are written in her voice and her age band (young, mid, senior — see
`WELCOME_TONE_LINES`, `voiceIntroduction()`), not in a number. Her own voice throughout, with the
disclosure kept and the bot line gone (requirement **L**). **No two welcomes are the same** — see
[A welcome that is never the same twice](#a-welcome-that-is-never-the-same-twice).

`chatIntroduction()` still exists for the one case the window cannot script — a session whose first
answer comes in before the introduction did — and simply joins those same messages with a blank line,
which the service then sends one by one.

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
beside their messages and in the close form of requirement E, and their name travels with every turn — to her own
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
  without eating the capital of a name: only the ordinary words she may open a sentence with lose
  theirs, so "achha, the capital of France is Paris" but never "achha, alisha Bhattacharya"), a line
  of feeling, the visitor's name, a warm aside and the country's emoji. A one-line writer gets a
  one-line answer.
- `voiceIntroduction()` — her opening, in the same voice: `COUNTRY_FLAVOURS` gives every country its
  own home life, its own kind of day and its own way of asking a question back (India: biryani on
  Sundays, the aunties next door, "what is your chai count for the day?"; Iran: ghormeh sabzi, the
  news from home, "where does the evening find you?"), and the age bands pick how it is said. This is
  requirement **F** of the second brief — and since requirement **C** of the third brief it is also
  the rule that she opens with **no fact about herself that was not asked for**: four or five messages
  that say her name, her handle and where the whole of her lives, how she sounds and one line about
  her evening, and then her question back. Her city, her country, her age in years and the number of
  photographs on her card stay behind the questions that ask for them. It is still why an Indian of
  25 and an Iranian of 25 — or a young woman and a woman of 30 — do not open the same conversation,
  in the introduction or in any answer that follows it.
- `splitChatMessages(text, maxChars)` — requirement **C**: where one answer becomes several. It keeps
  the line breaks the seam of the answer, splits on sentence ends when a paragraph is too long for one
  bubble, merges the slivers back, and only breaks a wall of text on a space when there is nothing
  else to break on.

## C and D. Expression, and smileys

Every answer she composes is dressed before it is sent: `inVoice()` runs it through
`garnishChatReply`, so even a plain fact arrives with her interjection, a line of feeling, the
visitor's name, a warm aside and one of her own emoji. A message that is nothing but a smiley is a
sentence like any other: `smileyReply()` in `chat-replies.ts` matches a face-only message
(`SMILEY_ONLY_PATTERN`) and answers with one of hers and a question, and a request for a smiley
(`SMILEY_REQUEST_PATTERN` — "send me a smiley") gets three of her country's favourites back. Nothing
about a smiley ever reaches the "I do not know that one" fallback.

## E and F. Selfies, and the pictures they send

When the visitor asks for a **selfie by name**, she **takes one now**: `chat-selfie.ts` fetches her
own profile photograph, reduces it to a likeness (`readSelfieReference`) and hands it, with the
moment and the flaw from `SELFIE_MOMENTS` — "in my room, the lamp is on and it is too warm in here",
"no filter, no makeup, this is the real thing" — to `POST /api/ai-selfie`, where Google Gemini's
image model photographs her (`worker/ai-selfie-core.mjs`). She is quiet for `pacing.selfieMinMs` to
`selfieMaxMs` (4–9 s) while it is taken, the way a person is quiet while she aims a phone at herself,
and the picture that comes back is what the visitor sees. Asking for her **photos** instead
(`SELFIE_REQUEST_PATTERN` without the word itself) is answered with a frame from her own album
(`pickChatSelfie`, never the same one twice in a session). Either way the window dresses the frame
like a phone photograph (`.chat-bubble.is-selfie`: portrait crop, a one-degree tilt, grain and a
soft-light wash, a `just now` tag) and `selfieCaption()` writes the caption a person would send with
it. With no `GEMINI_API_KEY` — or when the image model refuses — the album frame goes out instead: a
visitor who asks for a photograph always gets one.

A picture the visitor sends is read first: `chat-photo.ts` draws it into a 96-pixel canvas and turns
the pixels into facts — orientation, brightness, saturation, warmth, dominant colour and the share of
skin-toned pixels (`readChatPhotoFacts`, with a 1.5 s guard so a picture that never loads cannot
freeze her answer). `photoObservation()` then writes what she can see in it ("That came out really
dark — I can just about make you out", "Phone held up over your head too — very flattering angle"),
and the answer goes out with the intent `attachment:photo`.

## G and H. Her own initiative, and the third brief's A, B and D

- **The contract** — `contractPitch()` in `chat-voice.ts` asks the visitor for work in her own words:
  a brand promotion or an editorial set, priced from her own card ("It starts at ₹545 a
  photograph"). `maybePitch()` in the service offers it on the visitor's fifth and thirteenth
  message, at most twice a session, and never after a rudeness strike.
- **A — she speaks first, and then she waits** — her introduction is hers the moment the form in
  front of the window is filled in, and after that not one word of her own until the visitor has
  written something. `chatInitiative()` reports that as `heardFrom`, and `speakUp()` refuses to write
  on her side of the window while it is false. (The 11–19 s `AI_CHAT_IDLE_MIN_MS`/`MAX_MS` filler of
  the first delivery, and its six-nudge limit, are gone.)
- **B — the three things that give her the floor** — `chatInitiative()` reads them from the
  transcript and hands `speakUp()` a `reason`: the session has already run `AI_CHAT_ENGAGED_MS`
  (five minutes) → `'session'`; a subject they keep coming back to is in the transcript → `'topic'`
  (the visitor's own interest, with `idleChatOpener({ reason, topic })` continuing *that* subject);
  the visitor asked her something → `'question'`. Nothing else does. She waits
  `AI_CHAT_FOLLOWUP_MIN_MS`–`MAX_MS` (45–75 s, `followUpDelay()`, a fixed 20 s longer every time she
  has already spoken) before the follow-up goes out, never while she is mid-answer, and at most
  `AI_CHAT_FOLLOWUP_LIMIT` (6) times a session.
- **D — she stops waiting** — `AI_CHAT_INTEREST_MS` (three minutes) of silence measured from the
  visitor's last message — or from her hello, for a visitor who never wrote at all — is read as an
  answer: `disinterestFarewell()` says goodbye in her own voice (`intent: 'goodbye'`), `endSession()`
  closes the session with the reason `'inactive'`, and the close form of requirement E comes up over
  it. She never ends a session she is in the middle of answering.

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

## K. Her note, and the form that closes a session

`chat-summary.ts` still writes her own reading of the chat — `buildChatSessionSummary()`, the
headline, the paragraph and up to three chips for what the two of them were about, the rating and
whether she was the one who ended it. It used to be a page of its own (`chat-session-summary.*`, gone);
since the third brief it is the **note inside the close form of requirement E**, folded away under the
visitor's own rating:

- the two faces, hers and the visitor's, with the time they spent together (`formatTogether`:
  "40 seconds", "48 minutes", "1 hour 12 minutes");
- four figures — the messages exchanged, the visitor's, hers, and the photographs that went back and
  forth (`buildChatFeedbackFacts()`; only real messages count, and only `attachment.kind === 'photo'`
  is a photograph), with the split of the photographs spelled out in the line beneath;
- the visitor's 1–5 stars and their comments box (see [The third brief](#the-third-brief-af));
- her note: the paragraph she writes about the conversation, her own rating out of five and the chips
  for what it was about.

`Close` at the end of the form is what puts it away and sends what the visitor gave with it
(`recordFeedback()`, kept on the session, readable afterwards through `feedbackFor(slug)`).

## The second brief: A–F

| Letter | What it asks for                                                                                            | Where it lives                                                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | the answer never arrives instantly and never word by word: "typing" first, then the whole message           | `AiModelChatService.typeOut()` — the wait comes from `typingTimeFor()` (34 ms a character, 2.4 s–7.2 s) and the message is written in one piece; the window renders `bubbleText()` (all of it) or the indicator, never a half-written line                             |
| B      | she may reach Google and OpenAI for any question and must never say so                                      | `streamRemoteReply()` collects the answer behind the scenes; the worker prompt forbids naming a source; her own engine has no such line at all                                                                                                                         |
| C      | an answer may come as two, three, four or more independent messages, with "typing" between them             | `splitChatMessages()` + `AiModelChatService.deliver()`, with `pacing.gapMinMs`/`gapMaxMs` (2–4 s) between the messages                                                                                                                                                 |
| D      | sometimes 3–7 s of nothing before typing starts, and sometimes a further 2–5 s pause mid-thought            | `awayPauseMs()` (`chat.away()` keeps the header quiet) and `typeOut()`'s mid-thought pause, which takes the pending bubble out of the transcript and puts it back                                                                                                      |
| E      | the profile's **Live Chat** button under the model's name, with a modern animation                          | `ai-model-portfolio.html` (`.chat-cta` under the `h1`) and `ai-model-portfolio.css` (`.action-chat.is-hero`: 1.7× smaller than the 2.5× button the brief asked for; breathing glow, a light band crossing it, a lift on hover, all off under `prefers-reduced-motion`) |
| F      | the introduction differs by age and country, starts after 3–5 s and arrives as 3–5 messages with 2–4 s gaps | `voiceIntroduction()`, `COUNTRY_FLAVOURS`, the age bands, `pacing.introMinMs`/`introMaxMs` and the same gaps; the voice then carries into every answer through `garnishChatReply()`                                                                                    |

## The third brief: A–F

| Letter | What it asks for                                                                                                     | Where it lives                                                                                                                                                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | she sends the first message, and then waits for the visitor — no more talking to an empty room                        | `chatInitiative()`'s `heardFrom` (the visitor's own messages, the transcript read once) + `speakUp()` in `ai-model-chat.service.ts`, which writes nothing on her side until it is true; her introduction is still hers (`introduceFirst()`)                                       |
| B      | she may write unprompted only past five minutes, on a subject that is in play, or after a question of the visitor's   | `chatInitiative()`'s `reason` (`'session'` at `AI_CHAT_ENGAGED_MS`, `'topic'` from `analyseUserBehaviour()`, `'question'` from `asksSomething()`) and `speakUp()` (`followUpDelay()`, `AI_CHAT_FOLLOWUP_LIMIT`) with `idleChatOpener({ reason, topic })`                          |
| C      | no city, country, age or album size until she is asked                                                                | `voiceIntroduction()`'s `WELCOME_TONE_LINES`, `WELCOME_DAY_LINES`, `welcomeCardLines()` and `homeLifeLine()` carry her country's flavour and her age band, never a number; the facts stay behind the questions that ask for them (her card, her biography, her album)             |
| D      | three minutes of silence and she ends the session herself, realising the visitor is not interested                     | `AI_CHAT_INTEREST_MS` in `chat-initiative.ts` (`disinterested`), `mayEndForSilence()` and `endForDisinterest()` in the service: `disinterestFarewell()`, `endSession('inactive')`, and the close form raised with it                                                              |
| E      | the ✕ — and every session she ends — asks first: both faces and names, the time together, the totals and each side's, the photographs, 1–5 stars and a comments box | `chat-feedback.{ts,html,css}` (`app-chat-feedback`), raised by `requestClose()`/`openFeedback()` and by `endSession()`, fed by `buildChatFeedbackFacts()`; `recordFeedback()` keeps what was given                                                     |
| F      | the form does not auto-close; it waits for the visitor's own Close button                                             | `ChatFeedbackCard.close()` is the only thing that ends it — no timer anywhere (`CHAT_AUTO_CLOSE_MS` and the auto-close effect are gone); Escape in the window hands its keystroke to that same button                                                                             |

## Reading what the visitor actually typed

People type fast on a phone. Before a single pattern looks at a message, `chat-input.ts`
(`readVisitorMessage()`) reads it once and hands the engine a repaired copy:

- letters stretched in excitement are collapsed (`sooooo beautiful` → `so beautiful`);
- the apostrophe-free and thumb-shortened forms are written out (`u r`, `ur`, `pls`, `thnx`, `abt`,
  `luv`, `gud`, `pick`… → `you are`, `your`, `please`, `thanks`, `about`, `love`, `good`, `picture`);
- a word of five letters or more one mistake away from a word the chat listens for is repaired to it
  (`beutifulll`, `boyfrind`, `biograhy`, `gorjus`…), with a second edit of room for words of eight
  letters or more.

The visitor's own words are what the window shows; only the reading is repaired. That is why
**"u r sooooo beutifull!!"** is answered as the compliment it is.

## The languages her visitors write in

Many visitors write their own language in Latin letters — Romanised Bengali (_ami khete jabo_), Hindi,
Urdu, Persian, Arabic (Arabizi), Turkish, Spanish, Malay. `chat-language.ts` gives her eight books for
those languages, and `readChatLanguage()` reads every message with them in three steps:

1. **Recognise.** `detectChatLanguage()` scores the message against each book's everyday words. A word
   only one book knows — `shukriya`, `chetori`, `kemon` — is what names the language; a word two books
   share (`aap`, `kaise`, `hai`) counts for much less, so Hindi and Urdu stay apart. A whole phrase the
   book knows (`ami khete jabo`, `kemon acho`, `apa khabar`) is the clearest sign of all.
2. **Understand.** `glossRomanised()` writes the message back into plain English, word by word, so the
   whole reply engine can read it. When the books could not read enough of it, she asks **Google
   Translate** — the same public endpoint the site's own language layer already uses, no key — for the
   sentence and for the language itself (`translateThroughGoogle()`), and remembers both.
3. **Answer in kind.** `romanisedReply()` writes her answer in the visitor's own Romanised language and
   in nothing else: her introduction, a warm answer to a compliment, her rate, her story, her idle
   line. The language is kept on the session (`AiChatSession.language`), so **once a visitor writes that
   way she keeps answering that way** for the rest of the two hours — with a short switch line in front
   of the first answer in a new language. An answer in another language is never delegated to OpenAI.

The books are `bn`, `hi`, `ur`, `fa`, `ar`, `tr`, `es`, `ms`; `languageForModel()` gives every model
the language of her own country and city (Kolkata, Shantinagar and Darjeeling → Bengali; Iran and
Afghanistan → Persian; the Arab world → Arabic; Türkiye → Turkish; Uruguay, Argentina and Colombia →
Spanish; Kuala Lumpur → Malay). A language with no book (Bosnian, Georgian, Irish) leaves the chat in
English rather than guessing.

## Her voice: like a person, never like a program

Rules the second brief settled, all of them in `chat-replies.ts` and `chat-voice.ts`:

- **No lists of what she can do.** Nothing in her answers offers topics — no _“ask me about capitals,
  currencies, continents”_, no _“I never miss”_, no _“I will shine”_ — and the idle lines no longer
  invite a geography quiz.
- **A compliment is answered like a woman.** _“You are very beautiful”_, _“you look gorgeous today”_,
  _“ur pretty”_, _“what a smile”_: `complimentReply()` answers with a blush, a tease, her own country's
  everyday word (`achha`, `yaar`, `khob`, `yalla`, `selam`…) in the mouth of a woman her age, and a
  question of her own — never with a generic line and never twice in the same conversation.
- **Personal questions are answered as herself.** A boyfriend, a marriage, her studies, her career, her
  family, her ambitions (`personalReply()`): first person, from what the studio wrote for her, with
  feeling and a question back — never _“my biography is on the website”_ and never _“I would rather
  quote it than invent it”_.
- **When she does not know, she asks again like a person** (`UNKNOWN_LINES`): _“Wait — say that once
  more, slower. What are you trying to say?”_ — no catalogue of her abilities, no apology for being a
  program.
- **Nothing is repeated.** `freshOptions()` keeps the last sixteen of her lines and passes over a line
  she has already sent in this conversation.
- The declaration of love keeps the studio's honesty rule: everything of her lives inside NeverBeen,
  and she says so warmly rather than pretending to be a woman down the road.

The same rules are written into the server-side persona (`worker/ai-chat-core.mjs`,
`CHAT_PERSONA_RULES`), so the OpenAI path answers in the same voice.

## Reading the turn before she answers

Nothing a visitor sends is answered before it has been read — their words, their photograph, their
document. `chat-analysis.ts` **is** that reading, and it happens in two passes:

1. **The window's own reading**, instantly and offline: `chat-input.ts` repairs the typing (stretched
   letters, short forms, spelling mistakes), `chat-language.ts` reads the language from the studio's
   eight books, `chat-photo.ts` looks at the frame of an attached photograph. It always produces a
   reading, with no network at all.
2. **The studio's reading desk** — `POST /api/ai-read` (`worker/ai-read-core.mjs`) — when the studio
   has the keys. The desk puts the words through **Google Translate** (the Cloud Translation API when
   `GOOGLE_TRANSLATE_API_KEY` is set, the same public Google endpoint the window already uses
   otherwise) and then the whole turn through **Google Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) or
   **OpenAI** (`OPENAI_API_KEY`, `OPENAI_MODEL`): what the visitor _meant_ in plain English, the
   language they wrote in (and whether it was Romanised), their intent, their feeling, their tone,
   what they seem to want, how to answer it — and, when something was attached, **what the photograph
   shows or what the document contains**. Gemini reads images and PDFs directly, so a brief or an
   invoice is read rather than thanked for; OpenAI reads an attached photograph with its vision model.
   The bytes of an attached document travel with the message in `attachment.fileData` for exactly
   this.

The two readings are merged: the desk's findings win where it has them, the window's own reading fills
the rest, and a language the studio has no book for is never switched to. The finished reading goes to
her own engine (`composeChatReply`, which then answers the meaning and not the letters) and to
`POST /api/ai-chat` as `reading`, so the studio's model is told what the visitor meant and what was
inside anything they attached — with one house rule repeated in both places: no answer ever says
anything was read, translated, searched or analysed.

If the desk answers "not configured", refuses, or cannot be reached, `readDeskUnavailable` is set and
she stops asking it for the rest of the visit: the window's own reading stands, and the chat behaves
exactly as it did before the desk existed. Which reader answered a message is kept on the transcript
as `message.analysedBy` (`gemini`, `openai`, `google-translate` or `studio`).

## A welcome that is never the same twice

`voiceIntroduction()` is seeded by the moment the visitor's form was filled in — `welcomeSeed()` in
the service, the epoch millisecond plus a breath of chance — so the same model opens the same chat
differently on every visit: a different hello (`openingLine`), a different way of saying who she is
(five card shapes) and where the whole of her lives (two orders of the same two facts — her card and
the Multiverse), a different line of tone chosen by her age band, a different shape for her own
evening (her country's own kitchen, street and weather through `homeLifeLine`), the two middle
messages in either order, and a different question back, in her country's idiom, with the visitor's
first name in front of it. Her age and her country are what the lines are chosen *by* — since
requirement **C** of the third brief neither of them is a number in the sentence, and the size of her
album is nowhere in it either (`voiceIntroduction()` carries no city, no age and no count; asking for
any of them is what brings them out, in `chatBioReply()` and the album answers).

Without a seed — the studio's transcripts and the tests — the introduction is her model's own,
unchanged from session to session, so a welcome can always be read back word for word.
`chatIntroduction()` (the one case the window cannot script) uses those same messages.

## The selfie she takes now

`POST /api/ai-selfie` (`worker/ai-selfie-core.mjs`) is her camera:

```json
{
  "model": { "name": "Alisha Bhattacharya", "location": "Darjeeling, India", "age": "25" },
  "moment": {
    "place": "in my room, the lamp is on and it is too warm in here",
    "flaw": "no filter, no makeup, this is the real thing"
  },
  "look": "25 years old, living in Darjeeling, in the middle of an ordinary evening at home",
  "reference": "data:image/jpeg;base64,…"
}
```

The reference is **her own profile photograph** (`selfieReference()` — the cover of her card), reduced
to at most 768 pixels on its longest side in the window and sent with the request. Gemini's image
model (`GEMINI_IMAGE_MODEL`, `gemini-2.5-flash-image` by default) is asked for one new phone selfie of
the woman in that photograph, taken in that moment, with `responseModalities: ["IMAGE"]`, and answers
with the picture as base64 — which is returned as `{ ok: true, provider: "gemini", image: "data:…" }`
and shown in a selfie bubble. Nothing is stored, and no visitor photograph is ever part of it: the
likeness is the model's own card.

Three refusals are all handled the same way: no key (`503 selfie-unavailable`), the model answering
with words instead of a picture (`502 selfie-refused`), or the camera being unreachable
(`502 selfie-failed`). In every case `selfieCameraUnavailable` is set and an album frame goes out
instead, so nobody asking for a photograph is left with an empty bubble. The endpoint has its own,
tighter throttle (12 requests a minute) because an image is the most expensive request on the site.

## Files

| File                                                               | What it holds                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/pages/ai-models/chat/ai-model-chat.{ts,html,css}`         | the window: layout, composer, attachments, reactions, the centred reminder, the closed state, both overlays                                                                                                                                                  |
| `src/app/pages/ai-models/chat/chat-identity-prompt.{ts,html,css}`  | the form in front of the window: the photograph and the name (requirement A)                                                                                                                                                                                 |
| `src/app/pages/ai-models/chat/chat-identity.ts`                    | the name rules and the visitor's photograph: 3–14 characters, 100 KB, first name only                                                                                                                                                                        |
| `src/app/pages/ai-models/chat/chat-feedback.{ts,html,css}`         | the ultra-modern close form (`app-chat-feedback`): both faces, the time together, the four counts, the 1–5 stars, the comments box and the single Close button (requirements E and F)                                                                          |
| `src/app/pages/ai-models/chat/chat-summary.ts`                     | what that form says: the minutes, the counts, her rating and her paragraph about the chat (`buildChatFeedbackFacts`, `buildChatSessionSummary`)                                                                                                              |
| `src/app/pages/ai-models/chat/chat-initiative.ts`                  | who has the floor: A (`heardFrom`), B (the three reasons she may write unprompted) and D (the three quiet minutes that end a session), read from the transcript alone                                                                                          |
| `src/app/pages/ai-models/chat/chat-voice.ts`                       | her voice by country and age, the visitor's behaviour, the opening line, the follow-up she writes for a reason (`idleChatOpener`), her goodbye to a visitor who went quiet (`disinterestFarewell`), the pitch, the video line                                      |
| `src/app/pages/ai-models/chat/chat-selfie.ts`                      | her camera and her album: the moments and flaws, the likeness (`readSelfieReference`), Gemini's selfie (`generateChatSelfie`), the album frame she falls back on, and the video-request pattern                                                              |
| `src/app/pages/ai-models/chat/chat-analysis.ts`                    | the reading before the answer: the window's own reading, the studio's reading desk, the merge, and the document bytes that travel with a message                                                                                                             |
| `src/app/pages/ai-models/chat/chat-photo.ts`                       | what she can see in a picture the visitor sends (requirement F)                                                                                                                                                                                              |
| `src/app/pages/ai-models/chat/chat-random.ts`                      | the seeded pick/roll helpers, so every random choice is still testable                                                                                                                                                                                       |
| `src/app/pages/ai-models/chat/chat-types.ts`                       | the session shape and the numbers: 2 h, 400 messages, 8 MB / 16 MB attachments, the six reactions, the reminder marks, and the pacing of a typed answer (`typingTimeFor`, the away pause, the mid-thought pause, the gap between messages, her introduction) |
| `src/app/pages/ai-models/chat/chat-moderation.ts`                  | profanity and harassment levels, the strikes, her warning and goodbye texts                                                                                                                                                                                  |
| `src/app/pages/ai-models/chat/chat-knowledge.ts`                   | her persona, the fact lines and the dossier index that answers use                                                                                                                                                                                           |
| `src/app/pages/ai-models/chat/chat-world.ts`, `world-countries.ts` | the built-in world file behind requirement C                                                                                                                                                                                                                 |
| `src/app/pages/ai-models/chat/chat-replies.ts`                     | her own engine: introduction, every topic, small talk, compliments, personal questions, the Romanised answer, the cascade of answers                                                                                                                         |
| `src/app/pages/ai-models/chat/chat-input.ts`                       | reading a typed message: stretched letters, short forms and spelling mistakes (one or two edits of room)                                                                                                                                                     |
| `src/app/pages/ai-models/chat/chat-language.ts`                    | the eight Romanised language books, the detection, the English gloss, Google Translate as the second reader, and her answer in the visitor's own language                                                                                                    |
| `src/app/services/ai-model-chat.service.ts`                        | the session store, the clock, the sent messages, the typing, the messages of one answer, the storage mirror                                                                                                                                                  |
| `src/app/services/ai-model-chat.testing.ts`                        | `silenceChatPacing()` — switches every wait off for the tests, which then delivers her messages in one go                                                                                                                                                    |
| `worker/ai-chat-core.mjs` (+ `.d.mts`)                             | the live endpoint: validation, persona, Google search, OpenAI streaming, and the reading of the turn in her instructions                                                                                                                                     |
| `worker/ai-read-core.mjs` (+ `.d.mts`)                             | the reading desk: Google Translate, the Gemini reading, the OpenAI reading, the JSON contract and the fallbacks                                                                                                                                              |
| `worker/ai-selfie-core.mjs` (+ `.d.mts`)                           | her camera: the selfie prompt, the Gemini image call, the picture out of the answer, and every refusal                                                                                                                                                       |
| `worker/index.ts`                                                  | `POST /api/ai-chat`, `POST /api/ai-read` and `POST /api/ai-selfie`, their throttles, and the optional secrets                                                                                                                                                |
| `scripts/dev-api.mjs`                                              | the local stand-in for `/api/ai-chat`, `/api/ai-read` and `/api/ai-selfie` on port 8787                                                                                                                                                                      |

## Running it locally

```bash
npm start                     # ng serve + the API stand-in on :8787, /api proxied (proxy.conf.json)
```

Without any key the window answers from her own engine, reads the turns itself and sends a frame from
her album when a selfie is asked for. To exercise the live paths:

```bash
OPENAI_API_KEY=sk-… GOOGLE_SEARCH_API_KEY=… GOOGLE_SEARCH_CX=… \
GEMINI_API_KEY=… GEMINI_MODEL=gemini-2.5-flash GEMINI_IMAGE_MODEL=gemini-2.5-flash-image \
GOOGLE_TRANSLATE_API_KEY=… npm start
```

In production the same values are Worker secrets, with `OPENAI_MODEL`, `GEMINI_MODEL` and
`GEMINI_IMAGE_MODEL` as optional variables (`gpt-4o-mini`, `gemini-2.5-flash` and
`gemini-2.5-flash-image` by default):

```bash
npx wrangler secret put OPENAI_API_KEY            # the answer, and the reading when Gemini is absent
npx wrangler secret put GOOGLE_SEARCH_API_KEY     # live results for questions about the world
npx wrangler secret put GOOGLE_SEARCH_CX
npx wrangler secret put GEMINI_API_KEY            # the reading desk, and the camera that takes her selfie
npx wrangler secret put GOOGLE_TRANSLATE_API_KEY  # optional: the Cloud Translation API
```

`npm start` prints a line for each of the three endpoints and says what is configured: the chat, the
reading desk, and her camera.

## Tests

```bash
npx ng test --no-watch --include "src/app/pages/ai-models/chat/*.spec.ts"
npx ng test --no-watch --include "src/app/services/ai-model-chat.service.spec.ts"
```

The chat suite is the files under `src/app/pages/ai-models/chat/` plus the service's own spec — 18
files and 203 tests at the time of writing (the third brief's `chat-initiative.spec.ts` and
`chat-feedback.spec.ts` are new, and `chat-session-summary.spec.ts` went with its component).

- `chat-replies.spec.ts` — the engine: the introduction, her card, her biography, the other models,
  the website, the world file, arithmetic, the small talk and the "outside my bubble" fallback;
- `chat-moderation.spec.ts` — the levels, the strikes, masked words and her goodbye;
- `chat-worker.spec.ts` — the Worker endpoints: the SSE stream with its sources, the persona that
  cannot be rewritten by the caller, the reading of the turn in her instructions, photographs and
  documents, the reading desk (Google Translate into Gemini, into OpenAI, a picture or a PDF inline,
  and the 503 / 502 / 405 / 400 answers), her camera (the selfie, the likeness, the refusal), every
  error status and the throttle;
- `ai-model-chat.spec.ts` — the window itself: her photograph, name, model id, city and country,
  **View Profile**, the countdown, the composer with its camera and attachments, Enter/Shift+Enter,
  both reactions, the centred 15-minute reminder, the closed state after three strikes, and the
  close form (E and F) both ways round — ✕, Escape and the backdrop on a chat that has started, the
  ✕ of the "Before we start" form closing straight through, and the ended window she leaves behind
  the form she raised herself;
- `ai-model-chat.service.spec.ts` — the session store: two hours, the identity gate that starts the
  clock and speaks first, the introduction that arrives message by message three to five seconds
  later, the typing indicator that is held for the time the message needs and then lands it whole,
  the away pause and the mid-thought pause, the answer that arrives as several messages, A (she
  writes nothing until the visitor has), B (the follow-up for each of the three reasons, and its 45–75 s
  wait), D (the three quiet minutes, the goodbye and the `'inactive'` close), the selfie and the
  photograph, the contract she asks for, the clock labels, the reminder marks and the timeout, the
  strikes, the close form (raised by ✕ and by a session that ends, `openFeedback()`/`dismissFeedback()`,
  `recordFeedback()` with its clamp and its 600-character comment, `feedbackFor()`), the reactions, the
  live endpoint with its sources, the answer that never names a source, the fallback to her own engine,
  the storage mirror and the closed-window guards;
- `chat-types.spec.ts` — the numbers of that pacing: the typing time that grows with the message and
  stays inside its floor and ceiling, and the 3–7 s / 2–5 s / 3–5 s / 2–4 s windows the second brief
  asks for;
- `chat-identity.spec.ts`, `chat-identity-prompt.spec.ts` — the form and its rules: 3–14 characters,
  the errors, the camera and the gallery, the 100 KB reduction, the refusal of a file that is not a
  picture, and the `{ name, avatar }` it confirms;
- `chat-voice.spec.ts` — her country and her age, what she works out about the visitor, the opening
  line, the follow-up she writes for the reason she was given (B) and the goodbye of a visitor who
  stopped answering (D), the pitch, the video sentence word for word, the four or five messages of her
  introduction (an Indian and an Iranian woman do not sound alike, and neither do 23 and 30 — and
  neither of them gives away a city, an age or a count of her photographs, C), and the splitter that
  turns one long answer into several messages;
- `chat-selfie.spec.ts`, `chat-photo.spec.ts` — her selfies, the moments and flaws, her camera (her
  own photograph as the likeness, the request it sends, a refusal answered with an album frame), the
  requests that trigger them, and what she sees in a picture the visitor sends;
- `chat-analysis.spec.ts` — the reading before the answer: the window's own reading of a typo'd
  message and of a Romanised one, the desk's reading of a turn and of an attached document, the merge
  that fills the desk's gaps, and the fallbacks when the desk is off or unreachable;
- `chat-summary.spec.ts` — what the close form says: the time together, the counts of the session
  and of each side, the photographs, her paragraph, her rating, the `'inactive'` ending;
- `chat-initiative.spec.ts` — A, B and D without a clock: no floor while every message is hers, the
  three reasons and their precedence, the three quiet minutes (and the two minutes fifty-nine), and
  a question recognised with or without its mark;
- `chat-feedback.spec.ts` — the close form itself (E and F): both faces and names, the four tiles,
  the split of the photographs, the hover preview and the five stars, taking a rating back, a
  comment with no stars, an empty form that sends nothing, the 600-character box, the line for each
  way a session ends, and the form drawn without a visitor photograph.
