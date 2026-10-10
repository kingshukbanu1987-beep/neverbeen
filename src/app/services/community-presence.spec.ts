import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommunityService, deleteCookie, setCookie, TOKEN_KEY } from './community.service';
import {
  chosenPresence,
  effectivePresence,
  lastSeenAgo,
  PRESENCE_AWAY_AFTER_MS,
  PresenceActivity,
  presenceText,
} from './community-presence';
import type { Companion, CurrentUser } from '../models/community';
import { environment } from '../../environments/environment';

const API = environment.apiBaseUrl;
const MINUTE = 60_000;
const NOW = Date.parse('2026-10-10T12:00:00.000Z');
const minutesBefore = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();
/** Relative to the real clock, for the service, which reads `Date.now()`. */
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

/** Lets the awaited HTTP chain issue its next request before we assert on it. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('community presence rules', () => {
  it('keeps a member Active while they used the community in the last 15 minutes', () => {
    expect(effectivePresence('Active', minutesBefore(5), NOW)).toEqual({
      status: 'Active',
      lastSeenUtc: minutesBefore(5),
    });
    expect(effectivePresence('Active', minutesBefore(14), NOW).status).toBe('Active');
  });

  it('shows Away once the member has not used the community for more than 15 minutes', () => {
    const seen = new Date(NOW - PRESENCE_AWAY_AFTER_MS - 1000).toISOString();
    expect(effectivePresence('Active', seen, NOW)).toEqual({ status: 'Away', lastSeenUtc: seen });
    expect(effectivePresence('Active', minutesBefore(16), NOW).status).toBe('Away');
  });

  it('makes Busy, Don’t Disturb and Custom Away too when the member is idle', () => {
    expect(effectivePresence('Busy', minutesBefore(30), NOW).status).toBe('Away');
    expect(effectivePresence("Don't Disturb", minutesBefore(30), NOW).status).toBe('Away');
    expect(effectivePresence('Custom', minutesBefore(30), NOW).status).toBe('Away');
  });

  it('never overrides Inactive (set by signing out), even when the member was just seen', () => {
    expect(effectivePresence('Inactive', minutesBefore(1), NOW)).toEqual({
      status: 'Inactive',
      lastSeenUtc: minutesBefore(1),
    });
    expect(effectivePresence('Inactive', minutesBefore(600), NOW).status).toBe('Inactive');
  });

  it('keeps Away as Away and keeps the status when no last-seen time is known', () => {
    expect(effectivePresence('Away', minutesBefore(1), NOW).status).toBe('Away');
    expect(effectivePresence('Busy', null, NOW)).toEqual({ status: 'Busy', lastSeenUtc: null });
    expect(effectivePresence(undefined, null, NOW).status).toBe('Active');
  });

  it('reads a stored Away (no longer a choice) as Active for the member’s own status', () => {
    expect(chosenPresence('Away')).toBe('Active');
    expect(chosenPresence(undefined)).toBe('Active');
    expect(chosenPresence('Busy')).toBe('Busy');
    expect(chosenPresence('something else')).toBe('Active');
  });

  it('says when the member was last seen beside Away and Inactive only', () => {
    expect(presenceText('Away', null, minutesBefore(12), NOW)).toEqual({
      label: 'Away · last seen 12 min ago',
      lastSeenLabel: '12 min ago',
    });
    expect(presenceText('Inactive', null, minutesBefore(180), NOW)).toEqual({
      label: 'Inactive · last seen 3 h ago',
      lastSeenLabel: '3 h ago',
    });
    expect(presenceText('Away', null, null, NOW)).toEqual({
      label: 'Away · last seen recently',
      lastSeenLabel: 'recently',
    });
    expect(presenceText('Active', null, minutesBefore(2), NOW)).toEqual({ label: 'Active', lastSeenLabel: null });
    expect(presenceText('Custom', 'Gone fishing', null, NOW).label).toBe('Gone fishing');
  });

  it('words the elapsed time for minutes, hours, days and older dates', () => {
    expect(lastSeenAgo(new Date(NOW - 20_000).toISOString(), NOW)).toBe('just now');
    expect(lastSeenAgo(minutesBefore(1), NOW)).toBe('1 min ago');
    expect(lastSeenAgo(minutesBefore(59), NOW)).toBe('59 min ago');
    expect(lastSeenAgo(minutesBefore(60 * 5), NOW)).toBe('5 h ago');
    expect(lastSeenAgo(minutesBefore(60 * 24 + 5), NOW)).toBe('yesterday');
    expect(lastSeenAgo(minutesBefore(60 * 24 * 3), NOW)).toBe('3 days ago');
    expect(lastSeenAgo(minutesBefore(60 * 24 * 30), NOW)).toMatch(/\d+ \w+/);
    expect(lastSeenAgo(null, NOW)).toBeNull();
  });
});

describe('PresenceActivity', () => {
  it('counts the member as using the community while the page is visible, focused and recently used', () => {
    const activity = new PresenceActivity(NOW);
    expect(activity.isUsing(NOW + 14 * MINUTE)).toBe(true);
    expect(activity.isUsing(NOW + 16 * MINUTE)).toBe(false);
  });

  it('is not using the community when the tab is hidden or the window lost focus', () => {
    const activity = new PresenceActivity(NOW);
    activity.setVisible(false);
    expect(activity.isUsing(NOW)).toBe(false);
    activity.setVisible(true);
    activity.setFocused(false);
    expect(activity.isUsing(NOW)).toBe(false);
  });

  it('is using again as soon as the member gives input', () => {
    const activity = new PresenceActivity(NOW);
    activity.setFocused(false);
    activity.noteInput(NOW + 3 * MINUTE);
    expect(activity.isUsing(NOW + 3 * MINUTE)).toBe(true);
    expect(activity.lastActivityAt(NOW + 4 * MINUTE)).toBe(NOW + 3 * MINUTE);
  });

  it('never reports a last activity later than now', () => {
    const activity = new PresenceActivity(NOW);
    expect(activity.lastActivityAt(NOW - MINUTE)).toBe(NOW - MINUTE);
  });
});

describe('CommunityService — presence', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;

  const member = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
    id: 9,
    email: 'ananya@example.com',
    fullName: 'Ananya Iyer',
    status: 'Active',
    profileComplete: true,
    activeStatus: 'Active',
    ...overrides,
  });

  /** A signed-in member session, as the browser has it after a real sign-in. */
  function signInAsMember(user: CurrentUser): void {
    setCookie(TOKEN_KEY, 'jwt.member.9', 30);
    service.token.set('jwt.member.9');
    service.currentUser.set(user);
  }

  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommunityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    (service as unknown as { stopLiveUpdates(): void }).stopLiveUpdates();
    httpMock.verify();
    deleteCookie(TOKEN_KEY);
  });

  it('makes the member Inactive on the Web API when they log out, whatever status they had', async () => {
    signInAsMember(member({ activeStatus: 'Busy' }));

    service.logout();
    await tick();

    const request = httpMock.expectOne(`${API}/api/presence/sign-out`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt.member.9');
    request.flush({ activeStatus: 'Inactive', lastSeenUtc: new Date().toISOString() });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('does not call the Web API when a guest logs out', () => {
    service.logout();
    httpMock.expectNone(`${API}/api/presence/sign-out`);
  });

  it('marks the member as here as soon as the page is in use, and reports it on their first input', async () => {
    signInAsMember(member({ lastSeenUtc: minutesAgo(40) }));
    const presence = (service as unknown as { startPresence(): void });
    presence.startPresence();

    // This browser knows at once: the member is not Away just because the page reloaded.
    expect(service.presenceFor(9).status).toBe('Active');
    httpMock.expectNone(`${API}/api/presence/heartbeat`);

    window.dispatchEvent(new Event('pointerdown'));
    await tick();

    const beat = httpMock.expectOne(`${API}/api/presence/heartbeat`);
    expect(beat.request.method).toBe('POST');
    expect(beat.request.headers.get('Authorization')).toBe('Bearer jwt.member.9');
    const body = beat.request.body as { lastActivityUtc: string };
    expect(Math.abs(Date.parse(body.lastActivityUtc) - Date.now())).toBeLessThan(5_000);
    beat.flush({});
    expect(service.currentUser()?.lastSeenUtc).toBe(body.lastActivityUtc);
  });

  it('shows another traveler who has been idle for over 15 minutes as Away, with last seen', () => {
    const companion = {
      id: 42,
      fullName: 'Chloe Dupont',
      profilePhotoUrl: '',
      country: 'France',
      city: 'Nice',
      profession: 'Photographer',
      isOnline: true,
      activeStatus: 'Active',
      lastSeenUtc: minutesAgo(20),
      mutualCompanionsCount: 0,
      status: 'connected',
      isProfileLocked: false,
    } as unknown as Companion;
    service.companions.set([companion]);

    const presence = service.presenceFor(42);

    expect(presence.status).toBe('Away');
    expect(presence.label).toBe('Away · last seen 20 min ago');
    expect(presence.lastSeenLabel).toBe('20 min ago');
  });

  it('shows the member’s own chosen status again once they are using the community', () => {
    signInAsMember(member({ activeStatus: 'Busy', lastSeenUtc: minutesAgo(20) }));
    expect(service.presenceFor(9).status).toBe('Away');

    service.currentUser.update((u) => (u ? { ...u, lastSeenUtc: new Date().toISOString() } : u));

    expect(service.presenceFor(9).status).toBe('Busy');
    expect(service.presenceFor(9).lastSeenLabel).toBeNull();
  });

  it('uses the author’s presence from a post, not only the companion list', () => {
    const presence = service.presenceFor(77, {
      activeStatus: 'Inactive',
      lastSeenUtc: minutesAgo(180),
    });
    expect(presence.label).toBe('Inactive · last seen 3 h ago');
  });

  /** A connected companion with the given status, as the Web API hands it over. */
  const connected = (
    id: number,
    activeStatus: string,
    overrides: Partial<Companion> = {},
  ): Companion =>
    ({
      id,
      fullName: `Traveler ${id}`,
      profilePhotoUrl: '',
      country: 'India',
      city: 'Kolkata',
      profession: 'Traveler',
      isOnline: activeStatus !== 'Inactive',
      activeStatus,
      lastSeenUtc: minutesAgo(2),
      mutualCompanionsCount: 0,
      status: 'connected',
      isProfileLocked: false,
      ...overrides,
    }) as unknown as Companion;

  it('keeps Active, Busy, Don’t Disturb, Away and Custom companions in Online Now', () => {
    service.companions.set([
      connected(11, 'Active'),
      connected(12, 'Busy'),
      connected(13, "Don't Disturb"),
      connected(14, 'Away', { lastSeenUtc: minutesAgo(40) }),
      connected(15, 'Custom', { customStatusText: 'In Ladakh' }),
    ]);

    expect(service.onlineCompanions().map((c) => c.id)).toEqual([11, 12, 13, 14, 15]);
    expect(service.offlineCompanions()).toEqual([]);
  });

  it('moves a companion to Offline Companions when their status becomes Inactive', () => {
    service.companions.set([connected(11, 'Busy'), connected(12, 'Inactive')]);

    expect(service.onlineCompanions().map((c) => c.id)).toEqual([11]);
    expect(service.offlineCompanions().map((c) => c.id)).toEqual([12]);
    expect(service.presenceFor(12).label).toBe('Inactive · last seen 2 min ago');

    // The same companion choosing Active again puts them straight back in Online Now.
    service.companions.set([
      connected(11, 'Busy'),
      connected(12, 'Active'),
    ]);

    expect(service.onlineCompanions().map((c) => c.id)).toEqual([11, 12]);
    expect(service.offlineCompanions()).toEqual([]);
  });

  it('counts a companion with no recorded status as online, and one the API reports offline as Inactive', () => {
    service.companions.set([
      connected(11, 'Active', { activeStatus: undefined }),
      connected(12, 'Active', { activeStatus: undefined, isOnline: false }),
    ]);

    expect(service.onlineCompanions().map((c) => c.id)).toEqual([11]);
    expect(service.offlineCompanions().map((c) => c.id)).toEqual([12]);
  });

  it('signing in starts the member as Active', async () => {
    const pending = service.loginWithOAuth('Google', 'auth-code-123');
    httpMock.expectOne(`${API}/health`).flush('Healthy');
    await tick();
    httpMock.expectOne(`${API}/api/auth/oauth/login`).flush({
      token: 'jwt.member.9',
      tokenType: 'Bearer',
      expiresIn: 259200,
      isNewUser: false,
      profileComplete: false,
      message: 'Signed in.',
      user: {
        id: 9,
        fullName: 'Ananya Iyer',
        email: 'ananya@example.com',
        status: 'Active',
        profileComplete: false,
        profilePhotoUrl: null,
      },
    });
    await pending;
    await tick();
    const device = httpMock.expectOne(`${API}/api/devices`);
    device.flush({ ...device.request.body, lastSeenUtc: new Date().toISOString(), isActive: true, blocked: false });

    expect(service.currentUser()?.activeStatus).toBe('Active');
    expect(service.currentUser()?.customStatusText).toBe('');
    expect(service.currentUser()?.lastSeenUtc).toBeDefined();
    expect(service.presenceFor(9).status).toBe('Active');
  });
});
