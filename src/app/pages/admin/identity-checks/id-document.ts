import { Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { IdentityFile, IdentitySubmission } from '../shared/admin-identity.service';

interface DocTheme {
  authority: string;
  title: string;
  band: string;
  accent: string;
  paper: string;
  ink: string;
}

const THEMES: Record<IdentitySubmission['documentType'], DocTheme> = {
  'Aadhaar Card': { authority: 'Unique Identification Authority of India', title: 'आधार — AADHAAR', band: 'linear-gradient(90deg,#f97316 0 33%,#ffffff 33% 66%,#16a34a 66%)', accent: '#b91c1c', paper: '#fffdf7', ink: '#1f2937' },
  'PAN Card': { authority: 'Income Tax Department · Govt. of India', title: 'PERMANENT ACCOUNT NUMBER CARD', band: 'linear-gradient(90deg,#1d4ed8,#38bdf8)', accent: '#1e3a8a', paper: '#eff6ff', ink: '#0f172a' },
  Passport: { authority: 'Republic · Ministry of External Affairs', title: 'PASSPORT', band: 'linear-gradient(90deg,#1e3a8a,#312e81)', accent: '#1e3a8a', paper: '#f5f3ff', ink: '#111827' },
  'Driving Licence': { authority: 'Transport Department', title: 'DRIVING LICENCE', band: 'linear-gradient(90deg,#0f766e,#14b8a6)', accent: '#115e59', paper: '#f0fdfa', ink: '#0f172a' },
  'Voter ID': { authority: 'Election Commission of India', title: 'ELECTOR PHOTO IDENTITY CARD', band: 'linear-gradient(90deg,#7c3aed,#c026d3)', accent: '#6b21a8', paper: '#faf5ff', ink: '#1f2937' },
  'National ID Card': { authority: 'National Registration Authority', title: 'NATIONAL IDENTITY CARD', band: 'linear-gradient(90deg,#15803d,#65a30d)', accent: '#166534', paper: '#f7fee7', ink: '#1f2937' },
};

/** Natural (100%) pixel size of a rendered document. */
export function docNaturalSize(s: IdentitySubmission, f: IdentityFile): { w: number; h: number } {
  return f.side === 'Selfie' ? { w: 640, h: 800 } : s.documentType === 'Passport' && f.side === 'Front' ? { w: 640, h: 450 } : { w: 640, h: 404 };
}

/**
 * Renders a submitted identity document. Real uploads (dataUrl) are shown as-is;
 * demo submissions are drawn as a realistic document from the submission data.
 * Natural size is 640px wide — use `width` to scale it (e.g. thumbnails).
 */
@Component({
  selector: 'app-id-document',
  host: { '[style.width.px]': 'width()', '[style.height.px]': 'height()', class: 'idd-host' },
  template: `
    <div class="idd-scale" [style.transform]="'scale(' + scale() + ')'" [style.width.px]="natural().w" [style.height.px]="natural().h">
      @if (file().dataUrl; as url) {
        @if (file().mime.startsWith('image/')) {
          <img class="idd-upload" [src]="url" [alt]="file().name" />
        } @else {
          <iframe class="idd-upload" [src]="safeUrl()" [title]="file().name"></iframe>
        }
      } @else if (file().side === 'Selfie') {
        <div class="idd-selfie">
          <img [src]="photo()" alt="" class="idd-selfie-photo" />
          <div class="idd-face-box"><i></i><i></i><i></i><i></i></div>
          <div class="idd-selfie-card" [style.background]="theme().band"><span>{{ submission().documentType }}</span></div>
          <div class="idd-selfie-meta">
            <span>● LIVE CAPTURE</span>
            <span>{{ submission().submittedAtUtc.slice(0, 16).replace('T', ' ') }} UTC</span>
          </div>
        </div>
      } @else if (file().side === 'Back') {
        <div class="idd-card" [style.background]="theme().paper" [style.color]="theme().ink">
          <div class="idd-band" [style.background]="theme().band"></div>
          <div class="idd-back">
            <div>
              <small>Address</small>
              <p>{{ submission().address || '—' }}</p>
              <small>Issued on</small>
              <p>{{ submission().issuedOn }}</p>
              @if (submission().expiresOn) {
                <small>Valid until</small>
                <p>{{ submission().expiresOn }}</p>
              }
            </div>
            <div class="idd-qr" aria-hidden="true">
              @for (c of qr(); track $index) {
                <i [class.on]="c"></i>
              }
            </div>
          </div>
          <div class="idd-barcode" aria-hidden="true">
            @for (b of barcode(); track $index) {
              <i [style.width.px]="b"></i>
            }
          </div>
          <div class="idd-foot" [style.color]="theme().accent">{{ theme().authority }}</div>
        </div>
      } @else {
        <div class="idd-card" [class.passport]="submission().documentType === 'Passport'" [style.background]="theme().paper" [style.color]="theme().ink">
          <div class="idd-head" [style.background]="theme().band">
            <span class="idd-emblem">✦</span>
            <div>
              <strong>{{ theme().title }}</strong>
              <small>{{ theme().authority }}</small>
            </div>
          </div>
          <div class="idd-body">
            <div class="idd-photo">
              <img [src]="photo()" alt="" />
              <span class="idd-holo" aria-hidden="true"></span>
            </div>
            <dl>
              <div><dt>Name</dt><dd class="idd-name">{{ submission().nameOnDocument }}</dd></div>
              <div class="row">
                <div><dt>Date of birth</dt><dd>{{ submission().dobOnDocument }}</dd></div>
                <div><dt>Sex</dt><dd>{{ submission().genderOnDocument }}</dd></div>
              </div>
              <div class="row">
                <div><dt>Nationality</dt><dd>{{ submission().issuingCountry }}</dd></div>
                @if (submission().expiresOn) {
                  <div><dt>Expiry</dt><dd>{{ submission().expiresOn }}</dd></div>
                }
              </div>
              <div><dt>Document No.</dt><dd class="idd-number" [style.color]="theme().accent">{{ submission().documentNumber }}</dd></div>
            </dl>
          </div>
          @if (submission().documentType === 'Passport') {
            <div class="idd-mrz">
              <span>{{ mrz()[0] }}</span>
              <span>{{ mrz()[1] }}</span>
            </div>
          } @else {
            <div class="idd-foot" [style.color]="theme().accent">{{ theme().authority }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        border-radius: 10px;
        flex: 0 0 auto;
      }
      .idd-scale {
        transform-origin: top left;
        position: absolute;
        top: 0;
        left: 0;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .idd-upload {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #0f172a;
        border: none;
      }
      .idd-card {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 22px;
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
        background-image: radial-gradient(circle at 80% 30%, rgba(99, 102, 241, 0.08), transparent 45%) !important;
      }
      .idd-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.025) 0 2px, transparent 2px 9px);
        pointer-events: none;
      }
      .idd-head {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 26px;
        color: #0f172a;
      }
      .idd-head strong {
        display: block;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
      }
      .idd-head small {
        font-size: 13px;
        font-weight: 700;
      }
      .passport .idd-head,
      .idd-card:not(.passport) .idd-head {
        color: #fff;
      }
      .idd-emblem {
        font-size: 34px;
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.25);
      }
      .idd-body {
        display: flex;
        gap: 26px;
        padding: 22px 28px 10px;
      }
      .idd-photo {
        position: relative;
        width: 150px;
        height: 188px;
        border-radius: 10px;
        overflow: hidden;
        flex: 0 0 auto;
        box-shadow: 0 0 0 3px #fff, 0 6px 18px rgba(15, 23, 42, 0.25);
      }
      .idd-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: saturate(0.85) contrast(1.05);
      }
      .idd-holo {
        position: absolute;
        right: -14px;
        bottom: -14px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: conic-gradient(from 30deg, #f0abfc, #93c5fd, #86efac, #fde68a, #f0abfc);
        opacity: 0.55;
        mix-blend-mode: screen;
      }
      dl {
        margin: 0;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      dl .row {
        display: flex;
        gap: 30px;
      }
      dt {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.55;
      }
      dd {
        margin: 2px 0 0;
        font-size: 17px;
        font-weight: 700;
      }
      .idd-name {
        font-size: 21px;
        font-weight: 900;
      }
      .idd-number {
        font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
        font-size: 24px;
        letter-spacing: 0.08em;
      }
      .idd-foot {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 10px 28px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border-top: 1px dashed rgba(15, 23, 42, 0.15);
      }
      .idd-mrz {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.75);
        display: flex;
        flex-direction: column;
        font-family: ui-monospace, 'OCR B', Menlo, monospace;
        font-size: 17px;
        letter-spacing: 0.18em;
        white-space: nowrap;
        overflow: hidden;
      }
      .idd-band {
        height: 16px;
      }
      .idd-back {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        padding: 24px 30px;
      }
      .idd-back small {
        display: block;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.55;
      }
      .idd-back p {
        margin: 2px 0 14px;
        font-size: 17px;
        font-weight: 700;
        max-width: 330px;
      }
      .idd-qr {
        width: 168px;
        height: 168px;
        display: grid;
        grid-template-columns: repeat(21, 1fr);
        padding: 8px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
        flex: 0 0 auto;
      }
      .idd-qr i.on {
        background: #0f172a;
      }
      .idd-barcode {
        display: flex;
        gap: 2px;
        height: 42px;
        margin: 0 30px;
      }
      .idd-barcode i {
        background: #111827;
      }
      .idd-selfie {
        position: relative;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 50% 35%, #334155, #0f172a);
        border-radius: 22px;
        overflow: hidden;
      }
      .idd-selfie-photo {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.95;
      }
      .idd-face-box {
        position: absolute;
        left: 22%;
        top: 14%;
        width: 56%;
        height: 46%;
      }
      .idd-face-box i {
        position: absolute;
        width: 44px;
        height: 44px;
        border: 4px solid #34d399;
      }
      .idd-face-box i:nth-child(1) { left: 0; top: 0; border-right: none; border-bottom: none; }
      .idd-face-box i:nth-child(2) { right: 0; top: 0; border-left: none; border-bottom: none; }
      .idd-face-box i:nth-child(3) { left: 0; bottom: 0; border-right: none; border-top: none; }
      .idd-face-box i:nth-child(4) { right: 0; bottom: 0; border-left: none; border-top: none; }
      .idd-selfie-card {
        position: absolute;
        right: 26px;
        bottom: 84px;
        width: 180px;
        height: 114px;
        border-radius: 12px;
        transform: rotate(-8deg);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: grid;
        place-items: center;
        color: #fff;
        font-weight: 900;
        font-size: 15px;
        text-align: center;
        padding: 8px;
      }
      .idd-selfie-meta {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: space-between;
        padding: 16px 22px;
        background: linear-gradient(0deg, rgba(0, 0, 0, 0.75), transparent);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.06em;
      }
      .idd-selfie-meta span:first-child {
        color: #f87171;
      }
    `,
  ],
})
export class IdDocument {
  private readonly sanitizer = inject(DomSanitizer);

  readonly submission = input.required<IdentitySubmission>();
  readonly file = input.required<IdentityFile>();
  readonly photo = input<string>('');
  /** Rendered width in px (natural width is 640). */
  readonly width = input<number>(640);

  protected readonly theme = computed(() => THEMES[this.submission().documentType] ?? THEMES['National ID Card']);
  protected readonly natural = computed(() => docNaturalSize(this.submission(), this.file()));
  protected readonly scale = computed(() => this.width() / this.natural().w);
  protected readonly height = computed(() => Math.round(this.natural().h * this.scale()));
  protected readonly safeUrl = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.file().dataUrl ?? ''));

  private readonly seed = computed(() => [...this.submission().documentNumber].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7));

  protected readonly qr = computed(() => {
    let h = this.seed();
    return Array.from({ length: 21 * 21 }, (_, i) => {
      const x = i % 21;
      const y = Math.floor(i / 21);
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (finder) {
        const fx = x > 13 ? x - 14 : x;
        const fy = y > 13 ? y - 14 : y;
        return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
      }
      h = (h * 1103515245 + 12345) >>> 0;
      return (h >> 16) % 2 === 0;
    });
  });

  protected readonly barcode = computed(() => {
    let h = this.seed();
    return Array.from({ length: 70 }, () => {
      h = (h * 1103515245 + 12345) >>> 0;
      return 1 + ((h >> 16) % 4);
    });
  });

  protected readonly mrz = computed(() => {
    const s = this.submission();
    const [first, ...rest] = s.nameOnDocument.split(' ');
    const surname = (rest.join('<') || first).replace(/[^A-Z<]/gi, '').toUpperCase();
    const line1 = `P<${s.issuingCountry.slice(0, 3).toUpperCase()}${surname}<<${first.toUpperCase()}`.padEnd(44, '<').slice(0, 44);
    const dob = s.dobOnDocument.replace(/-/g, '').slice(2);
    const exp = (s.expiresOn || '').replace(/-/g, '').slice(2);
    const line2 = `${s.documentNumber.replace(/\W/g, '')}<${s.issuingCountry.slice(0, 3).toUpperCase()}${dob}${s.genderOnDocument[0]?.toUpperCase() ?? '<'}${exp}`.padEnd(44, '<').slice(0, 44);
    return [line1, line2];
  });
}
