import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SiteConfigService } from '../../services/site-config.service';
import { Home } from './home';

describe('Home history restoration', () => {
  it('reloads a cached history restore, but not a normal page load', () => {
    let reloads = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: { location: { reload: () => reloads++ } } } },
        { provide: SiteConfigService, useValue: { visibleItems: () => [] } },
      ],
    });
    const home = TestBed.runInInjectionContext(() => new Home());
    home['onPageShow'](new PageTransitionEvent('pageshow', { persisted: false }));
    expect(reloads).toBe(0);
    home['onPageShow'](new PageTransitionEvent('pageshow', { persisted: true }));
    expect(reloads).toBe(1);
    // The fresh page's pageshow must not start a reload loop.
    home['onPageShow'](new PageTransitionEvent('pageshow', { persisted: false }));
    expect(reloads).toBe(1);
  });

  it('moves How It Works immediately before Pricing', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: { location: { reload: () => {} } } } },
      ],
    });
    const home = TestBed.runInInjectionContext(() => new Home());
    const ids = home['sections']().map((s) => s.id);
    const pricingIdx = ids.indexOf('pricing');
    expect(pricingIdx).toBeGreaterThan(0);
    expect(ids[pricingIdx - 1]).toBe('how');
  });

  it('orders Brochure under Multiverse and Storyline below Brochure', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: { location: { reload: () => {} } } } },
      ],
    });
    const home = TestBed.runInInjectionContext(() => new Home());
    const ids = home['sections']().map((s) => s.id);
    const multiverseIdx = ids.indexOf('multiverse');
    expect(multiverseIdx).toBeGreaterThanOrEqual(0);
    expect(ids[multiverseIdx + 1]).toBe('brochure');
    expect(ids[multiverseIdx + 2]).toBe('storyline');
  });
});
