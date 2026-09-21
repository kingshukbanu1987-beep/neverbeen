import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommunityService } from '../../services/community.service';

@Component({
  selector: 'app-community-hub',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class CommunityHub {
  protected readonly service = inject(CommunityService);
  private readonly router = inject(Router);

  logout(): void {
    this.service.logout();
    this.router.navigate(['/community']);
  }
}
