import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);
  protected readonly open = signal(false);
  protected readonly currentUrl = signal(this.router.url || '');

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }

  protected readonly isCompactLogo = computed(() => {
    const url = this.currentUrl();
    return url.includes('/community') || url.includes('/profile');
  });

  protected readonly links = [
    { label: 'Home', path: '/', fragment: undefined as string | undefined, icon: 'home' },
    { label: 'How', path: '/', fragment: 'how-it-works', icon: 'cog' },
    { label: 'Audience', path: '/audience', fragment: undefined, icon: 'users' },
    { label: 'Collection', path: '/collection', fragment: undefined, icon: 'image' },
    { label: 'Destinations', path: '/', fragment: 'destinations', icon: 'map-pin' },
    { label: 'Live', path: '/travel-feeds', fragment: undefined, icon: 'live' },
    { label: 'Pricing', path: '/', fragment: 'pricing', icon: 'tag' },
    { label: 'FAQ', path: '/', fragment: 'faq', icon: 'help-circle' },
    { label: 'Admin', path: '/login', fragment: undefined, icon: 'log-in' },
    { label: 'Founder', path: '/', fragment: 'owner', icon: 'user' },
    { label: 'Contact', path: '/', fragment: 'contact', icon: 'mail' },
    { label: 'Feedback', path: '/feedback', fragment: undefined, icon: 'message-square' },
  ];

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }
}
