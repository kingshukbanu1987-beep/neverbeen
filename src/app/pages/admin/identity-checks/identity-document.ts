import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminIdentityService, IDENTITY_STATUS_META, IDENTITY_TRIGGER_META, IdentityFile, checksPassed } from '../shared/admin-identity.service';
import { AdminInsightsService, shortDate, timeAgo } from '../shared/admin-insights.service';
import { accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { IdDocument, docNaturalSize } from './id-document';

type Zoom = 'fit' | number;

const DAY = 86_400_000;

/**
 * Clear, full-screen viewer for one submitted identity document. Opened in a new
 * browser tab from Admin → Dashboard → Identity Check Verification and rendered
 * without the website / admin chrome: large fit-to-screen document with zoom,
 * pan, rotate and enhance, a thumbnail strip for the other files, and a details
 * panel (document vs. profile comparison, file info, automated checks, history
 * and the review decision).
 */
@Component({
  selector: 'app-admin-identity-document',
  imports: [RouterLink, IdDocument, AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './identity-document.css'],
  templateUrl: './identity-document.html',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class AdminIdentityDocument {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

  protected readonly zoomMode = signal<Zoom>('fit');
  protected readonly rotation = signal(0);
  protected readonly enhance = signal(false);
  protected readonly grayscale = signal(false);
  protected readonly showDetails = signal(true);
  protected readonly showKeys = signal(false);
  protected readonly isFullscreen = signal(false);
  protected readonly copied = signal(false);
  protected readonly pending = signal<'enable' | 'disable' | 'recheck' | null>(null);

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly stageSize = signal({ w: 900, h: 620 });

  private readonly params = toSignal(this.route.paramMap.pipe(map((p) => ({ sid: Number(p.get('submissionId')), fid: p.get('fileId') ?? '' }))), {
    initialValue: { sid: 0, fid: '' },
  });

  protected readonly submission = computed(() => this.identity.byId(this.params().sid));
  protected readonly file = computed(() => {
    const s = this.submission();
    return s?.files.find((f) => f.id === this.params().fid) ?? s?.files[0];
  });
  protected readonly fileIndex = computed(() => {
    const s = this.submission();
    const f = this.file();
    return s && f ? s.files.findIndex((x) => x.id === f.id) : -1;
  });
  protected readonly member = computed(() => (this.submission() ? this.insights.member(this.submission()!.userId) : undefined));
  protected readonly passed = computed(() => checksPassed(this.submission()!.checks));
  protected readonly history = computed(() => {
    const s = this.submission();
    return s ? this.identity.historyOf(s.userId).slice().sort((a, b) => b.submittedAtUtc.localeCompare(a.submittedAtUtc)) : [];
  });

  // ------------------------------------------------------------------ sizing
  protected readonly natural = computed(() => {
    const s = this.submission();
    const f = this.file();
    return s && f ? docNaturalSize(s, f) : { w: 640, h: 404 };
  });
  private readonly rotated = computed(() => this.rotation() % 180 !== 0);
  /** Scale that fits the whole document inside the stage (never upscales past 250%). */
  protected readonly fitScale = computed(() => {
    const { w, h } = this.natural();
    const box = this.stageSize();
    const pad = 64;
    const [dw, dh] = this.rotated() ? [h, w] : [w, h];
    return Math.max(0.2, Math.min(2.5, (box.w - pad) / dw, (box.h - pad) / dh));
  });
  protected readonly scale = computed(() => (this.zoomMode() === 'fit' ? this.fitScale() : (this.zoomMode() as number)));
  protected readonly renderW = computed(() => Math.round(this.natural().w * this.scale()));
  protected readonly renderH = computed(() => Math.round(this.natural().h * this.scale()));
  /** Layout box of the (possibly rotated) document so the stage can scroll correctly. */
  protected readonly boxW = computed(() => (this.rotated() ? this.renderH() : this.renderW()));
  protected readonly boxH = computed(() => (this.rotated() ? this.renderW() : this.renderH()));

  // ------------------------------------------------------------------ details
  protected readonly sizeLabel = computed(() => {
    const b = this.file()?.sizeBytes ?? 0;
    return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
  });
  protected readonly formatLabel = computed(() => {
    const m = this.file()?.mime ?? '';
    return m === 'application/pdf' ? 'PDF document' : m.startsWith('image/') ? `${m.slice(6).toUpperCase()} image` : m || '—';
  });
  protected readonly docAge = computed(() => {
    const dob = Date.parse(this.submission()?.dobOnDocument ?? '');
    if (Number.isNaN(dob)) return null;
    return Math.floor((Date.now() - dob) / (365.25 * DAY));
  });
  protected readonly expiry = computed(() => {
    const s = this.submission();
    const t = Date.parse(s?.expiresOn ?? '');
    if (!s?.expiresOn || Number.isNaN(t)) return { text: 'No expiry', tone: 'muted' };
    const days = Math.round((t - Date.now()) / DAY);
    if (days < 0) return { text: `Expired ${Math.abs(days)} days ago`, tone: 'bad' };
    if (days < 90) return { text: `Expires in ${days} days`, tone: 'warn' };
    const years = (days / 365).toFixed(1);
    return { text: `Valid · ${years} years left`, tone: 'ok' };
  });
  /** Side-by-side comparison of what the document says vs. the community profile. */
  protected readonly comparison = computed(() => {
    const s = this.submission();
    const m = this.member();
    if (!s) return [];
    const norm = (v: string) => (v || '').trim().toLowerCase();
    const genderDoc = s.genderOnDocument || '—';
    const genderProfile = m?.gender || '—';
    return [
      { label: 'Full name', doc: s.nameOnDocument, profile: m?.fullName ?? '—', ok: s.checks.nameMatch as boolean | null },
      { label: 'Date of birth', doc: `${s.dobOnDocument}${this.docAge() !== null ? ` (age ${this.docAge()})` : ''}`, profile: m ? `Age ${m.age}` : '—', ok: s.checks.dobMatch as boolean | null },
      {
        label: 'Gender',
        doc: genderDoc,
        profile: genderProfile,
        ok: genderProfile === 'Not specified' || genderProfile === '—' ? null : norm(genderDoc)[0] === norm(genderProfile)[0],
      },
      { label: 'Country', doc: s.issuingCountry, profile: m?.country ?? '—', ok: m ? norm(s.issuingCountry) === norm(m.country) : null },
    ];
  });
  protected readonly faceTone = computed(() => {
    const f = this.submission()?.checks.faceMatch ?? 0;
    return f >= 80 ? 'ok' : f >= 60 ? 'warn' : 'bad';
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
        this.zoomMode.set('fit');
        this.rotation.set(0);
      });
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.stageRef()?.nativeElement;
      const measure = () => {
        const w = el?.clientWidth || window.innerWidth * 0.66;
        const h = el?.clientHeight || window.innerHeight - 200;
        if (w > 0 && h > 0) this.stageSize.set({ w, h });
      };
      measure();
      if (el && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        destroyRef.onDestroy(() => ro.disconnect());
      }
      const onFs = () => this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', onFs);
      destroyRef.onDestroy(() => document.removeEventListener('fullscreenchange', onFs));
    });
  }

  // ------------------------------------------------------------------ zoom / pan / rotate
  protected zoomBy(factor: number): void {
    const next = Math.min(4, Math.max(0.2, +(this.scale() * factor).toFixed(3)));
    this.zoomMode.set(next);
  }

  protected actualSize(): void {
    this.zoomMode.set(1);
  }

  protected fit(): void {
    this.zoomMode.set('fit');
  }

  protected rotate(delta: number): void {
    this.rotation.set((this.rotation() + delta + 360) % 360);
  }

  protected onWheel(e: WheelEvent): void {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }

  private drag: { x: number; y: number; left: number; top: number } | null = null;
  protected readonly dragging = signal(false);

  protected onPointerDown(e: PointerEvent): void {
    const el = this.stageRef()?.nativeElement;
    if (!el || e.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    this.drag = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    this.dragging.set(true);
    el.setPointerCapture?.(e.pointerId);
  }

  protected onPointerMove(e: PointerEvent): void {
    const el = this.stageRef()?.nativeElement;
    if (!el || !this.drag) return;
    el.scrollLeft = this.drag.left - (e.clientX - this.drag.x);
    el.scrollTop = this.drag.top - (e.clientY - this.drag.y);
  }

  protected onPointerUp(): void {
    this.drag = null;
    this.dragging.set(false);
  }

  protected toggleFullscreen(): void {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      /* not supported */
    }
  }

  // ------------------------------------------------------------------ navigation
  protected go(delta: number): void {
    const s = this.submission();
    if (!s || s.files.length < 2) return;
    const i = (this.fileIndex() + delta + s.files.length) % s.files.length;
    this.open(s.files[i]);
  }

  protected open(f: IdentityFile): void {
    const s = this.submission();
    if (s) void this.router.navigate(['/admin/identity-document', s.id, f.id], { replaceUrl: true });
  }

  protected closeTab(): void {
    // Opened in a new tab from the dashboard → close it; otherwise go back to the grid.
    if (window.opener) window.close();
    else void this.router.navigateByUrl('/admin/dashboard/identity-checks');
  }

  protected copyNumber(): void {
    const n = this.submission()?.documentNumber ?? '';
    void navigator.clipboard?.writeText(n).catch(() => undefined);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (this.pending() || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    switch (e.key) {
      case 'ArrowRight':
        this.go(1);
        break;
      case 'ArrowLeft':
        this.go(-1);
        break;
      case '+':
      case '=':
        this.zoomBy(1.25);
        break;
      case '-':
      case '_':
        this.zoomBy(0.8);
        break;
      case '0':
        this.fit();
        break;
      case '1':
        this.actualSize();
        break;
      case 'r':
      case 'R':
        this.rotate(e.shiftKey ? -90 : 90);
        break;
      case 'e':
      case 'E':
        this.enhance.set(!this.enhance());
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'i':
      case 'I':
        this.showDetails.set(!this.showDetails());
        break;
      case '?':
        this.showKeys.set(!this.showKeys());
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  // ------------------------------------------------------------------ decision
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
