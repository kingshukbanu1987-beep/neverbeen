import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AiModelHighlight, AiModelProfile } from '../ai-model-data';
import { HighlightViewer } from './highlight-viewer';

/**
 * The model's Highlights — the Instagram-style row of circular covers shown just above **Read full
 * Biography**, with a horizontal scrollbar (and arrow controls) when the model has more highlights
 * than fit. Each circle opens the watch story viewer: portrait frames that advance every four
 * seconds (a clip plays for its own duration) with the highlight's background music. Highlights
 * never expire, and their frames carry no likes, comments, seen or share features.
 */
@Component({
  selector: 'app-model-highlights',
  imports: [HighlightViewer],
  templateUrl: './model-highlights.html',
  styleUrl: './model-highlights.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'syncScroll()',
  },
})
export class ModelHighlights implements AfterViewInit {
  readonly model = input.required<AiModelProfile>();

  /** Every highlight of the album, in folder order — none at all hides the whole row. */
  protected readonly highlights = computed<AiModelHighlight[]>(() => this.model().highlights ?? []);

  protected readonly viewerOpen = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly canScrollBack = signal(false);
  protected readonly canScrollForward = signal(false);

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');
  private trigger: HTMLElement | null = null;

  constructor() {
    // A model change redraws the row: re-measure so the arrows reflect the new overflow.
    effect(() => {
      this.highlights();
      queueMicrotask(() => this.syncScroll());
    });
  }

  ngAfterViewInit(): void {
    // The rail is measured once it exists; the arrows stay hidden for a model with one highlight.
    queueMicrotask(() => this.syncScroll());
  }

  /** Opens the selected highlight in the story viewer. */
  protected open(index: number, event?: Event): void {
    this.trigger = (event?.currentTarget as HTMLElement | null) ?? null;
    this.activeIndex.set(index);
    this.viewerOpen.set(true);
  }

  /** Returns to the circle that opened the viewer, so keyboard focus is not lost. */
  protected closeViewer(): void {
    this.viewerOpen.set(false);
    queueMicrotask(() => this.trigger?.focus({ preventScroll: true }));
  }

  /** The left/right arrows scroll one screenful of circles at a time. */
  protected scrollRail(direction: -1 | 1): void {
    const rail = this.rail()?.nativeElement;
    if (!rail) return;
    const distance = Math.max(rail.clientWidth * 0.72, 240);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    rail.scrollBy({ left: direction * distance, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /** Keeps the arrow buttons in step with the horizontal scroll position. */
  protected syncScroll(): void {
    const rail = this.rail()?.nativeElement;
    if (!rail) return;
    const max = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    this.canScrollBack.set(rail.scrollLeft > 4);
    this.canScrollForward.set(rail.scrollLeft < max - 4);
  }

  /** "3 stories" / "1 story" under the circle. */
  protected storyLabel(highlight: AiModelHighlight): string {
    const count = highlight.items.length;
    return `${count} ${count === 1 ? 'story' : 'stories'}`;
  }

  /** The screen-reader description of a circle, including what pressing it starts. */
  protected openLabel(highlight: AiModelHighlight): string {
    const videos = highlight.videoCount;
    const pieces = [this.storyLabel(highlight)];
    if (videos > 0) pieces.push(`${videos} ${videos === 1 ? 'clip' : 'clips'}`);
    return `Play the ${highlight.name} highlight — ${pieces.join(', ')} with music`;
  }
}
