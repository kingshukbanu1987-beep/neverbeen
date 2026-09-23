import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-community-connect',
  imports: [RouterLink],
  templateUrl: './connect.html',
  styleUrl: './connect.css',
})
export class CommunityConnect implements OnInit {
  protected readonly service = inject(CommunityService);
  protected readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  protected readonly simulateExisting = signal(false);
  protected readonly loadingProvider = signal<string | null>(null);

  ngOnInit(): void {
    // If the user is already authenticated (cookie has key and profile exists), show profile page
    if (this.service.isAuthenticated() && this.service.profile()) {
      this.router.navigate(['/community/profile']);
    }
  }

  setSimulationMode(isExisting: boolean): void {
    this.simulateExisting.set(isExisting);
  }

  /** Switch the entire NeverBeen site to the chosen language. */
  onLanguageChange(event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    this.translation.setLanguage(code);
  }

  async signInWith(provider: 'google' | 'facebook' | 'apple' | 'microsoft'): Promise<void> {
    this.loadingProvider.set(provider);
    try {
      const res = await this.service.loginWithOAuth(provider, this.simulateExisting());
      if (res.profileComplete) {
        this.router.navigate(['/community/profile']);
      } else {
        this.router.navigate(['/community/register']);
      }
    } finally {
      this.loadingProvider.set(null);
    }
  }
}
