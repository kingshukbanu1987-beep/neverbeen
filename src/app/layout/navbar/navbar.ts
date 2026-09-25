import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';

interface NavLink {
  id: string;
  label: string;
  path: string;
  fragment: string | undefined;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly cms = inject(SiteConfigService);
  protected readonly open = signal(false);
  protected readonly currentUrl = signal(this.router.url || '');

  constructor() {
    // Publish the live header height as a CSS variable (--site-nav-h) so other sticky
    // elements (e.g. the Admin Console topbar/side panel) can sit below the website header
    // instead of covering it when the page is scrolled.
    const host = inject(ElementRef<HTMLElement>);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const header = (host.nativeElement as HTMLElement).querySelector<HTMLElement>('.nav');
      if (!header || typeof ResizeObserver === 'undefined') return;
      const root = document.documentElement;
      const update = () => root.style.setProperty('--site-nav-h', `${header.offsetHeight}px`);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(header);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }

  /**
   * Compact header (smaller bar + 50% logo) on the Community, member profiles and the whole
   * Admin Console, so as much of the working area as possible is visible.
   */
  protected readonly isCompactLogo = computed(() => {
    const url = this.currentUrl();
    return url.includes('/community') || url.includes('/profile') || /^\/admin(\/|\?|#|$)/.test(url);
  });

  private readonly allLinks: NavLink[] = [
    { id: 'home', label: 'Home', path: '/', fragment: undefined as string | undefined, icon: 'home' },
    { id: 'how', label: 'How', path: '/', fragment: 'how-it-works', icon: 'cog' },
    { id: 'audience', label: 'Audience', path: '/audience', fragment: undefined, icon: 'users' },
    { id: 'collection', label: 'Collection', path: '/collection', fragment: undefined, icon: 'image' },
    { id: 'destinations', label: 'Destinations', path: '/', fragment: 'destinations', icon: 'map-pin' },
    { id: 'live', label: 'Live', path: '/travel-feeds', fragment: undefined, icon: 'live' },
    { id: 'pricing', label: 'Pricing', path: '/', fragment: 'pricing', icon: 'tag' },
    { id: 'faq', label: 'FAQ', path: '/', fragment: 'faq', icon: 'help-circle' },
    { id: 'admin', label: 'Admin', path: '/login', fragment: undefined, icon: 'log-in' },
    { id: 'founder', label: 'Founder', path: '/', fragment: 'owner', icon: 'user' },
    { id: 'contact', label: 'Contact', path: '/', fragment: 'contact', icon: 'mail' },
    { id: 'feedback', label: 'Feedback', path: '/feedback', fragment: undefined, icon: 'message-square' },
  ];

  /** Menu options in the order, wording and visibility published in Website Management. */
  protected readonly links = computed(() =>
    this.cms
      .visibleItems('global.navbar', 'links')
      .map((item) => {
        const base = this.allLinks.find((l) => l.id === item.id);
        return base ? { ...base, label: item.label } : null;
      })
      .filter((l): l is NavLink => l !== null),
  );

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }
}
