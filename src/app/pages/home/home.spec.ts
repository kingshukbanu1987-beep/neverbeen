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
});
