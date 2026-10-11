import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityService, PENDING_CHATS_KEY, TOKEN_KEY, deleteCookie } from './community.service';

/**
 * Messenger page on tablet / laptop / wide screens: chats open in the page's wide panel
 * instead of the floating dock. These tests pin the service side of it.
 */
describe('CommunityService — Messenger page (wide layout)', () => {
  let service: CommunityService;

  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CommunityService] });
    service = TestBed.inject(CommunityService);
    service.exploreAsGuest();
  });

  it('seeds previous (read) chats next to the waiting ones, so the chats panel has history', () => {
    const chats = service.pendingChats();
    expect(chats.filter((c) => c.unreadCount > 0).length).toBe(3);
    expect(chats.filter((c) => c.unreadCount === 0).length).toBeGreaterThanOrEqual(4);
    expect(chats.every((c) => c.lastSenderId != null)).toBe(true);
  });

  it('never evicts the chat shown in the wide panel when a sixth chat opens', () => {
    const people = service.visibleCompanions().filter((c) => c.status === 'connected').slice(0, 6);
    expect(people.length).toBe(6);
    service.messengerPageActive.set(true);
    service.messengerPageChatKey.set(Number(people[0].id));
    for (const p of people) service.openChatBox(p);
    const keys = service.activeChatBoxes().map((b) => b.companionId);
    expect(keys.length).toBe(5);
    expect(keys).toContain(Number(people[0].id));
    expect(keys).not.toContain(Number(people[1].id));
  });

  it('moves a conversation to the top of the chats panel, read, as soon as the member writes', () => {
    vi.useFakeTimers();
    try {
      const read = service.pendingChats().filter((c) => c.unreadCount === 0);
      const oldest = read[read.length - 1];
      const target = service.companions().find((c) => Number(c.id) === oldest.companionId)!;
      service.messengerPageActive.set(true);
      service.messengerPageChatKey.set(Number(target.id));
      service.openChatBox(target);
      service.sendChatMessage(Number(target.id), 'Back in Lisbon next month!');
      const top = service.pendingChats()[0];
      expect(top.companionId).toBe(Number(target.id));
      expect(top.preview).toBe('Back in Lisbon next month!');
      expect(top.unreadCount).toBe(0);
      expect(JSON.parse(localStorage.getItem(PENDING_CHATS_KEY) ?? '[]')[0].companionId).toBe(Number(target.id));
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('restores a minimized chat box for the wide panel', () => {
    const p = service.visibleCompanions().find((c) => c.status === 'connected')!;
    service.openChatBox(p);
    service.toggleMinimizeChatBox(Number(p.id));
    expect(service.activeChatBoxes().find((b) => b.companionId === Number(p.id))?.isMinimized).toBe(true);
    service.restoreChatBox(Number(p.id));
    expect(service.activeChatBoxes().find((b) => b.companionId === Number(p.id))?.isMinimized).toBe(false);
  });
});
