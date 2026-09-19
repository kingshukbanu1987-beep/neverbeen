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
    { label: 'Home', path: '/', fragment: undefined as string | undefined },
    { label: 'How It Works', path: '/', fragment: 'how-it-works' },
    { label: 'Audience', path: '/audience', fragment: undefined },
    { label: 'Collection', path: '/collection', fragment: undefined },
    { label: 'Destinations', path: '/', fragment: 'destinations' },
    { label: 'Pricing', path: '/', fragment: 'pricing' },
    { label: 'Login', path: '/login', fragment: undefined },
    { label: 'Founder', path: '/', fragment: 'owner' },
    { label: 'Contact', path: '/', fragment: 'contact' },
  ];

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }
}
