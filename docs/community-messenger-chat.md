# Community Messenger: online lists and the chat pop-up window

Requirements of the Community Messenger, and where each one lives. A–D are in the website — the
Web API needed one change (the “online” rule) and the database needed none. E is the Messenger
page's three-panel layout on tablets, laptops and wide screens.

## A. Who is online

A member whose status is **Active, Busy, Don't Disturb, Away or any Custom status** is listed in

- **Online Now** — Messenger page (`profile.html`, `activeSection() === 'messenger'`), and
- **Online Companions** — the right-hand panel of the profile home page (Journey view),

each with the status they chose beside their name and the matching presence-dot colour
(green Active, red Busy, dark red Don't Disturb, amber Away, violet Custom).

A member whose status is **Inactive** — chosen in the dropdown, or set when they sign out — is
removed from both lists and appears in **Offline Companions** on the Messenger page with their
last-seen time.

The rule is `effectiveStatus !== 'Inactive'`, so Away stays online. It lives in
`CommunityService.companionIsOnline()`, which the `onlineCompanions` / `offlineCompanions` computed
lists use; both panels read those two lists, so they always agree. The Web API answers the same
rule in `CompanionDto.IsOnline` — see
[`docs/community-presence.md`](community-presence.md) and
[`docs/patches/neverbeen-api-community-online-status.patch`](patches/neverbeen-api-community-online-status.patch).

## B. The chat window always shows the latest message

`src/app/shared/chat-auto-scroll/chat-auto-scroll.ts` — a directive on the chat's message list:

```html
<div class="chat-messages-container" [nbChatAutoScroll]="box.messages">
```

It scrolls to the bottom after every render in which the message list changed, so

- opening a chat pop-up starts at the newest message, not at the top of the history;
- a message that arrives from the companion scrolls the window down to it;
- the member's own outgoing message is followed the same way;
- un-minimizing a chat box re-creates the list, which starts at the newest message again;
- a profile picture that finishes loading after the scroll cannot leave the newest message half
  cut off: the list is pinned to the bottom again (the directive listens for `load` in capture,
  because image load events do not bubble).

## C. Both pictures, the two bubble colours and the session date

- Both travellers' profile pictures are in the window: the companion's beside their messages and
  the member's own beside theirs. In a group chat the picture is the actual sender's
  (`CommunityProfile.chatSender()`), falling back to the chat's companion.
- The companion's messages: `#EBEBEB` background, black text. The member's own messages:
  `#6829FF` background, white text. The `outgoing` / `incoming` class is now on the bubble itself
  (`.chat-bubble.outgoing` / `.chat-bubble.incoming` in `profile.css`); before this change it was
  only on the row, so the bubble rules never matched and the bubbles had no background.
- Each chat session is headed inside the window by its date and time, Messenger-style —
  `3 Oct 2026, 07:54`. A new session starts after a pause of more than an hour
  (`CHAT_SESSION_GAP_MS` in `profile.ts`, `isChatSessionStart()` / `chatSessionLabel()`), so the
  first message of the window always carries one.

## D. Text lined up with the profile picture

`.chat-msg-row` used `align-items: flex-end`, which dropped the picture to the bottom of the whole
content column — under the bubble *and* its (always rendered, invisible until hover) action bar —
so the text sat well above the picture. The row now uses `align-items: flex-start` and the avatar
column carries a 3px top offset, which puts the 24px picture level with the first line of the
message text (the bubble's `0.4rem` top padding plus half a `1.35` line of `0.82rem` text).

## E. Messenger page on tablets, laptops and wide screens

From **768px wide** the Messenger page is a three-panel page in the style of Facebook Messenger
(design: [`design/messenger-wide-layout-mockup.html`](design/messenger-wide-layout-mockup.html),
[`screenshots/messenger-wide-design.png`](screenshots/messenger-wide-design.png); the real page:
[`screenshots/messenger-wide-page.png`](screenshots/messenger-wide-page.png)). Phones keep the
Online Now / Offline Companions lists and the pop-up chats described above.

| Panel | What it shows |
| --- | --- |
| **Left — Chats** | Every previous and current chat, newest first: 1:1 chats with companions (read and unread, from the chat inbox), chats opened in this session and the member's Circles. Each row has the picture with the presence dot, the name, “You: …” / “Liam: …” preview and its age (now · 5m · 3h · Mon · 2 Oct). Unread rows are bold with a blue count. Search (also finds companions to **start a new chat**), chips **All / Unread · N / Circles**, ✎ new message. The Community default side panel is **not** shown — it is only an off-canvas menu behind ☰. |
| **Centre, top 20% — Online now** | Companions who are online: round picture, first name and a green dot. Clicking one opens the chat with them. |
| **Centre — the open chat** | The same chat body as the pop-ups (session headers, bubbles, replies, reactions, emoji tray, composer — one shared `ng-template #chatBodyTpl`), sized to the panel, with Add people / Save as Circle / Manage Circle and the profile toggle (ⓘ) in its header. |
| **Right — Profile** | The companion being chatted with: cover, picture with presence dot, name + verified tick, status, profession · location, **View Profile** and Follow. Then About (See more), Details (work, home, hometown, languages, relationship · mutual companions, last seen), Circles in common and Photos. Each About-me field follows the companion's per-field audience; a locked profile shows only a notice to non-companions. For a Circle chat: its description, members (admins marked) and Manage Circle. |

Breakpoints (`messenger-wide.css`): ≥1200px `320px | chat | 300px`; 1024–1199px
`280px | chat | 280px`; 768–1023px `260px | chat` with the profile as a drawer over the chat (ⓘ).
The three panels fill the window under the site header and scroll on their own.

How it works (`profile.ts`, “MESSENGER PAGE — tablet / laptop / wide screens”):

- `messengerWide` = Messenger section ∧ not viewing a visitor ∧ `(min-width: 768px)`. While it is
  true, the floating chat dock, the phone header and the in-page search are hidden, and
  `CommunityService.messengerPageActive` stops chats from popping up.
- The page opens on the latest conversation with a companion. Choosing a chat sets
  `CommunityService.messengerPageChatKey` and opens (or restores) its chat box; the box the page
  opened itself (`messengerPageOwnedKey`) is closed again when the member moves on or leaves the
  page, while chats that were already open as pop-ups come back when they leave. The chat shown is
  never evicted by the five-box limit and is marked read as messages arrive; other chats get an
  unread count in the list instead of popping up.
- Sending (or receiving, in the guest tour) moves the conversation to the top of the list at once
  (`notePendingChatActivity`). The list itself is the pure `buildMessengerChats` /
  `filterMessengerChats` in `messenger-chats.ts`.
- “Chat” anywhere on the page (Circle chat buttons, Circles in common, search hits) opens in the
  wide panel instead of a pop-up.

**Web API** — [`patches/neverbeen-api-community-messenger-wide.patch`](patches/neverbeen-api-community-messenger-wide.patch)
(verify with `python3 docs/patches/neverbeen-api-community-messenger-wide-verification.py <neverbeen-api>`):
`GET /api/messages/conversations` is ordered by the new `ConversationDto.LastActivityUtc` (newest
message, else creation time) and every conversation DTO — also the one returned when a chat is
(re)opened with `POST /api/messages/conversations` — carries `LastMessage`, `UnreadCount` and
`LastActivityUtc`; unread counts only the other members' messages. The website works with older API
builds too (it falls back to the last message's time). **Database** — no change: every value comes
from existing columns.

## Tests

- `src/app/services/community-presence.spec.ts` — the online / offline split for every status.
- `src/app/pages/community/profile/profile.spec.ts` — the Messenger and rail lists (Requirement A),
  the pictures, bubble classes and session header (Requirements C & D), and the session-splitting
  and wording helpers.
- `src/app/shared/chat-auto-scroll/chat-auto-scroll.spec.ts` — the window opens on the latest
  message and follows every message that arrives (Requirement B).
- `src/app/pages/community/profile/messenger-chats.spec.ts` — the chats panel (Requirement E):
  read and unread chats newest first, open chats, hidden members, Circle rows, filters, search,
  “You: …” previews and the age labels.
- `src/app/services/community-messenger-page.spec.ts` — the service side of Requirement E:
  previous chats in the guest tour, the shown chat is never evicted, a sent message moves the chat
  to the top, restoring a minimized box.
