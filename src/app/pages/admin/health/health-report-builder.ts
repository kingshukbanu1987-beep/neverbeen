import { OverlayPortal } from '../shared/overlay-portal';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DeviceFilter, Granularity, HealthDataService, RANGE_OPTIONS, RangeKey } from './health-data.service';
import { REPORT_SECTIONS, ReportSection, ReportSpec, buildExcel, buildReportData, describeWindow, saveSpec } from './health-report.model';
import { downloadBlob } from './xlsx';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { SelectValueSync } from '../../../shared/select-value-sync';

const PRESET_KEY = 'neverbeen_health_report_presets';

interface ReportPreset {
  name: string;
  spec: Omit<ReportSpec, 'id' | 'createdUtc'>;
}

/**
 * Modal for composing a Health report: pick period, filters, sections and
 * layout, then export as a print-ready PDF (via the dedicated report page) or
 * as a styled multi-sheet Excel workbook.
 */
@Component({
  selector: 'app-health-report-builder',
  imports: [SelectValueSync, OverlayPortal],
  styleUrls: ['../shared/admin-grid.css', '../website/website.css', './health-report-builder.css'],
  template: `
    <div class="g-modal-backdrop" appOverlayPortal (click)="closed.emit()">
      <div class="g-modal rb" role="dialog" aria-modal="true" aria-label="Generate health report" (click)="$event.stopPropagation()">
        <header class="rb-head">
          <div>
            <h3>Generate health report</h3>
            <p>{{ periodText() }} · {{ sections().size }} section{{ sections().size === 1 ? '' : 's' }}</p>
          </div>
          <button type="button" class="g-icon-btn" (click)="closed.emit()" aria-label="Close">✕</button>
        </header>

        <div class="rb-body">
          <div class="rb-grid">
            <label class="rb-field span-2">
              <span>Report title</span>
              <input type="text" [value]="title()" (input)="title.set($any($event.target).value)" maxlength="90" />
            </label>
            <label class="rb-field">
              <span>Prepared by</span>
              <input type="text" [value]="preparedBy()" (input)="preparedBy.set($any($event.target).value)" maxlength="60" />
            </label>
            <label class="rb-field">
              <span>Classification</span>
              <select [value]="confidentiality()" (change)="confidentiality.set($any($event.target).value)">
                <option value="Internal">Internal</option>
                <option value="Confidential">Confidential</option>
                <option value="Public">Public</option>
              </select>
            </label>
          </div>

          <h4 class="rb-sub">Criteria</h4>
          <div class="rb-grid">
            <div class="rb-field span-2">
              <span>Period</span>
              <div class="wm-seg">
                @for (r of rangeOptions; track r.key) {
                  <button type="button" [class.active]="rRange() === r.key" (click)="rRange.set(r.key)">{{ r.label }}</button>
                }
              </div>
            </div>
            @if (rRange() === 'custom') {
              <label class="rb-field">
                <span>From</span>
                <input type="date" [value]="rFrom()" [max]="rTo()" (change)="rFrom.set($any($event.target).value)" />
              </label>
              <label class="rb-field">
                <span>To</span>
                <input type="date" [value]="rTo()" [min]="rFrom()" (change)="rTo.set($any($event.target).value)" />
              </label>
            }
            <label class="rb-field">
              <span>Granularity</span>
              <select [value]="gran()" (change)="rGran.set($any($event.target).value)">
                @for (g of allowedGran(); track g) {
                  <option [value]="g">{{ g === 'hour' ? 'Hourly' : g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly' }}</option>
                }
              </select>
            </label>
            <label class="rb-field">
              <span>Device</span>
              <select [value]="rDevice()" (change)="rDevice.set($any($event.target).value)">
                <option value="all">All devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </label>
            <label class="rb-field">
              <span>Country</span>
              <select [value]="rCountry()" (change)="rCountry.set($any($event.target).value)">
                <option value="all">All countries</option>
                @for (c of data.countries(); track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </label>
            <label class="rb-check">
              <input type="checkbox" [checked]="rCompare()" (change)="rCompare.set($any($event.target).checked)" />
              Compare with previous period
            </label>
          </div>

          <h4 class="rb-sub">
            Sections
            <button type="button" class="g-link-btn" (click)="toggleAll()">{{ sections().size === allSections.length ? 'Clear all' : 'Select all' }}</button>
          </h4>
          <div class="rb-sections">
            @for (s of allSections; track s.key) {
              <label class="rb-section" [class.on]="sections().has(s.key)">
                <input type="checkbox" [checked]="sections().has(s.key)" (change)="toggleSection(s.key)" />
                <span class="rb-ico">{{ s.icon }}</span>
                <span>
                  <strong>{{ s.label }}</strong>
                  <small>{{ s.hint }}</small>
                </span>
              </label>
            }
          </div>

          <h4 class="rb-sub">Content & layout</h4>
          <div class="rb-grid">
            <label class="rb-check"><input type="checkbox" [checked]="charts()" (change)="charts.set($any($event.target).checked)" /> Charts (PDF)</label>
            <label class="rb-check"><input type="checkbox" [checked]="tables()" (change)="tables.set($any($event.target).checked)" /> Data tables</label>
            <label class="rb-check"><input type="checkbox" [checked]="recs()" (change)="recs.set($any($event.target).checked)" /> Recommendations</label>
            <div class="rb-field">
              <span>PDF orientation</span>
              <div class="wm-seg">
                <button type="button" [class.active]="orientation() === 'portrait'" (click)="orientation.set('portrait')">▯ Portrait</button>
                <button type="button" [class.active]="orientation() === 'landscape'" (click)="orientation.set('landscape')">▭ Landscape</button>
              </div>
            </div>
            <label class="rb-field span-2">
              <span>Notes / executive commentary (optional)</span>
              <textarea rows="3" [value]="notes()" (input)="notes.set($any($event.target).value)" maxlength="1200" placeholder="Context for readers, e.g. the release that shipped this month…"></textarea>
            </label>
          </div>

          <h4 class="rb-sub">Saved presets</h4>
          <div class="rb-presets">
            @for (p of presets(); track p.name) {
              <span class="rb-preset">
                <button type="button" (click)="applyPreset(p)">{{ p.name }}</button>
                <button type="button" class="x" (click)="deletePreset(p.name)" [attr.aria-label]="'Delete preset ' + p.name">✕</button>
              </span>
            } @empty {
              <small class="g-muted">No presets yet.</small>
            }
            <button type="button" class="g-link-btn" (click)="savePreset()">+ Save current as preset</button>
          </div>
        </div>

        <footer class="g-modal-actions rb-actions">
          <button type="button" class="g-btn" (click)="closed.emit()">Cancel</button>
          <button type="button" class="g-btn success" [disabled]="!sections().size" (click)="exportExcel()">📊 Export Excel</button>
          <button type="button" class="g-btn violet" [disabled]="!sections().size" (click)="exportPdf()">🖨 Open PDF / print</button>
        </footer>
      </div>
    </div>
  `,
})
export class HealthReportBuilder {
  protected readonly data = inject(HealthDataService);
  private readonly audit = inject(AdminAuditService);
  private readonly auth = inject(AdminAuthService);
  private readonly insights = inject(AdminInsightsService);

  readonly range = input<RangeKey>('30d');
  readonly from = input<string>('');
  readonly to = input<string>('');
  readonly granularity = input<Granularity>('day');
  readonly device = input<DeviceFilter>('all');
  readonly country = input('all');
  readonly compare = input(true);
  readonly closed = output<void>();

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly allSections = REPORT_SECTIONS;

  protected readonly title = signal('NeverBeen — Website Health Report');
  protected readonly preparedBy = signal('');
  protected readonly confidentiality = signal<ReportSpec['confidentiality']>('Internal');
  protected readonly notes = signal('');
  protected readonly sections = signal<Set<ReportSection>>(new Set(REPORT_SECTIONS.map((s) => s.key)));
  protected readonly charts = signal(true);
  protected readonly tables = signal(true);
  protected readonly recs = signal(true);
  protected readonly orientation = signal<'portrait' | 'landscape'>('portrait');

  // criteria (seeded from the dashboard in ngOnInit)
  protected readonly rRange = signal<RangeKey>('30d');
  protected readonly rFrom = signal('');
  protected readonly rTo = signal('');
  protected readonly rGran = signal<Granularity>('day');
  protected readonly rDevice = signal<DeviceFilter>('all');
  protected readonly rCountry = signal('all');
  protected readonly rCompare = signal(true);
  protected readonly presets = signal<ReportPreset[]>(this.loadPresets());

  ngOnInit(): void {
    this.rRange.set(this.range());
    this.rFrom.set(this.from());
    this.rTo.set(this.to());
    this.rGran.set(this.granularity());
    this.rDevice.set(this.device());
    this.rCountry.set(this.country());
    this.rCompare.set(this.compare());
    this.preparedBy.set(`${this.auth.username} (Administrator)`);
  }

  private readonly win = computed(() => this.data.window({ range: this.rRange(), from: this.rFrom(), to: this.rTo() }));
  protected readonly allowedGran = computed(() => this.data.granularities(this.win()));
  protected readonly gran = computed<Granularity>(() => (this.allowedGran().includes(this.rGran()) ? this.rGran() : this.allowedGran()[0]));
  protected readonly periodText = computed(() => describeWindow(this.win()));

  protected toggleSection(k: ReportSection): void {
    this.sections.update((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  protected toggleAll(): void {
    this.sections.set(this.sections().size === REPORT_SECTIONS.length ? new Set() : new Set(REPORT_SECTIONS.map((s) => s.key)));
  }

  spec(): ReportSpec {
    return {
      id: `R-${Date.now().toString(36).toUpperCase()}`,
      title: this.title().trim() || 'Website Health Report',
      preparedBy: this.preparedBy().trim() || 'Administrator',
      notes: this.notes().trim(),
      // keep canonical section order
      sections: REPORT_SECTIONS.map((s) => s.key).filter((k) => this.sections().has(k)),
      range: this.rRange(),
      from: this.rFrom() || undefined,
      to: this.rTo() || undefined,
      granularity: this.gran(),
      device: this.rDevice(),
      country: this.rCountry(),
      compare: this.rCompare(),
      includeCharts: this.charts(),
      includeTables: this.tables(),
      includeRecommendations: this.recs(),
      orientation: this.orientation(),
      confidentiality: this.confidentiality(),
      createdUtc: new Date().toISOString(),
    };
  }

  private fileBase(spec: ReportSpec): string {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `neverbeen-health-report-${stamp}-${spec.id.toLowerCase()}`;
  }

  protected exportPdf(): void {
    const spec = this.spec();
    saveSpec(spec);
    this.audit.log({ category: 'operations', action: 'Generated health report (PDF)', targetLabel: spec.title, details: `${spec.id} · ${this.periodText()} · ${spec.sections.join(', ')}` });
    const w = window.open(new URL('admin/health-report', document.baseURI).href, '_blank');
    if (!w) this.insights.notify('Pop-up blocked — allow pop-ups for this site to open the printable report.');
    this.closed.emit();
  }

  protected exportExcel(): void {
    const spec = this.spec();
    try {
      const blob = buildExcel(buildReportData(this.data, spec), spec);
      downloadBlob(`${this.fileBase(spec)}.xlsx`, blob);
      this.audit.log({ category: 'operations', action: 'Exported health report (Excel)', targetLabel: spec.title, details: `${spec.id} · ${this.periodText()} · ${spec.sections.join(', ')}` });
      this.insights.notify('Excel report downloaded.');
      this.closed.emit();
    } catch (e) {
      this.insights.notify(`Could not build the Excel file: ${(e as Error).message}`);
    }
  }

  // ------------------------------------------------------------------ presets
  private loadPresets(): ReportPreset[] {
    try {
      return JSON.parse(localStorage.getItem(PRESET_KEY) ?? '[]') as ReportPreset[];
    } catch {
      return [];
    }
  }

  private persistPresets(list: ReportPreset[]): void {
    this.presets.set(list);
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(list));
    } catch {
      /* ignore quota */
    }
  }

  protected savePreset(): void {
    const name = (window.prompt('Preset name', `${this.rangeOptions.find((r) => r.key === this.rRange())?.label ?? 'Custom'} report`) ?? '').trim();
    if (!name) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdUtc, ...rest } = this.spec();
    this.persistPresets([...this.presets().filter((p) => p.name !== name), { name, spec: rest }].slice(-8));
  }

  protected applyPreset(p: ReportPreset): void {
    const s = p.spec;
    this.title.set(s.title);
    this.preparedBy.set(s.preparedBy);
    this.notes.set(s.notes);
    this.sections.set(new Set(s.sections));
    this.rRange.set(s.range);
    this.rFrom.set(s.from ?? '');
    this.rTo.set(s.to ?? '');
    this.rGran.set(s.granularity);
    this.rDevice.set(s.device);
    this.rCountry.set(s.country);
    this.rCompare.set(s.compare);
    this.charts.set(s.includeCharts);
    this.tables.set(s.includeTables);
    this.recs.set(s.includeRecommendations);
    this.orientation.set(s.orientation);
    this.confidentiality.set(s.confidentiality);
  }

  protected deletePreset(name: string): void {
    this.persistPresets(this.presets().filter((p) => p.name !== name));
  }
}
