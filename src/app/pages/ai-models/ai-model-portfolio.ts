import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AiModelGalleryFrame, aiModelProfiles } from './ai-model-data';

/** Renders the studio lightbox on document.body so the site header cannot cover it. */
@Directive({ selector: '[appStudioPortal]' })
class StudioPortal implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly doc = inject(DOCUMENT);

  ngOnInit(): void {
    this.doc.body.appendChild(this.el);
  }

  ngOnDestroy(): void {
    this.el.remove();
  }
}

@Component({
  selector: 'app-ai-model-portfolio-page',
  imports: [RouterLink, NgTemplateOutlet, StudioPortal],
  templateUrl: './ai-model-portfolio.html',
  styleUrl: './ai-model-portfolio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelPortfolioPage {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('lightboxClose');

  /** Tile that opened the lightbox, so focus returns to it when the view closes. */
  private lastFocusedTile: HTMLElement | null = null;

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  protected readonly frames = computed(() => this.model()?.gallery ?? []);
  protected readonly leadFrame = computed(() => this.frames()[0] ?? null);
  protected readonly restFrames = computed(() => this.frames().slice(1));

  /** Index of the enlarged photograph, or null when the portfolio is at rest. */
  protected readonly activeIndex = signal<number | null>(null);

  protected readonly activeView = computed(() => {
    const index = this.activeIndex();
    const profile = this.model();
    if (index === null || !profile) return null;

    const frame = profile.gallery[index];
    if (!frame) return null;

    return {
      index,
      frame,
      name: profile.name,
      title: this.frameTitle(frame, index),
      note: this.frameNote(frame),
      alt: this.photoAlt(profile.name, frame, index),
      position: `${this.frameNumber(index)} / ${String(profile.gallery.length).padStart(2, '0')}`,
    };
  });

  constructor() {
    effect(() => {
      if (this.activeIndex() !== null) {
        this.closeButton()?.nativeElement.focus();
      }
    });

    effect(() => {
      this.slug();
      this.activeIndex.set(null);
      this.unlockScroll();
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (this.activeIndex() === null) return;

      switch (event.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowRight':
          this.step(1);
          break;
        case 'ArrowLeft':
          this.step(-1);
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    this.document.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', onKeydown);
      this.unlockScroll();
    });
  }

  protected fact(value: string): string {
    return value.trim() || 'Details to be added';
  }

  protected frameNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected frameTitle(frame: AiModelGalleryFrame, index: number): string {
    return frame.title.trim() || `Frame ${this.frameNumber(index)}`;
  }

  protected frameNote(frame: AiModelGalleryFrame): string {
    return frame.note.trim() || 'Studio lighting';
  }

  protected photoAlt(name: string, frame: AiModelGalleryFrame, index: number): string {
    const title = frame.title.trim();
    return title
      ? `${name} — ${title}, studio fashion photograph`
      : `${name} — portfolio photograph ${index + 1}`;
  }

  /** Every fourth continuing frame spans the wall so the set has an editorial rhythm. */
  protected isWide(index: number): boolean {
    return index % 4 === 3;
  }

  protected open(index: number, event: Event): void {
    if (this.activeIndex() === null) {
      const target = event.currentTarget;
      this.lastFocusedTile = target instanceof HTMLElement ? target : null;
      this.document.body.style.overflow = 'hidden';
    }
    this.activeIndex.set(index);
  }

  protected close(): void {
    this.activeIndex.set(null);
    this.unlockScroll();
    this.lastFocusedTile?.focus?.();
    this.lastFocusedTile = null;
  }

  protected closeFromControl(event: Event): void {
    event.stopPropagation();
    this.close();
  }

  protected showPrevious(event: Event): void {
    event.stopPropagation();
    this.step(-1);
  }

  protected showNext(event: Event): void {
    event.stopPropagation();
    this.step(1);
  }

  private step(delta: number): void {
    const total = this.frames().length;
    if (total === 0) return;

    this.activeIndex.update((index) => {
      const current = index ?? 0;
      return (current + delta + total) % total;
    });
  }

  private unlockScroll(): void {
    this.document.body.style.overflow = '';
  }
}
