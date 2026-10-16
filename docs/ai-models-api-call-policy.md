# When the AI Models pages call the API

The rule the two AI-model pages follow — `/ai-models` (the directory) and `/ai-models/:slug` (a
model's profile):

- **A visit may read.** The page opening, a refresh, and coming back to the page are allowed to
  read whatever the page shows.
- **What the visitor does may read and write.** Opening a photograph, starting a clip, liking,
  commenting, sharing, starting or ending a Live Chat, sending her a message — each of those
  sends the one request that action needs.
- **Nothing else.** No interval, no timer, no polling while a page sits open. A page left on
  screen asks the API for nothing, and keeps the numbers it loaded.

## The directory — `/ai-models`

| Request                                                | When                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/models/live-chats`                           | When the directory opens, and again when the visitor comes back to the tab. **Not on a timer.**                                             |
| `GET /api/models/{slug}/testimonials?page=…`           | When the directory opens: one bounded walk of each model's review feed (four models at a time) for the rating and review count on her card. |
| `GET /api/models/{slug}/media/stats`                   | When the directory opens: once per model for the session, for the seen / likes / comments / shares row on her card.                         |
| `POST /api/models/{slug}/live-chats` (+ `/end`)        | The visitor starts or ends a Live Chat from a card.                                                                                         |
| The media writes below (view / like / comment / share) | What the visitor does inside the chat window or a card's media.                                                                             |

A member signing in during the visit re-reads the stats of the models already loaded, once, so
`likedByMe` is right. That is a one-off, not a timer.

## The profile — `/ai-models/:slug`

| Request                                                                | When                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /api/models/live-chats`                                           | When the profile opens, and again when the visitor comes back to the tab. **Not on a timer.**              |
| `GET /api/models/{slug}/testimonials?page=…`                           | When the profile opens (per model), and one more page when the visitor scrolls the review list to its end. |
| `POST /api/models/{slug}/testimonials`                                 | A signed-in member publishes a review.                                                                     |
| `GET /api/models/{slug}/media/stats`                                   | Once when the profile opens (per model, for the session).                                                  |
| `GET /api/models/{slug}/media/comments`                                | The visitor opens a photograph's or a clip's comment panel.                                                |
| `POST /api/models/{slug}/media/view`                                   | A photograph is opened in the viewer, or a clip starts. One count per visitor per media.                   |
| `POST /api/models/{slug}/media/like`                                   | A signed-in member likes (or unlikes) that media.                                                          |
| `POST /api/models/{slug}/media/comments`                               | A signed-in member posts a comment.                                                                        |
| `POST /api/models/{slug}/media/share`                                  | The visitor shares that media (the share sheet, or the copied link).                                       |
| `POST /api/models/{slug}/live-chats` (+ `/end`)                        | A Live Chat session begins or ends.                                                                        |
| `POST /neverbeen-api/api/ai-chat`                                      | The visitor sends her a message.                                                                           |
| `POST /api/ai-read`, `/api/ai-selfie`, `/api/livechatselfiesandphotos` | The reading desk reads a turn, or she takes a photograph.                                                  |

## What the pages no longer do

The Live Now / past-chat pill used to be polled: `ModelLiveChatService.startPolling()` re-read
`GET /api/models/live-chats` every **two seconds** while either page was on screen. That method is
gone. `ModelLiveChatService.watch()` — what both pages call now — adds one `visibilitychange`
listener and **no timer**, so the only other read is the visitor coming back to the tab. The
counters a visitor's own chat moves are still exact: the start / end request is answered with the
fresh counts, and they take their place in the pill as they arrive.

## How the rule is held

| Test                                                                                                                         | Holds                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `model-live-chat.service.spec.ts` → "re-reads the counts when the visitor comes back to the tab, and never polls on a timer" | Ten minutes of faked time on an open page make no request; a return to the tab reads once. |
| `ai-models-live-chat.spec.ts` → "reads the counts when the directory opens, and asks for nothing while it stays open"        | Same rule at the directory page, with every timer it holds advanced.                       |
| `ai-model-portfolio.spec.ts` → "reads the Live Chat counts when the profile opens, and asks for nothing while it stays open" | Same rule at the profile page.                                                             |

Each guard fails if a poll timer is added back to its page, so the policy stays held by the test
suite rather than by memory.
