import { Component, afterNextRender, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  constructor() {
    // Start the site-wide multilingual layer once the first view is rendered.
    afterNextRender(() => this.translation.init());
  }

  /**
   * The Admin Console renders its own full-page shell (side panel, top bar and
   * "Back to Website" link). The site-wide sticky navbar/footer must be hidden
   * on /admin/** routes — otherwise both sticky headers (site nav + admin top
   * bar) fight for the top of the viewport and the admin header ends up
   * covering the website menu while scrolling.
   */
  protected readonly showSiteChrome = computed(() => !this.router.url.startsWith('/admin'));
}
