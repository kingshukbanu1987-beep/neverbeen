import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Companion, PostAudience } from '../../../models/community';

@Component({
  selector: 'app-post-audience',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pa">
      <span class="pa-label">Who can see this</span>
      <div class="pa-modes" role="radiogroup" aria-label="Who can see this post">
        @for (mode of modes; track mode.id) {
          <button type="button" class="pa-mode" [class.on]="isOn(mode.id)" (click)="setMode(mode.id)">
            <span>{{ mode.icon }}</span>{{ mode.label }}
          </button>
        }
      </div>
      @if (audience.mode === 'custom') {
        <p class="pa-note">
          {{ (audience.allowIds?.length || 0) }} {{ (audience.allowIds?.length || 0) === 1 ? 'person' : 'people' }} can see this.
          Everyone else is restricted.
          <button type="button" class="pa-edit" (click)="openCustom()">Edit</button>
        </p>
      }
    </div>

    @if (customOpen()) {
      <div class="pa-overlay" (click)="cancelCustom()">
        <div class="pa-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-privacy-title" (click)="$event.stopPropagation()">
          <header>
            <div>
              <p>Customization privacy</p>
              <h3 id="custom-privacy-title">Allow</h3>
            </div>
            <button type="button" class="pa-close" (click)="cancelCustom()" aria-label="Close">✕</button>
          </header>
          <div class="pa-body">
            <input
              class="pa-search"
              type="search"
              placeholder="Search users"
              aria-label="Search users"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
            <label class="pa-private-toggle">
              <input type="checkbox" [checked]="onlyMeDraft()" (change)="onlyMeDraft.set($any($event.target).checked)" />
              <span><strong>Only Me</strong><small>Keep this Journey post private. Companion selection will be disabled.</small></span>
            </label>
            <p class="pa-note">Choose who may see this post. Everyone else, companion or not, cannot see it.</p>
            @if (selectedPeople().length) {
              <div class="pa-chips" aria-label="Allowed users">
                @for (person of selectedPeople(); track person.id) {
                  <button type="button" (click)="toggleDraft(person.id)">{{ person.fullName }} ✕</button>
                }
              </div>
            }
            <div class="pa-results">
              @for (person of filteredPeople(); track person.id) {
                <label class="pa-user" [class.pa-frozen]="onlyMeDraft()">
                  @if (!onlyMeDraft()) { <input type="checkbox" [checked]="draftHas(person.id)" (change)="toggleDraft(person.id)" /> }
                  <img [src]="person.profilePhotoUrl || ''" [alt]="person.fullName" />
                  <span>
                    <strong>{{ person.fullName }}</strong>
                    <small>{{ person.city }}, {{ person.country }}</small>
                  </span>
                  <em>{{ onlyMeDraft() ? 'Frozen' : (draftHas(person.id) ? 'Allowed' : 'Allow') }}</em>
                </label>
              } @empty {
                <p class="pa-empty">No users match that search.</p>
              }
            </div>
          </div>
          <footer>
            <button type="button" class="pa-cancel" (click)="cancelCustom()">Cancel</button>
            <button type="button" class="pa-submit" (click)="submitCustom()">Submit</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .pa { display: flex; flex-direction: column; gap: 0.55rem; }
    .pa-label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; }
    .pa-modes { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .pa-mode, .pa-edit, .pa-cancel, .pa-submit, .pa-close, .pa-chips button {
      font: inherit;
      cursor: pointer;
    }
    .pa-mode {
      border: 1px solid #e2e8f0;
      background: #fff;
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .pa-mode.on { background: #0f172a; color: #fff; border-color: #0f172a; }
    .pa-note { margin: 0; color: #475569; font-size: 0.78rem; line-height: 1.45; }
    .pa-edit { border: 0; background: transparent; color: #0f766e; font-weight: 800; padding: 0 0.2rem; }
    .pa-overlay {
      position: fixed;
      inset: 0;
      z-index: 100020;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: clamp(72px, 10vh, 96px) 1rem 1.5rem;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
    }
    .pa-dialog {
      width: min(520px, 100%);
      max-height: min(78vh, 680px);
      display: flex;
      flex-direction: column;
      border-radius: 28px;
      background: #fff;
      box-shadow: 0 30px 70px -28px rgba(15, 23, 42, 0.55);
      overflow: hidden;
    }
    header, .pa-body, footer { padding-left: 1.35rem; padding-right: 1.35rem; }
    header {
      position: relative;
      display: flex;
      justify-content: space-between;
      padding-top: 1.25rem;
      padding-bottom: 0.7rem;
    }
    header p { margin: 0; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e; }
    header h3 { margin: 0.15rem 0 0; font-size: 1.35rem; letter-spacing: -0.03em; }
    .pa-close { border: 0; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; }
    .pa-body { display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 1rem; overflow: auto; }
    .pa-search, .pa-user {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
    }
    .pa-search { padding: 0.75rem 0.85rem; font: inherit; }
    .pa-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .pa-chips button { border: 0; border-radius: 999px; background: #ecfeff; color: #115e59; padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 700; }
    .pa-results { display: flex; flex-direction: column; gap: 0.4rem; }
    .pa-user { display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.75rem; cursor: pointer; }
    .pa-user img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
    .pa-user span { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .pa-user small { color: #64748b; }
    .pa-user em { font-style: normal; font-size: 0.75rem; font-weight: 800; color: #0f766e; }
    .pa-empty { margin: 0.2rem 0; color: #64748b; }
    footer { display: flex; justify-content: flex-end; gap: 0.55rem; padding-top: 0.9rem; padding-bottom: 1.15rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    .pa-cancel, .pa-submit { border-radius: 999px; padding: 0.55rem 0.95rem; font-weight: 800; }
    .pa-cancel { border: 1px solid #cbd5e1; background: #fff; }
    .pa-submit { border: 0; background: #0f172a; color: #fff; }
  `,
})
export class PostAudienceControl {
  @Input() audience: PostAudience = { mode: 'public', allowIds: [], denyIds: [] };
  @Input() companions: Companion[] = [];
  @Input() people: Companion[] = [];
  @Output() audienceChange = new EventEmitter<PostAudience>();

  protected readonly customOpen = signal(false);
  protected readonly query = signal('');
  protected readonly draft = signal<number[]>([]);
  protected readonly onlyMeDraft = signal(false);

  protected readonly modes: { id: PostAudience['mode']; label: string; icon: string }[] = [
    { id: 'public', label: 'Public', icon: '🌐' },
    { id: 'companions', label: 'Companions', icon: '👥' },
    { id: 'custom', label: 'Custom', icon: '✨' },
  ];

  protected isOn(mode: PostAudience['mode']): boolean {
    return this.audience.mode === mode || (mode === 'custom' && this.customOpen());
  }

  protected setMode(mode: PostAudience['mode']): void {
    if (mode === 'custom') {
      this.openCustom();
      return;
    }
    this.audienceChange.emit({ mode, allowIds: [], denyIds: [] });
  }

  protected openCustom(): void {
    this.draft.set([...(this.audience.allowIds ?? [])].map(Number));
    this.onlyMeDraft.set(this.audience.mode === 'only-me');
    this.query.set('');
    this.customOpen.set(true);
  }

  protected cancelCustom(): void {
    this.customOpen.set(false);
  }

  protected directory(): Companion[] {
    return this.people.length ? this.people : this.companions;
  }

  protected draftHas(id: number): boolean {
    return this.draft().some((saved) => Number(saved) === Number(id));
  }

  protected toggleDraft(id: number): void {
    const num = Number(id);
    this.draft.update((ids) => (ids.some((saved) => Number(saved) === num) ? ids.filter((saved) => Number(saved) !== num) : [...ids, num]));
  }

  protected filteredPeople(): Companion[] {
    const q = this.query().trim().toLowerCase();
    return this.directory().filter((person) => {
      if (!q) return true;
      return [person.fullName, person.city, person.country, person.profession].some((part) =>
        (part || '').toLowerCase().includes(q),
      );
    });
  }

  protected selectedPeople(): Companion[] {
    return this.draft()
      .map((id) => this.directory().find((person) => Number(person.id) === Number(id)))
      .filter((person): person is Companion => !!person);
  }

  protected submitCustom(): void {
    this.audienceChange.emit({
      mode: this.onlyMeDraft() ? 'only-me' : 'custom',
      allowIds: this.onlyMeDraft() ? [] : [...this.draft()],
      denyIds: [],
    });
    this.customOpen.set(false);
  }
}
