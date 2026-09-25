import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { AdminInsightsService, timeAgo } from '../shared/admin-insights.service';
import { AdminUserSearch } from './user-search';
import { AdminCountryChart } from './country-chart';
import { AdminRegistrationChart } from './registration-chart';
import { AdminSuspiciousUsers } from './suspicious-users';
import { AdminIdentityService } from '../shared/admin-identity.service';

interface ActivityDay {
  label: string;
  posts: number;
  comments: number;
  postsPct: number;
  commentsPct: number;
}

interface StatCard {
  icon: string;
  label: string;
  value: number;
  sub: string;
  glow: string;
  link?: string;
  action?: () => void;
}

/**
 * Admin > Dashboard — user search, key metrics (clickable into detail grids),
 * country & registration charts, 7-day activity, most-engaged journey posts,
 * latest abuse reports and the suspicious-users grid.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, AdminUserSearch, AdminCountryChart, AdminRegistrationChart, AdminSuspiciousUsers],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard {
  private readonly community = inject(CommunityService);
  private readonly insights = inject(AdminInsightsService);
  private readonly router = inject(Router);
  private readonly identity = inject(AdminIdentityService);
  protected readonly timeAgo = timeAgo;

  protected readonly statCards = computed<StatCard[]>(() => {
    const pending = this.insights.pendingReports().length;
    const suspicious = this.insights.suspiciousUsers();
    const highRisk = suspicious.filter((s) => s.riskLevel === 'High').length;
    const idPending = this.identity.pending();
    return [
      { icon: '👥', label: 'Total Members', value: this.insights.members().length, sub: 'registered across the community', glow: 'rgba(16,185,129,0.45)', link: '/admin/dashboard/members/all' },
      { icon: '🟢', label: 'Online Now', value: this.insights.onlineMembers().length, sub: 'members active at this moment', glow: 'rgba(34,197,94,0.45)', link: '/admin/dashboard/members/online' },
      { icon: '✅', label: 'Verified Members', value: this.insights.verifiedMembers().length, sub: 'identity-checked accounts', glow: 'rgba(29,155,240,0.45)', link: '/admin/dashboard/members/verified' },
      {
        icon: '🪪',
        label: 'Identity Check Verification',
        value: idPending.length,
        sub: `${idPending.filter((s) => s.trigger === 'disabled').length} disabled · ${idPending.filter((s) => s.trigger === 'identity_required').length} forced checks awaiting review`,
        glow: 'rgba(139,92,246,0.45)',
        link: '/admin/dashboard/identity-checks',
      },
      { icon: '🚩', label: 'Abuse Reports', value: this.insights.reports().length, sub: `${pending} awaiting a decision`, glow: 'rgba(239,68,68,0.45)', link: '/admin/dashboard/abuse-reports' },
      { icon: '🕵️', label: 'Suspicious Users', value: suspicious.length, sub: `${highRisk} high-risk accounts`, glow: 'rgba(245,158,11,0.5)', action: () => this.scrollTo('suspicious-users') },
    ];
  });

  protected readonly chartDays = computed<ActivityDay[]>(() => {
    const now = new Date();
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), dayKey: d.toISOString().slice(0, 10), posts: 0, comments: 0 };
    });
    const inBucket = (iso: string) => buckets.find((b) => (iso ?? '').startsWith(b.dayKey));
    for (const post of this.community.journeyPosts()) {
      const b = inBucket(post.createdAtUtc);
      if (b) b.posts++;
      for (const c of post.comments ?? []) {
        const cb = inBucket(c.createdAtUtc);
        if (cb) cb.comments++;
      }
    }
    for (const c of this.community.comments()) {
      const b = inBucket(c.createdAtUtc);
      if (b) b.comments++;
    }
    const max = Math.max(1, ...buckets.map((b) => Math.max(b.posts, b.comments)));
    return buckets.map((b) => ({
      label: b.label,
      posts: b.posts,
      comments: b.comments,
      postsPct: Math.max(2, Math.round((b.posts / max) * 100)),
      commentsPct: Math.max(2, Math.round((b.comments / max) * 100)),
    }));
  });

  protected readonly highlightPosts = computed(() => {
    const list = this.insights.highlightPosts().slice(0, 6);
    const top = list[0]?.score || 1;
    return list.map((h, i) => ({ ...h, rank: i + 1, pct: Math.round((h.score / top) * 100) }));
  });

  protected readonly latestReports = computed(() => this.insights.pendingReports().slice(0, 4));

  protected openCard(card: StatCard): void {
    if (card.link) this.router.navigateByUrl(card.link);
    else card.action?.();
  }

  private scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
