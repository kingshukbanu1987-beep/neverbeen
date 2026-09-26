import { Component } from '@angular/core';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminUsers } from './users/users';
import { AdminUserInsights } from './users/insights/user-insights';
import { UserStatsService, buckets, dayNo, emptyFilter, LAUNCH, countSeries, sum } from './users/insights/user-stats';
import { UcTrend } from './users/insights/charts';
import { periodWindow } from './users/insights/new-users';
import { AdminLayout } from './admin';
import { AdminInsightsService } from './shared/admin-insights.service';
import { AdminModerationService } from '../../services/admin-moderation.service';
import { AnnouncementsService, ANNOUNCEMENTS_KEY, emptyAudience, matchesAudience, statusOf } from '../../services/announcements.service';
import { AnnouncementInboxService, ANNOUNCEMENT_INBOX_KEY, viewerProfile } from '../../services/announcement-inbox.service';
import { CommunityProfile } from '../community/profile/profile';
import { AdminAnnouncementComposer } from './announcements/announcement-composer';
import { CommunityService, TOKEN_KEY, deleteCookie } from '../../services/community.service';

@Component({ template: '' })
class Blank {}

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const btn = (root: ParentNode, label: string) => $$<HTMLButtonElement>(root, 'button').find((b) => text(b).includes(label))!;

async function settle(fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function insights(section: string) {
  const fixture = TestBed.createComponent(AdminUserInsights);
  fixture.componentRef.setInput('section', section);
  fixture.detectChanges();
  return fixture;
}

describe('Admin › User Management insights (A–E) and announcements in Notifications (F)', () => {
  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
  });

  it('User Management shows the five insight tabs (lazy) and hides the account KPIs on them', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminUsers);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const tabs = $$(el, '.um-itab');
    expect(tabs.map((t) => t.dataset['tab'])).toEqual(['registrations', 'active', 'engagement', 'disabled', 'new']);
    expect($(el, '.um-kpis')).toBeTruthy();

    tabs[0].click();
    await settle(fixture);
    for (const block of await fixture.getDeferBlocks()) await block.render(DeferBlockState.Complete);
    fixture.detectChanges();
    expect($(el, '.um-kpis')).toBeNull();
    expect(text($(el, '.uc-head h2'))).toBe('User Registrations Statistics');
    expect($(el, 'app-uc-filters')).toBeTruthy();

    $$(el, '.um-itab')[4].click();
    await settle(fixture);
    for (const block of await fixture.getDeferBlocks()) await block.render(DeferBlockState.Complete);
    fixture.detectChanges();
    expect(text($(el, '.uc-head h2'))).toBe('New Users');
  });

  it('A: registrations — KPIs, trend by segment, cumulative view, geography/gender/age breakdowns and filters', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const members = TestBed.inject(AdminInsightsService).members();
    const fixture = insights('registrations');
    const el: HTMLElement = fixture.nativeElement;

    // Six KPI tiles; "Total members" matches the member count.
    const kpis = $$(el, 'app-uc-kpi');
    expect(kpis.length).toBe(6);
    expect(text(kpis[1])).toContain(members.length.toLocaleString());

    // All-time monthly registrations add up to every member.
    btn(el, 'All time').click();
    fixture.detectChanges();
    const trend = fixture.debugElement.query((d) => d.componentInstance instanceof UcTrend).componentInstance as UcTrend;
    const all = (trend.series() as { values: number[] }[]).reduce((a, s) => a + sum(s.values), 0);
    expect(all).toBe(members.length);
    expect(text(el)).toContain('🚀 Launch');

    // Cumulative view ends at the total number of members.
    btn(el, 'Cumulative').click();
    fixture.detectChanges();
    const last = trend.series()[0].values.at(-1);
    expect(last).toBe(members.length);

    // Break down by gender → Male & Female series.
    btn(el, 'Gender').click();
    fixture.detectChanges();
    expect(trend.series().map((s) => s.name)).toEqual(expect.arrayContaining(['Male', 'Female']));
    expect($$(el, '.uc-leg').length).toBeGreaterThanOrEqual(2);

    // Hover tooltip.
    trend.hoverAt(2);
    fixture.detectChanges();
    expect($(el, '.uc-tip strong')).toBeTruthy();

    // Breakdown cards, pyramid and calendar render.
    expect(text(el)).toContain('Geography');
    expect($$(el, '.uc-pyr-row').length).toBe(6);
    expect($$(el, '.uc-cal-grid .uc-cell').length).toBeGreaterThan(300);
    expect($$(el, '.uc-table tbody tr').length).toBeGreaterThan(0);

    // Gender filter via popover → only female members match.
    $<HTMLButtonElement>(el, '.uc-fbtn[data-filter="genders"]')!.click();
    fixture.detectChanges();
    const female = $$<HTMLLabelElement>(el, '.uc-pop-item').find((l) => text(l).startsWith('Female'))!;
    female.querySelector('input')!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const females = members.filter((m) => m.gender === 'Female').length;
    expect(text($(el, '.uc-matching b'))).toBe(females.toLocaleString());
    expect(text($(el, '.uc-chip'))).toContain('Female');
    expect(text(kpis[1])).toContain(females.toLocaleString());

    // Clicking a region bar adds a Geography filter.
    const region = $$(el, '.uc-bar-row.clickable')[0];
    const regionName = text(region.querySelector('.uc-bar-name'));
    region.click();
    fixture.detectChanges();
    expect($$(el, '.uc-chip').map(text).some((c) => c.includes(regionName))).toBe(true);

    btn(el, 'Reset filters').click();
    fixture.detectChanges();
    expect($$(el, '.uc-chip').length).toBe(0);
    expect(text($(el, '.uc-matching b'))).toBe(members.length.toLocaleString());
  });

  it('activity model agrees with members: last active day, online today, no activity while disabled', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const stats = TestBed.inject(UserStatsService);
    const rows = stats.activity();
    const today = dayNo(Date.now());
    expect(rows.length).toBe(stats.members().length);
    for (const r of rows.slice(0, 200)) {
      const m = r.member;
      const expectedLast = m.isOnline ? today : Math.max(r.start, dayNo(Date.parse(m.lastActiveUtc)));
      if (!stats.disableEvents().some((e) => e.member.id === m.id)) expect(r.lastDay).toBe(Math.min(today, expectedLast));
      expect(r.days[0]).toBe(1); // active on the day they joined
    }
    // Everyone online right now counts as active today.
    const online = rows.filter((r) => r.member.isOnline && r.member.accountState !== 'disabled');
    expect(online.every((r) => r.days[today - r.start] === 1)).toBe(true);

    // Past disable → reinstate events: no activity while disabled.
    const events = stats.disableEvents().filter((e) => e.reinstatedAt !== null);
    expect(events.length).toBeGreaterThan(10);
    for (const e of events.slice(0, 20)) {
      const row = rows.find((r) => r.member.id === e.member.id)!;
      expect(stats.activeDays(row, dayNo(e.disabledAt), dayNo(e.reinstatedAt!) - 1)).toBe(0);
      expect(e.reinstatedAt!).toBeLessThan(Date.parse(e.member.lastActiveUtc));
    }
  });

  it('B: daily active users — DAU today, WAU/MAU, stickiness, weekday pattern, calendar and segment table', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const stats = TestBed.inject(UserStatsService);
    const fixture = insights('active');
    const el: HTMLElement = fixture.nativeElement;
    const today = dayNo(Date.now());
    const rows = stats.rows(emptyFilter());

    const kpis = $$(el, 'app-uc-kpi');
    expect(kpis.length).toBe(6);
    expect(text(kpis[0])).toContain(stats.uniqueActive(rows, today, today).toLocaleString());
    expect(text(kpis[3])).toContain(stats.uniqueActive(rows, today - 6, today).toLocaleString());
    expect(text(kpis[4])).toContain(stats.uniqueActive(rows, today - 29, today).toLocaleString());
    expect(text(kpis[5])).toMatch(/Stickiness \d+(\.\d)?%/);

    // Daily chart has a 7-day average overlay; week granularity offers WAU vs avg DAU.
    expect(text(el)).toContain('7-day average');
    btn(el, 'Week').click();
    fixture.detectChanges();
    expect(text(el)).toContain('Weekly active users');
    btn(el, 'Avg daily (DAU)').click();
    fixture.detectChanges();
    expect(text(el)).toContain('Daily active users');

    // Month / Year granularity for long ranges.
    btn(el, 'All time').click();
    fixture.detectChanges();
    expect($<HTMLButtonElement>(el, '.uc-seg [aria-pressed="true"]')).toBeTruthy();
    btn(el, 'Year').click();
    fixture.detectChanges();
    btn(el, 'Unique (YAU)').click();
    fixture.detectChanges();
    expect(text(el)).toContain('Yearly active users');

    expect($$(el, 'app-uc-bars').length).toBeGreaterThanOrEqual(4);
    expect(text(el)).toContain('Monday');
    expect($$(el, '.uc-cal-grid .uc-cell').length).toBeGreaterThan(300);
    expect($$(el, '.uc-table tbody tr').length).toBeGreaterThan(0);
  });

  it('C: most active / inactive leaderboards with Manage, tiers, distribution and segment comparison', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = insights('engagement');
    const el: HTMLElement = fixture.nativeElement;

    expect(text(el)).toContain('Power users');
    expect(text(el)).toContain('Inactive');
    let rows = $$(el, '.uc-lead tbody tr');
    expect(rows.length).toBe(10);
    expect(rows.every((r) => r.querySelector('app-manage-user-btn'))).toBe(true);
    const activeDays = rows.map((r) => Number(text(r.querySelectorAll('td')[4]).split('/')[0]));
    expect(activeDays).toEqual([...activeDays].sort((a, b) => b - a));

    btn(el, '💤 Most inactive').click();
    fixture.detectChanges();
    rows = $$(el, '.uc-lead tbody tr');
    expect(rows[0].dataset['board']).toBe('inactive');
    const rates = rows.map((r) => parseFloat(text(r.querySelectorAll('td')[5])));
    expect(rates).toEqual([...rates].sort((a, b) => a - b));

    btn(el, '25').click();
    fixture.detectChanges();
    expect($$(el, '.uc-lead tbody tr').length).toBe(25);

    // Per day / week / month / year periods.
    btn(el, '7 days').click();
    fixture.detectChanges();
    expect(text(el)).toContain('0 days');
    btn(el, '12 months').click();
    fixture.detectChanges();
    btn(el, 'Month').click();
    fixture.detectChanges();
    expect($$(el, 'app-uc-trend').length).toBe(2);
    expect(text(el)).toContain('Avg active days by age group');
  });

  it('D: disabled users — history, currently disabled accounts, reasons and a list with Manage', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const members = TestBed.inject(AdminInsightsService).members();
    const target = members[5];
    TestBed.inject(AdminModerationService).disableAccount(target.id, 'Spam or promotional content');
    const fixture = insights('disabled');
    const el: HTMLElement = fixture.nativeElement;

    const kpis = $$(el, 'app-uc-kpi');
    expect(text(kpis[0])).toContain('Disabled right now 1');
    expect(text(el)).toContain('Reasons');
    expect(text(el)).toContain('Actioned by');

    btn(el, 'Disabled now').click();
    fixture.detectChanges();
    const rows = $$(el, '.uc-dis-row');
    expect(rows.length).toBe(1);
    expect(rows[0].dataset['status']).toBe('disabled');
    expect(text(rows[0])).toContain(target.fullName);
    expect(rows[0].querySelector('app-manage-user-btn')).toBeTruthy();

    btn(el, 'All time').click();
    fixture.detectChanges();
    btn(el, 'Reinstated').click();
    fixture.detectChanges();
    expect($$(el, '.uc-dis-row[data-status="reinstated"]').length).toBeGreaterThan(5);
  });

  it('E: new users today / this week / this month / this year / last 5 years', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const members = TestBed.inject(AdminInsightsService).members();
    const fixture = insights('new');
    const el: HTMLElement = fixture.nativeElement;
    const now = Date.now();
    const count = (p: 'today' | 'week' | 'month' | 'year' | '5y') => {
      const w = periodWindow(p, now);
      return members.filter((m) => Date.parse(m.registeredAtUtc) >= w.from && Date.parse(m.registeredAtUtc) <= w.to).length;
    };

    const tiles = $$(el, '.uc-period');
    expect(tiles.map((t) => t.dataset['period'])).toEqual(['today', 'week', 'month', 'year', '5y']);
    for (const t of tiles) expect(text(t.querySelector('strong'))).toBe(count(t.dataset['period'] as never).toLocaleString());
    // No range selector on this page (periods replace it); filters still apply.
    expect(btn(el, '30 days')).toBeUndefined();

    tiles[4].click();
    fixture.detectChanges();
    expect(count('5y')).toBe(members.length);
    expect(text(el)).toContain('🚀 Launch');
    expect($$(el, '.uc-newbie').length).toBe(12);
    expect($$(el, '.uc-newbie app-manage-user-btn').length).toBe(12);
    btn(el, 'Show more').click();
    fixture.detectChanges();
    expect($$(el, '.uc-newbie').length).toBe(24);

    tiles[3].click();
    fixture.detectChanges();
    expect(text(el)).toContain(`New users this year · ${count('year')}`);

    // Chart buckets: today → hours, this year → months.
    expect(buckets(periodWindow('today', now).from, periodWindow('today', now).end, 'hour').length).toBe(24);
    const yearly = countSeries(members, buckets(periodWindow('5y', now).from, now, 'year'), (m) => m, (m) => Date.parse(m.registeredAtUtc), 'none', members);
    expect(sum(yearly[0].values)).toBe(members.length);
    expect(new Date(LAUNCH).getUTCFullYear()).toBe(2024);
  });

  it('side panel lists the User Management insight pages while User Management is open', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'admin/users', component: Blank }, { path: 'admin/dashboard', component: Blank }])] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/dashboard');
    const fixture = TestBed.createComponent(AdminLayout);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect($(el, '.nav-sub-users')).toBeNull();

    await router.navigateByUrl('/admin/users?tab=active');
    await settle(fixture);
    const links = $$(el, '.nav-sub-users a');
    expect(links.map((a) => a.dataset['tab'])).toEqual(['directory', 'registrations', 'active', 'engagement', 'disabled', 'new']);
    expect(links.map((a) => text(a.querySelector('.nav-sub-label')))).toEqual(['Directory', 'Registrations statistics', 'Daily active users', 'Most active / inactive', 'Disabled users', 'New users']);
    expect($(el, '.nav-sub-users a.active')?.dataset['tab']).toBe('active');
  });

  it('F: live announcements reach matching members, can be cleared, and new ones arrive automatically (also from another tab)', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const ann = TestBed.inject(AnnouncementsService);
    await ann.ready;
    const inbox = TestBed.inject(AnnouncementInboxService);
    const viewer = { id: 4242, country: 'India', city: 'Kolkata', gender: 'Male', age: 38, isVerified: true };
    const now = Date.now();
    const expected = ann
      .items()
      .filter((a) => statusOf(a, now) === 'live' && matchesAudience(a.audience, viewer))
      .map((a) => a.id);
    const got = inbox.noticesFor(viewer).map((n) => n.a.id);
    expect(got.sort()).toEqual(expected.sort());
    expect(got.length).toBeGreaterThan(0);
    // Not scheduled, drafts, cancelled, expired or other audiences.
    for (const id of ['an-1002', 'an-1009', 'an-1011', 'an-1013', 'an-1004', 'an-1016', 'an-1003', 'an-1005']) expect(got).not.toContain(id);
    expect(inbox.unreadCount(viewer)).toBe(got.length);

    // Clear one → gone for this member only.
    inbox.clear(viewer.id, got[0]);
    expect(inbox.noticesFor(viewer).map((n) => n.a.id)).not.toContain(got[0]);
    expect(inbox.noticesFor({ ...viewer, id: 999 }).map((n) => n.a.id)).toContain(got[0]);
    expect(JSON.parse(localStorage.getItem(ANNOUNCEMENT_INBOX_KEY)!)['4242'].cleared).toEqual([got[0]]);

    // Publish → delivered immediately (and always includes the Notifications channel).
    const a = ann.create({
      title: 'Brand new feature',
      body: 'Try **Collections** today',
      category: 'feature',
      priority: 'normal',
      channels: ['banner'],
      audience: emptyAudience('all'),
      state: 'published',
      sendAtUtc: new Date().toISOString(),
      expiresAtUtc: null,
    });
    expect(a.channels).toContain('inbox');
    const list = inbox.noticesFor(viewer);
    const first = list.find((n) => n.a.id === a.id)!;
    expect(first).toBeTruthy();
    // Critical announcements stay on top; otherwise newest first.
    expect(list.findIndex((n) => n.a.id === a.id)).toBe(list.filter((n) => n.a.priority === 'critical').length);
    expect(first.html).toBe('Try <strong>Collections</strong> today');
    expect(first.unread).toBe(true);

    // Another tab publishes → storage event delivers it here.
    const stored = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)!);
    const remote = { ...stored.items[0], id: 'an-remote', title: 'From another tab', sendAtUtc: new Date().toISOString() };
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify({ items: [remote, ...stored.items] }));
    window.dispatchEvent(new StorageEvent('storage', { key: ANNOUNCEMENTS_KEY }));
    expect(inbox.noticesFor(viewer).map((n) => n.a.id)).toContain('an-remote');

    // Ended announcements disappear.
    ann.endNow(a.id);
    expect(inbox.noticesFor(viewer).map((n) => n.a.id)).not.toContain(a.id);
  });

  it('F (end-to-end): an announcement published in the Admin Console composer shows in the member profile → Notifications after a reload', async () => {
    // 1) Admin publishes to all users through the composer UI.
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await TestBed.inject(AnnouncementsService).ready;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const composer = TestBed.createComponent(AdminAnnouncementComposer);
    composer.detectChanges();
    const cel: HTMLElement = composer.nativeElement;
    const type = (sel: string, v: string) => {
      const i = cel.querySelector(sel) as HTMLInputElement;
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    type('#an-title', 'Hello from the admins');
    type('#an-body', 'Our **new** feature is live.');
    composer.detectChanges();
    btn(cel, '🚀 Publish').click();
    composer.detectChanges();
    btn(document.body.querySelector('.g-modal') as HTMLElement, 'Publish now').click();
    composer.detectChanges();
    composer.destroy();
    const published = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)!).items[0];
    expect(published.title).toBe('Hello from the admins');

    // 2) Fresh app load (new root services read localStorage) → member opens Notifications.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [CommunityProfile], providers: [provideRouter([])] }).compileComponents();
    await TestBed.inject(AnnouncementsService).ready;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(CommunityService).loginAsDemoUser('active_member');
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    $$<HTMLButtonElement>(el, '.menu-btn').find((b) => text(b).includes('Notifications'))!.click();
    fixture.detectChanges();
    const card = $(el, `.ann-notice[data-id="${published.id}"]`);
    expect(card).toBeTruthy();
    expect(text(card)).toContain('Hello from the admins');
  });

  it('F: the profile Notifications section lists announcements with a badge, marks them read and lets the member clear them', async () => {
    await TestBed.configureTestingModule({ imports: [CommunityProfile], providers: [provideRouter([])] }).compileComponents();
    const ann = TestBed.inject(AnnouncementsService);
    await ann.ready;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const community = TestBed.inject(CommunityService);
    community.loginAsDemoUser('active_member');
    const inbox = TestBed.inject(AnnouncementInboxService);
    const viewer = viewerProfile(community.currentUser(), community.profile() as never)!;
    const expected = inbox.noticesFor(viewer);
    expect(expected.length).toBeGreaterThan(0);

    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const notifBtn = $$<HTMLButtonElement>(el, '.menu-btn').find((b) => text(b).includes('Notifications'))!;
    const badge = () => Number(text(notifBtn.querySelector('.notif-count-badge')) || 0);
    const before = badge();
    expect(before).toBe(community.unreadNotificationCount() + expected.length);

    notifBtn.click();
    fixture.detectChanges();
    let cards = $$(el, '.ann-notice');
    expect(cards.map((c) => c.dataset['id'])).toEqual(expected.map((n) => n.a.id));
    expect(text(cards[0])).toContain('NeverBeen Team');
    expect(cards.every((c) => c.classList.contains('unread'))).toBe(true); // highlighted as new while open
    expect(badge()).toBe(0);
    expect(inbox.unreadCount(viewer)).toBe(0);

    // A new announcement pushed by an admin appears automatically.
    const pushed = ann.create({
      title: 'Pushed while reading',
      body: 'Hello travellers',
      category: 'general',
      priority: 'critical',
      channels: ['inbox'],
      audience: emptyAudience('all'),
      state: 'published',
      sendAtUtc: new Date().toISOString(),
      expiresAtUtc: null,
    });
    fixture.detectChanges();
    cards = $$(el, '.ann-notice');
    expect(cards[0].dataset['id']).toBe(pushed.id);
    expect(text(cards[0])).toContain('New');
    expect(badge()).toBe(1);

    // Clear one, then clear all.
    cards[0].querySelector<HTMLButtonElement>('.ann-notice-clear')!.click();
    fixture.detectChanges();
    expect($$(el, '.ann-notice').map((c) => c.dataset['id'])).not.toContain(pushed.id);
    btn(el, 'Clear all').click();
    fixture.detectChanges();
    expect($$(el, '.ann-notice').length).toBe(0);
    expect(inbox.noticesFor(viewer).length).toBe(0);
  });
});
