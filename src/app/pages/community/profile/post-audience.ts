import { Component, EventEmitter, Input, Output } from '@angular/core';
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
          <button type="button" class="pa-mode" [class.on]="audience.mode === mode.id" (click)="setMode(mode.id)">
            <span>{{ mode.icon }}</span>{{ mode.label }}
          </button>
        }
      </div>
      @if (audience.mode === 'custom') {
        <div class="pa-lists">
          <section>
            <strong>Specific companions can see</strong>
            <div class="pa-picks">
              @for (c of companions; track c.id) {
                <label>
                  <input type="checkbox" [checked]="allowHas(c.id)" (change)="toggle(c.id, 'allow')" />
                  {{ c.fullName }}
                </label>
              }
            </div>
          </section>
          <section>
            <strong>Specific companions can’t see</strong>
            <div class="pa-picks">
              @for (c of companions; track c.id) {
                <label>
                  <input type="checkbox" [checked]="denyHas(c.id)" (change)="toggle(c.id, 'deny')" />
                  {{ c.fullName }}
                </label>
              }
            </div>
          </section>
        </div>
        <p class="pa-note">A companion can be in only one list. If someone can see it, they can’t also be blocked from it.</p>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .pa { display: flex; flex-direction: column; gap: 0.55rem; }
    .pa-label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; }
    .pa-modes { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .pa-mode {
      border: 1px solid #e2e8f0;
      background: #fff;
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .pa-mode.on { background: #0f172a; color: #fff; border-color: #0f172a; }
    .pa-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .pa-picks { max-height: 140px; overflow: auto; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; }
    .pa-note { margin: 0; color: #64748b; font-size: 0.75rem; }
    @media (max-width: 720px) { .pa-lists { grid-template-columns: 1fr; } }
  `,
})
export class PostAudienceControl {
  @Input() audience: PostAudience = { mode: 'public', allowIds: [], denyIds: [] };
  @Input() companions: Companion[] = [];
  @Output() audienceChange = new EventEmitter<PostAudience>();

  protected readonly modes: { id: PostAudience['mode']; label: string; icon: string }[] = [
    { id: 'public', label: 'Public', icon: '🌐' },
    { id: 'companions', label: 'Companions', icon: '👥' },
    { id: 'custom', label: 'Custom', icon: '✨' },
  ];

  protected setMode(mode: PostAudience['mode']): void {
    this.audienceChange.emit({ ...this.audience, mode });
  }

  protected allowHas(id: number): boolean {
    return (this.audience.allowIds ?? []).includes(id);
  }

  protected denyHas(id: number): boolean {
    return (this.audience.denyIds ?? []).includes(id);
  }

  protected toggle(id: number, list: 'allow' | 'deny'): void {
    const allow = new Set(this.audience.allowIds ?? []);
    const deny = new Set(this.audience.denyIds ?? []);
    const target = list === 'allow' ? allow : deny;
    const other = list === 'allow' ? deny : allow;
    if (target.has(id)) target.delete(id);
    else {
      target.add(id);
      other.delete(id);
    }
    this.audienceChange.emit({
      ...this.audience,
      mode: 'custom',
      allowIds: [...allow],
      denyIds: [...deny],
    });
  }
}
