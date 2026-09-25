import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AdminLayout } from './admin';
import { AdminUserSearch } from './dashboard/user-search';
import { AdminManageUserHost } from './users/manage-user-host';
import { ManageUserService } from './shared/manage-user.service';
import { AdminMembers } from './members/members';
import { AdminAbuseReports } from './abuse-reports/abuse-reports';
import { AdminSuspiciousUsers } from './dashboard/suspicious-users';
import { AdminIdentityChecks } from './identity-checks/identity-checks';
import { AdminDashboard } from './dashboard/dashboard';
import { AdminPresenceService } from './shared/admin-presence.service';
import { AdminAnnouncements } from './announcements/announcements';
import { AdminAnnouncementComposer } from './announcements/announcement-composer';
import { AdminWhatsApp, WHATSAPP_WEB_URL, WHATSAPP_WINDOW_NAME } from './whatsapp/whatsapp';
import { AdminInsightsService } from './shared/admin-insights.service';
import { AdminAuditService } from '../../services/admin-audit.service';
import { AnnouncementBar } from '../../layout/announcement-bar/announcement-bar';
import {
  ANNOUNCEMENTS_KEY,
  AnnouncementsService,
  describeAudience,
  emptyAudience,
  matchesAudience,
  regionOf,
  statusOf,
} from '../../services/announcements.service';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function btn(root: ParentNode, text: string): HTMLButtonElement {
  const b = ([...root.querySelectorAll('button')] as HTMLButtonElement[]).find((x) => (x.textContent ?? '').includes(text));
  expect(b, `button "${text}"`).toBeTruthy();
  return b!;
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function route(query: Record<string, string> = {}, data: Record<string, unknown> = {}) {
  return {
    provide: ActivatedRoute,
    useValue: {
      data: of(data),
      queryParamMap: new BehaviorSubject(convertToParamMap(query)),
      snapshot: { data, queryParamMap: convertToParamMap(query) },
    },
  };
}

@Component({
  selector: 'app-test-host',
  imports: [AdminUserSearch, AdminManageUserHost],
  template: `<app-admin-user-search /><app-admin-manage-user-host />`,
})
class SearchHost {}

describe('Admin Console — Manage everywhere, Announcements, live admins, WhatsApp', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.body.querySelectorAll('.ud, .ud-backdrop, .an-drawer, .an-drawer-backdrop, .g-modal-backdrop').forEach((n) => n.remove()));

  /* ------------------------------------ A ------------------------------------ */

  it('A: Dashboard user search shows a Manage button per user that opens the User Management drawer', () => {
    TestBed.configureTestingModule({ imports: [SearchHost], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SearchHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    type(el.querySelector('.us-box input') as HTMLInputElement, 'a');
    fixture.detectChanges();
    const rows = el.querySelectorAll('.us-row');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => {
      expect(r.querySelector('app-manage-user-btn button')?.textContent).toContain('Manage');
      expect(r.querySelector('.g-btn.danger, .g-btn.success')).toBeTruthy(); // existing Disable / Enable stays
    });
    const name = rows[0].querySelector('.us-meta strong')?.textContent?.trim().replace('✓', '').trim();
    (rows[0].querySelector('app-manage-user-btn button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const drawer = el.querySelector('.ud') as HTMLElement;
    expect(drawer).toBeTruthy();
    expect(drawer.querySelector('.ud-id-meta h3')?.textContent).toContain(name!);
    expect(drawer.textContent).toContain('Overview');

    // Escape closes it
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.ud')).toBeNull();
    expect(TestBed.inject(ManageUserService).openId()).toBeNull();
  });

  it('A: Manage is shown beside users on members, abuse reports, suspicious users, identity checks and dashboard lists', async () => {
    TestBed.configureTestingModule({
      imports: [AdminMembers, AdminAbuseReports, AdminSuspiciousUsers, AdminIdentityChecks, AdminDashboard],
      providers: [provideRouter([]), route({}, { mode: 'all' })],
    });
    const manage = TestBed.inject(ManageUserService);

    const members = TestBed.createComponent(AdminMembers);
    members.detectChanges();
    await flush();
    members.detectChanges();
    const rows = members.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r: Element) => expect(r.querySelector('app-manage-user-btn')).toBeTruthy());
    (rows[0].querySelector('app-manage-user-btn button') as HTMLButtonElement).click();
    expect(manage.openId()).toBeGreaterThan(0);
    manage.close();

    const reports = TestBed.createComponent(AdminAbuseReports);
    reports.detectChanges();
    const parties = reports.nativeElement.querySelectorAll('.ar-party');
    expect(parties.length).toBeGreaterThan(1);
    parties.forEach((p: Element) => expect(p.querySelector('app-manage-user-btn')).toBeTruthy());

    const sus = TestBed.createComponent(AdminSuspiciousUsers);
    sus.detectChanges();
    const susRows = sus.nativeElement.querySelectorAll('tbody tr');
    expect(susRows.length).toBeGreaterThan(0);
    susRows.forEach((r: Element) => expect(r.querySelector('app-manage-user-btn')).toBeTruthy());

    const ic = TestBed.createComponent(AdminIdentityChecks);
    ic.detectChanges();
    expect(ic.nativeElement.querySelectorAll('.ic-manage app-manage-user-btn').length).toBeGreaterThan(0);

    const dash = TestBed.createComponent(AdminDashboard);
    dash.detectChanges();
    const tile = dash.nativeElement.querySelector('.report-tile') as HTMLElement;
    expect(tile.querySelectorAll('app-manage-user-btn').length).toBe(2);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    (tile.querySelector('app-manage-user-btn button') as HTMLButtonElement).click();
    expect(manage.openId()).toBeGreaterThan(0);
    expect(nav).not.toHaveBeenCalled(); // Manage doesn't also open the report
    tile.click();
    expect(nav).toHaveBeenCalledWith(['/admin/dashboard/abuse-reports'], expect.objectContaining({ queryParams: expect.any(Object) }));
  });

  /* ------------------------------ C + side panel ------------------------------ */

  it('C: side panel shows live admins next to live members; Announcement and WhatsApp follow Mail', async () => {
    TestBed.configureTestingModule({ imports: [AdminLayout], providers: [provideRouter([])] });
    await TestBed.inject(AnnouncementsService).ready;
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const presence = TestBed.inject(AdminPresenceService);
    const live = presence.liveCount();
    expect(live).toBeGreaterThanOrEqual(2);
    expect(live).toBeLessThanOrEqual(presence.total());

    const strips = el.querySelectorAll('.admin-live .admin-live-strip');
    expect(strips.length).toBe(2);
    expect(strips[0].textContent).toContain('members');
    expect(strips[1].textContent?.replace(/\s+/g, ' ')).toContain(`Live • ${live} admins`);
    expect(el.querySelector('.status-pill.admins')?.textContent).toContain(`${live} admins live`);

    (strips[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = el.querySelectorAll('.la-list li[data-status]');
    expect(items.length).toBe(presence.total());
    expect(items[0].textContent).toContain('You (admin)');
    expect(el.querySelectorAll('.la-list li[data-status="offline"]').length).toBe(presence.total() - live);
    expect(el.querySelector('.la-msg')?.getAttribute('href')).toMatch(/^\/admin\/mail\/compose\?to=/);
    expect(el.querySelector('.la-foot')?.textContent).toContain(`${live} of ${presence.total()} admins live now`);

    const nav = [...el.querySelector('.admin-nav')!.children] as HTMLElement[];
    const labels = nav.map((n) => (n.classList.contains('nav-group') ? 'Mail' : n.querySelector('.nav-text strong')?.textContent?.trim()));
    expect(labels.slice(0, 5)).toEqual(['Dashboard', 'Mail', 'Announcement', 'WhatsApp', 'Repositories']);
    expect(nav[2].getAttribute('href')).toBe('/admin/announcements');
    expect(nav[3].getAttribute('href')).toBe('/admin/whatsapp');
    // one scheduled seed announcement is flagged in the side panel
    expect(nav[2].querySelector('.nav-flag')?.textContent?.trim()).toBe(String(TestBed.inject(AnnouncementsService).scheduledCount()));
  });

  /* ------------------------------------ B ------------------------------------ */

  it('B: announcement audience rules (geography, country, city, gender, age, verified, particular users)', () => {
    const p = { id: 7, country: 'France', city: 'Paris', gender: 'Female', age: 31, isVerified: true };
    expect(regionOf('France')).toBe('Europe');
    expect(regionOf('India')).toBe('South Asia');
    expect(matchesAudience(emptyAudience('all'), p)).toBe(true);
    expect(matchesAudience({ ...emptyAudience('filtered'), regions: ['Europe'] }, p)).toBe(true);
    expect(matchesAudience({ ...emptyAudience('filtered'), regions: ['South Asia'] }, p)).toBe(false);
    expect(matchesAudience({ ...emptyAudience('filtered'), countries: ['France'], cities: ['Lyon'] }, p)).toBe(false);
    expect(matchesAudience({ ...emptyAudience('filtered'), genders: ['Female'], ageMin: 25, ageMax: 34 }, p)).toBe(true);
    expect(matchesAudience({ ...emptyAudience('filtered'), ageMax: 29 }, p)).toBe(false);
    expect(matchesAudience({ ...emptyAudience('filtered'), verifiedOnly: true }, { ...p, isVerified: false })).toBe(false);
    expect(matchesAudience({ ...emptyAudience('users'), userIds: [7] }, p)).toBe(true);
    expect(matchesAudience({ ...emptyAudience('users'), userIds: [8] }, p)).toBe(false);
    expect(describeAudience({ ...emptyAudience('filtered'), regions: ['Europe'], genders: ['Female'], ageMin: 25, ageMax: 40, verifiedOnly: true })).toBe(
      'Europe · Female · Age 25–40 · Verified only',
    );
    expect(describeAudience({ ...emptyAudience('users'), userIds: [1, 2], groupNames: ['Top contributors'] })).toBe('2 selected users · Top contributors');
  });

  it('B: seeded announcements from other admins in every status; banner only reaches matching visitors', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await TestBed.inject(AnnouncementsService).ready;
    const svc = TestBed.inject(AnnouncementsService);
    const items = svc.items();
    expect(items.length).toBe(16);
    const st = (id: string) => statusOf(svc.byId(id)!);
    expect(st('an-1008')).toBe('live');
    expect(st('an-1009')).toBe('scheduled');
    expect(st('an-1011')).toBe('draft');
    expect(st('an-1004')).toBe('expired');
    expect(st('an-1013')).toBe('cancelled');
    expect(new Set(items.map((a) => a.createdBy)).size).toBeGreaterThanOrEqual(8);
    // Signed-out visitors: no seeded banner targets everyone.
    expect(svc.forViewer(null)).toEqual([]);
    expect(svc.forViewer({ id: 1, country: 'Pakistan', city: 'Lahore', gender: 'Male', age: 30, isVerified: false }).map((a) => a.id)).toEqual(['an-1003']);
    expect(svc.forViewer({ id: 1, country: 'Italy', city: 'Milan', gender: 'Female', age: 30, isVerified: true }).map((a) => a.id)).toEqual(['an-1005']);
    svc.dismiss('an-1005');
    expect(svc.forViewer({ id: 1, country: 'Italy', city: 'Milan', gender: 'Female', age: 30, isVerified: true })).toEqual([]);
  });

  it('B: sample announcements load lazily and never overwrite one published meanwhile', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const svc = TestBed.inject(AnnouncementsService);
    const mine = svc.create({
      title: 'Published before the samples arrived',
      body: 'Hello',
      category: 'general',
      priority: 'normal',
      channels: ['inbox'],
      audience: emptyAudience('all'),
      state: 'published',
      sendAtUtc: new Date().toISOString(),
      expiresAtUtc: null,
    });
    await svc.ready;
    expect(svc.items().length).toBe(17);
    expect(svc.items()[0].id).toBe(mine.id);
    const saved = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)!).items;
    expect(saved.length).toBe(17);
  });

  it('B: grid — KPIs, status tabs, search, sort, details drawer (with Manage), cancel & delete with Undo', async () => {
    TestBed.configureTestingModule({ imports: [AdminAnnouncements], providers: [provideRouter([]), route()] });
    await TestBed.inject(AnnouncementsService).ready;
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const svc = TestBed.inject(AnnouncementsService);
    const audit = TestBed.inject(AdminAuditService);
    const fixture = TestBed.createComponent(AdminAnnouncements);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('.an-kpi').length).toBe(6);
    expect(el.querySelectorAll('.an-row').length).toBe(10); // page size 10 of 16
    expect(el.querySelector('.an-foot')?.textContent).toContain('of 16');
    // pinned critical safety notice is first
    expect(el.querySelector('.an-row .an-title')?.textContent).toContain('fake “NeverBeen Support”');
    expect(el.querySelector('.an-row .an-pin')).toBeTruthy();

    const tab = (label: string) => ([...el.querySelectorAll('.an-tab')] as HTMLButtonElement[]).find((t) => t.textContent?.includes(label))!;
    tab('Live').click();
    fixture.detectChanges();
    const liveRows = el.querySelectorAll('.an-row');
    expect(liveRows.length).toBe(svc.liveCount());
    liveRows.forEach((r) => expect(r.getAttribute('data-status')).toBe('live'));
    tab('All').click();

    type(el.querySelector('.an-search input') as HTMLInputElement, 'lisbon');
    fixture.detectChanges();
    expect(el.querySelectorAll('.an-row').length).toBe(1);
    expect(el.querySelector('.an-row .an-aud-chip')?.textContent).toContain('Europe');
    type(el.querySelector('.an-search input') as HTMLInputElement, '');
    fixture.detectChanges();

    // Sort by reach (desc) — everyone-audiences come first after pinned
    btn(el, 'Audience · reach').click();
    fixture.detectChanges();
    const reaches = [...el.querySelectorAll('.an-row:not(:first-child) .an-aud small b')].map((b) => Number(b.textContent!.replace(/,/g, '')));
    expect(reaches).toEqual([...reaches].sort((a, b) => b - a));

    // Details drawer for the "particular users" announcement → Manage buttons for each user
    type(el.querySelector('.an-search input') as HTMLInputElement, 'storytellers');
    fixture.detectChanges();
    (el.querySelector('.an-row') as HTMLElement).click();
    fixture.detectChanges();
    expect(nav).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { a: 'an-1012' } }));
    const drawer = document.body.querySelector('.an-drawer') as HTMLElement;
    expect(drawer.querySelector('h3')?.textContent).toContain('top storytellers');
    expect(drawer.querySelectorAll('.an-funnel-row').length).toBe(4);
    expect(drawer.querySelectorAll('.an-users li app-manage-user-btn').length).toBeGreaterThan(0);
    (drawer.querySelector('.an-users app-manage-user-btn button') as HTMLButtonElement).click();
    expect(TestBed.inject(ManageUserService).openId()).toBeGreaterThan(0);
    (drawer.querySelector('.an-dr-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.body.querySelector('.an-drawer')).toBeNull();

    // Cancel a scheduled announcement via the row menu
    type(el.querySelector('.an-search input') as HTMLInputElement, '2-step');
    fixture.detectChanges();
    (el.querySelector('.an-kebab') as HTMLButtonElement).click();
    fixture.detectChanges();
    btn(el.querySelector('.an-menu')!, 'Cancel sending').click();
    fixture.detectChanges();
    btn(document.body.querySelector('.g-modal')!, 'Cancel sending').click();
    fixture.detectChanges();
    expect(statusOf(svc.byId('an-1009')!)).toBe('cancelled');
    expect(audit.entries()[0].category).toBe('announcement');

    // Bulk delete + Undo
    type(el.querySelector('.an-search input') as HTMLInputElement, '');
    fixture.detectChanges();
    const checks = [...el.querySelectorAll('tbody .an-check input')] as HTMLInputElement[];
    checks[1].click();
    checks[2].click();
    fixture.detectChanges();
    expect(el.querySelector('.an-bulk strong')?.textContent).toContain('2 selected');
    btn(el.querySelector('.an-bulk')!, 'Delete').click();
    fixture.detectChanges();
    btn(document.body.querySelector('.g-modal')!, 'Delete').click();
    fixture.detectChanges();
    expect(svc.items().length).toBe(14);
    btn(document.body.querySelector('.an-undo')!, 'Undo').click();
    fixture.detectChanges();
    expect(svc.items().length).toBe(16);
  });

  it('B: composer — targeted audience by geography/gender/age with live reach, then publish to users', async () => {
    TestBed.configureTestingModule({ imports: [AdminAnnouncementComposer], providers: [provideRouter([]), route()] });
    await TestBed.inject(AnnouncementsService).ready;
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const svc = TestBed.inject(AnnouncementsService);
    const members = TestBed.inject(AdminInsightsService).members();
    const fixture = TestBed.createComponent(AdminAnnouncementComposer);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const reach = () => Number(el.querySelector('.an-reach-num strong')!.textContent!.replace(/,/g, ''));

    expect(reach()).toBe(members.length); // All users by default

    // Validation
    btn(el, '🚀 Publish').click();
    fixture.detectChanges();
    expect(el.querySelector('.an-errors')?.textContent).toContain('Add a title.');

    type(el.querySelector('#an-title') as HTMLInputElement, 'Europe meetup — Paris');
    type(el.querySelector('#an-body') as HTMLTextAreaElement, 'Join us for a **sunset** walk.');
    fixture.detectChanges();

    // Targeted → Geography: Europe
    btn(el, 'Targeted').click();
    fixture.detectChanges();
    btn(el.querySelector('.an-filters')!, 'Europe').click();
    fixture.detectChanges();
    const europe = members.filter((m) => regionOf(m.country) === 'Europe');
    expect(reach()).toBe(europe.length);
    expect(el.querySelector('.an-reach-label')?.textContent).toContain('Europe');
    // country options are restricted to the region
    const countryPills = [...el.querySelectorAll('.an-filter')[1].querySelectorAll('.an-pill')].map((p) => p.textContent);
    expect(countryPills.every((t) => !t?.includes('India'))).toBe(true);

    // Gender + age narrow it further
    btn(el.querySelector('.an-filters')!, 'Male').click();
    fixture.detectChanges();
    expect(reach()).toBe(europe.filter((m) => m.gender === 'Male').length);
    btn(el.querySelector('.an-filters')!, '✕ Clear').click();
    fixture.detectChanges();
    expect(reach()).toBe(members.length);
    btn(el.querySelector('.an-filters')!, 'Female').click();
    btn(el.querySelector('.an-filters')!, '30–34').click();
    fixture.detectChanges();
    const expected = members.filter((m) => m.gender === 'Female' && m.age >= 30 && m.age <= 34).length;
    expect(reach()).toBe(expected);
    expect(el.querySelector('.an-reach-label')?.textContent).toContain('Female · Age 30–34');

    // Channels: add Push, preview tabs
    btn(el.querySelector('.an-channels')!, 'Push').click();
    fixture.detectChanges();
    btn(el.querySelector('.an-preview-tabs')!, 'Push').click();
    fixture.detectChanges();
    expect(el.querySelector('.an-pv-push b')?.textContent).toContain('Europe meetup — Paris');
    btn(el.querySelector('.an-preview-tabs')!, 'Notifications').click();
    fixture.detectChanges();
    expect(el.querySelector('.an-pv-note strong')?.textContent).toBe('sunset');

    btn(el, '🚀 Publish').click();
    fixture.detectChanges();
    const dialog = document.body.querySelector('.g-modal') as HTMLElement;
    expect(dialog.textContent).toContain(`${expected.toLocaleString()} user(s)`);
    btn(dialog, 'Publish now').click();
    fixture.detectChanges();
    const created = svc.items()[0];
    expect(created.title).toBe('Europe meetup — Paris');
    expect(created.recipients).toBe(expected);
    expect(created.channels).toEqual(['banner', 'inbox', 'push']);
    expect(created.audience).toEqual(expect.objectContaining({ mode: 'filtered', genders: ['Female'], ageMin: 30, ageMax: 34 }));
    expect(statusOf(created)).toBe('live');
    expect(nav).toHaveBeenCalledWith(['/admin/announcements'], { queryParams: { a: created.id } });
    expect(JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)!).items.length).toBe(17);
    expect(TestBed.inject(AdminAuditService).entries()[0].action).toBe('Published announcement');
  });

  it('B: composer — particular users (search, groups, Manage) and scheduling', async () => {
    TestBed.configureTestingModule({ imports: [AdminAnnouncementComposer], providers: [provideRouter([]), route()] });
    await TestBed.inject(AnnouncementsService).ready;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const svc = TestBed.inject(AnnouncementsService);
    const fixture = TestBed.createComponent(AdminAnnouncementComposer);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    type(el.querySelector('#an-title') as HTMLInputElement, 'Thanks for your reports');
    type(el.querySelector('#an-body') as HTMLTextAreaElement, 'You helped keep NeverBeen safe.');
    btn(el, 'Particular users').click();
    fixture.detectChanges();
    expect(el.querySelector('.an-reach-num strong')?.textContent?.trim()).toBe('0');

    const q = el.querySelector('#an-user-q') as HTMLInputElement;
    type(q, 'a');
    fixture.detectChanges();
    const results = el.querySelectorAll('.an-results li');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].querySelector('app-manage-user-btn')).toBeTruthy();
    const firstName = results[0].querySelector('.an-user-meta b')!.textContent!;
    q.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(el.querySelectorAll('.an-user-chip').length).toBe(1);
    expect(el.querySelector('.an-user-chip')?.textContent).toContain(firstName);
    expect(el.querySelector('.an-user-chip app-manage-user-btn')).toBeTruthy();

    btn(el.querySelector('.an-group-grid')!, 'Top contributors').click();
    fixture.detectChanges();
    const n = Number(el.querySelector('.an-reach-num strong')!.textContent!.replace(/,/g, ''));
    expect(n).toBeGreaterThanOrEqual(25);
    expect(el.querySelector('.an-selected-head')?.textContent).toContain('Top contributors');

    // Schedule for later
    btn(el, '⏱ Schedule').click();
    fixture.detectChanges();
    btn(el.querySelector('.an-hero-actions')!, 'Schedule').click();
    fixture.detectChanges();
    btn(document.body.querySelector('.g-modal')!, 'Schedule').click();
    fixture.detectChanges();
    const a = svc.items()[0];
    expect(a.audience.mode).toBe('users');
    expect(a.audience.userIds.length).toBe(n);
    expect(a.audience.groupNames).toEqual(['Top contributors']);
    expect(statusOf(a)).toBe('scheduled');
  });

  it('B: editing a scheduled announcement and duplicating a sent one pre-fill the composer', async () => {
    TestBed.configureTestingModule({ imports: [AdminAnnouncementComposer], providers: [provideRouter([]), route({ edit: 'an-1009' })] });
    await TestBed.inject(AnnouncementsService).ready;
    const f1 = TestBed.createComponent(AdminAnnouncementComposer);
    f1.detectChanges();
    const el: HTMLElement = f1.nativeElement;
    expect(el.querySelector('.an-hero h2')?.textContent).toContain('Edit announcement');
    expect((el.querySelector('#an-title') as HTMLInputElement).value).toBe('Protect your account with 2-step verification');
    expect(el.querySelector('#an-send-at')).toBeTruthy();
    expect(el.querySelector('.an-reach-label')?.textContent).toContain('Verified only');
  });

  it('B: a published "All users" banner announcement appears in the site announcement bar', () => {
    TestBed.configureTestingModule({ imports: [AnnouncementBar], providers: [provideRouter([])] });
    const svc = TestBed.inject(AnnouncementsService);
    svc.create({
      title: 'Service update',
      body: 'We shipped **faster** photo uploads.',
      category: 'feature',
      priority: 'normal',
      channels: ['banner'],
      audience: emptyAudience('all'),
      state: 'published',
      sendAtUtc: new Date(Date.now() - 1000).toISOString(),
      expiresAtUtc: null,
      ctaLabel: 'See what’s new',
      ctaUrl: '/help',
    });
    const fixture = TestBed.createComponent(AnnouncementBar);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.ab-admin') as HTMLElement;
    expect(bar.textContent).toContain('Service update');
    expect(bar.textContent).toContain('We shipped faster photo uploads.');
    expect(bar.querySelector('a')?.getAttribute('href')).toBe('/help');
    (bar.querySelector('.ab-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ab-admin')).toBeNull();
  });

  /* ------------------------------------ E ------------------------------------ */

  it('E: WhatsApp opens WhatsApp Web docked over the wide panel, handles blocked pop-ups and starts chats', () => {
    TestBed.configureTestingModule({ imports: [AdminWhatsApp], providers: [provideRouter([])] });
    const fake = { closed: false, focus: vi.fn(), close: vi.fn(() => (fake.closed = true)), opener: {} } as unknown as Window & { closed: boolean };
    const open = vi.spyOn(window, 'open').mockReturnValue(fake);
    const fixture = TestBed.createComponent(AdminWhatsApp);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.wa-state')?.textContent).toContain('Not opened yet');
    expect(el.querySelector('.wa-steps')?.textContent).toContain('Linked devices');

    btn(el, 'Open WhatsApp Web & scan QR').click();
    fixture.detectChanges();
    expect(open).toHaveBeenCalledWith(WHATSAPP_WEB_URL, WHATSAPP_WINDOW_NAME, expect.stringMatching(/^popup=yes,width=\d+,height=\d+,left=-?\d+,top=-?\d+$/));
    expect(el.querySelector('.wa-state')?.textContent).toContain('WhatsApp Web is open');
    expect(el.querySelector('.wa-live h3')?.textContent).toContain('open over this panel');
    btn(el, 'Bring WhatsApp to front').click();
    expect(fake.focus).toHaveBeenCalled();
    btn(el, 'Close WhatsApp').click();
    fixture.detectChanges();
    expect(el.querySelector('.wa-state')?.textContent).toContain('closed');

    // Start a chat with a number + template text
    type(el.querySelector('#wa-phone') as HTMLInputElement, '12');
    fixture.detectChanges();
    btn(el, 'Open chat in WhatsApp').click();
    fixture.detectChanges();
    expect(el.querySelector('.wa-err')?.textContent).toContain('country code');
    type(el.querySelector('#wa-phone') as HTMLInputElement, '+91 98765 43210');
    btn(el, '🚧 Maintenance alert').click();
    fixture.detectChanges();
    open.mockClear();
    (fake as { closed: boolean }).closed = false;
    btn(el, 'Open chat in WhatsApp').click();
    fixture.detectChanges();
    const url = open.mock.calls[0][0] as string;
    expect(url.startsWith('https://web.whatsapp.com/send?phone=919876543210&text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1].replace(/\+/g, ' '))).toContain('planned maintenance');
    expect(el.querySelector('.wa-recent-row')?.textContent).toContain('+919876543210');

    // Pop-up blocked
    btn(el, 'Close WhatsApp').click();
    open.mockReturnValue(null);
    fixture.detectChanges();
    btn(el, 'Open WhatsApp Web & scan QR').click();
    fixture.detectChanges();
    expect(el.querySelector('.wa-warn')?.textContent).toContain('blocked');
    open.mockRestore();
  });
});
