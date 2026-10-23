import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';

function initialFooterUrl(routerUrl: string): string {
  if (routerUrl && routerUrl !== '/') return routerUrl;
  if (typeof location !== 'undefined' && location.pathname && location.pathname !== '/') {
    return `${location.pathname}${location.search}${location.hash}`;
  }
  return routerUrl || '';
}

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly cms = inject(SiteConfigService);
  private readonly router = inject(Router);
  protected readonly currentUrl = signal(initialFooterUrl(this.router.url));
  protected readonly isAiModels = computed(() =>
    /^\/?ai-models(?:\/|\?|#|$)/.test(this.currentUrl()),
  );
  protected readonly year = new Date().getFullYear();
  protected readonly tagline = computed(() => this.cms.text('global.footer', 'tagline'));
  protected readonly copyright = computed(() => this.cms.text('global.footer', 'copyright'));
  protected readonly columns = computed(() => this.cms.visibleItems('global.footer', 'columns'));
  protected readonly showAdmin = computed(() => this.cms.flag('global.footer', 'showAdminLink'));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }
}
