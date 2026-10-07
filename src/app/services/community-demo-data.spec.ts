import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDemoAccount } from './community-demo.testing';
import {
  COMMENTS_KEY,
  COMPANIONS_KEY,
  CommunityService,
  CIRCLES_KEY,
  DEMO_COMMUNITY_KEY,
  GUEST_KEY,
  JOURNEY_KEY,
  NOTIFS_KEY,
  PENDING_CHATS_KEY,
  PROFILE_KEY,
  TOKEN_KEY,
  USER_KEY,
  deleteCookie,
  setCookie,
} from './community.service';

/**
 * The seeded community (the founder's sample profile, demo travellers, circles, Journey
 * feed, Message Book, chats, notifications) is the "Explore as Guest" tour. These tests
 * pin the rule from the product request: a member who signed in — with Google, Facebook or
 * by restoring the auth cookie — is never shown any of it, while the guest tour keeps the
 * whole seeded community.
 */
describe('CommunityService — demo data is confined to “Explore as Guest”', () => {
  function inject(): CommunityService {
    TestBed.configureTestingModule({ providers: [CommunityService] });
    return TestBed.inject(CommunityService);
  }

  function demoDataIsEmpty(service: CommunityService): boolean {
    return (
      service.comments().length === 0 &&
      service.journeyPosts().length === 0 &&
      service.companions().length === 0 &&
      service.circles().length === 0 &&
      service.notifications().length === 0 &&
      service.pendingChats().length === 0
    );
  }

  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
  });

  it('shows the seeded community only for a visitor who explores as guest', () => {
    const service = inject();
    // A plain signed-out visitor is not on the tour: the community starts empty.
    expect(demoDataIsEmpty(service)).toBe(true);
    expect(service.profile()).toBeNull();

    service.exploreAsGuest();

    // The guest tour opens all of it without an account session.
    expect(service.guestBrowsing()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.profile()?.fullName).toBe('Kingshuk');
    expect(service.companions().length).toBeGreaterThan(100);
    expect(service.journeyPosts().length).toBeGreaterThan(0);
    expect(service.circles().length).toBeGreaterThan(0);
    expect(service.comments().length).toBeGreaterThan(0);
    expect(service.notifications().length).toBeGreaterThan(0);
  });

  it('drops every demo dataset the moment a real member signs in', async () => {
    const service = inject();
    service.exploreAsGuest();
    expect(service.guestBrowsing()).toBe(true);
    expect(demoDataIsEmpty(service)).toBe(false);

    // A real Google sign-in (no Web API configured in this test → the identity is kept,
    // the account is pending registration). The demo community must end here.
    await service.loginWithOAuth('Google', 'mock_code_1');

    expect(service.guestBrowsing()).toBe(false);
    expect(service.profile()).toBeNull();
    expect(demoDataIsEmpty(service)).toBe(true);
    // …and it is gone from this browser as well, so a reload cannot bring it back.
    expect(localStorage.getItem(COMMENTS_KEY)).toBeNull();
    expect(localStorage.getItem(JOURNEY_KEY)).toBeNull();
    expect(localStorage.getItem(COMPANIONS_KEY)).toBeNull();
    expect(localStorage.getItem(CIRCLES_KEY)).toBeNull();
    expect(localStorage.getItem(NOTIFS_KEY)).toBeNull();
    expect(localStorage.getItem(PENDING_CHATS_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_COMMUNITY_KEY)).toBeNull();
  });

  it('opened with a real auth cookie: no demo data, and the seeded profile is discarded', () => {
    // The demo datasets and the seeded founder profile, written by an earlier visit
    // (the guest tour itself keeps its profile in memory only).
    const demo = inject();
    openDemoAccount(demo, 'active_member');
    const seededProfile = JSON.parse(localStorage.getItem(PROFILE_KEY)!);
    expect(seededProfile.fullName).toBe('Kingshuk');

    // The member comes back with their auth cookie: a fresh page load (fresh service).
    setCookie(TOKEN_KEY, 'jwt.a-real-member-token', 1);
    localStorage.removeItem(GUEST_KEY);
    TestBed.resetTestingModule();
    const member = inject();

    expect(member.guestBrowsing()).toBe(false);
    expect(member.token()).toBe('jwt.a-real-member-token');
    // The seeded founder profile is not adopted as the member's own: without a stored
    // profile of their own the Web API (`GET /api/profile/me`) is the only source.
    expect(member.profile()).toBeNull();
    expect(member.currentUser()).toBeNull();
    expect(demoDataIsEmpty(member)).toBe(true);
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(localStorage.getItem(COMPANIONS_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_COMMUNITY_KEY)).toBeNull();
  });

  it('keeps a member’s own stored profile and leaves the demo profile out of the session', () => {
    const own = {
      id: 7,
      firstName: 'Elena',
      lastName: 'Rostova',
      fullName: 'Elena Rostova',
      email: 'elena.rostova@gmail.com',
      status: 'Active',
      state: 'Île-de-France',
      city: 'Paris',
      country: 'France',
      gallery: [],
      commentCount: 0,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(own));
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: 7,
        firstName: 'Elena',
        lastName: 'Rostova',
        fullName: 'Elena Rostova',
        email: 'elena.rostova@gmail.com',
        status: 'Active',
        profileComplete: true,
      }),
    );
    setCookie(TOKEN_KEY, 'jwt.a-real-member-token', 1);

    const member = inject();

    expect(member.isAuthenticated()).toBe(true);
    expect(member.profile()?.fullName).toBe('Elena Rostova');
    expect(member.profile()?.state).toBe('Île-de-France');
    expect(member.currentUser()?.email).toBe('elena.rostova@gmail.com');
    expect(demoDataIsEmpty(member)).toBe(true);
  });
});
