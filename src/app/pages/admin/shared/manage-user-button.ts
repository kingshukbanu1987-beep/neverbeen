import { Component, inject, input } from '@angular/core';
import { ManageUserService } from './manage-user.service';

/**
 * "Manage" button shown beside a user anywhere in the Admin Console. Opens the full
 * User 360° drawer (profile, activity, moderation, security & devices, notes) for that user.
 */
@Component({
  selector: 'app-manage-user-btn',
  template: `
    <button
      type="button"
      class="mu-btn"
      [class.sm]="size() === 'sm'"
      [class.on-dark]="tone() === 'dark'"
      (click)="open($event)"
      [attr.aria-label]="'Manage ' + (name() || 'user')"
      [title]="'Open ' + (name() || 'this user') + '’s account in the Manage window'"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"></path>
      </svg>
      <span>Manage</span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .mu-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.42rem 0.75rem;
      border-radius: 10px;
      border: 1px solid rgba(79, 70, 229, 0.35);
      background: linear-gradient(135deg, #eef2ff, #e0f2fe);
      color: #3730a3;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.15s ease;
    }
    .mu-btn:hover {
      background: linear-gradient(135deg, #4f46e5, #0ea5e9);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 8px 18px -10px rgba(79, 70, 229, 0.9);
      transform: translateY(-1px);
    }
    .mu-btn:focus-visible {
      outline: 3px solid rgba(99, 102, 241, 0.45);
      outline-offset: 2px;
    }
    .mu-btn svg {
      width: 14px;
      height: 14px;
      flex: none;
    }
    .mu-btn.sm {
      padding: 0.28rem 0.55rem;
      font-size: 0.7rem;
      border-radius: 8px;
    }
    .mu-btn.sm svg {
      width: 12px;
      height: 12px;
    }
    .mu-btn.on-dark {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      color: #e0e7ff;
    }
  `,
})
export class ManageUserButton {
  private readonly manage = inject(ManageUserService);

  readonly userId = input.required<number | string>();
  readonly name = input<string>('');
  readonly size = input<'md' | 'sm'>('md');
  readonly tone = input<'light' | 'dark'>('light');

  protected open(e: Event): void {
    // Rows / tiles around the button are often clickable themselves.
    e.preventDefault();
    e.stopPropagation();
    this.manage.open(this.userId());
  }
}
