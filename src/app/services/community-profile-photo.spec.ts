import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CommunityService,
  deleteCookie,
  PROFILE_KEY,
  TOKEN_KEY,
  USER_KEY,
} from './community.service';
import { environment } from '../../environments/environment';

/**
 * Regression tests for "changing the profile picture from Manage your NeverBeen Account
 * is not getting saved":
 *
 * 1. The Web API serves every profile photograph from the same stable address
 *    (`/api/profile/{id}/photo`), so a successful upload used to keep a URL that is
 *    byte-identical to the old one — the browser went on showing the photograph it
 *    already had for that address and the new picture looked unsaved. The saved URL
 *    must therefore carry a fresh `?v=` version after each upload.
 * 2. A failed upload used to be silently replaced by a browser-only data-URL copy, so
 *    the page reported success while the database kept the old photograph. For a
 *    signed-in member the upload must now fail loudly (and change nothing) instead.
 */
const API = environment.apiBaseUrl;
const OLD_PHOTO_URL = `${API}/api/profile/7/photo`;

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function apiProfileDto(photoUrl: string) {
  return {
    id: 7,
    fullName: 'Kingshuk Banerjee',
    firstName: 'Kingshuk',
    lastName: 'Banerjee',
    email: 'kingshuk@example.com',
    countryId: 100,
    countryName: 'India',
    cityId: 5,
    cityName: 'Kolkata',
    state: 'West Bengal',
    profession: 'Engineer',
    status: 'Active',
    profilePhotoUrl: photoUrl,
    createdAtUtc: '2026-01-01T00:00:00Z',
    settings: {},
    gallery: [],
    commentCount: 0,
  };
}

describe('CommunityService — profile picture upload (Manage your NeverBeen Account)', () => {
  let service: CommunityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommunityService);
    httpMock = TestBed.inject(HttpTestingController);

    // A signed-in member whose current photograph lives at the API's stable address.
    service.token.set('jwt.real.member');
    service.currentUser.set({
      id: 7,
      firstName: 'Kingshuk',
      lastName: 'Banerjee',
      fullName: 'Kingshuk Banerjee',
      email: 'kingshuk@example.com',
      status: 'Active',
      profileComplete: true,
      profilePhotoUrl: OLD_PHOTO_URL,
    });
    service.profile.set({
      id: 7,
      uniqueId: '89201534010000000007',
      firstName: 'Kingshuk',
      lastName: 'Banerjee',
      fullName: 'Kingshuk Banerjee',
      email: 'kingshuk@example.com',
      countryId: 100,
      countryName: 'India',
      country: 'India',
      cityId: 5,
      cityName: 'Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      profession: 'Engineer',
      status: 'Active',
      profilePhotoUrl: OLD_PHOTO_URL,
      createdAtUtc: '2026-01-01T00:00:00Z',
      settings: {
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        publicProfileEnabled: true,
        theme: 'light',
        timezone: 'UTC',
      },
      gallery: [],
      commentCount: 0,
    });
  });

  afterEach(() => {
    httpMock.verify();
    deleteCookie(TOKEN_KEY);
  });

  it('saves a changed picture and keeps a versioned URL so the new photo is the one on screen', async () => {
    // The exact sequence the account page runs on Update: details first, then the photo.
    const details = service.updateProfile({
      countryId: 100,
      cityId: 5,
      state: 'West Bengal',
      profession: 'Engineer',
    });
    await tick();
    const putProfile = httpMock.expectOne(`${API}/api/profile`);
    expect(putProfile.request.method).toBe('PUT');
    putProfile.flush(apiProfileDto('/api/profile/7/photo'));
    await details;

    const upload = service.uploadProfilePhoto(
      new File([new Uint8Array([1, 2, 3, 4])], 'new-picture.jpg', { type: 'image/jpeg' }),
    );
    await tick();
    const putPhoto = httpMock.expectOne(`${API}/api/profile/photo`);
    expect(putPhoto.request.method).toBe('PUT');
    expect(putPhoto.request.headers.get('Authorization')).toBe('Bearer jwt.real.member');
    const body = putPhoto.request.body as FormData;
    expect((body.get('photo') as File).name).toBe('new-picture.jpg');
    // The API answers with the same stable address as before the upload…
    putPhoto.flush(apiProfileDto('/api/profile/7/photo'));
    const savedUrl = await upload;

    // …so the URL the app keeps must differ by its version, or no <img> would refetch.
    expect(savedUrl).toMatch(new RegExp(`^${API.replaceAll('/', '\\/')}\\/api\\/profile\\/7\\/photo\\?v=\\d+$`));
    expect(savedUrl).not.toBe(OLD_PHOTO_URL);
    expect(service.profile()?.profilePhotoUrl).toBe(savedUrl);
    expect(service.currentUser()?.profilePhotoUrl).toBe(savedUrl);
    // The stored session (what the homepage account menu reads) carries it too.
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!).profilePhotoUrl).toBe(savedUrl);
    expect(JSON.parse(localStorage.getItem(USER_KEY)!).profilePhotoUrl).toBe(savedUrl);
  });

  it('keeps the upload version when a later profile answer repeats the bare photo URL', async () => {
    const upload = service.uploadProfilePhoto(
      new File([new Uint8Array([5, 6, 7])], 'new-picture.jpg', { type: 'image/jpeg' }),
    );
    await tick();
    httpMock.expectOne(`${API}/api/profile/photo`).flush(apiProfileDto('/api/profile/7/photo'));
    const savedUrl = await upload;
    expect(savedUrl).toContain('?v=');

    // Any later save (e.g. editing details) is answered with the bare stable URL again:
    // falling back to it mid-session would resurrect the cached previous photograph.
    const details = service.updateProfile({ profession: 'Founder' });
    await tick();
    httpMock.expectOne(`${API}/api/profile`).flush(apiProfileDto('/api/profile/7/photo'));
    await details;

    expect(service.profile()?.profilePhotoUrl).toBe(savedUrl);
  });

  it('fails loudly instead of pretending a rejected upload was saved', async () => {
    const upload = service.uploadProfilePhoto(
      new File([new Uint8Array([9, 9, 9])], 'new-picture.jpg', { type: 'image/jpeg' }),
    );
    await tick();
    httpMock
      .expectOne(`${API}/api/profile/photo`)
      .flush({ error: 'Profile photo must be a PNG or JPEG image.' }, { status: 400, statusText: 'Bad Request' });

    await expect(upload).rejects.toThrow('Your new profile picture could not be saved');
    await expect(upload).rejects.toThrow('Profile photo must be a PNG or JPEG image.');

    // Nothing was "saved" anywhere: the stored picture is still the previous one.
    expect(service.profile()?.profilePhotoUrl).toBe(OLD_PHOTO_URL);
    expect(service.currentUser()?.profilePhotoUrl).toBe(OLD_PHOTO_URL);
  });

  it('still stores the picture in this browser for the local (non-API) demo session', async () => {
    service.token.set(null); // not a Web API session: the browser copy *is* the store

    const savedUrl = await service.uploadProfilePhoto(
      new File([new Uint8Array([1, 2, 3])], 'local-picture.jpg', { type: 'image/jpeg' }),
    );

    expect(savedUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(service.profile()?.profilePhotoUrl).toBe(savedUrl);
    expect(service.currentUser()?.profilePhotoUrl).toBe(savedUrl);
  });
});
