import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WIDE_BROCHURE, DocumentationPage } from './documentation';

const WIDE_URL = '/assets/documentation/NeverBeen_Documentation_Wide.pdf';

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

  it('publishes the wide landscape brochure as the only document', () => {
    const element: HTMLElement = create().nativeElement;

    expect(WIDE_BROCHURE.url).toBe(WIDE_URL);
    expect(element.querySelectorAll('.pdf-frame iframe').length).toBe(1);
    expect(element.querySelector<HTMLIFrameElement>('iframe')?.getAttribute('src')).toContain(
      WIDE_URL,
    );
    expect(element.querySelector('h2')?.textContent).toContain('Wide landscape brochure');
    expect(element.querySelector('.document-meta')?.textContent).toContain('Wide / landscape');
  });

  it('offers exactly an Open Brochure and a Download Brochure action, both for the landscape PDF', () => {
    const element: HTMLElement = create().nativeElement;
    const { open, download } = actionsOf(element);

    expect(element.querySelectorAll('.viewer-actions a.btn').length).toBe(2);

    expect(open?.getAttribute('href')).toBe(WIDE_URL);
    expect(open?.getAttribute('target')).toBe('_blank');
    expect(open?.getAttribute('rel')).toContain('noopener');

    expect(download?.getAttribute('href')).toBe(WIDE_URL);
    expect(download?.getAttribute('download')).toBe('NeverBeen_Documentation_Wide.pdf');
  });

  it('shows no portrait edition and no layout switcher', () => {
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
