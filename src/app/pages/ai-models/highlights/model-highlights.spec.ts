import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiModelHighlight, AiModelProfile } from '../ai-model-data';
import { ModelHighlights } from './model-highlights';

const highlights: AiModelHighlight[] = [
  {
    id: 'shiraz-diaries',
    name: 'Shiraz Diaries',
    cover: '/NeverBeenModels/TestStudioModel/Highlights/shiraz/01-cover.jpg',
    music: '/NeverBeenModels/TestStudioModel/theme.mp3',
    items: [
      {
        kind: 'photo',
        src: '/NeverBeenModels/TestStudioModel/Highlights/shiraz/01.jpg',
        type: '',
        poster: '',
        caption: '',
      },
      {
        kind: 'photo',
        src: '/NeverBeenModels/TestStudioModel/Highlights/shiraz/02.jpg',
        type: '',
        poster: '',
        caption: '',
      },
      {
        kind: 'photo',
        src: '/NeverBeenModels/TestStudioModel/Highlights/shiraz/03.jpg',
        type: '',
        poster: '',
        caption: '',
      },
    ],
    photoCount: 3,
    videoCount: 0,
  },
  {
    id: 'motion',
    name: 'Motion',
    cover: '/NeverBeenModels/TestStudioModel/Highlights/motion/01-cover.jpg',
    music: '',
    items: [
      {
        kind: 'photo',
        src: '/NeverBeenModels/TestStudioModel/Highlights/motion/01.jpg',
        type: '',
        poster: '',
        caption: '',
      },
      {
        kind: 'video',
        src: '/NeverBeenModels/TestStudioModel/Highlights/motion/02.mp4',
        type: 'video/mp4',
        poster: '',
        caption: '',
      },
    ],
    photoCount: 1,
    videoCount: 1,
  },
];

function model(overrides: Partial<AiModelProfile> = {}): AiModelProfile {
  return {
    slug: 'test-studio-model',
    name: 'Test Studio Model',
    cover: '/NeverBeenModels/TestStudioModel/cover.jpg',
    album: 'TestStudioModel',
    location: 'George Town, Malaysia',
    age: '29',
    height: '170 cm',
    weight: '58 kg',
    bodyShape: 'Hourglass',
    bust: '85 cm',
    waist: '64 cm',
    hip: '92 cm',
    handle: '@test.studio.model',
    tags: [],
    availability: 'Open for bookings',
    order: 99,
    photoRate: 550,
    photoNote: '',
    bio: '',
    illustrative: true,
    gallery: [],
    photos: [],
    videos: [],
    highlights,
    ...overrides,
  };
}

@Component({
  imports: [ModelHighlights],
  template: `<app-model-highlights [model]="profile()" />`,
})
class RailHost {
  readonly profile = signal(model());
}

describe('ModelHighlights', () => {
  let fixture: ComponentFixture<RailHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({ imports: [RailHost] }).compileComponents();
    fixture = TestBed.createComponent(RailHost);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  const circles = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.highlight-bubble'));

  it('shows one Instagram-style circle per Highlights sub-folder, with its name and count', () => {
    expect(element.querySelector('.highlights-section')).not.toBeNull();
    expect(element.querySelector('#model-highlights-title')?.textContent?.trim()).toBe(
      'Highlights',
    );
    // The brief removed the old "STORY ARCHIVE · NEVER EXPIRES" header above the title.
    expect(element.querySelector('.highlights-eyebrow')).toBeNull();
    expect(element.querySelector('.highlights-heading')?.textContent).not.toContain(
      'Story archive',
    );
    expect(element.querySelector('.highlights-count')?.textContent).toContain('2');
    expect(circles().length).toBe(2);

    const names = circles().map(
      (circle) => circle.querySelector('.highlight-name')?.textContent?.trim() ?? '',
    );
    expect(names).toEqual(['Shiraz Diaries', 'Motion']);
    expect(circles()[0].querySelector('img')?.getAttribute('src')).toContain('01-cover.jpg');
    expect(circles()[0].querySelector('.highlight-meta')?.textContent?.trim()).toBe('3 stories');
    expect(circles()[1].querySelector('.highlight-badge')?.textContent?.trim()).toBe('▶');
    expect(circles()[0].getAttribute('aria-label')).toContain('Play the Shiraz Diaries highlight');
    expect(circles()[0].getAttribute('aria-label')).toContain('with music');
  });

  it('plays the stories in the portrait viewer when a circle is clicked', () => {
    circles()[0].click();
    fixture.detectChanges();

    const viewer = element.querySelector('app-highlight-viewer');
    expect(viewer).not.toBeNull();
    expect(element.querySelector('.story-identity-copy strong')?.textContent?.trim()).toBe(
      'Shiraz Diaries',
    );
    expect(element.querySelector('.story-media')?.getAttribute('src')).toContain(
      'Highlights/shiraz/01.jpg',
    );
  });

  it('returns to the rail when the viewer is closed', () => {
    circles()[0].click();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('[aria-label="Close the highlight"]')!.click();
    fixture.detectChanges();

    expect(element.querySelector('app-highlight-viewer')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('renders nothing at all for a model without highlights', () => {
    fixture.componentInstance.profile.set(model({ highlights: [] }));
    fixture.detectChanges();

    expect(element.querySelector('.highlights-section')).toBeNull();
    expect(element.querySelector('app-highlight-viewer')).toBeNull();
  });
});
