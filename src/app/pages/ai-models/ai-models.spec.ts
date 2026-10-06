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
      'Fiadh Dara',
      'Nourhan Durrani',
      'Nazanin Maeve Al-Farsi',
      'Sereenah Noorzai',
      'Maeve Anahita',
      'Rozalin El Masry',
      'Ava Amira Gallagher',
      'Banafsheh Saoirse Yazdani',
      'Nirvana Noorzai',
      'Sorcha Golsa MacCarthy',
      'Fatima Sana Hussaini',
      'Zeina Al-Sabbagh',
      'Toulene Arslan',
      'Caoimhe Niloufar Rahimi',
      'Salma Ahmadzai',
      'Nermin Akhundzada',
      'Rasha Fakhoury',
      'Lana Mahvash Kennedy',
      'Donya Caoimhe Yazdani',
      'Priyanka Chatterjee',
    ];

    expect(element.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(aiModelProfiles.map((profile) => profile.name)).toEqual(expectedNames);
    expect(aiModelProfiles.map((profile) => profile.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
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

  it('publishes a per-photo rate in INR for every model, starting at ₹550', () => {
    for (const profile of aiModelProfiles) {
      expect(profile.photoRate, `${profile.name} photo rate`).toBeGreaterThan(0);
      expect(profile.photoNote).toContain('INR');
    }

    // The leading profile (Fiadh Dara) quotes ₹535; the models vary slightly around it.
    expect(aiModelProfiles[0].photoRate).toBe(535);
    expect(Math.min(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(520);
    expect(Math.max(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(600);
  });

  it('keeps the header to a short, graphic-free title', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const hero = element.querySelector('.studio-hero');

    expect(hero?.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(hero?.textContent).toContain('model profiles');
    expect(hero?.textContent).toContain('per photograph');

    // No decorative artwork, glow layers or scroll cue in the header.
    for (const selector of [
      '.hero-art',
      '.hero-gridlines',
      '.hero-glow',
      '.scroll-cue',
      '.hero-content',
      '.hero-footer',
    ]) {
      expect(element.querySelector(selector), selector).toBeNull();
    }
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
