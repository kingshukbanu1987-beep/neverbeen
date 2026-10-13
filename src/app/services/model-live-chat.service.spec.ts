import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { LIVE_CHAT_POLL_MS, ModelLiveChatService } from './model-live-chat.service';

const API = environment.apiBaseUrl.replace(/\/+$/, '');

describe('ModelLiveChatService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads every model’s Live Now and past-chat counts in one request', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    expect(service.status()).toBe('idle');
    const loading = service.load();
    expect(service.status()).toBe('loading');

    const request = http.expectOne(`${API}/api/models/live-chats`);
    expect(request.request.method).toBe('GET');
    request.flush([
      { modelSlug: 'alisha-bhattacharya', liveNowCount: 3, pastChatCount: 12 },
      { modelSlug: 'fiadh-dara', liveNowCount: 0, pastChatCount: 0 },
    ]);
    await loading;

    expect(service.status()).toBe('ready');
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 3, pastChats: 12 });
    expect(service.countsFor('fiadh-dara')).toEqual({ liveNow: 0, pastChats: 0 });
    expect(service.countsFor('nobody')).toBeNull();
  });

  it('reads a legacy single total as past chats, with nobody live now', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const loading = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: 'alisha-bhattacharya', liveChatCount: 1284 }]);
    await loading;

    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 0, pastChats: 1284 });
  });

  it('shares one request between concurrent loads', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const first = service.load();
    const second = service.load();
    const requests = http.match(`${API}/api/models/live-chats`);
    expect(requests).toHaveLength(1);
    requests[0].flush([]);
    await Promise.all([first, second]);
    expect(service.status()).toBe('ready');
  });

  it('reports an error and no counts when the API cannot be reached', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const loading = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush('gone', { status: 404, statusText: 'Not Found' });
    await loading;

    expect(service.status()).toBe('error');
    expect(service.countsFor('alisha-bhattacharya')).toBeNull();
  });

  it('keeps the last good counts when a later refresh fails', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const loading = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: 'alisha-bhattacharya', liveNowCount: 2, pastChatCount: 9 }]);
    await loading;

    const refreshing = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush('down', { status: 503, statusText: 'Unavailable' });
    await refreshing;

    expect(service.status()).toBe('ready');
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 2, pastChats: 9 });
  });

  it('polls the counts while someone is watching, and stops when they are gone', async () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const stop = service.startPolling();
    http.expectNone(`${API}/api/models/live-chats`);

    await vi.advanceTimersByTimeAsync(LIVE_CHAT_POLL_MS);
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: 'alisha-bhattacharya', liveNowCount: 5, pastChatCount: 40 }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 5, pastChats: 40 });

    stop();
    await vi.advanceTimersByTimeAsync(LIVE_CHAT_POLL_MS * 3);
    http.expectNone(`${API}/api/models/live-chats`);
  });

  it('records a chat start under its session key and takes the counts the API answers with', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const recording = service.recordStart('alisha-bhattacharya', 'session-key-1');
    const request = http.expectOne(`${API}/api/models/alisha-bhattacharya/live-chats`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ sessionKey: 'session-key-1' });
    request.flush({ modelSlug: 'alisha-bhattacharya', liveNowCount: 7, pastChatCount: 21 });

    await expect(recording).resolves.toEqual({ liveNow: 7, pastChats: 21 });
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 7, pastChats: 21 });
  });

  it('records a chat end and takes the counts the API answers with', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const recording = service.recordEnd('alisha-bhattacharya', 'session-key-1');
    const request = http.expectOne(`${API}/api/models/alisha-bhattacharya/live-chats/end`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ sessionKey: 'session-key-1' });
    request.flush({ modelSlug: 'alisha-bhattacharya', liveNowCount: 6, pastChatCount: 22 });

    await expect(recording).resolves.toEqual({ liveNow: 6, pastChats: 22 });
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 6, pastChats: 22 });
  });

  it('moves this device’s own counter when a start or end cannot reach the API', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const loading = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: 'alisha-bhattacharya', liveNowCount: 1, pastChatCount: 4 }]);
    await loading;

    const starting = service.recordStart('alisha-bhattacharya', 'session-key-9');
    http
      .expectOne(`${API}/api/models/alisha-bhattacharya/live-chats`)
      .flush('down', { status: 503, statusText: 'Unavailable' });
    await expect(starting).resolves.toBeNull();
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 2, pastChats: 4 });

    const ending = service.recordEnd('alisha-bhattacharya', 'session-key-9');
    http
      .expectOne(`${API}/api/models/alisha-bhattacharya/live-chats/end`)
      .flush('down', { status: 503, statusText: 'Unavailable' });
    await expect(ending).resolves.toBeNull();
    expect(service.countsFor('alisha-bhattacharya')).toEqual({ liveNow: 1, pastChats: 5 });
  });

  it('never records an end without the session’s own key', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    await expect(service.recordEnd('alisha-bhattacharya', '')).resolves.toBeNull();
  });
});
