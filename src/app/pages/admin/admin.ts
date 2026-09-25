import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminInsightsService } from './shared/admin-insights.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { SiteConfigService } from '../../services/site-config.service';

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
  protected readonly insights = inject(AdminInsightsService);

  protected readonly navItems: AdminNavItem[] = [
    { path: 'dashboard', label: 'Dashboard', icon: '📊', hint: 'Website statistics & activity' },
    { path: 'repositories', label: 'Repositories', icon: '🗄️', hint: 'Connected git repos & integrations' },
    { path: 'users', label: 'User Management', icon: '👥', hint: 'Accounts, roles, security & audit' },
    { path: 'data', label: 'Data Management', icon: '💾', hint: 'Privacy, retention, quality & backups' },
    { path: 'website', label: 'Website Management', icon: '🌐', hint: 'Edit Home, Community & site-wide components' },
    { path: 'maintenance', label: 'Site Downtime', icon: '🚧', hint: 'Take the website down for critical releases' },
    { path: 'health', label: 'Health', icon: '🩺', hint: 'Traffic, activity, storage & performance' },
  ];

  protected readonly onlineCount = this.insights.onlineMembers;
  protected readonly memberCount = this.insights.members;
  protected readonly toast = this.insights.toast;
  protected readonly maintenance = inject(MaintenanceService);
  protected readonly cms = inject(SiteConfigService);

  logout(): void {
    this.adminAuth.logout();
  }
}
