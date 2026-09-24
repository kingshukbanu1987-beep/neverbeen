import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { CommunityService } from '../../services/community.service';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
  hint: string;
}

/**
 * NeverBeen Admin Console shell — side panel navigation + routed pages.
 * Reachable only after signing in at /login with the demo admin account.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminLayout {
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

  logout(): void {
    this.adminAuth.logout();
  }
}
