import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityService,
  CreateAccountData,
  deleteCookie,
  getCookie,
  setCookie,
  TOKEN_KEY,
} from './community.service';

/**
 * The sign-up path must reach the NeverBeen Web API (the ASP.NET Core `neverbeen-api`
 * service backed by the PostgreSQL / Supabase database) — these tests pin the exact
 * requests the browser sends.
 */
const API = '/neverbeen-api';

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

    httpMock.expectOne(`${API}/health`).flush('Healthy');
    await tick();

    const registration = httpMock.expectOne(`${API}/api/registration`);
    expect(registration.request.method).toBe('POST');
    expect(registration.request.headers.get('Authorization')).toBe('Bearer jwt.token.value');

    const body = registration.request.body as FormData;
    expect(body.get('fullName')).toBe('Elena Rostova');
    expect(body.get('gender')).toBe('Female');
    expect(body.get('dateOfBirth')).toBe('1995-06-12');
    expect(body.get('email')).toBe('elena.rostova@example.com');
    expect(body.get('profession')).toBe('Freelancer');
    // Country / city ids must be the API's own seed ids (France = 60, Paris = 321).
    expect(body.get('countryId')).toBe('60');
    expect(body.get('cityId')).toBe('321');
    expect((body.get('photo') as File).name).toBe('elena.jpg');

    registration.flush({
      id: 7,
      fullName: 'Elena Rostova',
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

  it('keeps the account in this browser and says so when the Web API is unreachable', async () => {
    const pending = service.createNeverbeenAccount(account);

    httpMock.expectOne(`${API}/health`).error(new ProgressEvent('error'));

    const profile = await pending;

    expect(profile.fullName).toBe('Elena Rostova');
    expect(service.accountSaveTarget()).toBe('local');
    expect(service.accountSaveNotice()).toContain('could not be reached');
    expect(service.apiOnline()).toBe(false);
  });

  it('keeps the account local and asks for a sign-in when the API has no OAuth session (401)', async () => {
    const pending = service.createNeverbeenAccount(account);

    httpMock.expectOne(`${API}/health`).flush('Healthy');
    await tick();
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

    httpMock.expectOne(`${API}/health`).flush('Healthy');
    await tick();
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
});
