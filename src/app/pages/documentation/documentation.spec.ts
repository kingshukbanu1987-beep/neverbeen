import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VISITOR_BROCHURE, DocumentationPage } from './documentation';

const BROCHURE_URL = '/assets/documentation/NeverBeen_Brochure.pdf';

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

  function actionsOf(element: HTMLElement) {
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.viewer-actions a.btn'));
    return {
      open: links.find((link) => link.textContent?.includes('Open Brochure')),
      download: links.find((link) => link.textContent?.includes('Download Brochure')),
    };
  }

  it('publishes the visitor brochure as the only document', () => {
    const element: HTMLElement = create().nativeElement;

    expect(VISITOR_BROCHURE.url).toBe(BROCHURE_URL);
    expect(element.querySelectorAll('.pdf-frame iframe').length).toBe(1);
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(
      BROCHURE_URL,
    );
    expect(element.querySelector('h2')?.textContent).toContain('The NeverBeen brochure');
    expect(element.querySelector('.document-meta')?.textContent).toContain('Wide / landscape');
    expect(element.querySelector('.document-meta')?.textContent).toContain('36 pages');
  });

  it('offers exactly an Open Brochure and a Download Brochure action, both for the landscape PDF', () => {
    const element: HTMLElement = create().nativeElement;
    const { open, download } = actionsOf(element);

    expect(element.querySelectorAll('.viewer-actions a.btn').length).toBe(2);

    expect(open?.getAttribute('href')).toBe(BROCHURE_URL);
    expect(open?.getAttribute('target')).toBe('_blank');
    expect(open?.getAttribute('rel')).toContain('noopener');

    expect(download?.getAttribute('href')).toBe(BROCHURE_URL);
    expect(download?.getAttribute('download')).toBe('NeverBeen_Brochure.pdf');
  });

  it('talks to visitors, not to developers', () => {
    const element: HTMLElement = create().nativeElement;
    const copy = element.textContent ?? '';

    expect(copy).toContain('Neverbeen Request');
    expect(copy).not.toMatch(/admin console/i);
    expect(copy).not.toMatch(/documentation/i);
  });

  it('shows no second edition and no layout switcher', () => {
    const element: HTMLElement = create().nativeElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(element.querySelectorAll('.format-card, .document-controls, .auto-choice').length).toBe(
      0,
    );
    expect(links.filter((link) => link.getAttribute('href')?.includes('Mobile')).length).toBe(0);
    expect(element.textContent).not.toContain('Mobile edition');
    expect(element.textContent).not.toContain('Choose your view');
  });

  it('still lets the visitor leave for the rest of the site', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('.back-link')?.getAttribute('href')).toBe('/');
  });
});
