import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteRecoveryService } from './site-recovery.service';

/**
 * The service only ever talks to the browser through DOCUMENT, so every test drives a small
 * fake document/window and checks the one thing that matters: a broken tab is repaired once —
 * never twice, so no visitor can end up in a reload loop.
 */
interface FakeBrowser {
  document: any;
  reloads: string[];
  navigations: string[];
}

function setup(
  options: { href?: string; main?: any; visibility?: DocumentVisibilityState } = {},
): FakeBrowser {
  const reloads: string[] = [];
  const navigations: string[] = [];
  const href = options.href ?? 'https://neverbeen.test/';
  const main =
    options.main === undefined
      ? { querySelector: () => ({ nextElementSibling: {} }) }
      : options.main;
  const document = {
    baseURI: 'https://neverbeen.test/',
    visibilityState: options.visibility ?? 'visible',
    querySelector: (selector: string) => (selector === 'main' ? main : null),
    defaultView: {
      location: {
        href,
        reload: () => reloads.push(href),
        assign: (url: string) => navigations.push(url),
      },
      addEventListener: () => undefined,
      sessionStorage: window.sessionStorage,
    },
  };
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: document }, provideRouter([])],
  });
  return { document, reloads, navigations };
}

describe('SiteRecoveryService', () => {
  beforeEach(() => {
    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('reloads the page already open when a navigation fails', () => {
    const browser = setup({ href: 'https://neverbeen.test/' });
    const service = TestBed.inject(SiteRecoveryService);

    // The visitor is on the home page and the AI Models route could not be loaded.
    expect(service.recoverFailedNavigation('/ai-models')).toBe(true);
    expect(browser.navigations).toEqual(['https://neverbeen.test/ai-models']);
    expect(browser.reloads).toEqual([]);
  });

  it('reloads instead of navigating when the failing URL is the page already open', () => {
    const browser = setup({ href: 'https://neverbeen.test/ai-models' });
    const service = TestBed.inject(SiteRecoveryService);

    expect(service.recoverFailedNavigation('/ai-models')).toBe(true);
    expect(browser.reloads).toEqual(['https://neverbeen.test/ai-models']);
  });

  it('never retries the same URL twice in one tab, even after the guard was written', () => {
    const browser = setup();
    const first = TestBed.inject(SiteRecoveryService);
    expect(first.recoverFailedNavigation('/ai-models')).toBe(true);

    // A second failure for the same URL (for example the reload did not help) must not loop.
    expect(first.recoverFailedNavigation('/ai-models')).toBe(false);
    expect(browser.navigations).toHaveLength(1);

    // The guard lives in the tab, so a brand-new application instance honours it too.
    TestBed.resetTestingModule();
    const second = setup();
    expect(TestBed.inject(SiteRecoveryService).recoverFailedNavigation('/ai-models')).toBe(false);
    expect(second.navigations).toHaveLength(0);
  });

  it('ignores an empty URL', () => {
    const browser = setup();
    const service = TestBed.inject(SiteRecoveryService);
    expect(service.recoverFailedNavigation('')).toBe(false);
    expect(service.recoverFailedNavigation(null)).toBe(false);
    expect(browser.navigations).toHaveLength(0);
    expect(browser.reloads).toHaveLength(0);
  });

  describe('content watch', () => {
    afterEach(() => {
      TestBed.inject(SiteRecoveryService).stop();
    });

    it('keeps a page that rendered its routed component', async () => {
      const browser = setup();
      const service = TestBed.inject(SiteRecoveryService);
      service.startContentWatch();
      // Verify the decision itself: a rendered page is left alone.
      expect(service['hasRoutedContent'](browser.document.querySelector('main'))).toBe(true);
      service.stop();
      expect(browser.reloads).toHaveLength(0);
    });

    it('repairs a page that came back with only the header and the footer', () => {
      // The router outlet exists but nothing was built after it.
      const browser = setup({ main: { querySelector: () => ({ nextElementSibling: null }) } });
      const service = TestBed.inject(SiteRecoveryService);

      service['checkRoutedContent'](true);

      expect(browser.reloads).toEqual(['https://neverbeen.test/']);
    });

    it('does not touch the maintenance page or the stand-alone admin pages (no <main>)', () => {
      const browser = setup({ main: null });
      const service = TestBed.inject(SiteRecoveryService);

      service['checkRoutedContent'](true);

      expect(browser.reloads).toHaveLength(0);
      expect(browser.navigations).toHaveLength(0);
    });
  });
});
