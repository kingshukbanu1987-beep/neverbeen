import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { aiModelProfiles } from './ai-model-data';
import { AiModelsPage } from './ai-models';

describe('AiModelsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the portfolios in the published order and labels randomized details as illustrative', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const expectedNames = [
      'Nourhan Durrani',
      'Nirvana Noorzai',
      'Sereenah Noorzai',
      'Rozalin El Masry',
      'Fatima Sana Hussaini',
      'Salma Ahmadzai',
      'Toulene Arslan',
      'Zeina Al-Sabbagh',
      'Nermin Akhundzada',
      'Rasha Fakhoury',
    ];

    expect(element.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(aiModelProfiles.map((profile) => profile.name)).toEqual(expectedNames);
    expect(aiModelProfiles.map((profile) => profile.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(element.querySelectorAll('.model-card').length).toBe(expectedNames.length);
    expect(element.querySelector('.empty-studio')).toBeNull();
    expect(element.querySelector('.profile-data-note')?.textContent).toContain('illustrative');
    expect(aiModelProfiles.every((profile) => profile.illustrative)).toBe(true);

    // The cards follow the data order, not the folder order.
    const cardNames = Array.from(element.querySelectorAll('.model-card h3')).map((heading) =>
      heading.textContent?.trim(),
    );
    expect(cardNames).toEqual(expectedNames);
  });

  it('shows how many photographs each portfolio holds, in large bold type on the cover', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const cards = Array.from(element.querySelectorAll('.model-card'));

    for (const [index, profile] of aiModelProfiles.entries()) {
      const badge = cards[index].querySelector('.card-photo-count');
      expect(badge, `${profile.name} photo count`).toBeTruthy();
      expect(badge?.querySelector('b')?.textContent?.trim()).toBe(String(profile.photos.length));
      expect(badge?.querySelector('i')?.textContent?.trim()).toBe(
        profile.photos.length === 1 ? 'photograph' : 'photographs',
      );
      expect(badge?.getAttribute('aria-label')).toContain(String(profile.photos.length));
    }
  });

  it('publishes per-model booking rates in USD that differ between models', () => {
    for (const profile of aiModelProfiles) {
      expect(profile.rates.length, `${profile.name} booking terms`).toBeGreaterThan(0);
      for (const rate of profile.rates) {
        expect(rate.term).toBeTruthy();
        expect(rate.usd).toBeGreaterThan(0);
      }
      expect(profile.rateNote).toBeTruthy();
    }

    const firstTerms = aiModelProfiles.map((profile) => profile.rates[0].usd);
    expect(new Set(firstTerms).size).toBeGreaterThan(1);
  });

  it('renders a designed portrait placeholder when an original cover is not available', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const missingCoverIndex = aiModelProfiles.findIndex((profile) => !profile.cover);

    if (missingCoverIndex === -1) return;

    const card = element.querySelectorAll('.model-card')[missingCoverIndex];
    expect(card.querySelector('.card-portrait-placeholder')).toBeTruthy();
    expect(card.querySelector('img')).toBeNull();
  });
});
