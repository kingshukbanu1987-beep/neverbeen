import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminIdentityService, IDENTITY_STATUS_META, IDENTITY_TRIGGER_META, checksPassed } from '../shared/admin-identity.service';
import { AdminInsightsService, shortDate, timeAgo } from '../shared/admin-insights.service';
import { accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { IdDocument } from './id-document';

/** Full-page, secure viewer for one submitted identity document (opened in a new tab from the grid). */
@Component({
  selector: 'app-admin-identity-document',
  imports: [RouterLink, IdDocument, AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './identity-document.css'],
  template: `
    <div class="iv">
      @if (submission(); as s) {
        <header class="iv-top">
          <a class="iv-back" routerLink="/admin/dashboard/identity-checks">← Identity Check Verification</a>
          <div class="iv-title">
            <h1>{{ s.documentType }} · {{ file()?.side }}</h1>
            <p>{{ member()?.fullName ?? 'Deleted member' }} · {{ file()?.name }} · {{ sizeLabel() }}</p>
          </div>
          <div class="iv-tools" role="toolbar" aria-label="Document tools">
            <button type="button" (click)="zoomBy(-0.25)" aria-label="Zoom out">−</button>
            <span>{{ Math.round(zoom() * 100) }}%</span>
            <button type="button" (click)="zoomBy(0.25)" aria-label="Zoom in">＋</button>
            <button type="button" (click)="zoom.set(1); rotation.set(0)" title="Reset">⤢ Fit</button>
            <button type="button" (click)="rotation.set((rotation() + 90) % 360)" title="Rotate">⟳ Rotate</button>
            <button type="button" [class.on]="enhance()" (click)="enhance.set(!enhance())" title="Boost contrast to spot edits">◐ Enhance</button>
            @if (file()?.dataUrl) {
              <a [href]="file()!.dataUrl" [download]="file()!.name">⤓ Download</a>
            }
          </div>
        </header>

        <div class="iv-main">
          <section class="iv-stage">
            <div class="iv-canvas" [class.enhance]="enhance()" [style.transform]="'rotate(' + rotation() + 'deg) scale(' + zoom() + ')'">
              @if (file(); as f) {
                <app-id-document [submission]="s" [file]="f" [photo]="member()?.photo ?? ''" [width]="f.side === 'Selfie' ? 420 : 640" />
              }
            </div>
            <nav class="iv-strip" aria-label="Other documents in this submission">
              @for (f of s.files; track f.id) {
                <a [routerLink]="['/admin/identity-document', s.id, f.id]" [class.active]="f.id === file()?.id" replaceUrl>
                  <app-id-document [submission]="s" [file]="f" [photo]="member()?.photo ?? ''" [width]="f.side === 'Selfie' ? 48 : 96" />
                  <span>{{ f.side }}</span>
                </a>
              }
            </nav>
            <p class="iv-watermark">CONFIDENTIAL · Viewed by admin · {{ viewedAt }}</p>
          </section>

          <aside class="iv-side">
            <div class="iv-card">
              <div class="iv-member">
                <img [src]="member()?.photo" alt="" />
                <div>
                  <strong>{{ member()?.fullName ?? 'Deleted member' }}</strong>
                  <small>{{ member()?.email }}</small>
                  <small>UID {{ member()?.uniqueId }}</small>
                </div>
              </div>
              <div class="iv-badges">
                <span class="g-badge" [class]="'g-badge ' + triggerMeta[s.trigger].tone">{{ triggerMeta[s.trigger].icon }} {{ triggerMeta[s.trigger].label }}</span>
                @if (member(); as m) {
                  <span class="g-badge">Account: {{ stateLabel(m.accountState) }}</span>
                }
                <span class="g-badge" [class]="'g-badge ' + statusMeta[s.status].tone">{{ statusMeta[s.status].label }}</span>
              </div>
              <p class="iv-reason">{{ s.triggerReason }}</p>
              @if (s.memberNote) {
                <p class="iv-note">💬 “{{ s.memberNote }}”</p>
              }
            </div>

            <div class="iv-card">
              <h3>Document details</h3>
              <dl class="iv-dl">
                <dt>Type</dt><dd>{{ s.documentType }}</dd>
                <dt>Number</dt><dd><code>{{ s.documentNumber }}</code></dd>
                <dt>Name on document</dt><dd [class.bad]="!s.checks.nameMatch">{{ s.nameOnDocument }}</dd>
                <dt>Name on profile</dt><dd>{{ member()?.fullName ?? '—' }}</dd>
                <dt>Date of birth</dt><dd [class.bad]="!s.checks.dobMatch">{{ s.dobOnDocument }}</dd>
                <dt>Issued</dt><dd>{{ s.issuedOn }}</dd>
                @if (s.expiresOn) {
                  <dt>Expires</dt><dd [class.bad]="!s.checks.notExpired">{{ s.expiresOn }}</dd>
                }
                <dt>Country</dt><dd>{{ s.issuingCountry }}</dd>
                <dt>Submitted</dt><dd>{{ shortDate(s.submittedAtUtc) }} ({{ timeAgo(s.submittedAtUtc) }}) · attempt #{{ s.attempt }}</dd>
              </dl>
            </div>

            <div class="iv-card">
              <h3>Automated checks <small>{{ passed().passed }}/{{ passed().total }} passed</small></h3>
              <ul class="iv-checks">
                <li [class.ok]="s.checks.nameMatch">{{ s.checks.nameMatch ? '✓' : '✕' }} Name matches profile</li>
                <li [class.ok]="s.checks.dobMatch">{{ s.checks.dobMatch ? '✓' : '✕' }} Date of birth matches profile</li>
                <li [class.ok]="s.checks.notExpired">{{ s.checks.notExpired ? '✓' : '✕' }} Document within validity</li>
                <li [class.ok]="s.checks.faceMatch >= 80">{{ s.checks.faceMatch >= 80 ? '✓' : '✕' }} Face match {{ s.checks.faceMatch }}%</li>
                <li [class.ok]="s.checks.liveness">{{ s.checks.liveness ? '✓' : '✕' }} Selfie liveness</li>
                <li [class.ok]="s.checks.tamperFree">{{ s.checks.tamperFree ? '✓' : '✕' }} No signs of tampering</li>
              </ul>
            </div>

            <div class="iv-card iv-decide">
              <h3>Decision</h3>
              @if (s.decidedAtUtc) {
                <p class="iv-decided">{{ statusMeta[s.status].label }} — {{ s.decisionNote }} · {{ timeAgo(s.decidedAtUtc) }}</p>
              }
              @if (s.status === 'pending' || s.status === 'resubmit_requested') {
                <button type="button" class="g-btn success" (click)="pending.set('enable')">✓ Enable account</button>
                <button type="button" class="g-btn danger" (click)="pending.set('disable')">⛔ Permanently disable account</button>
                <button type="button" class="g-btn violet" [disabled]="s.status === 'resubmit_requested'" (click)="pending.set('recheck')">🔁 Force identity check again</button>
              }
            </div>
          </aside>
        </div>

        @if (pending(); as p) {
          <app-admin-confirm-dialog
            [heading]="p === 'enable' ? 'Enable this account?' : p === 'disable' ? 'Permanently disable this account?' : 'Force identity check again?'"
            [message]="p === 'enable' ? 'The member gets full access back immediately.' : p === 'disable' ? 'The member can no longer use NeverBeen or appeal with new documents.' : 'The member stays locked out until they submit new documents.'"
            [confirmLabel]="p === 'enable' ? 'Enable account' : p === 'disable' ? 'Permanently disable' : 'Request new documents'"
            [tone]="p === 'enable' ? 'success' : p === 'disable' ? 'danger' : 'violet'"
            [reasonPlaceholder]="p === 'enable' ? 'Optional note' : 'Reason shown to other admins'"
            (confirmed)="decide($event)"
            (cancelled)="pending.set(null)"
          />
        }
      } @else {
        <div class="iv-missing">
          <h1>Document not found</h1>
          <p>This submission no longer exists or was erased.</p>
          <a class="g-btn dark" routerLink="/admin/dashboard/identity-checks">Back to Identity Check Verification</a>
        </div>
      }
    </div>
    @if (toast(); as t) {
      <div class="iv-toast" role="status">{{ t }}</div>
    }
  `,
})
export class AdminIdentityDocument {
  private readonly route = inject(ActivatedRoute);
  private readonly identity = inject(AdminIdentityService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly Math = Math;
  protected readonly statusMeta = IDENTITY_STATUS_META;
  protected readonly triggerMeta = IDENTITY_TRIGGER_META;
  protected readonly stateLabel = accountStateLabel;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;
  protected readonly toast = this.insights.toast;
  protected readonly viewedAt = new Date().toLocaleString();

  protected readonly zoom = signal(1);
  protected readonly rotation = signal(0);
  protected readonly enhance = signal(false);
  protected readonly pending = signal<'enable' | 'disable' | 'recheck' | null>(null);

  private readonly params = toSignal(this.route.paramMap.pipe(map((p) => ({ sid: Number(p.get('submissionId')), fid: p.get('fileId') ?? '' }))), {
    initialValue: { sid: 0, fid: '' },
  });

  protected readonly submission = computed(() => this.identity.byId(this.params().sid));
  protected readonly file = computed(() => {
    const s = this.submission();
    return s?.files.find((f) => f.id === this.params().fid) ?? s?.files[0];
  });
  protected readonly member = computed(() => (this.submission() ? this.insights.member(this.submission()!.userId) : undefined));
  protected readonly passed = computed(() => checksPassed(this.submission()!.checks));
  protected readonly sizeLabel = computed(() => {
    const b = this.file()?.sizeBytes ?? 0;
    return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
  });

  constructor() {
    let lastLogged = '';
    effect(() => {
      const s = this.submission();
      const f = this.file();
      if (!s || !f) return;
      const key = `${s.id}/${f.id}`;
      if (key === lastLogged) return;
      lastLogged = key;
      untracked(() => {
        this.identity.logView(s, f);
        this.zoom.set(1);
        this.rotation.set(0);
      });
    });
  }

  protected zoomBy(delta: number): void {
    this.zoom.set(Math.min(3, Math.max(0.5, +(this.zoom() + delta).toFixed(2))));
  }

  protected decide(reason: string): void {
    const s = this.submission();
    const p = this.pending();
    if (!s || !p) return;
    const name = this.member()?.fullName ?? 'Member';
    if (p === 'enable') {
      this.identity.approve(s.id, reason || undefined);
      this.insights.notify(`${name}'s account is enabled again.`);
    } else if (p === 'disable') {
      this.identity.permanentlyDisable(s.id, reason || undefined);
      this.insights.notify(`${name}'s account has been permanently disabled.`);
    } else {
      this.identity.requestRecheck(s.id, reason || undefined);
      this.insights.notify(`${name} must complete the identity check again.`);
    }
    this.pending.set(null);
  }
}
