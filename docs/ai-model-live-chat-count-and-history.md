# AI model Live Now / past-chat counters and whole chat history

## What the website does

- **Live Now and past chats on each model card.** A single split transparent pill comes on the line
  under the card's Live Chat button (and beside the button on the model's own page), as tall as that
  button. Its first half shows how many chat sessions are **live with the model right now** under the
  word *Live Now* — a grey, still dot while there are none (the default, `0`), and a pulsing green
  dot while there are any. Its second half shows the model's whole **past-chat total**
  (`0 past chats`, `1 past chat`, `12 past chats`). A long total is written compactly, exactly as the
  card's engagement counters are — `1400` reads `1.4K`, `1700000` reads `1.7M`, `1400000000` reads
  `1.4B`, `1900000000000` reads `1.9T` — and the exact figure is never lost: it stays in the
  tool-tip on hover and in the words read out by assistive tech. The pill has a line to itself on the
  card, so the frame is that much taller to hold the copy over it: the cover is 0.7 of its width
  (0.8 on the narrowest phones), and the card reads its rating figure 1.3× bigger than it was
  (1.08rem → 1.4rem), the stars unchanged.
- **The counters are read on every visit — and never polled.** They are read from
  `GET /api/models/live-chats` when the directory (or a model's own page) opens: a visit, a
  refresh, or a return to the page. The only other read is the visitor coming back to the tab,
  which is the same return. Nothing is requested on a timer, so a page left open on screen asks
  the API for nothing and shows the numbers it loaded. The counters that do move while a page is
  open are the visitor's own: a Live Chat started or ended here is answered with the fresh counts
  by its own `POST /api/models/{slug}/live-chats` (or `…/end`) request. (The first release of this
  feature re-read the endpoint every two seconds; that polling is gone.)
- **One count per chat, up and down.** The chat window records a start when the visitor's
  two-hour session begins (after the name and photograph form), via
  `POST /api/models/{slug}/live-chats`, under a session key of its own, and records the end of
  that same session — her goodbye, the visitor's ✕, the two hours running out — via
  `POST /api/models/{slug}/live-chats/end`. The session is flagged `liveChatCounted` /
  `liveChatEnded`, so closing and reopening the window never counts either side twice. A session
  whose tab simply vanished (battery, crash) is retired by the API itself: an unended start older
  than two hours counts as a past chat, not a live one.
- **Reviews line.** The card reads `4 reviews` (number, a gap, then the word "reviews").
- **Whole chat history.** The chat window has a *Chat history* button, and so does the close form
  (the end-of-chat card with the stars and the comments box): both open every message of the
  session — her answers, the visitor's messages, photographs, documents (with Save when the file
  is still in the tab), replies, reactions and sources. *Print* and *Save as PDF* open the
  browser's print dialog on a printable copy. Choose **Save as PDF** as the destination to keep it
  on the device. The history is read from the session the window already holds in this tab. It is
  not sent to or stored on any server.

## Backend changes (not yet deployed)

| Side     | Patch / script                                                  | Apply                                                                                         |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Database | `docs/patches/neverbeen-database-model-live-chat-count.sql`      | Run the script against the NeverBeen database. It is idempotent, and upgrades a table created by the earlier live-chat-count script in place (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`). |
| Database | `docs/patches/neverbeen-database-model-live-chat-count.patch`    | Schema patch; `git apply --unidiff-zero` to the top of `schema.sql` (the file is not in either repo). |
| API      | `docs/patches/neverbeen-api-model-live-chat-count.patch`         | `git -C neverbeen-api apply docs/patches/neverbeen-api-model-live-chat-count.patch`, then build and deploy `neverbeen-api`. If the earlier live-chat-count patch was already applied, revert it first — this patch replaces it wholesale. |

Verification:

```bash
python3 docs/patches/neverbeen-database-model-live-chat-count-verification.py
python3 docs/patches/neverbeen-api-model-live-chat-count-verification.py /path/to/neverbeen-api
```

Until the API is deployed with the live/past split, the website still behaves sensibly: a legacy
`liveChatCount` answer is read as the past-chat total (every chat it counted has long run out its
two hours), the Live Now half shows the quiet default `0` with the grey dot, and starts or ends
the API cannot take yet adjust this device's own counters until the next successful read — the
next visit, or the moment the visitor comes back to the tab.
