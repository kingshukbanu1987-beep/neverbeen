import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteConfigService } from '../../services/site-config.service';

@Component({
  selector: 'app-community-hub',
  imports: [RouterOutlet],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class CommunityHub {
  private readonly cms = inject(SiteConfigService);
  protected readonly aurora = computed(() => this.cms.flag('community.shell', 'aurora'));
}
