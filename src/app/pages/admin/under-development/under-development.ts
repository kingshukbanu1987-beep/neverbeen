import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

/** Placeholder shown for Admin Console sections that are not built yet. */
@Component({
  selector: 'app-admin-under-development',
  imports: [RouterLink],
  template: `
    <section class="ud">
      <div class="ud-icon" aria-hidden="true">🚧</div>
      <h2>Under Development</h2>
      @if (section()) {
        <p class="ud-section">{{ section() }}</p>
      }
      <p>This section of the Admin Console is being built and will be available soon.</p>
      <a routerLink="/admin/dashboard" class="ud-link">← Back to Dashboard</a>
    </section>
  `,
  styles: [
    `
      .ud {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: #ffffff;
        border: 1px dashed #cbd5e1;
        border-radius: 20px;
        padding: 2rem;
      }
      .ud-icon {
        font-size: 3rem;
        line-height: 1;
        margin-bottom: 0.8rem;
      }
      h2 {
        margin: 0;
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(120deg, #0f172a, #10b981 60%, #6366f1);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .ud-section {
        margin: 0.4rem 0 0;
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #10b981;
      }
      p {
        margin: 0.6rem 0 0;
        font-size: 0.9rem;
        color: #64748b;
        max-width: 420px;
      }
      .ud-link {
        margin-top: 1.2rem;
        font-size: 0.82rem;
        font-weight: 700;
        color: #047857;
        text-decoration: none;
      }
      .ud-link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class AdminUnderDevelopment {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data);
  protected readonly section = computed(() => (this.data()?.['section'] as string) ?? '');
}
