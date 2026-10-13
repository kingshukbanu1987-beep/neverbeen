import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { ModelLiveChatService } from './model-live-chat.service';

const API = environment.apiBaseUrl.replace(/\/+$/, '');

describe('ModelLiveChatService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads every model’s Live Chat count in one request', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    expect(service.status()).toBe('idle');
    const loading = service.load();
    expect(service.status()).toBe('loading');

    const request = http.expectOne(`${API}/api/models/live-chats`);
    expect(request.request.method).toBe('GET');
    request.flush([
      { modelSlug: 'alisha-bhattacharya', liveChatCount: 12 },
      { modelSlug: 'fiadh-dara', liveChatCount: 0 },
    ]);
    await loading;

    expect(service.status()).toBe('ready');
    expect(service.countFor('alisha-bhattacharya')).toBe(12);
    expect(service.countFor('fiadh-dara')).toBe(0);
    expect(service.countFor('nobody')).toBeNull();
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
    expect(service.countFor('alisha-bhattacharya')).toBeNull();
  });

  it('records a chat start and takes the count the API answers with', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const recording = service.recordStart('alisha-bhattacharya');
    const request = http.expectOne(`${API}/api/models/alisha-bhattacharya/live-chats`);
    expect(request.request.method).toBe('POST');
    request.flush({ modelSlug: 'alisha-bhattacharya', liveChatCount: 7 });

    await expect(recording).resolves.toBe(7);
    expect(service.countFor('alisha-bhattacharya')).toBe(7);
  });

  it('returns null and keeps the last known count when a chat start cannot be recorded', async () => {
    const service = TestBed.inject(ModelLiveChatService);
    const http = TestBed.inject(HttpTestingController);

    const loading = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: 'alisha-bhattacharya', liveChatCount: 4 }]);
    await loading;

    const recording = service.recordStart('alisha-bhattacharya');
    http
      .expectOne(`${API}/api/models/alisha-bhattacharya/live-chats`)
      .flush('down', { status: 503, statusText: 'Unavailable' });

    await expect(recording).resolves.toBeNull();
    expect(service.countFor('alisha-bhattacharya')).toBe(4);
  });
});
