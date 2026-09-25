import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { AnnouncementBar } from './layout/announcement-bar/announcement-bar';
import { MaintenancePage } from './layout/maintenance-page/maintenance-page';
import { TranslationService } from './services/translation.service';
import { MaintenanceService, isBypassPath } from './services/maintenance.service';
import { SiteConfigService } from './services/site-config.service';
import { SiteAnalyticsService } from './services/site-analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, AnnouncementBar, MaintenancePage],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly maintenance = inject(MaintenanceService);
  private readonly cms = inject(SiteConfigService);
  private readonly analytics = inject(SiteAnalyticsService);

  private readonly url = signal(typeof location !== 'undefined' ? location.pathname : '/');

  /** Visitors see only the maintenance page while the site is down (admins keep /admin and /login). */
  protected readonly showMaintenance = computed(() => this.maintenance.isDown() && !this.cms.previewMode && !isBypassPath(this.url()));
  protected readonly showAnnouncement = computed(() => !isBypassPath(this.url()));
  /** Print-only pages (Admin → Health report) render without the site chrome. */
  protected readonly bare = computed(() => this.url().split(/[?#]/)[0].endsWith('/admin/health-report'));

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const url = e.urlAfterRedirects || e.url;
      this.url.set(url);
      // First-party page-view analytics for Admin → Health (skipped inside the admin preview frame).
      if (!this.cms.previewMode) this.analytics.recordView(url);
    });
    this.analytics.start();

    // Start the site-wide multilingual layer once the first view is rendered.
    afterNextRender(() => this.translation.init());
  }
}
