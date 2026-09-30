import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocumentationPage } from './documentation';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(matches: boolean): () => void {
  const original = window.matchMedia;
  const listeners = new Set<ChangeListener>();
  const query: MediaQueryList = {
    matches,
    media: '(test)',
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (typeof listener === 'function') listeners.add(listener as ChangeListener);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (typeof listener === 'function') listeners.delete(listener as ChangeListener);
    },
    addListener: (listener: ChangeListener) => listeners.add(listener),
    removeListener: (listener: ChangeListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => query,
  });

  return () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: original });
  };
}

describe('DocumentationPage', () => {
  let restoreMatchMedia: (() => void) | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentationPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => restoreMatchMedia?.());

  function create() {
    const fixture = TestBed.createComponent(DocumentationPage);
    fixture.detectChanges();
    return fixture;
  }

  it('selects the landscape PDF for tablet, laptop and desktop-sized screens', () => {
    restoreMatchMedia = installMatchMedia(false);
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('h2')?.textContent).toContain('Wide screen edition');
    expect(element.querySelector('.format-card.active')?.textContent).toContain('Wide');
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(
      '/documentation/NeverBeen_Documentation_Wide.pdf',
    );
  });

  it('selects the portrait document and exposes its download action on phone-sized screens', () => {
    restoreMatchMedia = installMatchMedia(true);
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('h2')?.textContent).toContain('Mobile edition');
    expect(element.querySelector('.format-card.active')?.textContent).toContain('Mobile');
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(
      '/documentation/NeverBeen_Documentation_Mobile.pdf',
    );

    const download = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((link) =>
      link.textContent?.includes('Download PDF'),
    );
    expect(download?.getAttribute('href')).toBe('/documentation/NeverBeen_Documentation_Mobile.pdf');
    expect(download?.getAttribute('download')).toBe('NeverBeen_Documentation_Mobile.pdf');
  });

  it('lets a visitor override the recommendation and restore it later', () => {
    restoreMatchMedia = installMatchMedia(true);
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const formats = Array.from(element.querySelectorAll<HTMLButtonElement>('.format-card'));

    formats.find((button) => button.textContent?.includes('Wide'))?.click();
    fixture.detectChanges();

    expect(element.querySelector('.screen-status')?.classList.contains('manual')).toBe(true);
    expect(element.querySelector('.format-card.active')?.textContent).toContain('Wide');

    (element.querySelector<HTMLButtonElement>('.auto-choice') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.screen-status')?.classList.contains('manual')).toBe(false);
    expect(element.querySelector('.format-card.active')?.textContent).toContain('Mobile');
  });
});
