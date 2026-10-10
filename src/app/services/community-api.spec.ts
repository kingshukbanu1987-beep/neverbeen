import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityService,
  CreateAccountData,
  DEVICE_ID_KEY_PREFIX,
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
    await tick();

    const device = httpMock.expectOne(`${API}/api/devices`);
    expect(device.request.method).toBe('POST');
    expect(device.request.body).toMatchObject({
      id: expect.any(String),
      type: expect.any(String),
      os: expect.any(String),
      browser: expect.any(String),
      isCurrent: true,
    });
    device.flush({
      ...device.request.body,
      lastSeenUtc: new Date().toISOString(),
      isActive: true,
      blocked: false,
      ipAddress: '',
      macAddress: '',
      location: '',
    });

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

  it('the local directory search includes the signed-in member themself', () => {
    // The Web API's directory search never returns the member themself, so the
    // website's local directory must resolve them: typing your own name finds
    // your own profile instead of "No travelers or circles match".
    const hits = service.searchCompanionsLocally('kingshuk');
    const me = hits.find((h) => Number(h.id) === 7);
    expect(me).toBeTruthy();
    expect(me!.fullName).toBe('Kingshuk Banu');
    // A last-name / city / profession query finds the member as well.
    expect(service.searchCompanionsLocally('banu').some((h) => Number(h.id) === 7)).toBe(true);
    expect(service.searchCompanionsLocally('kolkata').some((h) => Number(h.id) === 7)).toBe(true);
    // …and the member is never duplicated when already in the directory.
    expect(hits.filter((h) => Number(h.id) === 7).length).toBe(1);
  });

  it('searchUsers falls back to the local directory — with the member themself — when the API is down', async () => {
    const pending = service.searchUsers('kingshuk');
    httpMock
      .expectOne(`${API}/api/users/search?query=kingshuk&limit=25`)
      .error(new ProgressEvent('error'));

    const hits = await pending;
    expect(hits.some((h) => Number(h.id) === 7 && h.fullName === 'Kingshuk Banu')).toBe(true);
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

  it('getCurrentUserAsCompanion uses the signed-in member’s own id for uniqueId instead of 1', () => {
    const me = service.getCurrentUserAsCompanion();
    expect(me.id).toBe(7);
    expect(me.uniqueId).toBe('89201534010000000007');
  });

  it('loadUserByUid falls back to GET /api/companions/{id} when GET /api/users/uid/{uid} answers 404', async () => {
    const uid = '89201534010000000021';
    const pending = service.loadUserByUid(uid);

    httpMock
      .expectOne(`${API}/api/users/uid/${uid}`)
      .flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    await tick();

    const fallback = httpMock.expectOne(`${API}/api/companions/21`);
    fallback.flush({
      id: 21,
      uniqueId: uid,
      fullName: 'Elena Rostova',
      profilePhotoUrl: '/api/profile/21/photo',
      country: 'France',
      city: 'Paris',
      profession: 'Travel Blogger',
      isOnline: true,
      mutualCompanionsCount: 0,
      status: 'none',
    });

    const companion = await pending;
    expect(companion?.id).toBe(21);
    expect(companion?.fullName).toBe('Elena Rostova');
    expect(service.companions().some((c) => c.id === 21)).toBe(true);
  });

  it('searchUsers falls back to probing GET /api/companions/{id} when GET /api/users/search answers 404', async () => {
    const pending = service.searchUsers('elena');

    httpMock
      .expectOne(`${API}/api/users/search?query=elena&limit=25`)
      .flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    await tick();

    // First batch of 5 companion probes (ids 1..5).
    for (const id of [1, 2, 3, 4, 5]) {
      const req = httpMock.expectOne(`${API}/api/companions/${id}`);
      if (id === 2) {
        req.flush({
          id: 2,
          uniqueId: '89201534010000000002',
          fullName: 'Elena Rostova',
          profilePhotoUrl: '/api/profile/2/photo',
          country: 'France',
          city: 'Paris',
          profession: 'Travel Blogger',
          isOnline: true,
          mutualCompanionsCount: 0,
          status: 'none',
        });
      } else {
        req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
      }
    }
    await tick();

    // Next two batches miss (consecutiveMisses reaches 10) and discovery stops.
    for (const id of [6, 8, 9, 10, 11]) {
      httpMock
        .expectOne(`${API}/api/companions/${id}`)
        .flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    }
    await tick();
    for (const id of [12, 13, 14, 15, 16]) {
      httpMock
        .expectOne(`${API}/api/companions/${id}`)
        .flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    }

    const hits = await pending;
    expect(hits.some((h) => h.id === 2 && h.fullName === 'Elena Rostova')).toBe(true);
  });

  it('hydrates post comments from GET /api/journey/{id}/comments and preserves comments on newly created posts', async () => {
    // 1. Creating a post and commenting on it before POST /api/journey resolves:
    const created = service.createJourneyPost('Evening in Kyoto');
    expect(created).toBeTruthy();

    service.addJourneyComment(created!.id, 'First comment right away!');
    expect(service.journeyPosts()[0].comments.length).toBe(1);

    const postReq = httpMock.expectOne(`${API}/api/journey`);
    postReq.flush({
      id: 501,
      author: { id: 7, fullName: 'Kingshuk Banu' },
      text: 'Evening in Kyoto',
      createdAtUtc: '2026-10-08T08:00:00Z',
      likeCount: 0,
      commentCount: 0,
      comments: [],
    });
    await tick();
    await tick();

    // Comment is preserved on the stored post and sent to POST /api/journey/501/comments!
    expect(service.journeyPosts()[0].id).toBe(501);
    expect(service.journeyPosts()[0].comments.length).toBe(1);

    const commentReq = httpMock.expectOne(`${API}/api/journey/501/comments`);
    expect(commentReq.request.method).toBe('POST');
    expect(commentReq.request.body).toEqual({
      text: 'First comment right away!',
      parentId: undefined,
      imageUrl: undefined,
    });
    commentReq.flush({
      id: 901,
      postId: 501,
      author: { id: 7, fullName: 'Kingshuk Banu' },
      text: 'First comment right away!',
      createdAtUtc: '2026-10-08T08:01:00Z',
      likeCount: 0,
      isLiked: false,
      reactions: [],
      replies: [],
    });
    await tick();

    expect(service.journeyPosts()[0].comments[0].id).toBe(901);
    expect(service.journeyPosts()[0].comments[0].text).toBe('First comment right away!');

    // 2. Loading comments explicitly from GET /api/journey/{id}/comments:
    const loadPromise = service.loadJourneyComments(501);
    httpMock.expectOne(`${API}/api/journey/501/comments`).flush([
      {
        id: 901,
        postId: 501,
        author: { id: 7, fullName: 'Kingshuk Banu' },
        text: 'First comment right away!',
        createdAtUtc: '2026-10-08T08:01:00Z',
        likeCount: 2,
        isLiked: true,
        reactions: [],
        replies: [],
      },
    ]);
    const loaded = await loadPromise;
    expect(loaded.length).toBe(1);
    expect(service.journeyPosts()[0].comments[0].likeCount).toBe(2);
  });
});

describe('CommunityService — live requests, notifications, chats, circles and follow cards', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;

  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Answers the request to `url` once the service has issued it. */
  async function answer(url: string, body: object | null): Promise<void> {
    await tick();
    httpMock.expectOne(url).flush(body);
    await tick();
  }

  /** One live round — what the page's timer runs every few seconds. */
  function poll(): Promise<void> {
    return (service as unknown as { pollLiveUpdates(): Promise<void> }).pollLiveUpdates();
  }

  /** Signs a make-believe member (id 7) in without triggering community hydration. */
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

  const elenaDto = {
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
  };

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

  it('registers the signed-in browser and displays API-backed device history', async () => {
    const registerCurrentDevice = (
      service as unknown as { registerCurrentDevice: () => Promise<void> }
    ).registerCurrentDevice.bind(service);
    const registering = registerCurrentDevice();
    await tick();

    const request = httpMock.expectOne(`${API}/api/devices`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt.member.7');
    const body = request.request.body as {
      id: string;
      name: string;
      type: string;
      os: string;
      browser: string;
      isCurrent: boolean;
      ipAddress?: string;
      macAddress?: string;
    };
    expect(body.id).not.toBe('device-current');
    expect(body.id.length).toBeGreaterThan(10);
    expect(body.name).toContain(body.browser);
    expect(body.isCurrent).toBe(true);
    expect(body.ipAddress).toBeUndefined();
    expect(body.macAddress).toBeUndefined();

    request.flush({
      ...body,
      lastSeenUtc: new Date().toISOString(),
      isActive: true,
      blocked: false,
      ipAddress: '',
      macAddress: '',
      location: '',
    });
    await registering;

    expect(localStorage.getItem(`${DEVICE_ID_KEY_PREFIX}:7`)).toBe(body.id);
    expect(service.devices()).toHaveLength(1); // discard the signed-out placeholder browser row
    expect(service.devices()[0]).toMatchObject({ id: body.id, isCurrent: true, isActive: true });
    expect(service.visibleDevices()).toContainEqual(expect.objectContaining({ id: body.id, isCurrent: true }));
  });

  it('hydrates real previous sign-in devices from GET /api/devices', async () => {
    const refreshing = service.refreshCommunityFromApi();
    await tick();

    const registration = httpMock.expectOne(`${API}/api/devices`);
    const currentBody = registration.request.body as {
      id: string;
      name: string;
      type: string;
      os: string;
      browser: string;
      isCurrent: boolean;
    };
    registration.flush({
      ...currentBody,
      lastSeenUtc: new Date().toISOString(),
      isActive: true,
      blocked: false,
    });
    await tick();

    const reads = httpMock.match((request) => request.method === 'GET');
    const devicesRead = reads.find((request) => request.request.url.endsWith('/api/devices'));
    expect(devicesRead).toBeDefined();
    for (const request of reads) {
      if (request === devicesRead) {
        request.flush([
          {
            id: 'member7-previous-phone',
            name: 'iPhone · Safari',
            type: 'Phone',
            os: 'iOS',
            browser: 'Safari',
            lastSeenUtc: '2026-10-01T12:00:00Z',
            isActive: false,
            blocked: false,
          },
        ]);
      } else if (request.request.url.includes('/api/journey?')) {
        request.flush({ items: [] });
      } else if (request.request.url.includes('/api/messagebook?')) {
        request.flush({ items: [] });
      } else if (request.request.url.includes('/api/follows/counts/')) {
        request.flush({ followers: 0, following: 0 });
      } else {
        request.flush([]);
      }
    }
    await refreshing;

    const currentId = localStorage.getItem(`${DEVICE_ID_KEY_PREFIX}:7`)!;
    expect(service.devices()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: currentId, isCurrent: true, isActive: true }),
        expect.objectContaining({ id: 'member7-previous-phone', isCurrent: false, isActive: false }),
      ]),
    );
    expect(service.visibleDevices()).toContainEqual(
      expect.objectContaining({ id: 'member7-previous-phone' }),
    );
  });

  it('shows a companionship request another member sent, without a reload', async () => {
    const round = poll();
    await tick();
    httpMock.expectOne(`${API}/api/companions`).flush([
      { ...elenaDto, status: 'pending_incoming' },
    ]);
    httpMock.expectOne(`${API}/api/notifications`).flush([
      {
        id: 88,
        type: 'companionship_request',
        fromUser: { id: 21, fullName: 'Elena Rostova', profilePhotoUrl: '' },
        message: 'sent you a companionship request',
        createdAtUtc: new Date().toISOString(),
        isRead: false,
        status: 'pending',
      },
    ]);
    httpMock.expectOne(`${API}/api/messages/conversations`).flush([]);
    await round;

    expect(service.companions().find((c) => c.id === 21)?.status).toBe('pending_incoming');
    const notice = service.notifications().find((n) => n.id === 88);
    expect(notice?.type).toBe('companionship_request');
    expect(notice?.status).toBe('pending');
  });

  it('withdraws a companion request the Web API did not store', async () => {
    service.companions.set([{ ...elenaDto, status: 'none' }] as never);

    service.sendCompanionshipRequest(21);
    expect(service.companions().find((c) => c.id === 21)?.status).toBe('pending_outgoing');

    httpMock
      .expectOne(`${API}/api/companions/21/request`)
      .flush({ error: 'Companion request could not be delivered.' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${API}/api/follows/21`).flush(null);
    await tick();

    expect(service.companions().find((c) => c.id === 21)?.status).toBe('none');
  });

  it('does not keep a Circle the Web API refused, and says why', async () => {
    const created = service.createCircle('Lisbon trip', 'Food and fado', [], '✈️', '#2563eb', 'data:image/svg+xml;base64,AAAA');
    expect(created).not.toBeNull();
    const saved = service.circleSaved(created!.id);

    httpMock
      .expectOne(`${API}/api/circles`)
      .flush(
        { error: 'Circle photo must be a PNG, JPEG, GIF or WebP image.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await saved).toBeNull();
    expect(service.circles().some((c) => c.id === created!.id)).toBe(false);
    expect(service.circleActionError()).toBe('Circle photo must be a PNG, JPEG, GIF or WebP image.');
  });

  it('keeps a Circle once the Web API has stored it, under the stored id', async () => {
    const created = service.createCircle('Lisbon trip', 'Food and fado', [], '✈️', '#2563eb', 'data:image/jpeg;base64,AAAA');
    const saved = service.circleSaved(created!.id);

    httpMock.expectOne(`${API}/api/circles`).flush({
      id: 4101,
      name: 'Lisbon trip',
      description: 'Food and fado',
      icon: '✈️',
      color: '#2563eb',
      memberIds: [7],
      adminIds: [7],
      ownerId: 7,
      createdAtUtc: new Date().toISOString(),
    });

    const stored = await saved;
    expect(stored?.id).toBe(4101);
    expect(service.circles().some((c) => c.id === 4101)).toBe(true);
    expect(service.circleActionError()).toBeNull();
  });

  it('sends a chat message as the signed-in member and stores it through the conversation', async () => {
    service.companions.set([elenaDto] as never);
    service.openChatBox(elenaDto as never);
    await answer(`${API}/api/messages/conversations`, { id: 900, unreadCount: 0 });
    await answer(`${API}/api/messages/conversations/900?pageSize=100`, []);

    service.sendChatMessage(21, 'See you in Lisbon');
    const before = service.activeChatBoxes().find((b) => b.companionId === 21)!;
    const bubble = before.messages[before.messages.length - 1];
    expect(bubble.senderId).toBe(7);
    expect(bubble.text).toBe('See you in Lisbon');

    const post = httpMock.expectOne(`${API}/api/messages/conversations/900/messages`);
    expect(post.request.body).toEqual(expect.objectContaining({ text: 'See you in Lisbon' }));
    post.flush({
      id: 777,
      conversationId: 900,
      senderId: 7,
      receiverId: 21,
      text: 'See you in Lisbon',
      sentAtUtc: new Date().toISOString(),
    });
    await tick();

    const after = service.activeChatBoxes().find((b) => b.companionId === 21)!;
    expect(after.messages.map((m) => m.id)).toContain(777);
    expect(after.messages.some((m) => m.id === bubble.id)).toBe(false);
  });

  it('pops the chat open for the recipient when a companion writes, without a reload', async () => {
    // Requirement C: the floating chat popup opens on tablet / laptop / wide screens —
    // jsdom's matchMedia never matches, so stub a wide screen for this test.
    const previousMatchMedia = window.matchMedia;
    const wideScreenList: MediaQueryList = {
      matches: true,
      media: '(min-width: 901px)',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    window.matchMedia = (() => wideScreenList) as unknown as typeof window.matchMedia;
    try {
      await popChatForNewMessage();
    } finally {
      window.matchMedia = previousMatchMedia;
    }
  });

  async function popChatForNewMessage(): Promise<void> {
    const oldMessage = { id: 500, conversationId: 900, senderId: 21, receiverId: 7, text: 'Hello from last week', sentAtUtc: '2026-10-01T10:00:00Z' };
    const newMessage = { id: 501, conversationId: 900, senderId: 21, receiverId: 7, text: 'Hi Kingshuk!', sentAtUtc: new Date().toISOString() };
    const participants = [
      { id: 7, fullName: 'Kingshuk Banu' },
      { id: 21, fullName: 'Elena Rostova', profilePhotoUrl: '', city: 'Paris', country: 'France' },
    ];

    // First round: the inbox already holds an old message. It is recorded, nothing pops up.
    const first = poll();
    await tick();
    httpMock.expectOne(`${API}/api/companions`).flush([elenaDto]);
    httpMock.expectOne(`${API}/api/notifications`).flush([]);
    httpMock.expectOne(`${API}/api/messages/conversations`).flush([
      { id: 900, unreadCount: 0, participants, lastMessage: oldMessage },
    ]);
    await first;
    expect(service.activeChatBoxes().length).toBe(0);

    // Second round: Elena has written. Her chat opens on this member's page.
    const second = poll();
    await tick();
    httpMock.expectOne(`${API}/api/companions`).flush([elenaDto]);
    httpMock.expectOne(`${API}/api/notifications`).flush([]);
    httpMock.expectOne(`${API}/api/messages/conversations`).flush([
      { id: 900, unreadCount: 1, participants, lastMessage: newMessage },
    ]);
    await second;

    await answer(`${API}/api/messages/conversations`, { id: 900, unreadCount: 1 });
    await answer(`${API}/api/messages/conversations/900?pageSize=100`, [newMessage]);
    await answer(`${API}/api/messages/conversations/900/read`, null);

    const box = service.activeChatBoxes().find((b) => b.companionId === 21);
    expect(box).toBeDefined();
    expect(box?.isMinimized).toBe(false);
    expect(box?.messages.map((m) => m.text)).toEqual(['Hi Kingshuk!']);
  }

  it('shows a follower’s city and country on their card', () => {
    (service as unknown as { apiFollowers: { set(list: unknown[]): void } }).apiFollowers.set([
      { id: 31, fullName: 'Marco Rossi', profession: 'Architect', country: 'Italy', city: 'Milan' },
    ]);
    service.follows.set({ '31': [7] });

    const follower = service.peopleFollowers(7).find((p) => p.id === 31);
    expect(follower?.city).toBe('Milan');
    expect(follower?.country).toBe('Italy');
  });
});
