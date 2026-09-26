import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfigService } from '../../services/site-config.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly cms = inject(SiteConfigService);
  protected readonly year = new Date().getFullYear();
  protected readonly tagline = computed(() => this.cms.text('global.footer', 'tagline'));
  protected readonly copyright = computed(() => this.cms.text('global.footer', 'copyright'));
  protected readonly columns = computed(() => this.cms.visibleItems('global.footer', 'columns'));
  protected readonly showAdmin = computed(() => this.cms.flag('global.footer', 'showAdminLink'));
}
