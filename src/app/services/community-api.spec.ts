import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityService,
  CreateAccountData,
  deleteCookie,
  getCookie,
  PROFILE_KEY,
  setCookie,
  TOKEN_KEY,
} from './community.service';
import { environment } from '../../environments/environment';
import { SEED_COUNTRIES } from '../models/community-seed';

/**
 * The sign-up path must reach the NeverBeen Web API (the ASP.NET Core `neverbeen-api`
 * service backed by the PostgreSQL / Supabase database) — these tests pin the exact
 * requests the browser sends.
 */
const API = environment.apiBaseUrl;

/** Lets the awaited HTTP chain issue its next request before we assert on it. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('CommunityService — NeverBeen Web API integration', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;

  const account: CreateAccountData = {
    name: 'Elena',
    surname: 'Rostova',
    email: 'elena.rostova@example.com',
    country: 'France',
    state: 'Île-de-France',
    city: 'Paris',
    gender: 'Female',
    dateOfBirth: '1995-06-12',
    profession: 'Freelancer',
    photoUrl: 'data:image/jpeg;base64,c2FtcGxl',
    photo: new File([new Uint8Array([1, 2, 3])], 'elena.jpg', { type: 'image/jpeg' }),
  };

  /** Answer of `GET /api/lookup/countries` (France). */
  const apiFrance = { id: 60, isoCode2: 'FR', name: 'France', phoneCode: '+33' };
  /** Answer of `GET /api/lookup/countries/60/cities` (Paris). */
  const apiParis = { id: 321, name: 'Paris' };

  /**
   * Answers the two lookup calls the sign-up path makes before it posts the member:
   * the country id and the country's city ids always come from the API's own lists.
   */
  async function flushLocationLookups(country = apiFrance, cities = [apiParis]): Promise<void> {
    httpMock.expectOne(`${API}/api/lookup/countries`).flush([country]);
    await tick();
    httpMock.expectOne(`${API}/api/lookup/countries/${country.id}/cities`).flush(cities);
    await tick();
  }

  /** Fails both lookup calls, as when the API cannot be reached from this browser. */
  async function failLocationLookups(countryId = apiFrance.id): Promise<void> {
    httpMock.expectOne(`${API}/api/lookup/countries`).error(new ProgressEvent('error'));
    await tick();
    httpMock
      .expectOne(`${API}/api/lookup/countries/${countryId}/cities`)
      .error(new ProgressEvent('error'));
    await tick();
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
    httpMock.verify();
    deleteCookie(TOKEN_KEY);
  });

  it('stores a new member through POST /api/registration and shows the stored profile', async () => {
    // The pending member the OAuth login created (JWT + "Pending" user awaiting registration).
    service.token.set('jwt.token.value');
    service.currentUser.set({
      id: 12,
      firstName: 'Elena',
      lastName: 'Rostova',
      fullName: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      status: 'Pending',
      profileComplete: false,
    });

    const pending = service.createNeverbeenAccount(account);
    await tick();

    // The ids sent with the registration are the ones the API's own lookup lists answer.
    await flushLocationLookups();

    const registration = httpMock.expectOne(`${API}/api/registration`);
    expect(registration.request.method).toBe('POST');
    expect(registration.request.headers.get('Authorization')).toBe('Bearer jwt.token.value');

    const body = registration.request.body as FormData;
    expect(body.get('fullName')).toBe('Elena Rostova');
    // First name, last name and state are stored in their own columns on the member row.
    expect(body.get('firstName')).toBe('Elena');
    expect(body.get('lastName')).toBe('Rostova');
    expect(body.get('state')).toBe('Île-de-France');
    expect(body.get('gender')).toBe('Female');
    expect(body.get('dateOfBirth')).toBe('1995-06-12');
    expect(body.get('email')).toBe('elena.rostova@example.com');
    expect(body.get('profession')).toBe('Freelancer');
    // Country / city ids come from those lists (France = 60, Paris = 321).
    expect(body.get('countryId')).toBe('60');
    expect(body.get('cityId')).toBe('321');
    expect((body.get('photo') as File).name).toBe('elena.jpg');

    registration.flush({
      id: 7,
      fullName: 'Elena Rostova',
      // A patched API answers the member's own columns back.
      firstName: 'Elena',
      lastName: 'Rostova',
      state: 'Île-de-France',
      email: 'elena.rostova@example.com',
      gender: 'Female',
      dateOfBirth: '1995-06-12T00:00:00',
      age: 31,
      countryId: 60,
      countryName: 'France',
      cityId: 321,
      cityName: 'Paris',
      pincode: null,
      contactNumber: null,
      postalAddress: null,
      aboutMe: null,
      profession: 'Freelancer',
      status: 'Active',
      profilePhotoUrl: '/api/profile/7/photo',
      externalProfilePictureUrl: null,
      createdAtUtc: '2026-10-07T00:00:00Z',
      settings: {},
      gallery: [],
      commentCount: 0,
    });

    const profile = await pending;

    expect(service.accountSaveTarget()).toBe('database');
    expect(service.accountSaveNotice()).toBeNull();
    expect(profile.id).toBe(7);
    expect(profile.fullName).toBe('Elena Rostova');
    // The stored name columns win over the split of the full name.
    expect(profile.firstName).toBe('Elena');
    expect(profile.lastName).toBe('Rostova');
    expect(profile.state).toBe('Île-de-France');
    // The member row keeps the submitted names / state in this browser too, so a reload
    // shows exactly what was stored.
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!).state).toBe('Île-de-France');
    expect(profile.cityName).toBe('Paris');
    expect(profile.status).toBe('Active');
    expect(profile.profilePhotoUrl).toBe(`${API}/api/profile/7/photo`);
    expect(service.profile()?.cityName).toBe('Paris');
    expect(service.currentUser()?.profileComplete).toBe(true);
    expect(service.apiOnline()).toBe(true);
  });

  it('exchanges the OAuth authorization code for a JWT through POST /api/auth/oauth/login', async () => {
    const pending = service.loginWithOAuth('Google', 'auth-code-123');

    httpMock.expectOne(`${API}/health`).flush('Healthy');
    await tick();

    const login = httpMock.expectOne(`${API}/api/auth/oauth/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ provider: 'Google', code: 'auth-code-123' });

    login.flush({
      token: 'jwt.new.member',
      tokenType: 'Bearer',
      expiresIn: 259200,
      isNewUser: true,
      profileComplete: false,
      message: 'New member — complete your registration.',
      user: {
        id: 12,
        fullName: 'Elena Rostova',
        email: 'elena.rostova@example.com',
        status: 'Pending',
        profileComplete: false,
        profilePhotoUrl: null,
      },
    });

    const result = await pending;

    expect(result.profileComplete).toBe(false);
    expect(result.isNewUser).toBe(true);
    expect(getCookie(TOKEN_KEY)).toBe('jwt.new.member');
    expect(service.token()).toBe('jwt.new.member');
    expect(service.currentUser()?.id).toBe(12);
    expect(service.currentUser()?.status).toBe('Pending');
  });

  it('accepts /health only when the answer really comes from the NeverBeen API', async () => {
    const pending = service.checkApiOnline(true);

    httpMock
      .expectOne(`${API}/health`)
      .flush('<html><body>Some other site</body></html>', { status: 200, statusText: 'OK' });

    await expect(pending).resolves.toBe(false);
    expect(service.apiProbeDetail()).toContain('not the NeverBeen API');
  });

  it('names the API address and the CORS setting when the browser cannot call the API', async () => {
    const pending = service.checkApiOnline(true);

    httpMock.expectOne(`${API}/health`).error(new ProgressEvent('error'));

    await expect(pending).resolves.toBe(false);
    expect(service.apiProbeDetail()).toContain(API);
    expect(service.apiProbeDetail()).toContain('Cors:AllowedOrigins');
    expect(service.apiOnline()).toBe(false);
  });

  it('reloads the signed-in member from GET /api/profile/me with the Bearer token', async () => {
    setCookie(TOKEN_KEY, 'jwt.existing.member', 30);
    service.token.set('jwt.existing.member');

    const pending = service.refreshProfileFromApi();
    await tick();

    const request = httpMock.expectOne(`${API}/api/profile/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt.existing.member');
    request.flush({
      id: 42,
      fullName: 'Marco Polo',
      email: 'marco@example.com',
      gender: 'Male',
      dateOfBirth: '1990-01-02T00:00:00',
      age: 36,
      countryId: 2,
      countryName: 'United Arab Emirates',
      cityId: 5,
      cityName: 'Dubai',
      pincode: null,
      contactNumber: null,
      postalAddress: null,
      aboutMe: 'Traveler',
      profession: 'Teacher',
      status: 'Active',
      profilePhotoUrl: null,
      externalProfilePictureUrl: null,
      createdAtUtc: '2026-01-01T00:00:00Z',
      settings: { theme: 'dark' },
      gallery: [],
      commentCount: 3,
    });

    const profile = await pending;

    expect(profile?.id).toBe(42);
    expect(service.profile()?.fullName).toBe('Marco Polo');
    expect(service.profile()?.settings.theme).toBe('dark');
  });

  it('keeps the account in this browser and names the API address when it is unreachable', async () => {
    const pending = service.createNeverbeenAccount(account);
    await tick();

    // While the API is offline the ids come from the generated seed list — the browser-only
    // flow — and the registration POST itself fails: no health probe stands in front of it.
    await failLocationLookups();
    httpMock.expectOne(`${API}/api/registration`).error(new ProgressEvent('error'));

    const profile = await pending;

    expect(profile.fullName).toBe('Elena Rostova');
    expect(service.accountSaveTarget()).toBe('local');
    expect(service.accountSaveNotice()).toContain(API);
    expect(service.accountSaveNotice()).toContain('Cors:AllowedOrigins');
    expect(service.apiOnline()).toBe(false);
  });

  it('keeps the account local and asks for a sign-in when the API has no OAuth session (401)', async () => {
    const pending = service.createNeverbeenAccount(account);
    await tick();
    await flushLocationLookups();
    httpMock
      .expectOne(`${API}/api/registration`)
      .flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const profile = await pending;

    expect(profile.fullName).toBe('Elena Rostova');
    expect(service.accountSaveTarget()).toBe('local');
    expect(service.accountSaveNotice()).toContain('Sign in with Google or Facebook');
  });

  it('surfaces a rejected registration instead of pretending the member was stored', async () => {
    service.token.set('jwt.token.value');

    const pending = service.createNeverbeenAccount(account);
    await tick();
    await flushLocationLookups();
    httpMock
      .expectOne(`${API}/api/registration`)
      .flush(
        { error: 'The email address is already registered to another community member.' },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(pending).rejects.toThrow(/already registered/);
    expect(service.accountSaveTarget()).toBeNull();
    expect(service.profile()).toBeNull();
  });

  it('sends the database’s country/city ids, never the generated seed ids', async () => {
    // The live database was seeded from neverbeen-database/seed.sql, which numbers its
    // countries India = 1 … Malaysia = 10, while the generated community-seed.ts list
    // numbers India = 81 and Kolkata = 443. The seed ids do not exist in that database, so
    // the API answered "The selected city does not belong to the selected country."
    const seedIndia = SEED_COUNTRIES.find((c) => c.name === 'India')!;
    const seedKolkata = seedIndia.cities.find((c) => c.name === 'Kolkata')!;
    expect(seedIndia.id).not.toBe(1);
    expect(seedKolkata.id).not.toBe(1);

    service.token.set('jwt.india.member');
    const pending = service.createNeverbeenAccount({
      ...account,
      country: 'India',
      state: 'West Bengal',
      city: 'Kolkata',
    });
    await tick();

    await flushLocationLookups({ id: 1, isoCode2: 'IN', name: 'India', phoneCode: '+91' }, [
      { id: 1, name: 'Kolkata' },
      { id: 2, name: 'Mumbai' },
      { id: 3, name: 'Delhi' },
    ]);

    const registration = httpMock.expectOne(`${API}/api/registration`);
    const body = registration.request.body as FormData;
    // Kolkata = city 1 of country 1 — the pair the API can verify.
    expect(body.get('countryId')).toBe('1');
    expect(body.get('cityId')).toBe('1');
    expect(body.get('countryId')).not.toBe(String(seedIndia.id));
    expect(body.get('cityId')).not.toBe(String(seedKolkata.id));

    registration.flush({
      id: 8,
      fullName: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      gender: 'Female',
      dateOfBirth: '1995-06-12T00:00:00',
      age: 31,
      countryId: 1,
      countryName: 'India',
      cityId: 1,
      cityName: 'Kolkata',
      pincode: null,
      contactNumber: null,
      postalAddress: null,
      aboutMe: null,
      profession: 'Freelancer',
      status: 'Active',
      profilePhotoUrl: '/api/profile/8/photo',
      externalProfilePictureUrl: null,
      createdAtUtc: '2026-10-07T00:00:00Z',
      settings: {},
      gallery: [],
      commentCount: 0,
    });

    const profile = await pending;
    expect(service.accountSaveTarget()).toBe('database');
    expect(profile.cityName).toBe('Kolkata');
  });

  it('refuses to post a city the database does not store for that country', async () => {
    service.token.set('jwt.token.value');

    // The database knows India, but not Kolkata — posting either id would make the API
    // answer "The selected city does not belong to the selected country."
    const pending = service.createNeverbeenAccount({
      ...account,
      country: 'India',
      state: 'West Bengal',
      city: 'Kolkata',
    });
    // Watch the rejection from the start so the failing promise is never left unhandled.
    const rejection = expect(pending).rejects.toThrow(/does not know Kolkata in India/);

    await tick();
    await flushLocationLookups({ id: 1, isoCode2: 'IN', name: 'India', phoneCode: '+91' }, [
      { id: 3, name: 'Delhi' },
    ]);

    // No POST is sent at all (httpMock.verify() in afterEach proves nothing is left over).
    await rejection;
    expect(service.accountSaveTarget()).toBeNull();
  });
});

/**
 * Member directory (Requirement A): the community search box must find ANY
 * registered traveler on the Web API — not only the companions this member
 * already has — and a profile URL must open that traveler's real profile, so
 * a companion request can be sent and the traveler followed from there.
 */
describe('CommunityService — member directory (search & public profiles)', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;

  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Signs a make-believe member in (no community hydration is triggered). */
  function signIn(): void {
    service.token.set('jwt.member.7');
    service.currentUser.set({
      id: 7,
      firstName: 'Kingshuk',
      lastName: 'Banu',
      fullName: 'Kingshuk Banu',
      email: 'kingshuk@example.com',
      status: 'Active',
      profileComplete: true,
    });
  }

  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommunityService);
    httpMock = TestBed.inject(HttpTestingController);
    signIn();
  });

  afterEach(() => {
    httpMock.verify();
    deleteCookie(TOKEN_KEY);
  });

  it('searchUsers asks GET /api/users/search and merges the hits into the directory', async () => {
    const pending = service.searchUsers('elen');

    const request = httpMock.expectOne(`${API}/api/users/search?query=elen&limit=25`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt.member.7');
    request.flush([
      {
        id: 21,
        uniqueId: '89201534010000000021',
        fullName: 'Elena Rostova',
        profilePhotoUrl: '/api/profile/21/photo',
        country: 'France',
        city: 'Paris',
        profession: 'Travel Blogger',
        isOnline: true,
        activeStatus: 'Active',
        isVerified: true,
        isProfileLocked: false,
        status: 'none',
        isFollowing: true,
        mutualCompanionsCount: 2,
      },
    ]);

    const hits = await pending;

    expect(hits.length).toBe(1);
    expect(hits[0].fullName).toBe('Elena Rostova');
    expect(hits[0].profilePhotoUrl).toBe(`${API}/api/profile/21/photo`);
    // The hit is now part of the local directory (status buttons + profile URL work).
    expect(service.companions().some((c) => c.id === 21)).toBe(true);
    // The directory's follow flag seeds the local follow graph (Follow button state).
    expect(service.isFollowing(21)).toBe(true);
  });

  it('searchUsers falls back to the local directory when the API cannot be reached', async () => {
    service.companions.set([
      {
        id: 5,
        fullName: 'Marco Rossi',
        profilePhotoUrl: '',
        country: 'Italy',
        city: 'Rome',
        profession: 'Architect',
        isOnline: false,
        mutualCompanionsCount: 0,
        status: 'none',
      },
    ]);

    const pending = service.searchUsers('marco');
    httpMock
      .expectOne(`${API}/api/users/search?query=marco&limit=25`)
      .error(new ProgressEvent('error'));

    const hits = await pending;
    expect(hits.map((h) => h.fullName)).toEqual(['Marco Rossi']);
    expect(service.apiOnline()).toBe(false);
  });

  it('loadUserByUid resolves a 20-digit profile URL id on GET /api/users/uid/{uid}', async () => {
    const uid = '89201534010000000033';
    const pending = service.loadUserByUid(uid);

    const request = httpMock.expectOne(`${API}/api/users/uid/${uid}`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt.member.7');
    request.flush({
      id: 33,
      uniqueId: uid,
      fullName: 'Maya Patel',
      profilePhotoUrl: '/api/profile/33/photo',
      coverPhotoUrl: '/api/profile/33/cover',
      country: 'India',
      city: 'Mumbai',
      profession: 'UI/UX Designer',
      isOnline: true,
      mutualCompanionsCount: 1,
      status: 'pending_incoming',
      bio: 'Minimalist traveler.',
      aboutMe: 'Minimalist traveler.',
      aboutMeDetailsJson: '{"intro":"Minimalist traveler."}',
      isProfileLocked: true,
      activeStatus: 'Active',
      isVerified: true,
      isFollowing: false,
      connectedCompanionIds: [21],
    });

    const companion = await pending;

    expect(companion?.id).toBe(33);
    expect(companion?.uniqueId).toBe(uid);
    expect(companion?.status).toBe('pending_incoming');
    expect(companion?.isProfileLocked).toBe(true);
    expect(companion?.aboutMeDetails?.intro).toBe('Minimalist traveler.');
    // Upserted, so the profile page resolves /profile?id=<uid> from companions().
    expect(
      service.companions().some((c) => c.uniqueId === uid && c.id === 33),
    ).toBe(true);
  });

  it('loadUserByUid answers a locally known companion without calling the API', async () => {
    service.companions.set([
      {
        id: 12,
        uniqueId: '89201534010000000012',
        fullName: 'Marco Rossi',
        profilePhotoUrl: '',
        country: 'Italy',
        city: 'Rome',
        profession: 'Architect',
        isOnline: false,
        mutualCompanionsCount: 0,
        status: 'connected',
      },
    ]);

    const companion = await service.loadUserByUid('89201534010000000012');
    expect(companion?.fullName).toBe('Marco Rossi');
    // httpMock.verify() proves no request went out.
  });

  it('loadVisitorExtras reads the visitor wall, gallery and follow counters', async () => {
    service.companions.set([
      {
        id: 21,
        uniqueId: '89201534010000000021',
        fullName: 'Elena Rostova',
        profilePhotoUrl: '',
        country: 'France',
        city: 'Paris',
        profession: 'Travel Blogger',
        isOnline: true,
        mutualCompanionsCount: 0,
        status: 'connected',
      },
    ]);

    const pending = service.loadVisitorExtras(21);

    httpMock.expectOne(`${API}/api/journey?authorId=21&pageSize=50`).flush({
      items: [
        {
          id: 900,
          author: { id: 21, fullName: 'Elena Rostova', profilePhotoUrl: null },
          text: 'Lake Como mornings.',
          createdAtUtc: '2026-10-01T09:00:00Z',
          likeCount: 3,
          comments: [],
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    httpMock.expectOne(`${API}/api/gallery/users/21`).flush([
      { id: 77, url: '/api/gallery/77', caption: 'Alpine light', createdAtUtc: '2026-09-30T10:00:00Z' },
    ]);
    httpMock.expectOne(`${API}/api/follows/counts/21`).flush({
      followers: 12,
      following: 4,
      isFollowing: true,
    });

    await pending;

    const wall = service.visitorWallPosts()['21'];
    expect(wall?.length).toBe(1);
    expect(wall?.[0].text).toBe('Lake Como mornings.');

    // The gallery lands on the companion entry the visitor card renders.
    const gallery = service.companions().find((c) => c.id === 21)?.gallery;
    expect(gallery?.[0].url).toBe(`${API}/api/gallery/77`);

    // The profile page's follower / following counters read the API answer.
    expect(service.followerCount(21)).toBe(12);
    expect(service.followingCount(21)).toBe(4);
  });

  it('stores journey comment reactions through POST /api/journey/comments/{id}/reactions', async () => {
    service.journeyPosts.set([
      {
        id: 50,
        author: { id: 7, fullName: 'Kingshuk Banu', profilePhotoUrl: '' },
        text: 'Post',
        createdAtUtc: '2026-10-01T09:00:00Z',
        likeCount: 0,
        comments: [
          {
            id: 61,
            author: { id: 21, fullName: 'Elena Rostova', profilePhotoUrl: '' },
            text: 'Lovely.',
            createdAtUtc: '2026-10-01T09:05:00Z',
            likeCount: 0,
            isLiked: false,
            reactions: [],
            replies: [],
          },
        ],
      },
    ]);

    service.reactToJourneyComment(50, 61, 'Heart');

    const request = httpMock.expectOne(`${API}/api/journey/comments/61/reactions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reactionType: 'Heart' });
    request.flush({ likeCount: 4 });
    await tick();

    const comment = service.journeyPosts().find((p) => p.id === 50)?.comments[0];
    expect(comment?.likeCount).toBe(4);
    expect(comment?.myReaction).toBe('Heart');
  });

  it('sends a companion request to a directory hit and follows them by default', async () => {
    // A traveler found through the directory (already upserted by searchUsers).
    service.companions.set([
      {
        id: 21,
        uniqueId: '89201534010000000021',
        fullName: 'Elena Rostova',
        profilePhotoUrl: '',
        country: 'France',
        city: 'Paris',
        profession: 'Travel Blogger',
        isOnline: true,
        mutualCompanionsCount: 0,
        status: 'none',
      },
    ]);

    service.sendCompanionshipRequest(21);

    const request = httpMock.expectOne(`${API}/api/companions/21/request`);
    expect(request.request.method).toBe('POST');
    expect(service.companions().find((c) => c.id === 21)?.status).toBe('pending_outgoing');

    // Sending a companionship request follows that traveler by default.
    const follow = httpMock.expectOne(`${API}/api/follows/21`);
    expect(follow.request.method).toBe('POST');
    expect(service.isFollowing(21)).toBe(true);
  });
});
