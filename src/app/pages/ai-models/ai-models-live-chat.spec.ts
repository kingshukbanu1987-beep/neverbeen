import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ModelLiveChatService } from '../../services/model-live-chat.service';
import { ModelMediaEngagementService } from '../../services/model-media-engagement.service';
import { ModelTestimonialsService } from '../../services/model-testimonials.service';
import { aiModelProfiles } from './ai-model-data';
import { AiModelsPage } from './ai-models';

const API = environment.apiBaseUrl.replace(/\/+$/, '');
const profile = aiModelProfiles[0];

/** Lets the directory's promise-based loads land, then the view can be checked. */
const settle = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

function cardFor(element: HTMLElement, name: string): HTMLElement {
  return Array.from(element.querySelectorAll<HTMLElement>('.model-card')).find(
    (card) => card.querySelector('h3')?.textContent?.trim() === name,
  )!;
}

function pillTextOf(pill: HTMLElement, segment: string): { value: string; word: string } {
  const seg = pill.querySelector<HTMLElement>(`.card-live-pill-seg.${segment}`)!;
  return {
    value: seg.querySelector('.card-live-pill-value')?.textContent?.trim() ?? '',
    word: seg.querySelector('.card-live-pill-word')?.textContent?.trim() ?? '',
  };
}

describe('AiModelsPage — Live Now / past-chat pill and review wording', () => {
  let testimonialsApi: { list: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    testimonialsApi = {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 1, rating: 5 }],
        totalCount: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AiModelsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ModelMediaEngagementService,
          useValue: {
            registerModel: vi.fn(),
            statsFor: vi.fn(() => ({
              seen: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              likedByMe: false,
            })),
          },
        },
        { provide: ModelTestimonialsService, useValue: testimonialsApi },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the split pill beside the Live Chat button: Live Now with a pulse, and the past chats', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveNowCount: 3, pastChatCount: 1284 }]);
    await settle();
    fixture.detectChanges();

    const card = cardFor(fixture.nativeElement, profile.name);
    const pill = card.querySelector<HTMLElement>('.card-live-pill')!;
    expect(pill).not.toBeNull();
    expect(pill.previousElementSibling?.classList.contains('card-action-chat')).toBe(true);
    expect(pill.classList.contains('is-live')).toBe(true);
    expect(pill.querySelector('.card-live-pill-dot')).not.toBeNull();
    expect(pill.querySelector('.card-live-pill-divider')).not.toBeNull();

    const now = pillTextOf(pill, 'is-now');
    expect(now.value).toBe('3');
    expect(now.word).toBe('Live Now');

    const past = pillTextOf(pill, 'is-past');
    expect(past.value).toBe('1,284');
    expect(past.word).toBe('past chats');

    expect(pill.getAttribute('aria-label')).toBe(
      `3 live now and 1,284 past chats with ${profile.name}`,
    );
    fixture.destroy();
  });

  it('shows the quiet default — 0 live now, grey dot, 0 past chats — for a model the API did not list', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    TestBed.inject(HttpTestingController)
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveNowCount: 2, pastChatCount: 5 }]);
    await settle();
    fixture.detectChanges();

    const other = cardFor(fixture.nativeElement, aiModelProfiles[1].name);
    const pill = other.querySelector<HTMLElement>('.card-live-pill')!;
    expect(pill).not.toBeNull();
    expect(pill.classList.contains('is-live')).toBe(false);

    const now = pillTextOf(pill, 'is-now');
    expect(now.value).toBe('0');
    const past = pillTextOf(pill, 'is-past');
    expect(past.value).toBe('0');
    expect(past.word).toBe('past chats');
    fixture.destroy();
  });

  it('uses the singular for one past chat', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    TestBed.inject(HttpTestingController)
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveNowCount: 0, pastChatCount: 1 }]);
    await settle();
    fixture.detectChanges();

    const pill = cardFor(fixture.nativeElement, profile.name).querySelector<HTMLElement>(
      '.card-live-pill',
    )!;
    const past = pillTextOf(pill, 'is-past');
    expect(past.value).toBe('1');
    expect(past.word).toBe('past chat');
    expect(pill.classList.contains('is-live')).toBe(false);
    fixture.destroy();
  });

  it('moves the Live Now count when a fresh poll answers with different numbers', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveNowCount: 1, pastChatCount: 10 }]);
    await settle();
    fixture.detectChanges();

    let pill = cardFor(fixture.nativeElement, profile.name).querySelector<HTMLElement>(
      '.card-live-pill',
    )!;
    let now = pillTextOf(pill, 'is-now');
    expect(now.value).toBe('1');

    // A chat ends somewhere else in the world: the next poll brings the smaller number, and the
    // pill shows it without any reload of the page.
    const service = TestBed.inject(ModelLiveChatService);
    const refreshing = service.load();
    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveNowCount: 0, pastChatCount: 11 }]);
    await refreshing;
    fixture.detectChanges();

    pill = cardFor(fixture.nativeElement, profile.name).querySelector<HTMLElement>(
      '.card-live-pill',
    )!;
    now = pillTextOf(pill, 'is-now');
    expect(now.value).toBe('0');
    expect(pill.classList.contains('is-live')).toBe(false);
    const past = pillTextOf(pill, 'is-past');
    expect(past.value).toBe('11');
    fixture.destroy();
  });

  it('keeps the quiet default on every card when the API is unavailable', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    await settle();
    fixture.detectChanges();

    const pill = cardFor(fixture.nativeElement, profile.name).querySelector<HTMLElement>(
      '.card-live-pill',
    )!;
    expect(pill).not.toBeNull();
    expect(pill.classList.contains('is-live')).toBe(false);
    const now = pillTextOf(pill, 'is-now');
    expect(now.value).toBe('0');
    expect(now.word).toBe('Live Now');
    fixture.destroy();
  });

  it('writes the review count as a number, a clear gap, and the word "reviews"', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    TestBed.inject(HttpTestingController).expectOne(`${API}/api/models/live-chats`).flush([]);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const card = cardFor(fixture.nativeElement, profile.name);
    const link = card.querySelector<HTMLAnchorElement>('.card-review-link')!;
    expect(link.querySelector('.card-review-number')?.textContent?.trim()).toBe('1');
    expect(link.querySelector('.card-review-word')?.textContent).toBe(' reviews');
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe('(1 reviews)');
    expect(link.getAttribute('aria-label')).toBe(`Read 1 reviews for ${profile.name}`);
    fixture.destroy();
  });
});
