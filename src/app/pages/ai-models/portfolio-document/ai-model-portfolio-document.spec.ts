import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelPortfolioDocumentPage } from './ai-model-portfolio-document';

const testRoutes = [
  {
    path: 'ai-models/:slug/portfolio',
    component: AiModelPortfolioDocumentPage,
  },
];

function withDocument(): AiModelProfile {
  const profile: AiModelProfile = {
    slug: 'document-studio-model',
    name: 'Document Studio Model',
    cover: '/NeverBeenModels/DocumentStudioModel/cover.jpg',
    album: 'DocumentStudioModel',
    location: 'George Town, Malaysia',
    age: '28',
    height: '171 cm',
    weight: '57 kg',
    bodyShape: 'Hourglass',
    bust: '86 cm',
    waist: '63 cm',
    hip: '91 cm',
    handle: '@document.studio.model',
    tags: ['Editorial'],
    availability: 'Open for bookings',
    order: 98,
    photoRate: 600,
    photoNote: '',
    bio: 'A temporary portfolio used by the unit test suite.',
    illustrative: true,
    gallery: [],
    photos: [],
    videos: [],
    portfolio: {
      url: '/NeverBeenModels/DocumentStudioModel/Portfolio/DocumentStudioModel_Portfolio.pdf',
      fileName: 'DocumentStudioModel_Portfolio.pdf',
      downloadName: 'NeverBeen-Portfolio-Document-Studio-Model.pdf',
      pages: 24,
      orientation: 'portrait',
      style: 'obsidian-muse',
      styleName: 'Obsidian Muse',
      generatedAt: '2026-01-15T09:30:00.000Z',
      sizeBytes: 4_800_000,
    },
  };
  aiModelProfiles.push(profile);
  return profile;
}

function withoutDocument(): AiModelProfile {
  const profile = withDocument();
  profile.slug = 'blank-studio-model';
  profile.name = 'Blank Studio Model';
  profile.album = 'BlankStudioModel';
  profile.portfolio = null;
  return profile;
}

function release(profile: AiModelProfile): void {
  const index = aiModelProfiles.indexOf(profile);
  if (index >= 0) aiModelProfiles.splice(index, 1);
}

describe('AiModelPortfolioDocumentPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioDocumentPage],
      providers: [provideRouter(testRoutes)],
    }).compileComponents();
  });

  it('embeds the generated portfolio document with its details and download action', async () => {
    const profile = withDocument();
    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${profile.slug}/portfolio`);
      harness.detectChanges();
      const element = harness.routeNativeElement!;

      expect(element.querySelector('.document-frame')).toBeTruthy();
      expect(element.textContent).toContain('Document Studio Model');
      expect(element.textContent).toContain('THE NEVERBEEN STUDIO');
      expect(element.textContent).toContain('George Town, Malaysia');
      expect(element.textContent).toContain('@document.studio.model');
      expect(element.textContent).not.toContain('24 pages');
      expect(element.textContent).not.toContain('Portrait');
      expect(element.textContent).not.toContain('Obsidian Muse');
      expect(element.textContent).not.toContain('Generated');
      expect(element.textContent).not.toContain('4.6 MB');

      const frame = element.querySelector<HTMLIFrameElement>('.document-frame')!;
      expect(frame.getAttribute('src')).toContain('DocumentStudioModel_Portfolio.pdf');

      const download = element.querySelector<HTMLAnchorElement>(
        'a[download="NeverBeen-Portfolio-Document-Studio-Model.pdf"]',
      );
      expect(download).toBeTruthy();
      expect(download?.getAttribute('href')).toContain(
        '/NeverBeenModels/DocumentStudioModel/Portfolio/',
      );
    } finally {
      release(profile);
    }
  });

  it('shows a plain white notice page when the model has no portfolio document', async () => {
    const profile = withoutDocument();
    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${profile.slug}/portfolio`);
      harness.detectChanges();
      const element = harness.routeNativeElement!;

      expect(element.querySelector('.portfolio-missing-page')).toBeTruthy();
      expect(element.querySelector('.document-frame')).toBeFalsy();
      expect(element.textContent).toContain('Portfolio not Available');
      expect(element.textContent).toContain('Blank Studio Model');
      expect(element.textContent).toContain(
        'No portfolio is available for this model yet. Please check again later, or connect with the NeverBeen support team to get the Model Portfolio.',
      );
      expect(element.textContent).toContain('Contact NeverBeen support');
    } finally {
      release(profile);
    }
  });

  it('explains that an unknown model has no portfolio either', async () => {
    const harness = await RouterTestingHarness.create('/ai-models/nobody-here/portfolio');
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    expect(element.textContent).toContain('Portfolio not Available');
    expect(element.textContent).toContain('Browse all AI models');
  });
});
