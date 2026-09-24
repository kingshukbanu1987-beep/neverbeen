import { Component, input, output, signal } from '@angular/core';

/**
 * Reusable confirmation dialog for destructive admin actions
 * (disable account, force identity confirmation…). Optionally collects a reason.
 */
@Component({
  selector: 'app-admin-confirm-dialog',
  template: `
    <div class="g-modal-backdrop" (click)="cancelled.emit()">
      <div class="g-modal" role="dialog" aria-modal="true" [attr.aria-label]="heading()" (click)="$event.stopPropagation()">
        <h3>{{ heading() }}</h3>
        <p>{{ message() }}</p>
        @if (withReason()) {
          <label class="sr-label" for="confirm-reason">Reason (visible to other admins)</label>
          <textarea
            id="confirm-reason"
            [placeholder]="reasonPlaceholder()"
            [value]="reason()"
            (input)="reason.set($any($event.target).value)"
          ></textarea>
        }
        <div class="g-modal-actions">
          <button type="button" class="g-btn" (click)="cancelled.emit()">Cancel</button>
          <button type="button" [class]="'g-btn ' + tone()" (click)="confirmed.emit(reason().trim())">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-grid.css',
  styles: [
    `
      .sr-label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
        margin-bottom: 0.3rem;
      }
    `,
  ],
})
export class AdminConfirmDialog {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly tone = input<'danger' | 'violet' | 'success' | 'dark'>('danger');
  readonly withReason = input(true);
  readonly reasonPlaceholder = input('e.g. Repeated offensive comments reported by members');

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  protected readonly reason = signal('');
}
