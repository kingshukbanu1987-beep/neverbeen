import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AdminDataOpsService, isPiiField, maskValue } from '../shared/admin-data-ops.service';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { CLASS_TONE } from './format';
import { SelectValueSync } from '../../../shared/select-value-sync';

interface ExplorerRecord {
  index: number | string;
  title: string;
  subtitle: string;
  raw: unknown;
  search: string;
}

/** Deep-clone a value, masking string values stored under personal-data keys. */
export function maskDeep(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskDeep(v, k)]));
  }
  if (typeof value === 'string' && key && isPiiField(key) && value) return maskValue(value);
  return value;
}

function titleOf(r: unknown, fallback: string): { title: string; subtitle: string } {
  if (!r || typeof r !== 'object') return { title: String(r), subtitle: fallback };
  const o = r as Record<string, unknown>;
  const author = (o['author'] as Record<string, unknown> | undefined)?.['fullName'];
  const title = (o['fullName'] ?? o['name'] ?? o['userName'] ?? o['action'] ?? o['reason'] ?? (author ? `Post by ${author}` : undefined) ?? `#${o['id'] ?? fallback}`) as string;
  const text = (o['text'] ?? o['message'] ?? o['description'] ?? o['profession'] ?? o['details'] ?? '') as string;
  const when = (o['createdAtUtc'] ?? o['atUtc'] ?? o['updatedAtUtc'] ?? '') as string;
  return { title: String(title), subtitle: [String(text).slice(0, 90), when ? new Date(when).toLocaleDateString() : ''].filter(Boolean).join(' · ') };
}

/** Browse any dataset record-by-record with PII masking, search and record deletion. */
@Component({
  selector: 'app-admin-data-explorer',
  imports: [SelectValueSync, AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <section class="g-panel">
      <div class="g-toolbar">
        <label class="g-select">
          <span>Dataset</span>
          <select [value]="key()" (change)="selectKey($any($event.target).value)">
            @for (d of datasets(); track d.key) {
              <option [value]="d.key">{{ d.icon }} {{ d.label }} ({{ d.records }})</option>
            }
          </select>
        </label>
        <label class="g-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
          <input type="search" placeholder="Search inside records…" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" aria-label="Search records" />
        </label>
        <span class="g-toolbar-spacer"></span>
        <button type="button" class="g-icon-btn" [class.on]="!masked()" (click)="toggleMask()" [attr.aria-pressed]="!masked()">
          {{ masked() ? '🙈 PII masked' : '👁 PII visible' }}
        </button>
      </div>

      @if (current(); as d) {
        <div class="dm-explorer-meta">
          <span class="g-badge" [class]="'g-badge ' + tone[d.classification]">{{ d.classification }}</span>
          <span>{{ d.description }}</span>
          <code>{{ d.key }}</code>
        </div>
      }

      <div class="dm-records">
        @for (r of paged(); track r.index) {
          <article class="dm-record" [class.open]="expanded() === r.index">
            <header (click)="expanded.set(expanded() === r.index ? null : r.index)">
              <span class="dm-rec-idx">{{ r.index }}</span>
              <div>
                <strong>{{ r.title }}</strong>
                <small>{{ r.subtitle }}</small>
              </div>
              <span class="dm-chevron">{{ expanded() === r.index ? '▾' : '▸' }}</span>
            </header>
            @if (expanded() === r.index) {
              <pre class="dm-json">{{ pretty(r.raw) }}</pre>
              <div class="dm-rec-actions">
                <button type="button" class="g-btn" (click)="copy(r.raw)">⧉ Copy JSON</button>
                @if (canDelete()) {
                  <button type="button" class="g-btn danger" (click)="pendingDelete.set(r)">🗑 Delete record</button>
                }
              </div>
            }
          </article>
        } @empty {
          <p class="g-empty">{{ records().length ? 'No records match your search.' : 'This dataset is empty.' }}</p>
        }
      </div>

      <footer class="g-foot">
        <span>{{ filtered().length }} record(s){{ masked() ? ' · personal data masked' : '' }}</span>
        <div class="g-pager">
          <button type="button" [disabled]="currentPage() === 1" (click)="page.set(currentPage() - 1)" aria-label="Previous page">‹</button>
          <button type="button" class="current">{{ currentPage() }} / {{ totalPages() }}</button>
          <button type="button" [disabled]="currentPage() === totalPages()" (click)="page.set(currentPage() + 1)" aria-label="Next page">›</button>
        </div>
      </footer>
    </section>

    @if (pendingDelete(); as r) {
      <app-admin-confirm-dialog
        heading="Delete this record?"
        [message]="'“' + r.title + '” will be permanently removed from ' + (current()?.label ?? 'the dataset') + '.'"
        confirmLabel="Delete record"
        [withReason]="false"
        (confirmed)="remove(r)"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class AdminDataExplorer implements OnInit {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);

  readonly initialKey = input<string | null>(null);

  protected readonly tone = CLASS_TONE;
  protected readonly datasets = this.dataOps.datasets;
  protected readonly key = signal('');
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly expanded = signal<number | string | null>(null);
  protected readonly pendingDelete = signal<ExplorerRecord | null>(null);
  private readonly pageSize = 10;

  protected readonly masked = computed(() => this.dataOps.state().maskPii);
  protected readonly current = computed(() => this.datasets().find((d) => d.key === this.key()));

  protected readonly records = computed<ExplorerRecord[]>(() => {
    const d = this.current();
    if (!d) return [];
    const value = d.read();
    const entries: [number | string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [i, v])
      : value && typeof value === 'object'
        ? Object.entries(value as Record<string, unknown>)
        : value === null || value === undefined
          ? []
          : [['value', value]];
    return entries.map(([index, raw]) => {
      const t = titleOf(raw, String(index));
      return { index, raw, ...t, search: JSON.stringify(raw).toLowerCase() };
    });
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q ? this.records().filter((r) => r.search.includes(q)) : this.records();
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered()
      .slice(start, start + this.pageSize)
      .map((r) => (this.masked() ? { ...r, ...titleOf(maskDeep(r.raw), String(r.index)) } : r));
  });

  protected readonly canDelete = computed(() => {
    const d = this.current();
    return !!d && d.owner === 'Community' && Array.isArray(d.read());
  });

  ngOnInit(): void {
    this.key.set(this.initialKey() ?? this.datasets()[0]?.key ?? '');
  }

  protected selectKey(key: string): void {
    this.key.set(key);
    this.page.set(1);
    this.expanded.set(null);
    this.search.set('');
  }

  protected toggleMask(): void {
    this.dataOps.setMask(!this.masked());
  }

  protected pretty(raw: unknown): string {
    return JSON.stringify(this.masked() ? maskDeep(raw) : raw, null, 2);
  }

  protected copy(raw: unknown): void {
    navigator.clipboard?.writeText(this.pretty(raw)).catch(() => undefined);
    this.insights.notify('Record copied to clipboard.');
  }

  protected remove(r: ExplorerRecord): void {
    const ok = this.dataOps.deleteRecord(this.key(), r.index);
    this.pendingDelete.set(null);
    this.expanded.set(null);
    this.insights.notify(ok ? 'Record deleted.' : 'This dataset cannot be edited here.');
  }
}
