import { describe, expect, it } from 'vitest';
import { ActiveChatBox, Circle, Companion } from '../../../models/community';
import type { PendingChat } from '../../../services/community.service';
import {
  MessengerChatSources,
  buildMessengerChats,
  circleChatKey,
  filterMessengerChats,
  messengerFirstName,
  messengerPreview,
  messengerTimeLabel,
} from './messenger-chats';

/**
 * Messenger page (tablet / laptop / wide screens): the chats side panel lists every previous
 * and current chat with companions and Circles, newest first, with Messenger-style rows.
 */
const ME = 1;

const companion = (id: number, fullName: string): Companion => ({
  id,
  fullName,
  profilePhotoUrl: `https://example.test/${id}.jpg`,
  country: 'Ireland',
  city: 'Dublin',
  profession: 'Guide',
  isOnline: true,
  mutualCompanionsCount: 0,
  status: 'connected',
});

const pending = (id: number, fullName: string, minutesAgo: number, extra: Partial<PendingChat> = {}): PendingChat => ({
  companionId: id,
  fullName,
  profilePhotoUrl: `https://example.test/p${id}.jpg`,
  profession: 'Guide',
  city: 'Rome',
  country: 'Italy',
  preview: `hello from ${fullName}`,
  sentAtUtc: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  unreadCount: 0,
  ...extra,
});

const circle = (id: number, name: string, extra: Partial<Circle> = {}): Circle =>
  ({
    id,
    name,
    description: `${name} description`,
    icon: '🌊',
    color: '#2563eb',
    adminIds: [ME],
    memberIds: [ME, 2],
    messages: [],
    createdAtUtc: new Date().toISOString(),
    ...extra,
  }) as Circle;

const sources = (over: Partial<MessengerChatSources> = {}): MessengerChatSources => ({
  me: ME,
  pendingChats: [],
  boxes: [],
  circles: [],
  companions: [],
  hiddenIds: new Set(),
  selectedKey: null,
  circleUnread: () => 0,
  ...over,
});

describe('Messenger page — chats side panel', () => {
  it('lists previous chats (read and unread) newest first, with fresh names from the directory', () => {
    const items = buildMessengerChats(
      sources({
        pendingChats: [
          pending(2, 'Old Name', 60 * 24 * 3, { unreadCount: 0, lastSenderId: ME }),
          pending(3, 'Chloe Dupont', 5, { unreadCount: 2 }),
        ],
        companions: [companion(2, 'Marco Rossi')],
      }),
    );
    expect(items.map((i) => i.key)).toEqual([3, 2]);
    expect(items[1].name).toBe('Marco Rossi');
    expect(items[1].mine).toBe(true);
    expect(messengerPreview(items[1])).toBe('You: hello from Old Name');
    expect(items[0].unread).toBe(2);
  });

  it('uses the newest message of a chat open in this session and never lists hidden members', () => {
    const now = new Date().toISOString();
    const box: ActiveChatBox = {
      companionId: 2,
      companion: companion(2, 'Marco Rossi'),
      isMinimized: false,
      draftText: '',
      messages: [{ id: 9, senderId: ME, receiverId: 2, text: 'See you in Rome!', sentAtUtc: now }],
      unreadCount: 0,
    } as ActiveChatBox;
    const items = buildMessengerChats(
      sources({
        pendingChats: [pending(2, 'Marco Rossi', 600), pending(4, 'Blocked Person', 1)],
        boxes: [box],
        hiddenIds: new Set([4]),
      }),
    );
    expect(items.map((i) => i.key)).toEqual([2]);
    expect(messengerPreview(items[0])).toBe('You: See you in Rome!');
  });

  it('lists Circles under their chat key with the sender’s first name; the open chat is never unread', () => {
    const c = circle(7, 'Nepal Tea House Trek', {
      messages: [{ id: 1, senderId: 2, receiverId: 0, text: 'Photos pinned', sentAtUtc: new Date().toISOString() }],
    } as Partial<Circle>);
    const quiet = circle(8, 'Quiet Circle');
    const items = buildMessengerChats(
      sources({
        circles: [c, quiet],
        companions: [companion(2, 'Kenji Sato')],
        pendingChats: [pending(3, 'Chloe Dupont', 30, { unreadCount: 1 })],
        circleUnread: (x) => (x.id === 7 ? 3 : 0),
        selectedKey: 3,
      }),
    );
    const row = items.find((i) => i.key === circleChatKey(7))!;
    expect(row.kind).toBe('circle');
    expect(messengerPreview(row)).toBe('Kenji: Photos pinned');
    expect(row.unread).toBe(3);
    expect(items.find((i) => i.key === 3)!.unread).toBe(0);

    // A Circle without messages is only listed under the Circles chip.
    expect(filterMessengerChats(items, 'all', '').some((i) => i.key === circleChatKey(8))).toBe(false);
    expect(filterMessengerChats(items, 'circles', '').map((i) => i.key)).toEqual([circleChatKey(7), circleChatKey(8)]);
    expect(filterMessengerChats(items, 'unread', '').map((i) => i.key)).toEqual([circleChatKey(7)]);
    expect(filterMessengerChats(items, 'all', 'chloe').map((i) => i.key)).toEqual([3]);
    expect(filterMessengerChats(items, 'circles', 'chloe')).toEqual([]);
    expect(filterMessengerChats(items, 'all', 'nepal').map((i) => i.key)).toEqual([circleChatKey(7)]);
  });

  it('labels the age of the newest message like Messenger', () => {
    const now = new Date(2026, 9, 11, 12, 0);
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(messengerTimeLabel(ago(10_000), now)).toBe('now');
    expect(messengerTimeLabel(ago(5 * 60_000), now)).toBe('5m');
    expect(messengerTimeLabel(ago(3 * 3_600_000), now)).toBe('3h');
    expect(messengerTimeLabel(new Date(2026, 9, 8, 9, 0).toISOString(), now)).toBe('Thu');
    expect(messengerTimeLabel(new Date(2026, 8, 2).toISOString(), now)).toBe('2 Sep');
    expect(messengerTimeLabel(new Date(2025, 9, 2).toISOString(), now)).toBe('2 Oct 2025');
    expect(messengerTimeLabel(null, now)).toBe('');
    expect(messengerFirstName('Liam O’Connor')).toBe('Liam');
    expect(messengerFirstName('')).toBe('Traveler');
  });
});
