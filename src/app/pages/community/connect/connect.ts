import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';

@Component({
  selector: 'app-community-connect',
  imports: [RouterLink],
  templateUrl: './connect.html',
  styleUrl: './connect.css',
})
export class CommunityConnect {
  protected readonly service = inject(CommunityService);
  private readonly router = inject(Router);

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  async connectWith(provider: 'google' | 'facebook' | 'microsoft'): Promise<void> {
    const res = await this.service.loginWithOAuth(provider, 'auth_code_simulated_' + Date.now());
    if (res.profileComplete) {
      this.router.navigate(['/community/profile']);
    } else {
      this.router.navigate(['/community/register']);
    }
  }

  demoLogin(mode: 'new_pending' | 'active_member'): void {
    this.service.loginAsDemoUser(mode);
    if (mode === 'new_pending') {
      this.router.navigate(['/community/register']);
    } else {
      this.router.navigate(['/community/profile']);
    }
  }
}
