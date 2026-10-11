import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteConfigService } from '../../services/site-config.service';
import { CommunityService } from '../../services/community.service';

@Component({
  selector: 'app-community-hub',
  imports: [RouterOutlet],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class CommunityHub {
  private readonly cms = inject(SiteConfigService);
  /** Publishes chat and notification counts to the community header on every community route. */
  private readonly community = inject(CommunityService);
  private readonly router = inject(Router);
  protected readonly service = this.community;
  protected readonly aurora = computed(() => this.cms.flag('community.shell', 'aurora'));

  private readonly currentUrl = signal(this.router.url || '');

  /**
   * The member's own profile page carries no blank strip above its cards: the hub's top padding
   * is dropped there so the profile starts directly under the community header.
   */
  protected readonly isProfileRoute = computed(() => /\/profile(?:\/|\?|#|$)/.test(this.currentUrl()));

  constructor() {
    this.community.unreadChatCount();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects || event.url));
  }
}
