import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { CommunityService } from '../../services/community.service';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
  hint: string;
}

interface TopbarMemberResult {
  id: number;
  fullName: string;
  profilePhotoUrl: string;
  profession: string;
  location: string;
  isAccountDisabled: boolean;
  isCurrentUser: boolean;
}

/**
 * NeverBeen Admin Console shell — side panel navigation + routed pages.
 * Reachable only after signing in at /login with the demo admin account.
 *
 * The top bar also hosts a global member search box: find any community
 * member by name, profession, city or country and disable / re-enable their
 * account right from the dropdown.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminLayout {
  private readonly el = inject(ElementRef);
  protected readonly adminAuth = inject(AdminAuthService);
  protected readonly community = inject(CommunityService);

  protected readonly navItems: AdminNavItem[] = [
    { path: 'dashboard', label: 'Dashboard', icon: '📊', hint: 'Website statistics & activity' },
    { path: 'repositories', label: 'Repositories', icon: '🗄️', hint: 'Connected git repos & integrations' },
    { path: 'users', label: 'User Management', icon: '👥', hint: 'Community member profiles' },
    { path: 'data', label: 'Data Management', icon: '💾', hint: 'Datasets, storage & backups' },
  ];

  protected readonly onlineCount = this.community.onlineCompanions;
  protected readonly memberCount = this.community.companions.asReadonly();

  // ---------------------- Top bar: member search ----------------------
  protected readonly searchQuery = signal('');
  protected readonly resultsOpen = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: number | null = null;

  /** Live matches from the member directory (capped so the dropdown stays readable). */
  protected readonly searchResults = computed<TopbarMemberResult[]>(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) return [];
    const current = this.community.currentUser();
    return this.community
      .companions()
      .filter((c) =>
        [c.fullName, c.profession, c.city, c.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        fullName: c.fullName || 'Unnamed member',
        profilePhotoUrl: c.profilePhotoUrl || '',
        profession: c.profession || '—',
        location: [c.city, c.country].filter(Boolean).join(', ') || '—',
        isAccountDisabled: c.isAccountDisabled === true,
        isCurrentUser: c.id === current?.id,
      }));
  });

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.resultsOpen.set(true);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.resultsOpen.set(false);
  }

  /** Disable (or re-enable) a member's account from the search dropdown. */
  toggleDisabled(member: TopbarMemberResult): void {
    if (member.isCurrentUser) {
      this.showToast('You cannot disable the member that is currently signed in.');
      return;
    }
    const disabling = !member.isAccountDisabled;
    this.community.adminSetAccountDisabled(member.id, disabling);
    this.showToast(
      disabling
        ? `${member.fullName}'s account has been disabled — hidden from the community until re-enabled.`
        : `${member.fullName}'s account has been re-enabled.`,
    );
  }

  /** Close the dropdown when clicking anywhere outside the admin console. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.resultsOpen.set(false);
    }
  }

  protected showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      if (this.toast() === message) this.toast.set(null);
      this.toastTimer = null;
    }, 3200);
  }

  logout(): void {
    this.adminAuth.logout();
  }
}
