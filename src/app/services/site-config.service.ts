import { Injectable, computed, signal } from '@angular/core';
import { CMS_COMPONENTS, CmsItem, CmsRecord, THEME_VARS, cmsField } from './site-config.registry';

export const SITE_CONFIG_KEY = 'neverbeen_site_config';
const MAX_REVISIONS = 30;

/** Overrides only: component key → field key → value. Missing = shipped default. */
export type CmsValues = Record<string, Record<string, unknown>>;

export interface CmsRevision {
  id: number;
  atUtc: string;
  by: string;
  note: string;
  changes: number;
  values: CmsValues;
}

export interface SiteConfigState {
  draft: CmsValues;
  published: CmsValues;
  publishedAtUtc: string | null;
  revisions: CmsRevision[];
}

export interface CmsChange {
  component: string;
  field: string;
  componentLabel: string;
  fieldLabel: string;
}

const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
export const deepEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * True when the app runs inside the Admin Console's live-preview frame
 * (`?nbPreview=draft` inside an iframe). Captured once at start-up so it
 * survives in-app navigation inside the preview.
 */
function detectPreview(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top && new URLSearchParams(window.location.search).get('nbPreview') === 'draft';
  } catch {
    return false;
  }
}

/**
 * Website content & layout configuration (a tiny headless CMS).
 *
 * The public site reads the *published* values; the Admin Console edits a
 * *draft* that can be previewed live and then published (with a revision
 * history for one-click rollback). Everything is stored in localStorage and
 * synchronised across tabs/frames through the `storage` event.
 */
@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  readonly previewMode = detectPreview();
  readonly state = signal<SiteConfigState>(this.load());

  /** Values the current page renders with. */
  private readonly active = computed<CmsValues>(() => (this.previewMode ? this.state().draft : this.state().published));

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === SITE_CONFIG_KEY) {
          this.state.set(this.load());
          this.applyTheme();
        }
      });
    }
    this.applyTheme();
  }

  /** Brand colours → CSS custom properties on <html> (re-applied whenever the state changes). */
  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const theme = (this.previewMode ? this.state().draft : this.state().published)['global.theme'] ?? {};
    for (const [field, cssVar] of Object.entries(THEME_VARS)) {
      const override = theme[field];
      if (typeof override === 'string' && /^#[0-9a-f]{6}$/i.test(override)) root.style.setProperty(cssVar, override);
      else root.style.removeProperty(cssVar);
    }
  }

  // ------------------------------------------------------------------ Site API (published / preview)

  get<T = string>(component: string, field: string): T {
    const v = this.active()[component]?.[field];
    return (v === undefined ? cmsField(component, field)?.default : v) as T;
  }

  text(component: string, field: string): string {
    return String(this.get(component, field) ?? '');
  }

  flag(component: string, field: string): boolean {
    return !!this.get<boolean>(component, field);
  }

  /** Items merged with the registry defaults (new defaults appended, unknown ids dropped), in configured order. */
  items(component: string, field: string): CmsItem[] {
    return this.mergeItems(component, field, this.active()[component]?.[field]);
  }

  visibleItems(component: string, field: string): CmsItem[] {
    return this.items(component, field).filter((i) => i.visible);
  }

  isItemVisible(component: string, field: string, id: string): boolean {
    return this.items(component, field).find((i) => i.id === id)?.visible ?? true;
  }

  itemLabel(component: string, field: string, id: string): string {
    return this.items(component, field).find((i) => i.id === id)?.label ?? id;
  }

  records<T = CmsRecord>(component: string, field: string): T[] {
    return (this.get<T[]>(component, field) ?? []) as T[];
  }

  // ------------------------------------------------------------------ Admin API (draft)

  draftValue<T = unknown>(component: string, field: string): T {
    const v = this.state().draft[component]?.[field];
    return clone((v === undefined ? cmsField(component, field)?.default : v) as T);
  }

  draftItems(component: string, field: string): CmsItem[] {
    return this.mergeItems(component, field, this.state().draft[component]?.[field]);
  }

  setDraft(component: string, field: string, value: unknown): void {
    const def = cmsField(component, field);
    if (!def) return;
    let v = value;
    if (def.type === 'items' && Array.isArray(v)) {
      const locked = def.lockedIds ?? [];
      v = (v as CmsItem[]).map((i) => ({ id: i.id, label: i.label, visible: locked.includes(i.id) ? true : i.visible }));
    }
    if (def.type === 'number' && typeof v === 'number') {
      v = Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, Math.round(v)));
    }
    this.state.update((s) => {
      const draft = clone(s.draft);
      const comp = { ...(draft[component] ?? {}) };
      if (deepEqual(v, def.default)) delete comp[field];
      else comp[field] = clone(v);
      if (Object.keys(comp).length) draft[component] = comp;
      else delete draft[component];
      return { ...s, draft };
    });
    this.save();
  }

  resetField(component: string, field: string): void {
    this.setDraft(component, field, cmsField(component, field)?.default);
  }

  resetComponent(component: string): void {
    this.state.update((s) => {
      const draft = clone(s.draft);
      delete draft[component];
      return { ...s, draft };
    });
    this.save();
  }

  /** Draft differs from the shipped default. */
  isCustomised(component: string, field?: string): boolean {
    const comp = this.state().draft[component];
    if (!comp) return false;
    return field ? field in comp : Object.keys(comp).length > 0;
  }

  /** Draft differs from what is live. */
  isChanged(component: string, field: string): boolean {
    const s = this.state();
    return !deepEqual(s.draft[component]?.[field], s.published[component]?.[field]);
  }

  readonly pendingChanges = computed<CmsChange[]>(() => {
    const s = this.state();
    const out: CmsChange[] = [];
    for (const c of CMS_COMPONENTS) {
      for (const f of c.fields) {
        if (!deepEqual(s.draft[c.key]?.[f.key], s.published[c.key]?.[f.key])) {
          out.push({ component: c.key, field: f.key, componentLabel: c.label, fieldLabel: f.label });
        }
      }
    }
    return out;
  });

  readonly customisedCount = computed(() => Object.values(this.state().published).reduce((n, c) => n + Object.keys(c).length, 0));

  publish(note: string, by = 'admin'): CmsRevision | null {
    const changes = this.pendingChanges().length;
    if (!changes) return null;
    const rev: CmsRevision = { id: Date.now(), atUtc: new Date().toISOString(), by, note: note.trim() || 'Published changes', changes, values: clone(this.state().draft) };
    this.state.update((s) => ({ ...s, published: clone(s.draft), publishedAtUtc: rev.atUtc, revisions: [rev, ...s.revisions].slice(0, MAX_REVISIONS) }));
    this.save();
    return rev;
  }

  discardDraft(): void {
    this.state.update((s) => ({ ...s, draft: clone(s.published) }));
    this.save();
  }

  /** Loads a revision into the draft (publish to make it live) — or publishes immediately. */
  restoreRevision(id: number, publishNow: boolean): boolean {
    const rev = this.state().revisions.find((r) => r.id === id);
    if (!rev) return false;
    this.state.update((s) => ({ ...s, draft: clone(rev.values) }));
    this.save();
    if (publishNow) this.publish(`Rolled back to revision of ${new Date(rev.atUtc).toLocaleString()}`);
    return true;
  }

  /** Clears every override in the draft (site returns to the shipped design once published). */
  resetAllDraft(): void {
    this.state.update((s) => ({ ...s, draft: {} }));
    this.save();
  }

  exportConfig(): { app: string; kind: string; exportedUtc: string; values: CmsValues } {
    return { app: 'NeverBeen', kind: 'site-config', exportedUtc: new Date().toISOString(), values: clone(this.state().published) };
  }

  /** Imports a previously exported configuration into the draft. Returns the number of known fields imported. */
  importConfig(raw: unknown): number {
    const values = (raw as { values?: unknown })?.values ?? raw;
    if (!values || typeof values !== 'object') throw new Error('Not a NeverBeen site configuration file.');
    const draft: CmsValues = {};
    let n = 0;
    for (const [comp, fields] of Object.entries(values as CmsValues)) {
      if (!fields || typeof fields !== 'object') continue;
      for (const [field, v] of Object.entries(fields)) {
        if (!cmsField(comp, field)) continue;
        (draft[comp] ??= {})[field] = clone(v);
        n++;
      }
    }
    if (!n) throw new Error('The file does not contain any recognised website settings.');
    this.state.update((s) => ({ ...s, draft }));
    this.save();
    return n;
  }

  // ------------------------------------------------------------------ internals

  private mergeItems(component: string, field: string, stored: unknown): CmsItem[] {
    const def = cmsField(component, field);
    const defaults = (def?.default as CmsItem[]) ?? [];
    const locked = def?.lockedIds ?? [];
    const byId = new Map(defaults.map((d) => [d.id, d]));
    const out: CmsItem[] = [];
    if (Array.isArray(stored)) {
      for (const row of stored as CmsItem[]) {
        const base = byId.get(row?.id);
        if (!base || out.some((o) => o.id === row.id)) continue;
        out.push({
          id: base.id,
          label: def?.labelEditable && typeof row.label === 'string' && row.label.trim() ? row.label : base.label,
          visible: locked.includes(base.id) ? true : row.visible !== false,
        });
      }
    }
    for (const d of defaults) if (!out.some((o) => o.id === d.id)) out.push({ ...d });
    return out;
  }

  private load(): SiteConfigState {
    const empty: SiteConfigState = { draft: {}, published: {}, publishedAtUtc: null, revisions: [] };
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SITE_CONFIG_KEY) : null;
      if (!raw) return empty;
      const p = JSON.parse(raw) as Partial<SiteConfigState>;
      return {
        draft: p.draft && typeof p.draft === 'object' ? p.draft : {},
        published: p.published && typeof p.published === 'object' ? p.published : {},
        publishedAtUtc: p.publishedAtUtc ?? null,
        revisions: Array.isArray(p.revisions) ? p.revisions : [],
      };
    } catch {
      return empty;
    }
  }

  private save(): void {
    this.applyTheme();
    try {
      localStorage.setItem(SITE_CONFIG_KEY, JSON.stringify(this.state()));
    } catch {
      /* storage full or unavailable — keep in memory */
    }
  }
}
