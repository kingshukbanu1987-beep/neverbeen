import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminWebsite } from './website/website';
import { AdminMaintenance } from './maintenance/maintenance';
import { AdminHealth } from './health/health';
import { AdminHealthReport } from './health/health-report';
import { HealthReportBuilder } from './health/health-report-builder';
import { HealthDataService, METRIC_META, pctChange } from './health/health-data.service';
import { REPORT_SPEC_KEY, ReportSpec, buildExcel, buildReportData, kpiRows, loadSpec, saveSpec } from './health/health-report.model';
import { buildXlsx, colName, crc32, zip } from './health/xlsx';
import { SiteConfigService } from '../../services/site-config.service';
import { MaintenanceService, isBypassPath, statusOf } from '../../services/maintenance.service';
import { MaintenancePage } from '../../layout/maintenance-page/maintenance-page';
import { AdminAuditService } from '../../services/admin-audit.service';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function click(el: Element | null | undefined): void {
  expect(el).toBeTruthy();
  (el as HTMLElement).click();
}

function buttonByText(root: HTMLElement, text: string, selector = 'button'): HTMLButtonElement | null {
  return ([...root.querySelectorAll(selector)] as HTMLButtonElement[]).find((b) => (b.textContent ?? '').includes(text)) ?? null;
}

async function blobBytes(b: Blob): Promise<Uint8Array> {
  // jsdom's Blob lacks stream()/arrayBuffer(); FileReader works.
  const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(b);
  });
  return new Uint8Array(buf);
}

function spec(partial: Partial<ReportSpec> = {}): ReportSpec {
  return {
    id: 'R-TEST',
    title: 'Test health report',
    preparedBy: 'admin (Administrator)',
    notes: 'Quarterly review',
    sections: ['summary', 'risks', 'traffic', 'activity', 'storage', 'performance'],
    range: '30d',
    granularity: 'day',
    device: 'all',
    country: 'all',
    compare: true,
    includeCharts: true,
    includeTables: true,
    includeRecommendations: true,
    orientation: 'portrait',
    confidentiality: 'Confidential',
    createdUtc: new Date().toISOString(),
    ...partial,
  };
}

describe('Website Management, Site Downtime & Health', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:test';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    // jsdom: keep the maintenance service from hitting the network.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
  });

  afterEach(() => vi.restoreAllMocks());

  // ------------------------------------------------------------------ A. Website Management
  it('site config keeps edits in a draft until they are published, with revisions to roll back', () => {
    const cms = TestBed.inject(SiteConfigService);
    const original = cms.text('home.hero', 'title');
    cms.setDraft('home.hero', 'title', 'Brand new headline');
    expect(cms.pendingChanges().length).toBe(1);
    expect(cms.text('home.hero', 'title')).toBe(original); // visitors still see the published value

    const rev = cms.publish('Hero refresh');
    expect(rev).toBeTruthy();
    expect(cms.text('home.hero', 'title')).toBe('Brand new headline');
    expect(cms.pendingChanges().length).toBe(0);

    cms.setDraft('home.hero', 'interval', 999); // clamped to the field max
    cms.publish('Interval');
    expect(cms.get<number>('home.hero', 'interval')).toBe(20);

    expect(cms.state().revisions.length).toBeGreaterThanOrEqual(2);
  });

  it('Website Management page lists the Home and Community component groups', async () => {
    TestBed.configureTestingModule({ imports: [AdminWebsite], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminWebsite);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Home page');
    expect(text).toContain('Community');
    expect(text).toContain('Site-wide');
  });

  // ------------------------------------------------------------------ B. Downtime
  it('maintenance windows switch the site down and back up; admin paths bypass it', () => {
    const svc = TestBed.inject(MaintenanceService);
    expect(svc.status()).toBe('live');

    svc.schedule(null, new Date(Date.now() + 60 * 60_000).toISOString(), 'Critical database release', 0);
    expect(svc.isDown()).toBe(true);

    svc.extend(30);
    expect(Date.parse(svc.state().schedule.endUtc!)).toBeGreaterThan(Date.now() + 80 * 60_000);

    svc.end();
    expect(svc.status()).toBe('live');
    expect(svc.history().length).toBeGreaterThan(0);

    const future = { enabled: true, startUtc: new Date(Date.now() + 3_600_000).toISOString(), endUtc: null, reason: '', warnBeforeMinutes: 30 };
    expect(statusOf(future, Date.now())).toBe('scheduled');
    expect(isBypassPath('/admin/maintenance')).toBe(true);
    expect(isBypassPath('/community')).toBe(false);
  });

  it('the downtime page shows the admin-chosen content', async () => {
    TestBed.configureTestingModule({ imports: [MaintenancePage], providers: [provideRouter([])] });
    const svc = TestBed.inject(MaintenanceService);
    svc.updatePage({ title: 'Critical updates are going on', message: 'We will be back shortly.' });
    svc.schedule(null, new Date(Date.now() + 3_600_000).toISOString(), 'Release', 0);
    const fixture = TestBed.createComponent(MaintenancePage);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Critical updates are going on');
    expect(text).toContain('We will be back shortly.');
  });

  it('Site Downtime admin page renders the scheduler and page designer', async () => {
    TestBed.configureTestingModule({ imports: [AdminMaintenance], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminMaintenance);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.g-page-head')).toBeTruthy();
    expect(el.textContent).toContain('Critical');
  });

  // ------------------------------------------------------------------ C. Health
  it('xlsx writer: CRC-32, ZIP container and a valid workbook blob', async () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(colName(0)).toBe('A');
    expect(colName(25)).toBe('Z');
    expect(colName(26)).toBe('AA');

    const z = zip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
    expect([...z.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const blob = buildXlsx(
      [{ name: 'Data', title: 'T', columns: [{ header: 'Name' }, { header: 'Value', format: 'int' }], rows: [['a & <b>', 1], ['c', 2]] }],
      { title: 'Book' },
    );
    expect(blob.type).toContain('spreadsheetml');
    const bytes = await blobBytes(blob);
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('a &amp; &lt;b&gt;');
  });

  it('report model: spec round-trip, KPI rows and Excel export with one sheet per section', async () => {
    saveSpec(spec());
    expect(localStorage.getItem(REPORT_SPEC_KEY)).toBeTruthy();
    expect(loadSpec()?.id).toBe('R-TEST');

    const data = TestBed.inject(HealthDataService);
    const d = buildReportData(data, spec());
    expect(d.buckets.length).toBeGreaterThanOrEqual(28);
    expect(d.totals.pageViews).toBeGreaterThan(0);
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThanOrEqual(100);
    const rows = kpiRows(d);
    expect(rows.map((r) => r.label)).toContain(METRIC_META.pageViews.label);
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(5, 0)).toBeNull();

    const text = new TextDecoder('latin1').decode(await blobBytes(buildExcel(d, spec())));
    for (const name of ['Summary', 'Risks', 'Traffic', 'Top pages', 'User activity', 'Funnel &amp; retention', 'Storage', 'Performance']) expect(text).toContain(`name="${name}"`);

    // Only the chosen sections become sheets
    const only = spec({ sections: ['storage'] });
    const small = new TextDecoder('latin1').decode(await blobBytes(buildExcel(buildReportData(data, only), only)));
    expect(small).toContain('name="Storage"');
    expect(small).not.toContain('name="Traffic"');
  });

  it('Health dashboard: score, tabs with charts & grids, filters and risk acknowledgement', async () => {
    TestBed.configureTestingModule({ imports: [AdminHealth], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminHealth);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('hc-gauge')).toBeTruthy();
    const tabs = [...el.querySelectorAll('.g-tabs button')].map((b) => b.textContent?.trim() ?? '');
    expect(tabs.join('|')).toContain('Traffic');
    expect(tabs.join('|')).toContain('User activity');
    expect(tabs.join('|')).toContain('Storage');
    expect(tabs.join('|')).toContain('Performance');

    // Traffic: KPIs, chart, heatmap, pages grid
    expect(el.querySelectorAll('.hl-kpi').length).toBe(6);
    expect(el.querySelector('hc-chart svg')).toBeTruthy();
    expect(el.querySelector('hc-heatmap')).toBeTruthy();
    const pageRows = el.querySelectorAll('.g-table tbody tr').length;
    expect(pageRows).toBeGreaterThan(0);
    expect(pageRows).toBeLessThanOrEqual(8);

    // Toggle a metric series and switch the chart to bars
    const seriesBefore = el.querySelectorAll('hc-chart .hc-legend button, hc-chart .hc-legend-item').length;
    click(buttonByText(el, 'Sessions', '.hl-chip'));
    click(el.querySelector('.hl-card-tools .wm-seg button[title="Bars"]'));
    fixture.detectChanges();
    expect(el.querySelectorAll('hc-chart .hc-legend button, hc-chart .hc-legend-item').length).toBeGreaterThanOrEqual(seriesBefore);

    // Period change
    click(buttonByText(el, '7 days', '.hl-controls .wm-seg button') ?? el.querySelectorAll('.hl-controls .wm-seg button')[1]);
    fixture.detectChanges();
    expect(el.querySelector('hc-chart svg')).toBeTruthy();

    for (const [tab, marker] of [
      ['User activity', 'hc-funnel'],
      ['Storage', '.hl-tips'],
      ['Performance', '.hl-vitals'],
    ] as const) {
      click(buttonByText(el, tab, '.g-tabs button'));
      fixture.detectChanges();
      await flush();
      fixture.detectChanges();
      expect(el.querySelector(marker)).toBeTruthy();
    }

    // Risks: acknowledge persists in localStorage
    click(buttonByText(el, 'Risks', '.g-tabs button'));
    fixture.detectChanges();
    const ackBtn = buttonByText(el, 'Acknowledge', '.hl-risk button');
    if (ackBtn) {
      const before = el.querySelectorAll('.hl-risk').length;
      click(ackBtn);
      fixture.detectChanges();
      expect(JSON.parse(localStorage.getItem('neverbeen_health_ack') ?? '[]').length).toBe(1);
      expect(el.querySelectorAll('.hl-risk').length).toBe(before - 1);
    }
  });

  it('report builder exports Excel and opens the printable PDF page', async () => {
    TestBed.configureTestingModule({ imports: [HealthReportBuilder], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HealthReportBuilder);
    fixture.detectChanges();
    // The builder is a modal: it renders at the <body> root so it is never hidden behind a panel.
    const el: HTMLElement = document.body.querySelector('.g-modal-backdrop') as HTMLElement;
    expect(el.parentElement).toBe(document.body);
    const audit = TestBed.inject(AdminAuditService);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    expect(el.querySelectorAll('.rb-section').length).toBe(6);
    click(buttonByText(el, 'Export Excel'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(audit.entries().some((e) => e.action.includes('Excel'))).toBe(true);
    expect(closed).toHaveBeenCalledTimes(1);

    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    click(buttonByText(el, 'Open PDF'));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('/admin/health-report'), '_blank');
    expect(loadSpec()?.sections.length).toBe(6);
  });

  it('printable report renders cover, running header/footer and every selected section', async () => {
    saveSpec(spec({ sections: ['summary', 'risks', 'traffic', 'storage', 'performance', 'activity'] }));
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ imports: [AdminHealthReport], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AdminHealthReport);
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.hr-cover h1')?.textContent).toContain('Test health report');
    expect(el.querySelectorAll('img[src="neverbeen-logo-report.png"]').length).toBeGreaterThanOrEqual(3);
    expect(el.querySelector('.hr-run-head')).toBeTruthy();
    expect(el.querySelector('.hr-run-foot')?.textContent).toContain('Confidential');
    expect(el.querySelectorAll('.hr-section').length).toBe(6);
    expect(el.textContent).toContain('Executive summary');
    expect(el.textContent).toContain('Quarterly review');
    expect(document.head.querySelector('style[data-health-report]')?.textContent).toContain('size: A4 portrait');

    click(buttonByText(el, 'Print / Save as PDF'));
    expect(print).toHaveBeenCalled();
    fixture.destroy();
    expect(document.head.querySelector('style[data-health-report]')).toBeNull();
  });
});
