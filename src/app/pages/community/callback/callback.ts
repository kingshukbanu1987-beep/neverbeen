import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';

@Component({
  selector: 'app-community-callback',
  imports: [RouterLink],
  templateUrl: './callback.html',
  styleUrl: './callback.css',
})
export class CommunityCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CommunityService);

  protected readonly statusMessage = signal('Validating authorization code with OAuth provider...');
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParams;
    const code = params['code'] || 'mock_code_' + Date.now();
    const provider = params['state'] || 'google';

    try {
      this.statusMessage.set(`Exchanging credentials with NeverBeen.API (${provider})...`);
      const res = await this.service.loginWithOAuth(provider, code);
      if (res.profileComplete) {
        this.statusMessage.set('Sign in verified! Redirecting to your profile...');
        setTimeout(() => this.router.navigate(['/community/profile']), 500);
      } else {
        this.statusMessage.set('New member detected! Redirecting to complete registration...');
        setTimeout(() => this.router.navigate(['/community/register']), 500);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to complete OAuth authentication.');
    }
  }
}
