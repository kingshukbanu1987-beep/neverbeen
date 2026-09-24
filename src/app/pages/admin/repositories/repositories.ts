import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommunityService } from '../../../services/community.service';

interface RepoInfo {
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  updatedAt: string;
  live: boolean;
}

interface CommitInfo {
  shortSha: string;
  message: string;
  author: string;
  date: string;
}

interface IntegrationRow {
  icon: string;
  name: string;
  detail: string;
  ok: boolean;
}

/**
 * Admin > Repositories — git repositories connected to the NeverBeen project
 * plus the integrations (backend API, maps, OAuth, image CDN). Repo details
 * are fetched live from the GitHub API and fall back to embedded data when the
 * network is unavailable.
 */
@Component({
  selector: 'app-admin-repositories',
  template: `
    <div class="admin-page-head">
      <h2>Connected Repositories</h2>
      <p>Git repositories and platform integrations that power the NeverBeen project.</p>
    </div>

    <!-- Repository cards -->
    <div class="repo-grid">
      <article class="repo-card">
        <header class="repo-head">
          <span class="repo-badge" aria-hidden="true">NG</span>
          <div class="repo-id">
            <h3>kingshukbanu1987-beep / neverbeen</h3>
            <p>Angular 21 web app — community, companion finder, journey posts &amp; admin console</p>
          </div>
          @if (frontendRepo(); as repo) {
            <span class="repo-live" [class.live]="repo.live">{{ repo.live ? '● LIVE' : '○ OFFLINE' }}</span>
          }
        </header>

        @if (frontendRepo(); as repo) {
          <div class="repo-metrics">
            <span title="Primary language">🟩 {{ repo.language || 'TypeScript' }}</span>
            <span title="Stars">⭐ {{ repo.stars }}</span>
            <span title="Forks">⑂ {{ repo.forks }}</span>
            <span title="Open issues">🐞 {{ repo.openIssues }}</span>
            <span title="Default branch">⑂ {{ repo.defaultBranch }}</span>
          </div>
          <p class="repo-updated">
            Last push: <strong>{{ repo.updatedAt ? friendlyDate(repo.updatedAt) : '—' }}</strong>
          </p>
        }
      </article>

      <article class="repo-card">
        <header class="repo-head">
          <span class="repo-badge dotnet" aria-hidden="true">.NET</span>
          <div class="repo-id">
            <h3>NeverBeen.API</h3>
            <p>ASP.NET Core 8 backend scaffold — companion &amp; notification endpoints</p>
          </div>
          <span class="repo-live">○ LOCAL</span>
        </header>
        <div class="repo-metrics">
          <span>🟦 C#</span>
          <span>⏬ {{ apiUrl }}</span>
        </div>
        <p class="repo-updated">
          Status:
          <strong class="{{ apiLive() ? 'ok-text' : 'muted-text' }}">{{ apiLive() ? 'reachable' : 'not running' }}</strong>
          <small>(start with <code>dotnet run</code> inside <code>NeverBeen.API</code>)</small>
        </p>
      </article>
    </div>

    <div class="repos-lower">
      <!-- Recent commits -->
      <section class="panel-card">
        <header class="panel-head">
          <h3>Recent Commits</h3>
          <span class="panel-sub">{{ commitsSource() === 'live' ? 'fetched live from GitHub' : 'embedded snapshot' }}</span>
        </header>
        @if (commits().length === 0) {
          <p class="empty-note">Commit history is unavailable right now.</p>
        } @else {
          <ul class="commit-list">
            @for (commit of commits(); track commit.shortSha) {
              <li class="commit-row">
                <code class="commit-sha">{{ commit.shortSha }}</code>
                <span class="commit-msg">{{ commit.message }}</span>
                <span class="commit-meta">{{ commit.author }} · {{ friendlyDate(commit.date) }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <!-- Integrations -->
      <section class="panel-card">
        <header class="panel-head">
          <h3>Platform Integrations</h3>
          <span class="panel-sub">services connected to the project</span>
        </header>
        <ul class="integration-list">
          @for (integration of integrations; track integration.name) {
            <li class="integration-row">
              <span class="integration-icon" aria-hidden="true">{{ integration.icon }}</span>
              <div class="integration-body">
                <strong>{{ integration.name }}</strong>
                <small>{{ integration.detail }}</small>
              </div>
              <span class="integration-state" [class.ok]="integration.ok">{{ integration.ok ? 'Connected' : 'Configured' }}</span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styleUrl: './repositories.css',
})
export class AdminRepositories implements OnInit {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly community = inject(CommunityService);

  protected readonly apiUrl = this.community.apiUrl;
  protected readonly frontendRepo = signal<RepoInfo>(FALLBACK_REPO);
  protected readonly commits = signal<CommitInfo[]>(FALLBACK_COMMITS);
  protected readonly commitsSource = signal<'live' | 'fallback'>('fallback');
  protected readonly apiLive = signal(false);

  protected readonly integrations: IntegrationRow[] = [
    { icon: '🔌', name: 'NeverBeen.API (ASP.NET Core)', detail: `Companion & notification API at ${'http://localhost:5080'}`, ok: false },
    { icon: '🗺️', name: 'Google Maps Platform', detail: 'Place picker & maps for journey post locations', ok: true },
    { icon: '🔐', name: 'OAuth — Google & Facebook', detail: 'Client-side demo sign-in for community members', ok: true },
    { icon: '🖼️', name: 'Image CDN', detail: 'Unsplash & DiceBear images for profiles and journey posts', ok: true },
    { icon: '🐙', name: 'GitHub', detail: 'kingshukbanu1987-beep/neverbeen — website source + API scaffold', ok: true },
  ];

  ngOnInit(): void {
    void this.loadRepoDetails();
    void this.probeApi();
  }

  protected friendlyDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private async loadRepoDetails(): Promise<void> {
    const http = this.http;
    if (!http) return;
    const repoUrl = 'https://api.github.com/repos/kingshukbanu1987-beep/neverbeen';
    try {
      const rawRepo = (await http.get<Record<string, unknown>>(repoUrl).toPromise()) ?? {};
      const rawCommits =
        (await http.get<Record<string, unknown>[]>(`${repoUrl}/commits?per_page=8`).toPromise()) ?? [];
      const repo: Record<string, unknown> = rawRepo;
      this.frontendRepo.set({
        fullName: (repo['full_name'] as string) ?? FALLBACK_REPO.fullName,
        description: (repo['description'] as string) ?? FALLBACK_REPO.description,
        language: (repo['language'] as string) ?? 'TypeScript',
        stars: (repo['stargazers_count'] as number) ?? 0,
        forks: (repo['forks_count'] as number) ?? 0,
        openIssues: (repo['open_issues_count'] as number) ?? 0,
        defaultBranch: (repo['default_branch'] as string) ?? 'master',
        updatedAt: (repo['pushed_at'] as string) ?? '',
        live: true,
      });
      this.commits.set(
        (rawCommits ?? [])
          .map((c) => {
            const entry = c as {
              sha?: string;
              commit?: { message?: string; author?: { name?: string; date?: string } };
            };
            return {
              shortSha: (entry.sha ?? '').slice(0, 7),
              message: entry.commit?.message?.split('\n')[0] ?? '—',
              author: entry.commit?.author?.name ?? 'unknown',
              date: entry.commit?.author?.date ?? '',
            };
          })
          .filter((c) => c.shortSha.length > 0),
      );
      this.commitsSource.set('live');
    } catch {
      /* network unavailable — keep the embedded snapshot */
    }
  }

  private async probeApi(): Promise<void> {
    if (!this.http) return;
    try {
      await this.http.get(`${this.community.apiUrl}/api/health`).toPromise();
      this.apiLive.set(true);
    } catch {
      this.apiLive.set(false);
    }
  }
}

const FALLBACK_REPO: RepoInfo = {
  fullName: 'kingshukbanu1987-beep/neverbeen',
  description: 'NeverBeen — ultra-modern travel companion web platform (Angular 21 + ASP.NET Core)',
  language: 'TypeScript',
  stars: 0,
  forks: 0,
  openIssues: 0,
  defaultBranch: 'master',
  updatedAt: '',
  live: false,
};

const FALLBACK_COMMITS: CommitInfo[] = [
  { shortSha: '963e489', message: 'Companion photo sizing + remove eye icon from View Profile button', author: 'Arena', date: '2026-09-24' },
  { shortSha: '4b13681', message: 'Ultra-modern hover preview card for community user names & pictures', author: 'Arena', date: '2026-09-24' },
  { shortSha: '018b3cb', message: 'Companion card photo column reduced to 25% of the card', author: 'Kingshuk Banu', date: '2026-09-22' },
];
