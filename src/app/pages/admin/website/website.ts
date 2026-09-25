import { OverlayPortal } from '../shared/overlay-portal';
import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SiteConfigService } from '../../../services/site-config.service';
import { CMS_COMPONENTS, CMS_PAGES, CmsPage, cmsComponent } from '../../../services/site-config.registry';
import { AdminAuditService, AuditCategory } from '../../../services/admin-audit.service';
import { AdminInsightsService, timeAgo } from '../shared/admin-insights.service';
import { downloadJson } from '../shared/admin-data-ops.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { AdminAuditLog } from '../shared/admin-audit-log';
import { CmsFieldEditor } from './cms-field-editor';

type WebsiteTab = 'editor' | 'history' | 'activity';
type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };

/**
 * Admin > Website Management — a small visual CMS for the public site:
 * pick any component (site-wide, Home page, Community), edit its content,
 * visibility and order, watch the live draft preview, then publish (with
 * revision history and one-click rollback).
 */
@Component({
  selector: 'app-admin-website',
  imports: [CmsFieldEditor, AdminConfirmDialog, AdminAuditLog, OverlayPortal],
  styleUrls: ['../shared/admin-grid.css', './website.css'],
  templateUrl: './website.html',
})
export class AdminWebsite {
  protected readonly cms = inject(SiteConfigService);
  private readonly audit = inject(AdminAuditService);
  private readonly insights = inject(AdminInsightsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly pages = CMS_PAGES;
  protected readonly tabs: { key: WebsiteTab; label: string; icon: string }[] = [
    { key: 'editor', label: 'Visual editor', icon: '🎛️' },
    { key: 'history', label: 'Publish history', icon: '🕘' },
    { key: 'activity', label: 'Change log', icon: '📜' },
  ];
  protected readonly devices: { key: Device; label: string; icon: string }[] = [
    { key: 'desktop', label: 'Desktop', icon: '🖥️' },
    { key: 'tablet', label: 'Tablet', icon: '📱' },
    { key: 'mobile', label: 'Mobile', icon: '📲' },
  ];
  protected readonly timeAgo = timeAgo;
  protected readonly auditCategories: AuditCategory[] = ['website'];

  private readonly query = toSignal(this.route.queryParamMap.pipe(map((p) => ({ tab: p.get('tab'), component: p.get('component') }))), {
    initialValue: { tab: null, component: null },
  });
  private readonly localTab = signal<WebsiteTab | null>(null);
  private readonly localComponent = signal<string | null>(null);

  protected readonly tab = computed<WebsiteTab>(() => {
    const t = this.localTab() ?? this.query().tab;
    return this.tabs.some((x) => x.key === t) ? (t as WebsiteTab) : 'editor';
  });
  protected readonly selectedKey = computed(() => {
    const k = this.localComponent() ?? this.query().component;
    return k && cmsComponent(k) ? k : 'home.layout';
  });
  protected readonly selected = computed(() => cmsComponent(this.selectedKey())!);

  protected readonly search = signal('');
  protected readonly tree = computed(() => {
    const q = this.search().trim().toLowerCase();
    return CMS_PAGES.map((p) => ({
      ...p,
      components: CMS_COMPONENTS.filter((c) => c.page === p.key && (!q || `${c.label} ${c.description}`.toLowerCase().includes(q))),
    })).filter((p) => p.components.length);
  });

  protected readonly pending = this.cms.pendingChanges;
  protected readonly pendingByComponent = computed(() => {
    const m = new Map<string, number>();
    for (const c of this.pending()) m.set(c.component, (m.get(c.component) ?? 0) + 1);
    return m;
  });
  protected readonly revisions = computed(() => this.cms.state().revisions);

  protected readonly kpis = computed(() => {
    const s = this.cms.state();
    const homeHidden = this.cms.items('home.layout', 'sections').filter((i) => !i.visible).length;
    const fields = CMS_COMPONENTS.reduce((n, c) => n + c.fields.length, 0);
    return [
      { label: 'Managed components', value: CMS_COMPONENTS.length, sub: `${fields} editable settings across ${CMS_PAGES.length} areas`, glow: 'rgba(99,102,241,0.16)' },
      { label: 'Unpublished changes', value: this.pending().length, sub: this.pending().length ? 'Draft differs from the live site' : 'Draft matches the live site', glow: this.pending().length ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.16)' },
      { label: 'Live customisations', value: this.cms.customisedCount(), sub: 'Settings changed from the shipped design', glow: 'rgba(139,92,246,0.16)' },
      { label: 'Home sections live', value: `${8 - homeHidden}/8`, sub: homeHidden ? `${homeHidden} hidden` : 'All sections shown', glow: 'rgba(14,165,233,0.16)' },
      { label: 'Last published', value: s.publishedAtUtc ? timeAgo(s.publishedAtUtc) : 'Never', sub: `${s.revisions.length} revision(s) kept`, glow: 'rgba(16,185,129,0.16)' },
    ];
  });

  // ------------------------------------------------------------------ preview
  protected readonly device = signal<Device>('desktop');
  protected readonly previewSource = signal<'draft' | 'live'>('draft');
  private readonly reloadKey = signal(0);
  private readonly previewHost = viewChild<ElementRef<HTMLElement>>('previewHost');
  private readonly hostWidth = signal(640);

  protected readonly previewPath = computed(() => {
    const c = this.selected();
    return `${c.previewPath}${this.previewSource() === 'draft' ? '?nbPreview=draft' : ''}${c.previewFragment ? '#' + c.previewFragment : ''}`;
  });
  protected readonly previewUrl = computed<SafeResourceUrl>(() => {
    this.reloadKey();
    const c = this.selected();
    // A unique query value forces a reload when "Reload" is pressed.
    const params = new URLSearchParams();
    params.set('nbPreview', this.previewSource() === 'draft' ? 'draft' : 'live');
    params.set('r', String(this.reloadKey()));
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${c.previewPath}?${params.toString()}${c.previewFragment ? '#' + c.previewFragment : ''}`);
  });
  protected readonly deviceWidth = computed(() => DEVICE_WIDTH[this.device()]);
  protected readonly scale = computed(() => Math.min(1, this.hostWidth() / this.deviceWidth()));

  // ------------------------------------------------------------------ dialogs
  protected readonly publishOpen = signal(false);
  protected readonly publishNote = signal('');
  protected readonly confirm = signal<null | { kind: 'discard' | 'reset' | 'rollback'; revisionId?: number }>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.previewHost()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.hostWidth.set(Math.max(240, el.clientWidth)));
      ro.observe(el);
      this.hostWidth.set(Math.max(240, el.clientWidth));
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  protected setTab(tab: WebsiteTab): void {
    this.localTab.set(tab);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'editor' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected select(key: string): void {
    this.localComponent.set(key);
    this.router.navigate([], { relativeTo: this.route, queryParams: { component: key }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected pageLabel(key: CmsPage): string {
    return CMS_PAGES.find((p) => p.key === key)?.label ?? key;
  }

  protected reloadPreview(): void {
    this.reloadKey.update((n) => n + 1);
  }

  protected openPreviewTab(): void {
    const c = this.selected();
    // Opened as a top-level tab the site shows the *live* version; the draft is only rendered inside the editor frame.
    window.open(`${c.previewPath}${c.previewFragment ? '#' + c.previewFragment : ''}`, '_blank', 'noopener');
  }

  protected resetComponent(): void {
    this.cms.resetComponent(this.selectedKey());
    this.insights.notify(`${this.selected().label} restored to its default design (draft).`);
  }

  // ------------------------------------------------------------------ publish flow
  protected openPublish(): void {
    this.publishNote.set('');
    this.publishOpen.set(true);
  }

  protected publish(): void {
    const changes = this.pending().map((c) => `${c.componentLabel} › ${c.fieldLabel}`);
    const rev = this.cms.publish(this.publishNote());
    this.publishOpen.set(false);
    if (!rev) return;
    this.audit.log({ category: 'website', action: 'Website changes published', targetLabel: rev.note, details: `${rev.changes} change(s): ${changes.slice(0, 6).join('; ')}${changes.length > 6 ? '…' : ''}` });
    this.insights.notify(`Published ${rev.changes} change(s) — the website is updated.`);
    this.reloadPreview();
  }

  protected runConfirm(): void {
    const c = this.confirm();
    this.confirm.set(null);
    if (!c) return;
    if (c.kind === 'discard') {
      const n = this.pending().length;
      this.cms.discardDraft();
      this.audit.log({ category: 'website', action: 'Draft discarded', details: `${n} unpublished change(s) dropped` });
      this.insights.notify('Draft discarded — the editor matches the live site again.');
    } else if (c.kind === 'reset') {
      this.cms.resetAllDraft();
      this.insights.notify('Every component reset to the shipped design in the draft. Publish to make it live.');
    } else if (c.kind === 'rollback' && c.revisionId) {
      const rev = this.revisions().find((r) => r.id === c.revisionId);
      this.cms.restoreRevision(c.revisionId, true);
      this.audit.log({ category: 'website', action: 'Website rolled back', targetLabel: rev?.note, details: rev ? `Revision of ${new Date(rev.atUtc).toLocaleString()}` : '' });
      this.insights.notify('Rolled back — that revision is live again.');
      this.reloadPreview();
    }
  }

  protected loadRevision(id: number): void {
    this.cms.restoreRevision(id, false);
    this.setTab('editor');
    this.insights.notify('Revision loaded into the draft — review it in the preview, then publish.');
  }

  protected downloadRevision(id: number): void {
    const rev = this.revisions().find((r) => r.id === id);
    if (rev) downloadJson(`neverbeen-site-config-${rev.atUtc.slice(0, 10)}.json`, { app: 'NeverBeen', kind: 'site-config', exportedUtc: rev.atUtc, values: rev.values });
  }

  protected exportConfig(): void {
    downloadJson(`neverbeen-site-config-${new Date().toISOString().slice(0, 10)}.json`, this.cms.exportConfig());
    this.audit.log({ category: 'website', action: 'Website configuration exported' });
  }

  protected async importConfig(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const n = this.cms.importConfig(JSON.parse(await file.text()));
      this.audit.log({ category: 'website', action: 'Website configuration imported', targetLabel: file.name, details: `${n} setting(s) loaded into the draft` });
      this.insights.notify(`Imported ${n} setting(s) into the draft — review and publish.`);
      this.setTab('editor');
    } catch (e) {
      this.insights.notify(`Import failed: ${(e as Error).message}`);
    }
  }
}
