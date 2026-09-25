import { Component, computed, inject, input, signal } from '@angular/core';
import { SiteConfigService } from '../../../services/site-config.service';
import { CmsField, CmsItem, CmsRecord, cmsField } from '../../../services/site-config.registry';

/**
 * Editor for a single Website Management field. Renders the right control for
 * the field type (text, toggle, colour, re-orderable item list, record list…)
 * and writes every change straight into the draft, which the live preview picks up.
 */
@Component({
  selector: 'app-cms-field-editor',
  styleUrls: ['../shared/admin-grid.css', './website.css'],
  host: { '[class.wide]': 'isWide()' },
  template: `
    @let f = field();
    <div class="cf" [class.changed]="changed()">
      <div class="cf-head">
        <label class="cf-label" [attr.for]="inputId()">
          {{ f.label }}
          @if (changed()) {
            <span class="cf-dot" title="Unpublished change"></span>
          }
        </label>
        @if (customised()) {
          <button type="button" class="cf-reset" (click)="reset()" title="Restore the shipped default">↺ Default</button>
        }
      </div>

      @switch (f.type) {
        @case ('toggle') {
          <label class="cf-switch">
            <input type="checkbox" [id]="inputId()" [checked]="value()" (change)="set($any($event.target).checked)" />
            <span class="track"><span class="thumb"></span></span>
            <span class="cf-switch-text">{{ value() ? 'On' : 'Off' }}</span>
          </label>
        }
        @case ('textarea') {
          <textarea [id]="inputId()" rows="4" [attr.maxlength]="f.maxLength ?? null" [value]="value()" (input)="set($any($event.target).value)"></textarea>
          @if (f.maxLength) {
            <small class="cf-count">{{ $any(value())?.length ?? 0 }} / {{ f.maxLength }}</small>
          }
        }
        @case ('number') {
          <div class="cf-range">
            <input type="range" [min]="f.min ?? 0" [max]="f.max ?? 100" [value]="value()" (input)="set(+$any($event.target).value)" aria-hidden="true" tabindex="-1" />
            <input type="number" [id]="inputId()" [min]="f.min ?? 0" [max]="f.max ?? 100" [value]="value()" (change)="set(+$any($event.target).value)" />
          </div>
        }
        @case ('select') {
          <div class="cf-seg" role="radiogroup" [attr.aria-label]="f.label">
            @for (o of f.options ?? []; track o.value) {
              <button type="button" role="radio" [attr.aria-checked]="value() === o.value" [class.active]="value() === o.value" (click)="set(o.value)">{{ o.label }}</button>
            }
          </div>
        }
        @case ('color') {
          <div class="cf-color">
            <input type="color" [id]="inputId()" [value]="value()" (input)="set($any($event.target).value)" />
            <input type="text" [value]="value()" maxlength="7" (change)="setColor($any($event.target).value)" aria-label="Hex colour" />
            <span class="cf-swatch" [style.background]="value()"></span>
          </div>
        }
        @case ('items') {
          <div class="cf-items-tools">
            <small>{{ visibleCount() }} of {{ items().length }} shown · drag ⠿ or use the arrows to re-order</small>
            <span class="g-toolbar-spacer"></span>
            <button type="button" class="g-link-btn" (click)="setAll(true)">Show all</button>
            <button type="button" class="g-link-btn" (click)="setAll(false)">Hide all</button>
          </div>
          <ol class="cf-items">
            @for (it of items(); track it.id; let i = $index; let first = $first; let last = $last) {
              <li
                [class.off]="!it.visible"
                [class.drag-over]="dragOver() === i"
                draggable="true"
                (dragstart)="dragFrom.set(i)"
                (dragover)="$event.preventDefault(); dragOver.set(i)"
                (dragleave)="dragOver.set(null)"
                (drop)="drop(i)"
                (dragend)="dragFrom.set(null); dragOver.set(null)"
              >
                <span class="cf-grip" aria-hidden="true">⠿</span>
                <span class="cf-pos">{{ i + 1 }}</span>
                @if (f.labelEditable) {
                  <input type="text" class="cf-item-label" [value]="it.label" [placeholder]="defaultLabel(it.id)" (change)="rename(i, $any($event.target).value)" [attr.aria-label]="'Label for ' + defaultLabel(it.id)" />
                } @else {
                  <span class="cf-item-name">{{ it.label }}</span>
                }
                <div class="cf-item-actions">
                  <button type="button" class="g-icon-btn" [disabled]="first" (click)="move(i, -1)" [attr.aria-label]="'Move ' + it.label + ' up'">↑</button>
                  <button type="button" class="g-icon-btn" [disabled]="last" (click)="move(i, 1)" [attr.aria-label]="'Move ' + it.label + ' down'">↓</button>
                  @if (isLocked(it.id)) {
                    <span class="g-badge" title="Always shown">🔒 Always on</span>
                  } @else {
                    <label class="cf-switch sm" [title]="it.visible ? 'Shown — click to hide' : 'Hidden — click to show'">
                      <input type="checkbox" [checked]="it.visible" (change)="toggleItem(i)" [attr.aria-label]="'Show ' + it.label" />
                      <span class="track"><span class="thumb"></span></span>
                    </label>
                  }
                </div>
              </li>
            }
          </ol>
        }
        @case ('records') {
          <div class="cf-items-tools">
            <small>{{ records().length }} item(s){{ f.maxRecords ? ' · max ' + f.maxRecords : '' }}</small>
            <span class="g-toolbar-spacer"></span>
            <button type="button" class="g-btn violet" [disabled]="f.maxRecords !== undefined && records().length >= f.maxRecords" (click)="addRecord()">＋ Add</button>
          </div>
          <div class="cf-records">
            @for (r of records(); track $index; let i = $index; let first = $first; let last = $last) {
              <details class="cf-record" [open]="openRecord() === i" (toggle)="onToggle(i, $event)">
                <summary>
                  <span class="cf-pos">{{ i + 1 }}</span>
                  <span class="cf-record-title">{{ recordTitle(r) || 'Untitled' }}</span>
                  <span class="cf-item-actions" (click)="$event.preventDefault()">
                    <button type="button" class="g-icon-btn" [disabled]="first" (click)="moveRecord(i, -1)" aria-label="Move up">↑</button>
                    <button type="button" class="g-icon-btn" [disabled]="last" (click)="moveRecord(i, 1)" aria-label="Move down">↓</button>
                    <button type="button" class="g-icon-btn danger" (click)="removeRecord(i)" aria-label="Remove">✕</button>
                  </span>
                </summary>
                <div class="cf-record-body">
                  @for (sf of f.recordFields ?? []; track sf.key) {
                    <label class="cf-sub">
                      <span>{{ sf.label }}</span>
                      @switch (sf.type) {
                        @case ('textarea') {
                          <textarea rows="3" [value]="str(r[sf.key])" (input)="setRecord(i, sf.key, $any($event.target).value)"></textarea>
                        }
                        @case ('lines') {
                          <textarea rows="4" [value]="lines(r[sf.key])" (change)="setRecord(i, sf.key, splitLines($any($event.target).value))"></textarea>
                        }
                        @case ('toggle') {
                          <span class="cf-switch sm">
                            <input type="checkbox" [checked]="!!r[sf.key]" (change)="setRecord(i, sf.key, $any($event.target).checked)" />
                            <span class="track"><span class="thumb"></span></span>
                          </span>
                        }
                        @default {
                          <input type="text" [value]="str(r[sf.key])" (input)="setRecord(i, sf.key, $any($event.target).value)" />
                        }
                      }
                    </label>
                  }
                </div>
              </details>
            } @empty {
              <p class="g-empty">Nothing here yet — the section will be hidden until you add an item.</p>
            }
          </div>
        }
        @default {
          <input [type]="f.type === 'url' ? 'text' : 'text'" [id]="inputId()" [attr.maxlength]="f.maxLength ?? null" [value]="value()" (input)="set($any($event.target).value)" />
          @if (f.maxLength) {
            <small class="cf-count">{{ $any(value())?.length ?? 0 }} / {{ f.maxLength }}</small>
          }
        }
      }
      @if (f.hint) {
        <small class="cf-hint">{{ f.hint }}</small>
      }
    </div>
  `,
})
export class CmsFieldEditor {
  private readonly cms = inject(SiteConfigService);

  readonly component = input.required<string>();
  readonly fieldKey = input.required<string>({ alias: 'field' });

  protected readonly field = computed<CmsField>(() => cmsField(this.component(), this.fieldKey())!);
  protected readonly isWide = computed(() => ['items', 'records', 'textarea'].includes(this.field().type));
  protected readonly inputId = computed(() => `cf-${this.component()}-${this.fieldKey()}`.replace(/\./g, '-'));
  protected readonly value = computed(() => {
    this.cms.state();
    return this.cms.draftValue<any>(this.component(), this.fieldKey());
  });
  protected readonly changed = computed(() => this.cms.isChanged(this.component(), this.fieldKey()));
  protected readonly customised = computed(() => this.cms.isCustomised(this.component(), this.fieldKey()));

  // items
  protected readonly items = computed<CmsItem[]>(() => {
    this.cms.state();
    return this.cms.draftItems(this.component(), this.fieldKey());
  });
  protected readonly visibleCount = computed(() => this.items().filter((i) => i.visible).length);
  protected readonly dragFrom = signal<number | null>(null);
  protected readonly dragOver = signal<number | null>(null);

  // records
  protected readonly records = computed<CmsRecord[]>(() => (Array.isArray(this.value()) ? (this.value() as CmsRecord[]) : []));
  protected readonly openRecord = signal<number | null>(null);

  protected set(v: unknown): void {
    this.cms.setDraft(this.component(), this.fieldKey(), v);
  }

  protected setColor(v: string): void {
    const hex = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) this.set(hex.toLowerCase());
  }

  protected reset(): void {
    this.cms.resetField(this.component(), this.fieldKey());
  }

  // ----- items
  protected defaultLabel(id: string): string {
    return ((this.field().default as CmsItem[]) ?? []).find((d) => d.id === id)?.label ?? id;
  }
  protected isLocked(id: string): boolean {
    return (this.field().lockedIds ?? []).includes(id);
  }
  private writeItems(list: CmsItem[]): void {
    this.set(list);
  }
  protected move(i: number, delta: number): void {
    const list = this.items().slice();
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.writeItems(list);
  }
  protected drop(to: number): void {
    const from = this.dragFrom();
    this.dragOver.set(null);
    this.dragFrom.set(null);
    if (from === null || from === to) return;
    const list = this.items().slice();
    const [row] = list.splice(from, 1);
    list.splice(to, 0, row);
    this.writeItems(list);
  }
  protected toggleItem(i: number): void {
    this.writeItems(this.items().map((it, k) => (k === i ? { ...it, visible: !it.visible } : it)));
  }
  protected setAll(visible: boolean): void {
    this.writeItems(this.items().map((it) => ({ ...it, visible })));
  }
  protected rename(i: number, label: string): void {
    const clean = label.trim() || this.defaultLabel(this.items()[i].id);
    this.writeItems(this.items().map((it, k) => (k === i ? { ...it, label: clean } : it)));
  }

  // ----- records
  protected recordTitle(r: CmsRecord): string {
    const key = this.field().recordTitleKey;
    return key ? String(r[key] ?? '') : '';
  }
  protected setRecord(i: number, key: string, v: string | boolean | string[]): void {
    const list = this.records().map((r, k) => (k === i ? { ...r, [key]: v } : r));
    // Only one featured plan at a time.
    if (key === 'featured' && v === true) list.forEach((r, k) => k !== i && 'featured' in r && (r['featured'] = false));
    this.set(list);
  }
  protected addRecord(): void {
    const blank: CmsRecord = {};
    for (const sf of this.field().recordFields ?? []) blank[sf.key] = sf.type === 'toggle' ? false : sf.type === 'lines' ? [] : '';
    const titleKey = this.field().recordTitleKey;
    if (titleKey) blank[titleKey] = 'New item';
    this.set([...this.records(), blank]);
    this.openRecord.set(this.records().length - 1);
  }
  protected removeRecord(i: number): void {
    this.set(this.records().filter((_, k) => k !== i));
  }
  protected moveRecord(i: number, delta: number): void {
    const list = this.records().slice();
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.set(list);
  }
  protected onToggle(i: number, e: Event): void {
    const open = (e.target as HTMLDetailsElement).open;
    if (open) this.openRecord.set(i);
    else if (this.openRecord() === i) this.openRecord.set(null);
  }
  protected str(v: unknown): string {
    return v === undefined || v === null ? '' : String(v);
  }
  protected lines(v: unknown): string {
    return Array.isArray(v) ? v.join('\n') : String(v ?? '');
  }
  protected splitLines(v: string): string[] {
    return v
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
}
