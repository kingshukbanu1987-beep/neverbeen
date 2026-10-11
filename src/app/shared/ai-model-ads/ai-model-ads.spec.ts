import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { aiModelProfiles } from '../../pages/ai-models/ai-model-data';
import { AiModelAdsService } from '../../services/ai-model-ads.service';
import {
  advertisementPhotos,
  availabilityOf,
  createRandom,
  pickAdModels,
  splitLocation,
  toAdvertisement,
} from './ai-model-ad';
import { AiModelAdCard } from './ai-model-ad-card';
import { AiModelAdsPanel } from './ai-model-ads-panel';

/** A model whose album folder holds four or more photographs. */
const MODEL_WITH_ALBUM = aiModelProfiles.find((model) => model.photos.length >= 4)!;
/** A model whose folder holds fewer than four — her card must show a single photograph. */
const MODEL_WITH_ONE = aiModelProfiles.find((model) => model.photos.length > 0 && model.photos.length < 4)!;

describe('NeverBeen AI Models advertisement data', () => {
  it('splits the published location into the city and the country', () => {
    expect(splitLocation('Shiraz, Iran')).toEqual({ city: 'Shiraz', country: 'Iran' });
    expect(splitLocation('Buenos Aires, Argentina')).toEqual({ city: 'Buenos Aires', country: 'Argentina' });
    expect(splitLocation('  Male  ')).toEqual({ city: 'Male', country: '' });
  });

  it('reads the studio availability notes as available, future or unavailable', () => {
    expect(availabilityOf({ ...aiModelProfiles[0], availability: '' })).toMatchObject({
      state: 'available',
      label: 'Available for Contract',
    });
    expect(
      availabilityOf({ ...aiModelProfiles[0], availability: 'Open for editorial and campaign bookings' }),
    ).toMatchObject({ state: 'available' });
    expect(
      availabilityOf({ ...aiModelProfiles[0], availability: 'Looking for Future Contract' }),
    ).toMatchObject({ state: 'future', label: 'Looking for Future Contract' });
    expect(
      availabilityOf({ ...aiModelProfiles[0], availability: 'Currently Unavailable' }),
    ).toMatchObject({ state: 'unavailable', label: 'Currently Unavailable' });
  });

  it('shows four folder photographs when the album has them and one when it does not', () => {
    const withAlbum = advertisementPhotos(MODEL_WITH_ALBUM, createRandom(7));
    expect(withAlbum).toHaveLength(4);
    expect(new Set(withAlbum).size).toBe(4);
    for (const photo of withAlbum) {
      expect(MODEL_WITH_ALBUM.photos.some((entry) => entry.src === photo) || photo === MODEL_WITH_ALBUM.cover).toBe(
        true,
      );
    }

    const single = advertisementPhotos(MODEL_WITH_ONE, createRandom(7));
    expect(single).toHaveLength(1);
  });

  it('keeps every model in the advertising pool and never repeats one inside a selection', () => {
    const random = createRandom(11);
    const picked = pickAdModels(aiModelProfiles, 15, random);
    expect(picked).toHaveLength(15);
    expect(new Set(picked.map((model) => model.slug)).size).toBe(15);

    // Asking for more cards than the studio has models simply continues the rotation.
    const oversized = pickAdModels(aiModelProfiles, aiModelProfiles.length + 3, createRandom(3));
    expect(oversized).toHaveLength(aiModelProfiles.length + 3);
    expect(new Set(oversized.map((model) => model.slug)).size).toBe(aiModelProfiles.length);
  });

  it('prepares a catalogue profile with her portrait, split location and availability', () => {
    const advertisement = toAdvertisement(MODEL_WITH_ALBUM, createRandom(5));
    expect(advertisement.slug).toBe(MODEL_WITH_ALBUM.slug);
    expect(advertisement.name).toBe(MODEL_WITH_ALBUM.name);
    expect(advertisement.photo).toBe(MODEL_WITH_ALBUM.cover);
    expect(advertisement.availability.state).toBe(availabilityOf(MODEL_WITH_ALBUM).state);
    expect(advertisement.city).toBe(splitLocation(MODEL_WITH_ALBUM.location).city);
    expect(advertisement.country).toBe(splitLocation(MODEL_WITH_ALBUM.location).country);
  });
});

describe('AiModelAdsService', () => {
  let service: AiModelAdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AiModelAdsService);
  });

  it('draws 15 distinct portfolios for the rail and keeps them for the whole visit', () => {
    const first = service.railAds(15);
    expect(first).toHaveLength(15);
    expect(new Set(first.map((ad) => ad.slug)).size).toBe(15);
    for (const advertisement of first) {
      expect(advertisement.photo).toBeTruthy();
      expect(advertisement.name).toBeTruthy();
      expect(advertisement.availability.label).toBeTruthy();
    }
    // Same arrangement when the panel asks again (no reshuffle on change detection).
    expect(service.railAds(15)).toBe(first);
  });

  it('runs feed advertisements at irregular intervals and never on the first posts', () => {
    const slots: number[] = [];
    for (let index = 0; index < 60; index += 1) {
      if (service.feedAdAfter(index)) slots.push(index);
    }

    expect(service.feedAdAfter(0)).toBeNull();
    expect(service.feedAdAfter(1)).toBeNull();
    expect(slots.length).toBeGreaterThan(4);

    // No two advertisements back to back, and every advertisement carries a portfolio link.
    for (let index = 1; index < slots.length; index += 1) {
      expect(slots[index] - slots[index - 1]).toBeGreaterThanOrEqual(3);
    }
    const advertisement = service.feedAdAfter(slots[0])!;
    expect(aiModelProfiles.some((model) => model.slug === advertisement.slug)).toBe(true);
    expect(advertisement.photos.length).toBeGreaterThan(0);

    // The same post keeps the same advertisement after “Load more”.
    expect(service.feedAdAfter(slots[0])).toBe(advertisement);
  });
});

describe('AI Models advertisement surfaces', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelAdsPanel, AiModelAdCard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders 15 rail advertisements with portrait, name, location, availability and a portfolio button', () => {
    const fixture = TestBed.createComponent(AiModelAdsPanel);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.aim-title')?.textContent).toContain('NeverBeen');
    expect(element.textContent).toContain('Advertisement');

    const cards = Array.from(element.querySelectorAll<HTMLElement>('.aim-card'));
    expect(cards).toHaveLength(15);

    for (const card of cards) {
      expect(card.querySelector('.aim-card__media img, .aim-card__pending')).toBeTruthy();
      expect(card.querySelector('.aim-card__name')?.textContent?.trim()).toBeTruthy();
      expect(card.querySelector('.aim-card__place')?.textContent).toContain(',');
      expect(card.querySelector('.aim-card__status')?.textContent?.trim()).toBeTruthy();
      const button = card.querySelector<HTMLAnchorElement>('.aim-card__cta');
      expect(button?.textContent).toContain('View Portfolio');
      expect(button?.getAttribute('href')).toMatch(/^\/ai-models\/[a-z0-9-]+$/);
    }
  });

  it('renders a feed advertisement with four photographs for an album and one otherwise', () => {
    const card = TestBed.createComponent(AiModelAdCard);

    card.componentRef.setInput('advertisement', toAdvertisement(MODEL_WITH_ALBUM, createRandom(9)));
    card.detectChanges();
    let element: HTMLElement = card.nativeElement;
    expect(element.querySelector('.aim-ad__tag')?.textContent).toContain('Advertisement');
    expect(element.querySelectorAll('.aim-ad__photo')).toHaveLength(4);
    expect(element.querySelector('.aim-ad__name')?.textContent).toContain(MODEL_WITH_ALBUM.name);
    expect(element.querySelector('.aim-ad__place')?.textContent).toContain(',');
    expect(element.querySelector('.aim-ad__status')?.textContent?.trim()).toBe(
      availabilityOf(MODEL_WITH_ALBUM).label,
    );
    expect(element.querySelector<HTMLAnchorElement>('.aim-ad__cta')?.getAttribute('href')).toBe(
      `/ai-models/${MODEL_WITH_ALBUM.slug}`,
    );

    card.componentRef.setInput('advertisement', toAdvertisement(MODEL_WITH_ONE, createRandom(9)));
    card.detectChanges();
    element = card.nativeElement;
    expect(element.querySelectorAll('.aim-ad__photo')).toHaveLength(1);
    expect(element.querySelector<HTMLAnchorElement>('.aim-ad__cta')?.getAttribute('href')).toBe(
      `/ai-models/${MODEL_WITH_ONE.slug}`,
    );
  });
});
