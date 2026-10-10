# Community Messenger: online lists and the chat pop-up window

Four requirements of the Community Messenger, and where each one lives. All four are in the
website — the Web API needed one change (the “online” rule) and the database needed none.

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

## Tests

- `src/app/services/community-presence.spec.ts` — the online / offline split for every status.
- `src/app/pages/community/profile/profile.spec.ts` — the Messenger and rail lists (Requirement A),
  the pictures, bubble classes and session header (Requirements C & D), and the session-splitting
  and wording helpers.
- `src/app/shared/chat-auto-scroll/chat-auto-scroll.spec.ts` — the window opens on the latest
  message and follows every message that arrives (Requirement B).
