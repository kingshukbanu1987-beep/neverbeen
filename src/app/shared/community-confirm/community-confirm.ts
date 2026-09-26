import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
  signal,
} from '@angular/core';

/**
 * Community confirmation dialog (Requirement: no titles in community confirm boxes).
 *
 * The native `window.confirm` shows the website address in its title bar; this
 * replacement renders only the message and the action buttons, styled with the
 * active community theme tokens.
 */
@Component({
  selector: 'app-community-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ccf-backdrop" (click)="onBackdrop($event)">
      <div class="ccf-card" role="alertdialog" aria-modal="true" [attr.aria-label]="message()">
        <p class="ccf-message">{{ message() }}</p>
        <div class="ccf-actions">
          <button type="button" class="ccf-btn ccf-cancel" (click)="settle(false)">Cancel</button>
          <button type="button" class="ccf-btn ccf-ok" (click)="settle(true)">{{ confirmLabel() }}</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .ccf-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100010; /* above community modal overlays (100000) and the hover card */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(2, 8, 23, 0.55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    .ccf-card {
      width: min(400px, 100%);
      border-radius: 18px;
      padding: 1.5rem 1.4rem 1.25rem;
      background: rgb(var(--ct-sf-rgb, 255 255 255) / 0.97);
      border: 1px solid var(--ct-ln, #e2e8f0);
      box-shadow:
        0 24px 60px -18px rgba(2, 8, 23, 0.45),
        0 4px 14px -8px rgba(2, 8, 23, 0.25);
      color: var(--ct-ink, #0f172a);
      font-family: 'Outfit', system-ui, sans-serif;
      animation: ccf-in 0.18s ease-out;
    }

    @keyframes ccf-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* No title — just the message. */
    .ccf-message {
      margin: 0 0 1.25rem;
      font-size: 0.98rem;
      font-weight: 600;
      line-height: 1.45;
      color: var(--ct-ink, #0f172a);
    }

    .ccf-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    .ccf-btn {
      font: inherit;
      font-size: 0.88rem;
      font-weight: 700;
      border-radius: 999px;
      padding: 0.55rem 1.25rem;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    .ccf-btn:focus-visible {
      outline: 3px solid rgb(var(--ct-ac-rgb, 37 99 235) / 0.45);
      outline-offset: 2px;
    }

    .ccf-cancel {
      border: 1px solid var(--ct-ln2, #cbd5e1);
      background: transparent;
      color: var(--ct-ink2, #334155);
    }

    .ccf-cancel:hover {
      background: rgb(var(--ct-ink-rgb, 15 23 42) / 0.06);
    }

    .ccf-ok {
      border: none;
      background: var(--ct-ac, #2563eb);
      color: var(--ct-act, #ffffff);
      box-shadow: 0 8px 20px -10px rgb(var(--ct-ac-rgb, 37 99 235) / 0.8);
    }

    .ccf-ok:hover {
      transform: translateY(-1px);
    }
  `,
})
export class CommunityConfirmComponent {
  readonly message = signal('');
  private readonly confirmLabelSignal = signal('Confirm');
  readonly confirmLabel = this.confirmLabelSignal.asReadonly();

  /** Set by the service once the host view is attached. */
  settleFn: ((result: boolean) => void) | null = null;

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.settle(false);
    }
  };

  constructor() {
    document.addEventListener('keydown', this.onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', this.onKey));
  }

  setMessage(message: string, confirmLabel = 'Confirm'): void {
    this.message.set(message);
    this.confirmLabelSignal.set(confirmLabel);
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.settle(false);
  }

  settle(result: boolean): void {
    document.removeEventListener('keydown', this.onKey);
    this.settleFn?.(result);
  }
}

/**
 * Imperative confirm() for community pages: `await confirmSvc.confirm('...')`.
 * Renders the title-less dialog on demand and resolves with the user's choice.
 */
@Injectable({ providedIn: 'root' })
export class CommunityConfirmService {
  private readonly injector = inject(EnvironmentInjector);
  private active: ComponentRef<CommunityConfirmComponent> | null = null;

  confirm(message: string, confirmLabel = 'Confirm'): Promise<boolean> {
    // One dialog at a time; a confirm() while one is open resolves false.
    if (this.active) return Promise.resolve(false);

    const cRef = createComponent(CommunityConfirmComponent, {
      environmentInjector: this.injector,
      hostElement: document.body,
    });
    cRef.changeDetectorRef.detectChanges();
    cRef.instance.setMessage(message, confirmLabel);

    let resolve!: (v: boolean) => void;
    const promise = new Promise<boolean>((r) => (resolve = r));
    let settled = false;
    cRef.instance.settleFn = (result: boolean) => {
      if (settled) return;
      settled = true;
      this.active = null;
      cRef.destroy();
      resolve(result);
    };
    this.active = cRef;
    cRef.changeDetectorRef.detectChanges();
    // Focus the Cancel action for keyboard users.
    const hostEl = cRef.location.nativeElement as HTMLElement;
    const cancelBtn = hostEl.querySelector('.ccf-cancel') as HTMLButtonElement | null;
    cancelBtn?.focus();
    return promise;
  }
}
