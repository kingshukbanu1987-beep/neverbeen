import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  ANN_CATEGORY_META,
  ANN_CHANNEL_META,
  ANN_PRIORITY_META,
  ANN_STATUS_META,
  AnnCategory,
  AnnChannel,
  AnnStats,
  AnnStatus,
  Announcement,
  AnnouncementsService,
  AudienceMode,
  REGIONS,
  describeAudience,
  statsOf,
  statusOf,
} from '../../../services/announcements.service';
import { AdminInsightsService, MemberInsight, downloadCsv } from '../shared/admin-insights.service';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { MailAdmin } from '../mail/admin-mail.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { OverlayPortal } from '../shared/overlay-portal';
import { ManageUserButton } from '../shared/manage-user-button';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { adminPerson, audienceMembers, breakdown, dateTime, plainAnnouncement, regionKey, relTime, renderAnnouncement } from './audience';

type StatusFilter = 'all' | AnnStatus;
type SortKey = 'date' | 'title' | 'reach' | 'open' | 'click' | 'status';
type ColKey = 'audience' | 'channels' | 'performance' | 'author' | 'date';
type Pending = { kind: 'delete' | 'end' | 'cancel' | 'publish'; ids: string[] } | null;

export interface AnnRow {
  a: Announcement;
  status: AnnStatus;
  reach: number;
  stats: AnnStats;
  author: MailAdmin;
  audienceLabel: string;
}

const STATUS_ORDER: Record<AnnStatus, number> = { live: 0, scheduled: 1, draft: 2, expired: 3, cancelled: 4 };

/**
 * Admin > Announcement — every notice published to users (all users or a targeted
 * audience) in a modern data grid: status tabs, search, filters, sortable columns,
 * column chooser, density, bulk actions, CSV export and a details drawer with
 * audience, delivery funnel, engagement curve and history.
 */
@Component({
  selector: 'app-admin-announcements',
  imports: [RouterLink, AdminConfirmDialog, OverlayPortal, ManageUserButton, SelectValueSync],
  templateUrl: './announcements.html',
  styleUrls: ['../shared/admin-grid.css', './announcements.css'],
})
export class AdminAnnouncements {
  protected readonly svc = inject(AnnouncementsService);
  private readonly insights = inject(AdminInsightsService);
  private readonly audit = inject(AdminAuditService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly catMeta = ANN_CATEGORY_META;
  protected readonly chMeta = ANN_CHANNEL_META;
  protected readonly prMeta = ANN_PRIORITY_META;
  protected readonly stMeta = ANN_STATUS_META;
  protected readonly categories = Object.keys(ANN_CATEGORY_META) as AnnCategory[];
  protected readonly channels = Object.keys(ANN_CHANNEL_META) as AnnChannel[];
  protected readonly relTime = relTime;
  protected readonly dateTime = dateTime;
  protected readonly render = renderAnnouncement;
  protected readonly plain = plainAnnouncement;
  protected readonly regions = REGIONS;

  protected readonly statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'draft', label: 'Drafts' },
    { key: 'expired', label: 'Ended' },
    { key: 'cancelled', label: 'Cancelled' },
  ];
  protected readonly colLabels: Record<ColKey, string> = { audience: 'Audience', channels: 'Channels', performance: 'Performance', author: 'Sent by', date: 'Date' };
  protected readonly colKeys = Object.keys(this.colLabels) as ColKey[];

  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly query = signal('');
  protected readonly category = signal<'all' | AnnCategory>('all');
  protected readonly channel = signal<'all' | AnnChannel>('all');
  protected readonly author = signal<string>('all');
  protected readonly audienceType = signal<'any' | AudienceMode>('any');
  protected readonly sort = signal<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly density = signal<'comfortable' | 'compact'>('comfortable');
  protected readonly cols = signal<Record<ColKey, boolean>>({ audience: true, channels: true, performance: true, author: true, date: true });
  protected readonly showCols = signal(false);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly menuFor = signal<string | null>(null);
  protected readonly pending = signal<Pending>(null);
  protected readonly undo = signal<{ text: string; items: Announcement[] } | null>(null);
  private undoTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly qp = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('a'))), { initialValue: null });
  private readonly localOpen = signal<string | null | undefined>(undefined);
  protected readonly openId = computed(() => (this.localOpen() !== undefined ? this.localOpen() : this.qp()));

  private readonly members = computed(() => this.insights.members());

  protected readonly rows = computed<AnnRow[]>(() => {
    const now = this.svc.now();
    const members = this.members();
    return this.svc.items().map((a) => {
      const status = statusOf(a, now);
      const reach = a.recipients ?? audienceMembers(members, a.audience).length;
      return { a, status, reach, stats: statsOf(a, reach, now), author: adminPerson(a.createdBy), audienceLabel: describeAudience(a.audience) };
    });
  });

  protected readonly counts = computed(() => {
    const c: Record<StatusFilter, number> = { all: 0, live: 0, scheduled: 0, draft: 0, expired: 0, cancelled: 0 };
    for (const r of this.rows()) {
      c.all++;
      c[r.status]++;
    }
    return c;
  });

  protected readonly authors = computed(() => {
    const ids = [...new Set(this.svc.items().map((a) => a.createdBy))];
    return ids.map((id) => adminPerson(id)).sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const st = this.statusFilter();
    const cat = this.category();
    const ch = this.channel();
    const au = this.author();
    const aud = this.audienceType();
    const { key, dir } = this.sort();
    const list = this.rows().filter(
      (r) =>
        (st === 'all' || r.status === st) &&
        (cat === 'all' || r.a.category === cat) &&
        (ch === 'all' || r.a.channels.includes(ch)) &&
        (au === 'all' || r.a.createdBy === au) &&
        (aud === 'any' || r.a.audience.mode === aud) &&
        (!q || [r.a.title, r.a.body, r.audienceLabel, r.author.name, this.catMeta[r.a.category].label].some((v) => v.toLowerCase().includes(q))),
    );
    const val = (r: AnnRow): number | string => {
      switch (key) {
        case 'title':
          return r.a.title.toLowerCase();
        case 'reach':
          return r.reach;
        case 'open':
          return r.stats.openRate;
        case 'click':
          return r.stats.clickRate;
        case 'status':
          return STATUS_ORDER[r.status];
        default:
          return Date.parse(r.a.sendAtUtc);
      }
    };
    return [...list].sort((x, y) => {
      if (x.a.pinned !== y.a.pinned) return x.a.pinned ? -1 : 1;
      const a = val(x);
      const b = val(y);
      return (a < b ? -1 : a > b ? 1 : 0) * dir;
    });
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => this.filtered().slice((this.currentPage() - 1) * this.pageSize(), this.currentPage() * this.pageSize()));
  protected readonly allOnPageSelected = computed(() => this.paged().length > 0 && this.paged().every((r) => this.selected().has(r.a.id)));
  protected readonly hasFilters = computed(
    () => !!this.query() || this.category() !== 'all' || this.channel() !== 'all' || this.author() !== 'all' || this.audienceType() !== 'any' || this.statusFilter() !== 'all',
  );

  protected readonly kpis = computed(() => {
    const rows = this.rows();
    const now = this.svc.now();
    const sent = rows.filter((r) => r.stats.delivered > 0);
    const recent = sent.filter((r) => now - Date.parse(r.a.sendAtUtc) <= 30 * 86_400_000);
    const reach30 = recent.reduce((s, r) => s + r.stats.delivered, 0);
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : 0);
    const withCta = sent.filter((r) => r.a.ctaUrl);
    const next = rows.filter((r) => r.status === 'scheduled').sort((a, b) => Date.parse(a.a.sendAtUtc) - Date.parse(b.a.sendAtUtc))[0];
    return [
      { label: 'Announcements', value: String(rows.length), sub: `${this.counts().draft} draft(s)`, icon: '📣', glow: 'rgba(99,102,241,0.18)' },
      { label: 'Live now', value: String(this.counts().live), sub: 'Visible to their audience', icon: '🟢', glow: 'rgba(16,185,129,0.2)' },
      { label: 'Scheduled', value: String(this.counts().scheduled), sub: next ? `Next ${relTime(next.a.sendAtUtc, now)}` : 'Nothing queued', icon: '⏱️', glow: 'rgba(139,92,246,0.18)' },
      { label: 'Delivered · 30 days', value: reach30.toLocaleString(), sub: `${recent.length} announcement(s)`, icon: '📬', glow: 'rgba(14,165,233,0.18)' },
      { label: 'Avg. open rate', value: `${avg(sent.map((r) => r.stats.openRate))}%`, sub: 'Opened ÷ delivered', icon: '👁️', glow: 'rgba(245,158,11,0.18)' },
      { label: 'Avg. click-through', value: `${avg(withCta.map((r) => r.stats.clickRate))}%`, sub: 'On announcements with a button', icon: '👆', glow: 'rgba(236,72,153,0.16)' },
    ];
  });

  /* ------------------------------ detail drawer ------------------------------ */

  protected readonly detail = computed(() => this.rows().find((r) => r.a.id === this.openId()) ?? null);

  protected readonly detailMembers = computed<MemberInsight[]>(() => {
    const d = this.detail();
    if (!d || d.a.audience.mode !== 'users') return [];
    return d.a.audience.userIds.map((id) => this.insights.member(id)).filter((m): m is MemberInsight => !!m);
  });

  protected readonly detailBreakdown = computed(() => {
    const d = this.detail();
    if (!d) return null;
    const list = audienceMembers(this.members(), d.a.audience);
    return {
      regions: breakdown(list, regionKey, 4),
      countries: breakdown(list, (m) => m.country, 5),
      genders: breakdown(list, (m) => m.gender, 3),
      ages: breakdown(list, (m) => m.ageGroup, 5),
    };
  });

  /** Opens per hour over the first 24h after sending (for the engagement curve). */
  protected readonly curve = computed(() => {
    const d = this.detail();
    if (!d || !d.stats.opened) return null;
    const pts: number[] = [];
    let prev = 0;
    for (let h = 1; h <= 24; h++) {
      const cum = 1 - Math.exp(-h / 5);
      pts.push(cum - prev);
      prev = cum;
    }
    const max = Math.max(...pts);
    const w = 320;
    const hgt = 90;
    const xy = pts.map((v, i) => [(i / 23) * w, hgt - (v / max) * (hgt - 8) - 4]);
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L${w},${hgt} L0,${hgt} Z`, peak: Math.round(d.stats.opened * pts[0]) };
  });

  protected readonly channelRows = computed(() => {
    const d = this.detail();
    if (!d) return [];
    const factor: Record<AnnChannel, number> = { banner: 1.25, inbox: 1, push: 0.8, email: 0.62 };
    return d.a.channels.map((c) => {
      const opened = Math.round(d.stats.opened * factor[c] * (1 / Math.max(1, d.a.channels.length * 0.55)));
      const delivered = c === 'email' ? Math.round(d.stats.delivered * 0.94) : d.stats.delivered;
      return { c, delivered, opened: Math.min(opened, delivered), rate: delivered ? Math.round((Math.min(opened, delivered) / delivered) * 100) : 0 };
    });
  });

  protected pct(n: number, of: number): number {
    return of ? Math.round((n / of) * 100) : 0;
  }

  /* --------------------------------- actions --------------------------------- */

  protected setSort(key: SortKey): void {
    const s = this.sort();
    this.sort.set({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'title' ? 1 : -1 });
  }

  protected sortIcon(key: SortKey): string {
    const s = this.sort();
    return s.key !== key ? '↕' : s.dir === 1 ? '↑' : '↓';
  }

  protected setStatus(s: StatusFilter): void {
    this.statusFilter.set(s);
    this.page.set(1);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.category.set('all');
    this.channel.set('all');
    this.author.set('all');
    this.audienceType.set('any');
    this.statusFilter.set('all');
    this.page.set(1);
  }

  protected toggleCol(k: ColKey): void {
    this.cols.update((c) => ({ ...c, [k]: !c[k] }));
  }

  protected toggle(id: string, on: boolean): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  protected togglePage(on: boolean): void {
    this.selected.update((s) => {
      const n = new Set(s);
      for (const r of this.paged()) {
        if (on) n.add(r.a.id);
        else n.delete(r.a.id);
      }
      return n;
    });
  }

  protected open(id: string): void {
    this.menuFor.set(null);
    this.localOpen.set(id);
    this.router.navigate([], { relativeTo: this.route, queryParams: { a: id }, replaceUrl: true });
  }

  protected close(): void {
    this.localOpen.set(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: { a: null }, replaceUrl: true });
  }

  protected edit(r: AnnRow): void {
    this.router.navigate(['/admin/announcements/new'], { queryParams: { edit: r.a.id } });
  }

  protected duplicate(r: AnnRow): void {
    this.router.navigate(['/admin/announcements/new'], { queryParams: { copy: r.a.id } });
  }

  protected pin(r: AnnRow): void {
    this.menuFor.set(null);
    this.svc.togglePin(r.a.id);
    this.log(r.a.pinned ? 'Announcement unpinned' : 'Announcement pinned', r.a.title);
  }

  protected ask(kind: NonNullable<Pending>['kind'], ids: string[]): void {
    this.menuFor.set(null);
    if (ids.length) this.pending.set({ kind, ids });
  }

  protected readonly pendingText = computed(() => {
    const p = this.pending();
    if (!p) return null;
    const one = p.ids.length === 1 ? this.svc.byId(p.ids[0]) : null;
    const name = one ? `“${one.title}”` : `${p.ids.length} announcements`;
    switch (p.kind) {
      case 'delete':
        return { heading: 'Delete announcement?', message: `${name} will be removed from this list. Members who already received it keep their copy.`, label: 'Delete', tone: 'danger' as const };
      case 'end':
        return { heading: 'End announcement now?', message: `${name} stops showing to members immediately (banner removed, no further notifications).`, label: 'End now', tone: 'danger' as const };
      case 'cancel':
        return { heading: 'Cancel scheduled announcement?', message: `${name} will not be sent. You can duplicate it later.`, label: 'Cancel sending', tone: 'danger' as const };
      default: {
        const r = one ? this.rows().find((x) => x.a.id === one.id) : null;
        return { heading: 'Publish now?', message: `${name} will be delivered immediately to ${r?.reach.toLocaleString() ?? 'its'} recipient(s) — ${r?.audienceLabel ?? ''}.`, label: 'Publish now', tone: 'success' as const };
      }
    }
  });

  protected confirm(): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);
    const titles = p.ids.map((id) => this.svc.byId(id)?.title ?? id);
    if (p.kind === 'delete') {
      const removed = this.svc.remove(p.ids);
      this.selected.set(new Set());
      if (p.ids.includes(this.openId() ?? '')) this.close();
      this.log(`Deleted ${removed.length} announcement(s)`, titles.join(', '));
      this.showUndo(`${removed.length} announcement(s) deleted.`, removed);
      return;
    }
    for (const id of p.ids) {
      const a = this.svc.byId(id);
      if (!a) continue;
      const st = statusOf(a, Date.now());
      if (p.kind === 'end' && st === 'live') this.svc.endNow(id);
      if (p.kind === 'cancel' && st === 'scheduled') this.svc.cancel(id);
      if (p.kind === 'publish' && (st === 'draft' || st === 'scheduled')) {
        this.svc.publishNow(id, audienceMembers(this.members(), a.audience).length);
      }
    }
    const verb = p.kind === 'end' ? 'Ended' : p.kind === 'cancel' ? 'Cancelled' : 'Published';
    this.log(`${verb} announcement`, titles.join(', '));
    this.insights.notify(`${verb}: ${titles.length === 1 ? titles[0] : titles.length + ' announcements'}`);
    this.selected.set(new Set());
  }

  private showUndo(text: string, items: Announcement[]): void {
    clearTimeout(this.undoTimer);
    this.undo.set({ text, items });
    this.undoTimer = setTimeout(() => this.undo.set(null), 8000);
  }

  protected undoDelete(): void {
    const u = this.undo();
    if (!u) return;
    this.svc.restore(u.items);
    this.undo.set(null);
    this.log('Restored deleted announcement(s)', u.items.map((a) => a.title).join(', '));
  }

  protected selectedIds(): string[] {
    return [...this.selected()];
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected bulkPin(): void {
    for (const id of this.selected()) {
      const a = this.svc.byId(id);
      if (a && !a.pinned) this.svc.togglePin(id);
    }
    this.selected.set(new Set());
  }

  protected selectedOf(status: AnnStatus): string[] {
    return [...this.selected()].filter((id) => {
      const a = this.svc.byId(id);
      return a && statusOf(a, Date.now()) === status;
    });
  }

  protected exportCsv(onlySelected = false): void {
    const sel = this.selected();
    const rows = this.filtered().filter((r) => !onlySelected || sel.has(r.a.id));
    downloadCsv(
      `neverbeen-announcements-${new Date().toISOString().slice(0, 10)}.csv`,
      ['ID', 'Title', 'Category', 'Priority', 'Status', 'Audience', 'Channels', 'Recipients', 'Delivered', 'Opened', 'Open rate %', 'Clicks', 'CTR %', 'Sent by', 'Send time', 'Expires'],
      rows.map((r) => [
        r.a.id,
        r.a.title,
        this.catMeta[r.a.category].label,
        r.a.priority,
        this.stMeta[r.status].label,
        r.audienceLabel,
        r.a.channels.map((c) => this.chMeta[c].label).join(' + '),
        r.reach,
        r.stats.delivered,
        r.stats.opened,
        r.stats.openRate,
        r.stats.clicked,
        r.stats.clickRate,
        r.author.name,
        r.a.sendAtUtc,
        r.a.expiresAtUtc ?? '',
      ]),
    );
    this.insights.notify(`Exported ${rows.length} announcement(s) to CSV.`);
  }

  protected who(id: string): string {
    return id === 'me' ? 'You' : adminPerson(id).name;
  }

  private log(action: string, target: string): void {
    this.audit.log({ category: 'announcement', action, targetLabel: target });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.pending()) return;
    if (this.menuFor()) this.menuFor.set(null);
    else if (this.showCols()) this.showCols.set(false);
    else if (this.openId()) this.close();
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement | null;
    if (!t?.closest('.an-menu-wrap')) this.menuFor.set(null);
    if (!t?.closest('.an-cols-wrap')) this.showCols.set(false);
  }
}
