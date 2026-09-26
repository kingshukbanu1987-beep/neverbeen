import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminUserSearch } from './dashboard/user-search';
import { AdminInsightsService } from './shared/admin-insights.service';
import { AnnouncementsService, ANNOUNCEMENTS_KEY, emptyAudience, matchesAudience, Announcement } from '../../services/announcements.service';
import { viewerProfile } from '../../services/announcement-inbox.service';
import { CommunityProfile } from '../community/profile/profile';
import { CommunityService, TOKEN_KEY, deleteCookie } from '../../services/community.service';

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function search(fixture: { nativeElement: HTMLElement; detectChanges: () => void }, term: string) {
  const input = $(fixture.nativeElement, '.us-box input') as HTMLInputElement;
  input.value = term;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  return $$(fixture.nativeElement, '.us-row');
}

/** A live announcement for everyone, written straight to storage as if another tab had published it. */
function externalAnnouncement(id: string, title: string): Announcement {
  const now = new Date(Date.now() - 60_000).toISOString();
  return {
    id,
    title,
    body: 'Published from another window.',
    category: 'feature',
    priority: 'normal',
    channels: ['inbox'],
    audience: emptyAudience('all'),
    state: 'published',
    sendAtUtc: now,
    expiresAtUtc: null,
    createdAtUtc: now,
    updatedAtUtc: now,
    createdBy: 'me',
    pinned: false,
    history: [],
    rates: { delivered: 0.98, open: 0.5, click: 0.1 },
  } as unknown as Announcement;
}

describe('Admin › Find a user rows (A) and announcements reaching Notifications (B)', () => {
  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    vi.restoreAllMocks();
  });

  it('A: each result is a compact row — larger photo, status pill beside the name, Manage + Disable grouped together', () => {
    TestBed.configureTestingModule({ imports: [AdminUserSearch], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUserSearch);
    fixture.detectChanges();
    const rows = search(fixture, 'a');
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      // Photo: 50px rounded square (was 38px) with the online dot.
      const img = $(row, '.us-photo img') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(getComputedStyle(img).width).toBe('50px');
      expect($(row, '.us-photo .us-online')).toBeTruthy();

      // Account state sits in the name line, right after the name.
      const nameRow = $(row, '.us-meta .us-name-row')!;
      expect($(nameRow, 'strong')).toBeTruthy();
      expect($(nameRow, '.us-state')).toBeTruthy();
      expect($(row, ':scope > .us-state, :scope > .g-badge')).toBeNull();

      // Both actions live in a single joined group.
      const group = $(row, ':scope > .us-actions')!;
      expect(group.getAttribute('role')).toBe('group');
      const buttons = $$<HTMLButtonElement>(group, 'button');
      expect(buttons.length).toBe(2);
      expect(text(buttons[0])).toBe('Manage');
      expect(['⛔ Disable', '✓ Enable']).toContain(text(buttons[1]));
      expect(text(row)).not.toContain('Disable account');
    }

    const active = rows.find((r) => r.getAttribute('data-state') === 'active')!;
    expect(text($(active, '.us-name-row .us-state'))).toBe('Active');
    expect($(active, '.us-state')!.classList).toContain('ok');
  });

  it('A: Disable (confirm) turns the row into Disabled + Enable, and Enable restores it', () => {
    TestBed.configureTestingModule({ imports: [AdminUserSearch], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminUserSearch);
    fixture.detectChanges();
    const target = TestBed.inject(AdminInsightsService).members().find((m) => m.accountState === 'active')!;
    let row = search(fixture, target.uniqueId)[0];
    ($(row, '.us-act.disable') as HTMLButtonElement).click();
    fixture.detectChanges();
    ($(document.body, '.g-modal .g-btn.danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    row = $$(fixture.nativeElement, '.us-row')[0];
    expect(row.classList).toContain('is-disabled');
    expect(text($(row, '.us-name-row .us-state'))).toBe('Disabled');
    ($(row, '.us-actions .us-act.enable') as HTMLButtonElement).click();
    fixture.detectChanges();
    row = $$(fixture.nativeElement, '.us-row')[0];
    expect(text($(row, '.us-name-row .us-state'))).toBe('Active');
  });

  it('B: the signed-in community account is a member admins can find, manage and target', () => {
    TestBed.configureTestingModule({ imports: [AdminUserSearch], providers: [provideRouter([])] });
    const community = TestBed.inject(CommunityService);
    const insights = TestBed.inject(AdminInsightsService);
    const before = insights.members().length;
    community.loginAsDemoUser('active_member');
    const me = community.currentUser()!;
    const member = insights.member(me.id);
    expect(member).toBeTruthy();
    expect(insights.members().length).toBe(before + 1);
    expect(member!.fullName).toBe(community.profile()?.fullName || me.fullName);

    // Found by the Dashboard's Find a user box.
    const fixture = TestBed.createComponent(AdminUserSearch);
    fixture.detectChanges();
    const rows = search(fixture, member!.uniqueId);
    expect(rows.length).toBe(1);
    expect(text($(rows[0], '.us-name-row strong'))).toBe(member!.fullName);

    // An announcement for exactly this user reaches the member's own viewer profile.
    const viewer = viewerProfile(me, community.profile());
    expect(matchesAudience({ ...emptyAudience('users'), userIds: [member!.id] }, viewer!)).toBe(true);
  });

  it('B: announcements published in another window appear in Notifications on focus, even without a storage event', async () => {
    await TestBed.configureTestingModule({ imports: [CommunityProfile], providers: [provideRouter([])] }).compileComponents();
    const svc = TestBed.inject(AnnouncementsService);
    await svc.ready;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(CommunityService).loginAsDemoUser('active_member');
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    $$<HTMLButtonElement>(el, '.menu-btn').find((b) => text(b).includes('Notifications'))!.click();
    fixture.detectChanges();
    expect($(el, '.ann-notice[data-id="an-x1"]')).toBeNull();

    // Another window writes the store; no `storage` event reaches this tab.
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify({ items: [externalAnnouncement('an-x1', 'Hello from another window'), ...svc.items()] }));
    window.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(text($(el, '.ann-notice[data-id="an-x1"]'))).toContain('Hello from another window');

    // Re-opening Notifications also re-syncs.
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify({ items: [externalAnnouncement('an-x2', 'Second one'), ...svc.items()] }));
    $$<HTMLButtonElement>(el, '.menu-btn').find((b) => text(b).includes('Notifications'))!.click();
    fixture.detectChanges();
    expect($(el, '.ann-notice[data-id="an-x2"]')).toBeTruthy();
  });

  it('B: a full browser storage is retried compactly and otherwise reported instead of failing silently', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const svc = TestBed.inject(AnnouncementsService);
    await svc.ready;
    const base = {
      body: 'b',
      category: 'feature',
      priority: 'normal',
      channels: ['inbox'],
      audience: emptyAudience('all'),
      state: 'published',
      sendAtUtc: new Date().toISOString(),
      expiresAtUtc: null,
    } as unknown as Parameters<AnnouncementsService['create']>[0];
    const realSet = Storage.prototype.setItem;

    // Full history doesn't fit, the compact copy does → saved, no error.
    let calls = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === ANNOUNCEMENTS_KEY && calls++ === 0) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, k, v);
    });
    const a = svc.create({ ...base, title: 'Fits compactly' });
    expect(svc.saveError()).toBeNull();
    expect(JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)!).items.some((x: Announcement) => x.id === a.id)).toBe(true);

    // Nothing fits → reported.
    spy.mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    svc.create({ ...base, title: 'Does not fit' });
    expect(svc.saveError()).toContain('storage is full');

    // Space freed → next save clears the warning.
    spy.mockRestore();
    svc.create({ ...base, title: 'Fits again' });
    expect(svc.saveError()).toBeNull();
  });
});
