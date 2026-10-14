# AI model Live Now / past-chat counters and whole chat history

## What the website does

- **Live Now and past chats on each model card.** A single split transparent pill sits beside the
  Live Chat button. Its first half shows how many chat sessions are **live with the model right
  now** under the word *Live Now* — a grey, still dot while there are none (the default, `0`), and
  a pulsing green dot while there are any. Its second half shows the model's whole **past-chat
  total** (`0 past chats`, `1 past chat`, `12 past chats`). On a phone the pill shrinks so it
  shares one row with the Live Chat button.
- **The counters are live.** They are read from `GET /api/models/live-chats` when the directory
  opens, and the directory keeps polling the same endpoint every two seconds while it is on
  screen (a hidden tab pauses, and catches up the moment it returns). A chat started or ended on
  any other device — or in another tab — moves the counters by themselves, with no refresh.
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
the API cannot take yet adjust this device's own counters until the next successful poll.
