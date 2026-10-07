import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  protected readonly service = this.community;
  protected readonly aurora = computed(() => this.cms.flag('community.shell', 'aurora'));

  constructor() {
    this.community.unreadChatCount();
  }
}
