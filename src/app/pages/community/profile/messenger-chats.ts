import { ActiveChatBox, Circle, Companion } from '../../../models/community';
import type { PendingChat } from '../../../services/community.service';

/**
 * Messenger page — tablet / laptop / wide-screen layout (chats side panel · open chat ·
 * companion profile). The pure parts live here so they can be tested on their own:
 * the chats list (previous and current chats), its filters, and the wording of a row.
 */

/** Filter chips above the chats list. */
export type MessengerChatFilter = 'all' | 'unread' | 'circles';

/** One row of the Messenger page's chats side panel. */
export interface MessengerChatItem {
  /** Chat-box key: the companion's id for a 1:1 chat, `-circleId` for a Circle chat. */
  key: number;
  kind: 'direct' | 'circle';
  name: string;
  photoUrl: string;
  /** The companion of a 1:1 chat (null for Circle and unsaved group chats). */
  companion: Companion | null;
  circle: Circle | null;
  /** Unsaved group chat (people were added to a 1:1 chat). */
  isGroup: boolean;
  /** Text of the newest message ('' when the chat has none yet). */
  preview: string;
  /** True when the signed-in member wrote the newest message. */
  mine: boolean;
  /** First name of whoever wrote the newest Circle message (not the member). */
  senderName: string;
  /** ISO time of the newest message (null when unknown). */
  sentAtUtc: string | null;
  unread: number;
  /** False for a Circle that has no messages and is not open (listed under Circles only). */
  hasHistory: boolean;
}

export interface MessengerChatSources {
  /** The signed-in member's id. */
  me: number;
  /** Chat inbox: every 1:1 conversation the member has had (Web API / guest tour). */
  pendingChats: PendingChat[];
  /** Chats open in this session (floating boxes and the Messenger page's own chat). */
  boxes: ActiveChatBox[];
  /** The member's Circles (admin or member). */
  circles: Circle[];
  /** Known travelers (fresh names, photos and presence). */
  companions: Companion[];
  /** Members hidden from the member (blocked either way, or disabled). */
  hiddenIds: Set<number>;
  /** Chat shown in the wide panel: it is being read, so it never counts as unread. */
  selectedKey: number | null;
  /** Unread messages in a Circle the member has not opened (`CommunityService.circleUnreadCount`). */
  circleUnread: (circle: Circle) => number;
}

const timeOf = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const firstName = (fullName: string | undefined): string => (fullName ?? '').trim().split(/\s+/)[0] ?? '';

/** Chat key of a Circle (the chat dock keys Circle chats by the negative Circle id). */
export const circleChatKey = (circleId: number): number => -Math.abs(circleId);

/**
 * Every previous and current chat of the member, newest first: 1:1 conversations from the chat
 * inbox, chats opened in this session (whose messages are the freshest), and the member's
 * Circles. One row per chat.
 */
export function buildMessengerChats(src: MessengerChatSources): MessengerChatItem[] {
  const byId = new Map(src.companions.map((c) => [Number(c.id), c]));
  const items = new Map<number, MessengerChatItem>();

  for (const p of src.pendingChats) {
    const id = Number(p.companionId);
    if (!(id > 0) || src.hiddenIds.has(id)) continue;
    const c = byId.get(id) ?? null;
    items.set(id, {
      key: id,
      kind: 'direct',
      name: c?.fullName || p.fullName,
      photoUrl: c?.profilePhotoUrl || p.profilePhotoUrl,
      companion: c,
      circle: null,
      isGroup: false,
      preview: p.preview ?? '',
      mine: p.lastSenderId != null && Number(p.lastSenderId) === Number(src.me),
      senderName: '',
      sentAtUtc: p.sentAtUtc || null,
      unread: p.unreadCount ?? 0,
      hasHistory: true,
    });
  }

  for (const box of src.boxes) {
    if (box.circleId || box.companionId < 0) continue; // Circle chats are listed below.
    if (src.hiddenIds.has(Number(box.companionId))) continue;
    const existing = items.get(box.companionId);
    const last = box.messages[box.messages.length - 1];
    const lastIsNewer = !!last && timeOf(last.sentAtUtc) >= timeOf(existing?.sentAtUtc);
    const c = box.isGroup ? null : (byId.get(Number(box.companionId)) ?? box.companion);
    items.set(box.companionId, {
      key: box.companionId,
      kind: 'direct',
      name: box.isGroup ? box.companion.fullName : existing?.name || box.companion.fullName,
      photoUrl: existing?.photoUrl || box.companion.profilePhotoUrl,
      companion: c,
      circle: null,
      isGroup: !!box.isGroup,
      preview: lastIsNewer ? last.text : (existing?.preview ?? ''),
      mine: lastIsNewer ? Number(last.senderId) === Number(src.me) : (existing?.mine ?? false),
      senderName: '',
      sentAtUtc: lastIsNewer ? last.sentAtUtc : (existing?.sentAtUtc ?? null),
      unread: Math.max(box.unreadCount ?? 0, existing?.unread ?? 0),
      hasHistory: true,
    });
  }

  for (const circle of src.circles) {
    const key = circleChatKey(circle.id);
    const box = src.boxes.find((b) => b.circleId === circle.id || b.companionId === key);
    const messages = box?.messages?.length ? box.messages : (circle.messages ?? []);
    const last = messages[messages.length - 1];
    const sender = last && Number(last.senderId) !== Number(src.me) ? byId.get(Number(last.senderId)) : undefined;
    items.set(key, {
      key,
      kind: 'circle',
      name: circle.name,
      photoUrl: circle.photoUrl || '',
      companion: null,
      circle,
      isGroup: true,
      preview: last?.text ?? circle.description ?? '',
      mine: !!last && Number(last.senderId) === Number(src.me),
      senderName: sender ? firstName(sender.fullName) : '',
      sentAtUtc: last?.sentAtUtc ?? null,
      unread: box ? (box.unreadCount ?? 0) : src.circleUnread(circle),
      hasHistory: !!last || !!box,
    });
  }

  return [...items.values()]
    .map((item) => (item.key === src.selectedKey ? { ...item, unread: 0 } : item))
    .sort((a, b) => timeOf(b.sentAtUtc) - timeOf(a.sentAtUtc));
}

/** The rows a filter chip and the panel's search box leave in the chats list. */
export function filterMessengerChats(
  items: MessengerChatItem[],
  filter: MessengerChatFilter,
  query: string,
): MessengerChatItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === 'unread' && item.unread <= 0) return false;
    if (filter === 'circles' && item.kind !== 'circle') return false;
    if (filter === 'all' && !item.hasHistory) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
  });
}

/** The newest message of a row: “You: …” for the member's own, “Liam: …” in a Circle. */
export function messengerPreview(item: MessengerChatItem): string {
  if (!item.preview) return item.kind === 'circle' ? 'Say hello to your Circle' : 'Say hello 👋';
  if (item.mine) return `You: ${item.preview}`;
  if (item.kind === 'circle' && item.senderName) return `${item.senderName}: ${item.preview}`;
  return item.preview;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Messenger-style age of a row's newest message: now · 5m · 3h · Mon · 2 Oct · 2 Oct 2025. */
export function messengerTimeLabel(iso: string | null | undefined, now: Date = new Date()): string {
  const t = timeOf(iso);
  if (!t) return '';
  const diff = Math.max(0, now.getTime() - t);
  const minute = 60_000;
  const hour = 60 * minute;
  if (diff < minute) return 'now';
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < 24 * hour) return `${Math.floor(diff / hour)}h`;
  const d = new Date(t);
  if (diff < 7 * 24 * hour) return WEEKDAYS[d.getDay()];
  const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`;
}

/** First name for the online companions row. */
export function messengerFirstName(fullName: string | undefined): string {
  return firstName(fullName) || 'Traveler';
}
