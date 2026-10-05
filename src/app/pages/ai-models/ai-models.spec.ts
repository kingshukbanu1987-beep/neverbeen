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

  it('renders the ten filename-named portfolios and labels randomized details as illustrative', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const expectedNames = [
      'Toulene Arslan',
      'Zeina Al-Sabbagh',
      'Fatima Sana Hussaini',
      'Rasha Fakhoury',
      'Salma Ahmadzai',
      'Rozalin El Masry',
      'Nermin Akhundzada',
      'Nirvana Noorzai',
      'Sereenah Noorzai',
      'Nourhan Durrani',
    ];

    expect(element.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(aiModelProfiles.map((profile) => profile.name)).toEqual(expectedNames);
    expect(element.querySelectorAll('.model-card').length).toBe(expectedNames.length);
    expect(element.querySelector('.empty-studio')).toBeNull();
    expect(element.querySelector('.profile-data-note')?.textContent).toContain('illustrative');
    expect(aiModelProfiles.every((profile) => profile.illustrative)).toBe(true);
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
