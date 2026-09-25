import { Component, ElementRef, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { AdminMailService, MailAdmin, MailGroup } from './admin-mail.service';
import { initials } from './mail-utils';

export type RecipientField = 'to' | 'cc' | 'bcc';

type Suggestion = { kind: 'admin'; admin: MailAdmin } | { kind: 'group'; group: MailGroup; count: number };

const DRAG_TYPE = 'application/x-neverbeen-admin';

/**
 * Chip-style recipient input used for To / Cc / Bcc in Compose.
 * - type a name, e-mail, team or role → suggestions (↑ ↓ to move, Enter / Tab / , to add)
 * - paste several addresses separated by commas, semicolons or new lines
 * - Backspace on an empty field removes the last chip
 * - teams ("Trust & Safety", "All admins"…) add every member at once
 * - chips can be dragged between To, Cc and Bcc
 * Only NeverBeen admins can receive admin mail — anything else becomes a red "not an admin" chip.
 */
@Component({
  selector: 'app-mail-recipients',
  template: `
    <div class="rc" [class.focused]="focused()" [class.drop]="dropping()" (click)="focus()" (dragover)="onDragOver($event)" (dragleave)="dropping.set(false)" (drop)="onDrop($event)">
      <label class="rc-label" [attr.for]="inputId()">{{ label() }}</label>
      <div class="rc-chips">
        @for (id of ids(); track id) {
          <span class="rc-chip" draggable="true" (dragstart)="onDragStart($event, id)" [title]="person(id).name + ' <' + person(id).email + '> · ' + person(id).title + ' — drag to move'">
            <span class="rc-av" [style.background]="person(id).color">{{ initials(person(id).name) }}</span>
            <span class="rc-name">{{ person(id).name }}</span>
            <button type="button" (click)="$event.stopPropagation(); remove(id)" [attr.aria-label]="'Remove ' + person(id).name">×</button>
          </span>
        }
        @for (bad of invalid(); track bad) {
          <span class="rc-chip bad" title="Not a NeverBeen admin — admin mail can only be sent to other admins">
            ⚠ {{ bad }}
            <button type="button" (click)="$event.stopPropagation(); removeInvalid(bad)" [attr.aria-label]="'Remove ' + bad">×</button>
          </span>
        }
        <input
          #box
          [id]="inputId()"
          type="text"
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="showList()"
          [attr.aria-controls]="inputId() + '-list'"
          [placeholder]="ids().length || invalid().length ? '' : placeholder()"
          [value]="text()"
          (input)="onInput($any($event.target).value)"
          (keydown)="onKey($event)"
          (paste)="onPaste($event)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        />
      </div>
      <ng-content />
      @if (showList()) {
        <ul class="rc-suggest" role="listbox" [id]="inputId() + '-list'" (mousedown)="$event.preventDefault()">
          @for (s of suggestions(); track $index; let i = $index) {
            <li role="option" [class.active]="i === active()" [attr.aria-selected]="i === active()" (click)="pick(s)" (mouseenter)="active.set(i)">
              @if (s.kind === 'admin') {
                <span class="rc-av lg" [style.background]="s.admin.color">
                  {{ initials(s.admin.name) }}
                  @if (s.admin.online) {
                    <i></i>
                  }
                </span>
                <span class="rc-s-main">
                  <strong>{{ s.admin.name }}</strong>
                  <small>{{ s.admin.title }} · {{ s.admin.email }}</small>
                </span>
                <span class="rc-team">{{ s.admin.team }}</span>
              } @else {
                <span class="rc-av lg group">{{ s.group.icon }}</span>
                <span class="rc-s-main">
                  <strong>{{ s.group.name }}</strong>
                  <small>Team · adds {{ s.count }} admin{{ s.count === 1 ? '' : 's' }}</small>
                </span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './mail.css',
})
export class MailRecipients {
  private readonly mail = inject(AdminMailService);

  readonly field = input.required<RecipientField>();
  readonly label = input('To');
  readonly placeholder = input('Type a name, email or team…');
  /** Admin ids on this line. */
  readonly ids = model<string[]>([]);
  /** Typed addresses that are not admins. */
  readonly invalid = model<string[]>([]);
  /** Ids already on another line — hidden from suggestions. */
  readonly taken = input<string[]>([]);

  /** An admin was added here (the parent removes them from the other lines). */
  readonly added = output<string>();
  /** A chip was dropped here from another line. */
  readonly moved = output<{ id: string; from: RecipientField; to: RecipientField }>();

  protected readonly text = signal('');
  protected readonly focused = signal(false);
  protected readonly active = signal(0);
  protected readonly dropping = signal(false);
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  protected readonly initials = initials;
  protected readonly inputId = computed(() => `rc-${this.field()}`);

  protected readonly suggestions = computed<Suggestion[]>(() => {
    const q = this.text().trim();
    const exclude = [...this.ids(), ...this.taken()];
    const groups: Suggestion[] = this.mail
      .searchGroups(q)
      .map((g) => ({ kind: 'group' as const, group: g, count: g.members.filter((m) => !this.ids().includes(m)).length }))
      .filter((g) => g.count > 0);
    const admins: Suggestion[] = this.mail.search(q, exclude).map((a) => ({ kind: 'admin' as const, admin: a }));
    return (q ? [...admins, ...groups] : [...admins.slice(0, 6), ...groups.slice(0, 2)]).slice(0, 9);
  });

  protected readonly showList = computed(() => this.focused() && this.suggestions().length > 0);

  protected person(id: string) {
    return this.mail.person(id);
  }

  focus(): void {
    this.box()?.nativeElement.focus();
  }

  add(id: string): void {
    if (!this.ids().includes(id)) this.ids.set([...this.ids(), id]);
    this.added.emit(id);
  }

  remove(id: string): void {
    this.ids.set(this.ids().filter((x) => x !== id));
  }

  protected removeInvalid(bad: string): void {
    this.invalid.set(this.invalid().filter((x) => x !== bad));
  }

  protected pick(s: Suggestion): void {
    if (s.kind === 'admin') this.add(s.admin.id);
    else for (const id of s.group.members) this.add(id);
    this.text.set('');
    this.active.set(0);
    this.focus();
  }

  protected onInput(v: string): void {
    if (/[,;]/.test(v)) {
      this.commitText(v);
      return;
    }
    this.text.set(v);
    this.active.set(0);
  }

  /** Turns free text ("priya.sharma@neverbeen.com, Arjun Mehta; bob@gmail.com") into chips. */
  commitText(raw: string): void {
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const bad: string[] = [];
    for (const p of parts) {
      const admin = this.mail.resolve(p);
      if (admin) this.add(admin.id);
      else if (!this.invalid().includes(p)) bad.push(p);
    }
    if (bad.length) this.invalid.set([...this.invalid(), ...bad]);
    this.text.set('');
  }

  protected onKey(e: KeyboardEvent): void {
    const list = this.suggestions();
    if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault();
      this.active.set((this.active() + 1) % list.length);
    } else if (e.key === 'ArrowUp' && list.length) {
      e.preventDefault();
      this.active.set((this.active() - 1 + list.length) % list.length);
    } else if (e.key === 'Enter' || (e.key === 'Tab' && this.text().trim())) {
      const typed = this.text().trim();
      if (!typed) {
        // Enter on an empty field picks the highlighted suggestion (if the list is open).
        if (this.showList() && list[this.active()]) {
          e.preventDefault();
          this.pick(list[this.active()]);
        }
        return;
      }
      e.preventDefault();
      const exact = this.mail.resolve(typed);
      if (exact) {
        this.add(exact.id);
        this.text.set('');
      } else if (list[this.active()]) this.pick(list[this.active()]);
      else this.commitText(typed);
    } else if (e.key === 'Backspace' && !this.text()) {
      if (this.invalid().length) this.invalid.set(this.invalid().slice(0, -1));
      else if (this.ids().length) this.ids.set(this.ids().slice(0, -1));
    } else if (e.key === 'Escape') {
      this.focused.set(false);
    }
  }

  protected onPaste(e: ClipboardEvent): void {
    const t = e.clipboardData?.getData('text') ?? '';
    if (/[,;\n]/.test(t)) {
      e.preventDefault();
      this.commitText(t);
    }
  }

  protected onBlur(): void {
    this.focused.set(false);
    if (this.text().trim()) this.commitText(this.text());
  }

  /* ------------------------------ drag & drop ------------------------------ */

  protected onDragStart(e: DragEvent, id: string): void {
    e.dataTransfer?.setData(DRAG_TYPE, JSON.stringify({ id, from: this.field() }));
    e.dataTransfer?.setData('text/plain', this.person(id).email);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOver(e: DragEvent): void {
    if (e.dataTransfer?.types?.includes(DRAG_TYPE)) {
      e.preventDefault();
      this.dropping.set(true);
    }
  }

  protected onDrop(e: DragEvent): void {
    this.dropping.set(false);
    const raw = e.dataTransfer?.getData(DRAG_TYPE);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    const { id, from } = JSON.parse(raw) as { id: string; from: RecipientField };
    if (from === this.field()) return;
    this.moved.emit({ id, from, to: this.field() });
  }
}
