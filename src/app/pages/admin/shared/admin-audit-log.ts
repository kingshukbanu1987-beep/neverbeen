import { Component, computed, inject, input, signal } from '@angular/core';
import { AdminAuditService, AUDIT_CATEGORY_META, AuditCategory } from '../../../services/admin-audit.service';
import { downloadCsv, timeAgo } from './admin-insights.service';

/** Searchable, filterable audit trail of admin actions — reused by User & Data Management. */
@Component({
  selector: 'app-admin-audit-log',
  styleUrls: ['./admin-grid.css', '../users/users.css'],
  template: `
    <section class="g-panel">
      <div class="g-toolbar">
        <label class="g-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
          <input type="search" placeholder="Search action, admin or target…" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" aria-label="Search audit log" />
        </label>
        <label class="g-select">
          <span>Category</span>
          <select [value]="category()" (change)="category.set($any($event.target).value); page.set(1)">
            <option value="">All categories</option>
            @for (c of availableCategories(); track c) {
              <option [value]="c">{{ meta[c].icon }} {{ meta[c].label }}</option>
            }
          </select>
        </label>
        <span class="g-toolbar-spacer"></span>
        <button type="button" class="g-icon-btn" [disabled]="!filtered().length" (click)="exportCsv()">⤓ Export CSV</button>
      </div>
      <div class="g-table-wrap">
        <table class="g-table compact">
          <thead>
            <tr>
              <th>When</th>
              <th>Category</th>
              <th>Action</th>
              <th>Target</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            @for (e of paged(); track e.id) {
              <tr>
                <td class="g-nowrap" [title]="e.atUtc">{{ timeAgo(e.atUtc) }}</td>
                <td><span class="al-cat">{{ meta[e.category].icon }} {{ meta[e.category].label }}</span></td>
                <td class="al-details">
                  <strong>{{ e.action }}</strong>
                  @if (e.details) {
                    <br /><small>{{ e.details }}</small>
                  }
                </td>
                <td class="g-nowrap">{{ e.targetLabel ?? '—' }}</td>
                <td class="g-nowrap g-muted">{{ e.actor }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="g-empty">No admin activity recorded yet. Actions you take will appear here.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="g-foot">
        <span>{{ filtered().length }} entr{{ filtered().length === 1 ? 'y' : 'ies' }} · tamper-evident trail kept for 365 days</span>
        <div class="g-pager">
          <button type="button" [disabled]="currentPage() === 1" (click)="page.set(currentPage() - 1)" aria-label="Previous page">‹</button>
          <button type="button" class="current">{{ currentPage() }} / {{ totalPages() }}</button>
          <button type="button" [disabled]="currentPage() === totalPages()" (click)="page.set(currentPage() + 1)" aria-label="Next page">›</button>
        </div>
      </footer>
    </section>
  `,
})
export class AdminAuditLog {
  private readonly audit = inject(AdminAuditService);

  /** Restrict the log to these categories (empty = everything). */
  readonly categories = input<AuditCategory[]>([]);

  protected readonly meta = AUDIT_CATEGORY_META;
  protected readonly timeAgo = timeAgo;
  protected readonly search = signal('');
  protected readonly category = signal<AuditCategory | ''>('');
  protected readonly page = signal(1);
  private readonly pageSize = 15;

  protected readonly availableCategories = computed<AuditCategory[]>(() =>
    this.categories().length ? this.categories() : (Object.keys(AUDIT_CATEGORY_META) as AuditCategory[]),
  );

  protected readonly filtered = computed(() => {
    const allowed = new Set(this.availableCategories());
    const cat = this.category();
    const q = this.search().trim().toLowerCase();
    return this.audit
      .entries()
      .filter((e) => allowed.has(e.category) && (!cat || e.category === cat))
      .filter((e) => !q || [e.action, e.actor, e.targetLabel ?? '', e.details ?? ''].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.atUtc.localeCompare(a.atUtc));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  protected exportCsv(): void {
    downloadCsv(
      `neverbeen-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Time (UTC)', 'Category', 'Action', 'Details', 'Target ID', 'Target', 'Admin'],
      this.filtered().map((e) => [e.atUtc, this.meta[e.category].label, e.action, e.details ?? '', e.targetId ?? '', e.targetLabel ?? '', e.actor]),
    );
  }
}
