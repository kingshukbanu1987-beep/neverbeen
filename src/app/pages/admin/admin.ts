import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AdminMailService } from './mail/admin-mail.service';
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
  protected readonly mail = inject(AdminMailService);
  private readonly router = inject(Router);

  /** Sub-items of the collapsible "Mail" group (shown right below Dashboard). */
  protected readonly mailItems = [
    { path: 'mail/inbox', label: 'Inbox', icon: '📥', hint: 'Messages from other admins' },
    { path: 'mail/sent', label: 'Sent', icon: '📤', hint: 'Messages you sent to admins' },
    { path: 'mail/compose', label: 'Compose', icon: '✏️', hint: 'Write to one or more admins' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly inMail = computed(() => this.url().startsWith('/admin/mail'));
  private readonly mailToggled = signal<boolean | null>(null);
  /** Open by default; the admin can collapse it (it re-opens while a Mail page is shown). */
  protected readonly mailOpen = computed(() => this.inMail() || (this.mailToggled() ?? true));

  protected toggleMail(): void {
    this.mailToggled.set(!this.mailOpen());
  }

  logout(): void {
    this.adminAuth.logout();
  }
}
