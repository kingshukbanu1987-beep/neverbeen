import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';

/**
 * OAuth callback (also served at `/auth/callback`, the URL registered with each provider).
 *
 * The provider appends the authorization `code`; `loginWithOAuth` sends it to the NeverBeen
 * Web API (`POST /api/auth/oauth/login`), which exchanges it for the member's data and a JWT.
 * A member without a completed profile goes on to the registration page — and that page's
 * "Create Neverbeen Account" button writes the profile to the database.
 */
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
    const provider = String(params['state'] || params['provider'] || 'google').toLowerCase();
    const providerError = params['error_description'] || params['error'];

    if (providerError) {
      this.errorMessage.set(
        `${provider} sign-in was cancelled or refused: ${String(providerError)}`,
      );
      return;
    }

    let code = params['code'] ? String(params['code']) : '';
    if (!code) {
      // No provider round-trip happened (a preview/demo visit to this page). Keep the demo
      // usable only while the Web API is unavailable; with the API online a real code is
      // required, so the member is sent back to the sign-in page instead of faking a session.
      const apiOnline = await this.service.checkApiOnline();
      if (apiOnline) {
        this.errorMessage.set(
          'The sign-in provider did not return an authorization code. Please start again from the Connect page.',
        );
        return;
      }
      code = 'mock_code_' + Date.now();
    }

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
