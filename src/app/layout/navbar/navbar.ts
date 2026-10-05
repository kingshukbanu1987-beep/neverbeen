import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';
import { CommunityBadgeService } from '../../services/community-badge.service';
import { CommunityThemePicker } from '../community-theme/community-theme-picker';
import { CommunitySearchBox } from '../community-search/community-search-box';

interface NavLink {
  id: string;
  label: string;
  path: string;
  fragment: string | undefined;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, CommunityThemePicker, CommunitySearchBox],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly cms = inject(SiteConfigService);
  private readonly badges = inject(CommunityBadgeService);
  protected readonly open = signal(false);
  protected readonly currentUrl = signal(this.router.url || '');

  /**
   * Community header badges: unread notifications / unread chats. Read from the
   * small root CommunityBadgeService (fed by the lazy CommunityService) so the
   * eager navbar never pulls the heavyweight community service into the initial bundle.
   */
  protected readonly unreadNotifications = this.badges.unreadNotifications;
  protected readonly unreadChats = this.badges.unreadChats;

  protected badgeText(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

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
   * The Community sign-in / connect page (exact route /community) belongs to the public
   * website: it keeps the full website header (logo + site menu). The community profile
   * header appears only once a visitor enters the community itself (/community/… pages,
   * member profiles and the Message Book).
   */
  private readonly isCommunitySignIn = computed(() => /^\/community(?:\/register)?\/?(\?|#|$)/.test(this.currentUrl()));

  /** Give the AI model studio the same compact, ink-dark site chrome as its portfolio pages. */
  protected readonly isAiModels = computed(() =>
    /^\/ai-models(?:\/|\?|#|$)/.test(this.currentUrl()),
  );

  /**
   * Compact header (smaller bar + 50% logo) on the Community, AI Models, member profiles and the whole
   * Admin Console, so as much of the working area as possible is visible. The Community
   * sign-in page keeps the full-size website header.
   */
  protected readonly isCompactLogo = computed(() => {
    const url = this.currentUrl();
    return (
      !this.isCommunitySignIn() &&
      (this.isAiModels() ||
        url.includes('/community') ||
        url.includes('/profile') ||
        /^\/admin(\/|\?|#|$)/.test(url))
    );
  });

  /** Community pages (hub, profiles, Message Book) — where the member's community theme applies. */
  protected readonly isCommunity = computed(
    () => !this.isCommunitySignIn() && /^\/(community|profile)(\/|\?|#|$)/.test(this.currentUrl()),
  );

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
