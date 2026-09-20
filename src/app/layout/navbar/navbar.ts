import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly open = signal(false);

  protected readonly links = [
    { label: 'Home', path: '/', fragment: undefined as string | undefined, icon: 'home' },
    { label: 'How', path: '/', fragment: 'how-it-works', icon: 'cog' },
    { label: 'Audience', path: '/audience', fragment: undefined, icon: 'users' },
    { label: 'Collection', path: '/collection', fragment: undefined, icon: 'image' },
    { label: 'Destinations', path: '/', fragment: 'destinations', icon: 'map-pin' },
    { label: 'Travel Feeds', path: '/travel-feeds', fragment: undefined, icon: 'globe' },
    { label: 'Pricing', path: '/', fragment: 'pricing', icon: 'tag' },
    { label: 'FAQ', path: '/', fragment: 'faq', icon: 'help-circle' },
    { label: 'Login', path: '/login', fragment: undefined, icon: 'log-in' },
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
