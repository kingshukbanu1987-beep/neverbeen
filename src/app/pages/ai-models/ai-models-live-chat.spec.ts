import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
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

describe('AiModelsPage — Live Chat counter and review wording', () => {
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

  it('shows the Live Chat count beside the Live Chat button, from one directory request', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveChatCount: 1284 }]);
    await settle();
    fixture.detectChanges();

    const card = cardFor(fixture.nativeElement, profile.name);
    const pill = card.querySelector<HTMLElement>('.card-live-count')!;
    expect(pill).not.toBeNull();
    expect(pill.previousElementSibling?.classList.contains('card-action-chat')).toBe(true);
    expect(pill.querySelector('.card-live-count-value')?.textContent?.trim()).toBe('1,284');
    expect(pill.querySelector('.card-live-count-word')?.textContent?.trim()).toBe('Live Chats');
    expect(pill.querySelector('svg')).not.toBeNull();
    expect(pill.getAttribute('aria-label')).toBe(`1,284 Live Chats with ${profile.name}`);

    // A model the API did not list has no counter at all, rather than a made-up one.
    const other = cardFor(fixture.nativeElement, aiModelProfiles[1].name);
    expect(other.querySelector('.card-live-count')).toBeNull();

    fixture.destroy();
  });

  it('uses the singular for one Live Chat', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    TestBed.inject(HttpTestingController)
      .expectOne(`${API}/api/models/live-chats`)
      .flush([{ modelSlug: profile.slug, liveChatCount: 1 }]);
    await settle();
    fixture.detectChanges();

    const pill = cardFor(fixture.nativeElement, profile.name).querySelector('.card-live-count')!;
    expect(pill.querySelector('.card-live-count-word')?.textContent?.trim()).toBe('Live Chat');
    fixture.destroy();
  });

  it('shows a dash while the counts load and hides the counter when the API is unavailable', async () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const loading = cardFor(fixture.nativeElement, profile.name).querySelector<HTMLElement>(
      '.card-live-count',
    );
    expect(loading?.querySelector('.card-live-count-value')?.textContent?.trim()).toBe('—');
    expect(loading?.classList.contains('is-loading')).toBe(true);

    http
      .expectOne(`${API}/api/models/live-chats`)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    await settle();
    fixture.detectChanges();

    expect(
      cardFor(fixture.nativeElement, profile.name).querySelector('.card-live-count'),
    ).toBeNull();
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
