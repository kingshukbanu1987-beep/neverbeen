# AI model Live Chat count and whole chat history

## What the website does

- **Live Chat count on each model card.** A pill sits beside the Live Chat button and shows how
  many Live Chats have been started with that model. It is read from
  `GET /api/models/live-chats` once per directory visit. While the counts load it shows `—`. If the
  API is unreachable or not yet deployed with this feature, the pill is hidden, not faked.
- **One count per chat.** The chat window records a start when the visitor's two-hour session begins
  (after the name and photograph form), via `POST /api/models/{slug}/live-chats`. The session is
  flagged `liveChatCounted`, so closing and reopening the window never counts it twice.
- **Reviews line.** The card reads `4 reviews` (number, a gap, then the word "reviews").
- **Whole chat history.** The chat window has a *Chat history* button. It opens every message of the
  session: her answers, the visitor's messages, photographs, documents (with Save when the file is
  still in the tab), replies, reactions and sources. *Print* and *Save as PDF* open the browser's print
  dialog on a printable copy. Choose **Save as PDF** as the destination to keep it on the device.
  The history is read from the session the window already holds in this tab. It is not sent to
  or stored on any server.

## Backend changes (not yet deployed)

| Side     | Patch / script                                                  | Apply                                                                                         |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Database | `docs/patches/neverbeen-database-model-live-chat-count.sql`      | Run the script against the NeverBeen database. It is idempotent.                              |
| Database | `docs/patches/neverbeen-database-model-live-chat-count.patch`    | Schema patch; `git apply --unidiff-zero` to the top of `schema.sql` (the file is not in either repo). |
| API      | `docs/patches/neverbeen-api-model-live-chat-count.patch`         | `git -C neverbeen-api apply docs/patches/neverbeen-api-model-live-chat-count.patch`, then build and deploy `neverbeen-api`. |

Verification:

```bash
python3 docs/patches/neverbeen-database-model-live-chat-count-verification.py
python3 docs/patches/neverbeen-api-model-live-chat-count-verification.py /path/to/neverbeen-api
```

Until the API is deployed, the cards hide the counter and chat starts are simply not recorded. The
chat itself continues as before.
