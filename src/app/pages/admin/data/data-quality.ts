import { Component, computed, inject } from '@angular/core';
import { AdminDataOpsService, QualityCheck } from '../shared/admin-data-ops.service';
import { AdminInsightsService } from '../shared/admin-insights.service';

/** Data quality & integrity: health score, automated checks, one-click fixes. */
@Component({
  selector: 'app-admin-data-quality',
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <div class="dm-quality-top">
      <section class="g-panel dm-health">
        <div class="dm-gauge" [style.--score]="score()" [attr.data-level]="level()">
          <strong>{{ score() }}</strong>
          <small>/ 100</small>
        </div>
        <div>
          <h3>Data health score</h3>
          <p>{{ summary() }}</p>
          <div class="dm-sev-row">
            <span data-sev="high">{{ bySeverity().high }} high</span>
            <span data-sev="medium">{{ bySeverity().medium }} medium</span>
            <span data-sev="low">{{ bySeverity().low }} low</span>
          </div>
        </div>
      </section>
    </div>

    <div class="dm-checks">
      @for (c of checks(); track c.id) {
        <article class="dm-check" [attr.data-sev]="c.severity" [class.clean]="!c.count">
          <header>
            <span class="dm-check-status">{{ c.count ? '!' : '✓' }}</span>
            <div>
              <strong>{{ c.title }}</strong>
              <small>{{ c.dataset }} · {{ c.severity }} severity</small>
            </div>
            <span class="dm-check-count">{{ c.count }}</span>
          </header>
          <p>{{ c.description }}</p>
          @if (c.samples.length) {
            <ul>
              @for (s of c.samples; track $index) {
                <li>{{ s }}</li>
              }
            </ul>
          }
          @if (c.fixLabel && c.count) {
            <button type="button" class="g-btn dark" (click)="fix(c)">🛠 {{ c.fixLabel }}</button>
          }
        </article>
      }
    </div>
  `,
})
export class AdminDataQuality {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly checks = computed(() =>
    this.dataOps
      .qualityChecks()
      .slice()
      .sort((a, b) => Number(!!b.count) - Number(!!a.count) || ['high', 'medium', 'low'].indexOf(a.severity) - ['high', 'medium', 'low'].indexOf(b.severity)),
  );
  protected readonly score = this.dataOps.healthScore;
  protected readonly level = computed(() => (this.score() >= 85 ? 'good' : this.score() >= 60 ? 'fair' : 'poor'));
  protected readonly bySeverity = computed(() => {
    const open = this.checks().filter((c) => c.count);
    return { high: open.filter((c) => c.severity === 'high').length, medium: open.filter((c) => c.severity === 'medium').length, low: open.filter((c) => c.severity === 'low').length };
  });
  protected readonly summary = computed(() => {
    const open = this.checks().filter((c) => c.count).length;
    return open ? `${open} of ${this.checks().length} integrity checks found issues.` : 'All integrity checks passed — your data is in great shape.';
  });

  protected fix(c: QualityCheck): void {
    const n = this.dataOps.fixQuality(c.id);
    this.insights.notify(`${c.fixLabel}: ${n} record(s) fixed.`);
  }
}
