import { Component, computed, inject } from '@angular/core';
import { CommunityService } from '../../../services/community.service';
import type { JourneyPost } from '../../../models/community';

interface ActivityDay {
  label: string;
  posts: number;
  comments: number;
  total: number;
  heightPct: (kind: 'posts' | 'comments') => number;
}

/**
 * Admin > Dashboard — website statistics: key metrics, a 7-day activity
 * chart (pure CSS bars) and the latest community activity feed.
 */
@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="admin-page-head">
      <h2>Website Statistics</h2>
      <p>Live overview of the NeverBeen platform — members, content and engagement.</p>
    </div>

    <!-- Key metric cards -->
    <div class="stat-grid">
      @for (card of statCards(); track card.label) {
        <article class="stat-card" [style.--stat-glow]="card.glow">
          <span class="stat-icon" aria-hidden="true">{{ card.icon }}</span>
          <p class="stat-label">{{ card.label }}</p>
          <p class="stat-value">{{ card.value }}</p>
          <p class="stat-sub">{{ card.sub }}</p>
        </article>
      }
    </div>

    <div class="dash-lower">
      <!-- 7-day activity chart -->
      <section class="chart-card">
        <header class="chart-head">
          <div>
            <h3>7-Day Activity</h3>
            <p>Posts &amp; comments created per day</p>
          </div>
          <div class="chart-legend">
            <span><i class="sw sw-posts"></i> Posts</span>
            <span><i class="sw sw-comments"></i> Comments</span>
          </div>
        </header>

        @if (chartDays().length === 0) {
          <p class="empty-note">No activity recorded yet.</p>
        } @else {
          <div class="chart-plot">
            @for (day of chartDays(); track day.label) {
              <div class="chart-col" [title]="'{{ day.label }}: {{ day.posts }} posts, {{ day.comments }} comments'">
                <div class="chart-bars">
                  <span class="bar bar-posts" [style.height.%]="day.heightPct('posts')" [class.tiny]="day.posts === 0"></span>
                  <span class="bar bar-comments" [style.height.%]="day.heightPct('comments')" [class.tiny]="day.comments === 0"></span>
                </div>
                <span class="chart-total">{{ day.posts + day.comments }}</span>
                <span class="chart-label">{{ day.label }}</span>
              </div>
            }
          </div>
        }
      </section>

      <!-- Latest activity feed -->
      <section class="feed-card">
        <header class="chart-head">
          <div>
            <h3>Latest Journey Posts</h3>
            <p>Most recent content published by members</p>
          </div>
        </header>

        @if (recentPosts().length === 0) {
          <p class="empty-note">No journey posts yet — content will appear here as members publish.</p>
        } @else {
          <ul class="feed-list">
            @for (post of recentPosts(); track post.id) {
              <li class="feed-item">
                <img
                  class="feed-avatar"
                  [src]="post.author ? post.author.profilePhotoUrl ?? '' : ''"
                  [alt]="'Avatar of ' + (post.author ? post.author.fullName ?? 'member' : 'member')"
                />
                <div class="feed-body">
                  <p class="feed-title">
                    <strong>{{ post.author ? post.author.fullName ?? 'Member' : 'Member' }}</strong>
                    <span class="feed-time">{{ post.timeAgo() }}</span>
                  </p>
                  <p class="feed-text">{{ post.snippet() }}</p>
                  <p class="feed-meta">
                    <span>♥ {{ post.likeCount }}</span>
                    <span>💬 {{ post.comments ? post.comments.length : 0 }}</span>
                    @if (post.location) {
                      <span>📍 {{ post.location }}</span>
                    }
                  </p>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styleUrl: './dashboard.css',
})
export class AdminDashboard {
  private readonly community = inject(CommunityService);

  protected readonly totalMembers = computed(() => this.community.companions().length);
  protected readonly onlineCount = computed(() => this.community.onlineCompanions().length);
  protected readonly totalPosts = computed(() => this.community.journeyPosts().length);
  protected readonly totalComments = computed(() => this.community.comments().length);
  protected readonly pendingRequests = computed(
    () =>
      this.community
        .companions()
        .filter((c) => c.status === 'pending_incoming' || c.status === 'pending_outgoing')
        .length,
  );
  protected readonly verifiedCount = computed(
    () => this.community.companions().filter((c) => c.isVerified).length,
  );
  protected readonly abuseReports = computed(() => this.community.abuseReports().length);
  protected readonly hiddenPosts = computed(() => this.community.hiddenPostIds().length);
  protected readonly totalLikes = computed(
    () => this.community.journeyPosts().reduce((sum, p) => sum + (p.likeCount ?? 0), 0),
  );

  protected readonly statCards = computed(() => [
    { icon: '👥', label: 'Total Members', value: this.totalMembers(), sub: 'in the companion directory', glow: 'rgba(16,185,129,0.35)' },
    { icon: '🟢', label: 'Online Now', value: this.onlineCount(), sub: 'members active at this moment', glow: 'rgba(34,197,94,0.35)' },
    { icon: '📝', label: 'Journey Posts', value: this.totalPosts(), sub: 'published by the community', glow: 'rgba(99,102,241,0.35)' },
    { icon: '💬', label: 'Comments', value: this.totalComments(), sub: 'top-level conversations', glow: 'rgba(14,165,233,0.35)' },
    { icon: '❤️', label: 'Total Likes', value: this.totalLikes(), sub: 'engagement across all posts', glow: 'rgba(236,72,153,0.35)' },
    { icon: '⏳', label: 'Pending Requests', value: this.pendingRequests(), sub: 'companion requests awaiting reply', glow: 'rgba(245,158,11,0.35)' },
    { icon: '✅', label: 'Verified Members', value: this.verifiedCount(), sub: 'identity checked accounts', glow: 'rgba(13,148,136,0.35)' },
    { icon: '🚩', label: 'Abuse Reports', value: this.abuseReports(), sub: 'flagged content under review', glow: 'rgba(239,68,68,0.35)' },
  ]);

  protected readonly chartDays = computed<ActivityDay[]>(() => {
    const now = new Date();
    const buckets = new Array(7).fill(0).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayKey: d.toISOString().slice(0, 10),
        posts: 0,
        comments: 0,
      };
    });

    const inBucket = (iso: string) => buckets.find((b) => iso.startsWith(b.dayKey));
    for (const post of this.community.journeyPosts()) {
      const bucket = inBucket(post.createdAtUtc ?? '');
      if (bucket) bucket.posts++;
      for (const c of post.comments ?? []) {
        const commentBucket = inBucket(c.createdAtUtc ?? '');
        if (commentBucket) commentBucket.comments++;
      }
    }
    for (const c of this.community.comments()) {
      const bucket = inBucket(c.createdAtUtc ?? '');
      if (bucket) bucket.comments++;
    }

    const max = Math.max(1, ...buckets.map((b) => b.posts + b.comments));
    return buckets.map((b) => ({
      label: b.label,
      posts: b.posts,
      comments: b.comments,
      total: b.posts + b.comments,
      heightPct: (kind: 'posts' | 'comments') => Math.max(2, Math.round(((kind === 'posts' ? b.posts : b.comments) / max) * 100)),
    }));
  });

  protected readonly recentPosts = computed(() =>
    this.community
      .journeyPosts()
      .slice()
      .sort((a, b) => (b.createdAtUtc ?? '').localeCompare(a.createdAtUtc ?? ''))
      .slice(0, 6)
      .map((p) => ({ ...p, ...postView(p) })),
  );
}

/** Small display helpers computed once per post render. */
function postView(post: JourneyPost) {
  const date = new Date(post.createdAtUtc ?? Date.now());
  return {
    snippet: () => (post.text ?? '').slice(0, 120),
    timeAgo: () => (Number.isNaN(date.getTime()) ? '—' : timeAgo(date)),
  };
}

function timeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return date.toLocaleDateString();
}
