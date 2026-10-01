import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocumentationPage } from './documentation';

const BROCHURE_URL = '/assets/documentation/Neverbeen_Brochure.pdf';

describe('DocumentationPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentationPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(DocumentationPage);
    fixture.detectChanges();
    return fixture;
  }

  function link(element: HTMLElement, label: string): HTMLAnchorElement | undefined {
    return Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((anchor) =>
      anchor.textContent?.includes(label),
    );
  }

  it('presents the Neverbeen Brochure as the one and only document', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('h2')?.textContent).toContain('Neverbeen Brochure');
    expect(element.querySelectorAll('iframe')).toHaveLength(1);
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(
      BROCHURE_URL,
    );
    expect(element.querySelector('iframe')?.getAttribute('title')).toContain('Neverbeen Brochure');
  });

  it('describes the document as wide landscape', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('.viewer-header .eyebrow')?.textContent).toContain('Wide landscape');
    expect(element.querySelector('.pdf-frame')).not.toBeNull();
  });

  it('opens the brochure in a new tab with "Open Brochure"', () => {
    const open = link(create().nativeElement, 'Open Brochure');

    expect(open).toBeDefined();
    expect(open?.getAttribute('href')).toBe(BROCHURE_URL);
    expect(open?.getAttribute('target')).toBe('_blank');
    expect(open?.getAttribute('rel')).toContain('noopener');
  });

  it('downloads the brochure with "Download Brochure"', () => {
    const download = link(create().nativeElement, 'Download Brochure');

    expect(download).toBeDefined();
    expect(download?.getAttribute('href')).toBe(BROCHURE_URL);
    expect(download?.getAttribute('download')).toBe('Neverbeen_Brochure.pdf');
  });

  it('offers exactly the two brochure actions and no edition switcher', () => {
    const element: HTMLElement = create().nativeElement;
    const actions = Array.from(element.querySelectorAll('.viewer-actions a')).map((anchor) =>
      anchor.textContent?.replace(/[↗↓]/g, '').trim(),
    );

    expect(actions).toEqual(['Open Brochure', 'Download Brochure']);
    expect(element.querySelector('.format-card')).toBeNull();
    expect(element.querySelector('.auto-choice')).toBeNull();
    expect(element.querySelector('.screen-status')).toBeNull();
    expect(element.textContent).not.toContain('Mobile edition');
    expect(element.textContent).not.toContain('Wide screen edition');
  });

  it('does not mention the Admin Console or site management', () => {
    const text = (create().nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toMatch(/admin console/i);
    expect(text).not.toMatch(/website management/i);
  });
});
