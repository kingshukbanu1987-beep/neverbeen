import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
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
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects || event.url),
    ),
    { initialValue: initialFooterUrl(this.router.url) },
  );
  protected readonly isAiModels = computed(() => {
    const path = this.currentUrl().split(/[?#]/)[0];
    return path === '/ai-models' || path.startsWith('/ai-models/');
  });
  /** The merchandise storefront shares the AI model studio's plum footer. */
  protected readonly isMerchandise = computed(() => {
    const path = this.currentUrl().split(/[?#]/)[0];
    return path === '/merchandise' || path.startsWith('/merchandise/');
  });
  protected readonly isStudioChrome = computed(() => this.isAiModels() || this.isMerchandise());
  protected readonly year = new Date().getFullYear();
  protected readonly tagline = computed(() => this.cms.text('global.footer', 'tagline'));
  protected readonly copyright = computed(() => this.cms.text('global.footer', 'copyright'));
  protected readonly columns = computed(() => this.cms.visibleItems('global.footer', 'columns'));
  protected readonly showAdmin = computed(() => this.cms.flag('global.footer', 'showAdminLink'));
}
