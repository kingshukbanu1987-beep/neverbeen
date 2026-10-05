import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { aiModelProfiles } from './ai-model-data';
import { AiModelPortfolioPage } from './ai-model-portfolio';

describe('AiModelPortfolioPage', () => {
  const nourhan = aiModelProfiles.find((profile) => profile.slug === 'nourhan-durrani');

  beforeEach(async () => {
    const paramMap = convertToParamMap({ slug: 'nourhan-durrani' });
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap },
            paramMap: of(paramMap),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.querySelector('.studio-lightbox')?.remove();
  });

  function create() {
    const fixture = TestBed.createComponent(AiModelPortfolioPage);
    fixture.detectChanges();
    return fixture;
  }

  function lightbox(): HTMLElement | null {
    return document.body.querySelector('.studio-lightbox');
  }

  it('opens Nourhan Durrani on a large studio frame and lists the rest of the session', () => {
    expect(nourhan?.gallery.length).toBe(10);

    const element: HTMLElement = create().nativeElement;
    const frames = element.querySelectorAll('.cover-shot, .gallery-frame');

    expect(element.querySelector('h1')?.textContent).toContain('Nourhan Durrani');
    expect(frames.length).toBe(10);
    expect(element.querySelector('.cover-shot img')?.getAttribute('src')).toBe(
      nourhan?.gallery[0].src,
    );
    expect(element.querySelector('.gallery-pending')).toBeNull();
    expect(lightbox()).toBeNull();
  });

  it('expands a photograph in a dialog and steps through the session', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const press = (key: string) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };

    (element.querySelector('.cover-shot') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(lightbox()?.getAttribute('role')).toBe('dialog');
    expect(lightbox()?.querySelector('figure img')?.getAttribute('src')).toBe(
      nourhan?.gallery[0].src,
    );
    expect(lightbox()?.textContent).toContain('Ivory Architecture');
    expect(lightbox()?.textContent).toContain('01 / 10');
    expect(document.body.style.overflow).toBe('hidden');

    (lightbox()?.querySelector('figure') as HTMLElement).click();
    fixture.detectChanges();
    expect(lightbox()).not.toBeNull();

    (lightbox()?.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(lightbox()?.querySelector('figure img')?.getAttribute('src')).toBe(
      nourhan?.gallery[1].src,
    );

    press('ArrowLeft');
    expect(lightbox()?.querySelector('figure img')?.getAttribute('src')).toBe(
      nourhan?.gallery[0].src,
    );

    press('Escape');
    expect(lightbox()).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes when the backdrop is clicked and returns to the chosen frame', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    (element.querySelectorAll('.gallery-frame')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(lightbox()?.querySelector('figure img')?.getAttribute('src')).toBe(
      nourhan?.gallery[2].src,
    );

    lightbox()?.click();
    fixture.detectChanges();
    expect(lightbox()).toBeNull();
  });
});
