import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelMediaEngagementService } from '../../../services/model-media-engagement.service';
import { AiModelPhoto } from '../ai-model-data';
import { ModelMediaComments } from '../../../shared/model-media-comments/model-media-comments';
import { ModelMediaEngagementBar } from '../../../shared/model-media-engagement/model-media-engagement';
import {
  DOUBLE_TAP_ZOOM,
  IDENTITY,
  MAX_ZOOM,
  Point,
  Size,
  ZOOM_STEP,
  ZoomTransform,
  clampPan,
  clampScale,
  distanceBetween,
  isZoomed,
  midpointOf,
  pinchTransform,
  wheelZoomFactor,
  zoomAround,
} from './zoom-pan';

/** How far a finger may wander and still count as a tap. */
const TAP_SLOP = 10;
/** Two taps closer than this (in time and space) are a double-tap. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DISTANCE = 36;
/** A swipe at 1× must travel this far sideways to change the photograph… */
const SWIPE_DISTANCE = 60;
/** …or be a quick flick of at least this length. */
const FLICK_DISTANCE = 28;
const FLICK_SPEED = 0.5;
/** How far the arrow keys move a zoomed photograph. */
const PAN_STEP = 90;

type Motion = 'instant' | 'smooth' | 'wheel';
type GestureKind = 'pan' | 'swipe' | 'pinch';

interface Gesture {
  kind: GestureKind;
  pointerType: string;
  /** Set once a second finger lands: from then on the gesture can never change the photograph. */
  multiTouch: boolean;
  startedOnPhoto: boolean;
  startTime: number;
  /** Where the first finger landed, for tap detection. */
  origin: Point;
  moved: boolean;
  /** Pointer position and transform when the current pan/swipe baseline was taken. */
  panOrigin: Point;
  baseline: ZoomTransform;
  /** Midpoint (stage coordinates) and spread of the fingers when the pinch began. */
  pinchMid: Point;
  pinchDistance: number;
  /** Recent pointer positions, for the glide after a pan. */
  samples: { t: number; x: number; y: number }[];
}

interface SafariGestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

/**
 * Full-screen viewer for a model's photographs, shared by her portfolio and her "View All" page.
 *
 * Besides browsing (arrows, thumbnails, keyboard, a swipe on touch screens), every photograph can be
 * zoomed: with the mouse wheel or a trackpad pinch around the cursor, with two fingers on a phone,
 * tablet or touch-screen laptop, with a double-click or double-tap, or with the zoom buttons and the
 * + / − / 0 keys. A zoomed photograph is dragged around with one finger or the mouse and glides to a
 * stop. Gestures never "jump" to another photograph: only a deliberate one-finger swipe at 1× does
 * that, so a pinch, a pan or a wheel turn always stays on the photograph being looked at.
 */
@Component({
  selector: 'app-ai-model-photo-viewer',
  imports: [RouterLink, ModelMediaComments, ModelMediaEngagementBar],
  templateUrl: './ai-model-photo-viewer.html',
  styleUrl: './ai-model-photo-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(window:resize)': 'onWindowResize()',
  },
})
export class AiModelPhotoViewer {
  /** The photographs to browse, in the order the page shows them. */
  readonly photos = input.required<readonly AiModelPhoto[]>();
  /** The photograph the visitor opened. */
  readonly startIndex = input(0);
  readonly modelName = input('');
  readonly modelHandle = input('');
  /** The portfolio slug — enables the engagement strip and the "seen" count of each frame. */
  readonly modelSlug = input('');
  /** Router link to the complete album, offered when the viewer only holds part of it. */
  readonly albumLink = input<readonly string[] | null>(null);
  /** How many photographs the complete album holds, shown on the album link. */
  readonly albumSize = input(0);

  readonly closed = output<void>();

  protected readonly maxZoom = MAX_ZOOM;

  /** Follows `startIndex`, but the viewer's own controls move it on. */
  protected readonly index = linkedSignal(() => {
    const last = Math.max(this.photos().length - 1, 0);
    return Math.min(Math.max(Math.trunc(this.startIndex()), 0), last);
  });

  protected readonly photo = computed(() => this.photos()[this.index()] ?? null);

  /**
   * The current photograph as a one-item list keyed by its address, so every photograph gets a
   * fresh element: its entrance animation plays and no zoom carries over from the previous one.
   */
  protected readonly stagePhotos = computed(() => {
    const photo = this.photo();
    return photo ? [photo] : [];
  });

  protected readonly total = computed(() => this.photos().length);
  protected readonly frameNumber = computed(() => this.frameLabel(this.index()));
  protected readonly totalNumber = computed(() =>
    String(Math.max(this.total(), 1)).padStart(2, '0'),
  );

  protected readonly caption = computed(() => {
    const photo = this.photo();
    if (!photo) return '';
    return photo.caption || `${this.modelName() || 'Portfolio'} · frame ${this.frameNumber()}`;
  });

  /** The caption split so a generated frame number can be set in the numeric face. */
  protected readonly captionParts = computed(() => {
    const photo = this.photo();
    if (!photo) return { text: '', frame: '' };
    if (photo.caption) return { text: photo.caption, frame: '' };
    return { text: `${this.modelName() || 'Portfolio'} · frame `, frame: this.frameNumber() };
  });

  /** The zoom level shown by the controls; the transform itself is written straight to the photo. */
  protected readonly scale = signal(1);
  protected readonly zoomed = computed(() => this.scale() > 1.001);
  protected readonly zoomPercent = computed(() => Math.round(this.scale() * 100));
  protected readonly atMaxZoom = computed(() => this.scale() >= MAX_ZOOM - 0.001);

  /** Which way the last navigation went, so the next photograph slides in from that side. */
  protected readonly direction = signal<'next' | 'previous' | 'none'>('none');
  /** True while a finger or the mouse is down on the stage. */
  protected readonly gesturing = signal(false);
  /** The "how to zoom" hint, shown when the viewer opens until the visitor first zooms. */
  protected readonly hintVisible = signal(true);
  protected readonly hintText = signal(
    typeof matchMedia === 'function' && matchMedia('(hover: none)').matches
      ? 'Pinch or double-tap to zoom'
      : 'Scroll, pinch or double-click to zoom',
  );

  private readonly engagement = inject(ModelMediaEngagementService);

  /**
   * Keep the public conversation visible as soon as a photograph opens. Wide screens place it
   * beside the photograph; narrow screens flow it directly underneath so it never covers the image.
   */
  protected readonly commentsOpen = signal(true);

  /** Comment count of the current photograph, for the toggle in the footer. */
  protected readonly commentCount = computed(() => {
    const slug = this.modelSlug();
    const photo = this.photo();
    if (!slug || !photo) return 0;
    return this.engagement.statsFor(slug, 'photo', photo.src).comments;
  });

  protected toggleComments(): void {
    this.commentsOpen.update((open) => !open);
  }

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly imageRef = viewChild<ElementRef<HTMLImageElement>>('photoImage');
  private readonly closeRef = viewChild<ElementRef<HTMLButtonElement>>('viewerClose');
  private readonly thumbsRef = viewChild<ElementRef<HTMLElement>>('thumbs');

  private view: ZoomTransform = IDENTITY;
  /** Sideways offset while a 1× photograph follows a swiping finger. */
  private swipeOffset = 0;
  private stageSize: Size = { width: 0, height: 0 };
  private stageCentre: Point = { x: 0, y: 0 };
  private photoSize: Size = { width: 0, height: 0 };

  private readonly pointers = new Map<number, Point>();
  private gesture: Gesture | null = null;
  private lastPointerType = 'mouse';
  private lastTap: { time: number; x: number; y: number } | null = null;
  private glideFrame = 0;
  private safariGestureBase = 1;
  private safariGestureFocus: Point = { x: 0, y: 0 };
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private thumbsPlaced = false;

  constructor() {
    // Move focus into the viewer as soon as it renders, so the keyboard works straight away.
    effect(() => {
      this.closeRef()?.nativeElement.focus({ preventScroll: true });
    });

    // The wheel and Safari's trackpad gestures need non-passive listeners, so the page behind
    // never scrolls or zooms while the visitor zooms the photograph.
    effect((onCleanup) => {
      const stage = this.stageRef()?.nativeElement;
      if (!stage) return;
      const options: AddEventListenerOptions = { passive: false };
      const wheel = (event: WheelEvent) => this.onWheel(event);
      const start = (event: Event) => this.onSafariGestureStart(event as SafariGestureEvent);
      const change = (event: Event) => this.onSafariGestureChange(event as SafariGestureEvent);
      const end = (event: Event) => event.preventDefault();
      stage.addEventListener('wheel', wheel, options);
      stage.addEventListener('gesturestart', start, options);
      stage.addEventListener('gesturechange', change, options);
      stage.addEventListener('gestureend', end, options);
      onCleanup(() => {
        stage.removeEventListener('wheel', wheel, options);
        stage.removeEventListener('gesturestart', start, options);
        stage.removeEventListener('gesturechange', change, options);
        stage.removeEventListener('gestureend', end, options);
      });
    });

    // Keep the active thumbnail in view as the visitor browses.
    effect(() => {
      const index = this.index();
      const strip = this.thumbsRef()?.nativeElement;
      const thumb = strip?.children.item(index) as HTMLElement | null | undefined;
      if (!strip || !thumb) return;
      const left = thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
      const behavior: ScrollBehavior = this.thumbsPlaced ? 'smooth' : 'instant';
      this.thumbsPlaced = true;
      if (typeof strip.scrollTo === 'function') strip.scrollTo({ left, behavior });
      else strip.scrollLeft = left;
    });

    // Warm the browser cache with the neighbours, so the next swipe shows its photograph at once.
    effect(() => {
      const photos = this.photos();
      const index = this.index();
      if (photos.length < 2 || typeof Image === 'undefined') return;
      for (const offset of [1, -1]) {
        const neighbour = photos[(index + offset + photos.length) % photos.length];
        const image = new Image();
        image.decoding = 'async';
        image.src = neighbour.src;
      }
    });

    // Every opened photograph counts as "seen" — no account needed, one count per visitor.
    effect(() => {
      const slug = this.modelSlug();
      const photo = this.photo();
      if (!slug || !photo) return;
      void this.engagement.recordView(slug, 'photo', photo.src);
    });

    this.hintTimer = setTimeout(() => this.hintVisible.set(false), 4200);

    inject(DestroyRef).onDestroy(() => {
      this.stopGlide();
      if (this.hintTimer) clearTimeout(this.hintTimer);
    });
  }

  // ------------------------------------------------------------------------------ navigation

  protected frameLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected photoAlt(index: number): string {
    return `${this.modelName() || 'Portfolio'} — portfolio photograph ${index + 1}`;
  }

  protected close(): void {
    this.closed.emit();
  }

  protected showNext(): void {
    const count = this.total();
    if (count < 2) return;
    this.direction.set('next');
    this.index.update((index) => (index + 1) % count);
    this.resetView();
  }

  protected showPrevious(): void {
    const count = this.total();
    if (count < 2) return;
    this.direction.set('previous');
    this.index.update((index) => (index - 1 + count) % count);
    this.resetView();
  }

  protected select(index: number): void {
    if (index < 0 || index >= this.total() || index === this.index()) return;
    this.direction.set(index > this.index() ? 'next' : 'previous');
    this.index.set(index);
    this.resetView();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        // A zoomed photograph is explored with the arrows; at 1× they browse the album.
        if (isZoomed(this.view)) this.panBy(-PAN_STEP, 0);
        else this.showNext();
        break;
      case 'ArrowLeft':
        if (isZoomed(this.view)) this.panBy(PAN_STEP, 0);
        else this.showPrevious();
        break;
      case 'ArrowUp':
        if (!isZoomed(this.view)) return;
        this.panBy(0, PAN_STEP);
        break;
      case 'ArrowDown':
        if (!isZoomed(this.view)) return;
        this.panBy(0, -PAN_STEP);
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      case '0':
        this.resetZoom();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /** Clicking the dark space around the stage (bar, caption, margins) dismisses the viewer. */
  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    // The stage handles its own taps (see `finishGesture`), and controls do their own thing.
    if (target?.closest('button, a, img, .lightbox-stage, .lightbox-thumbs, .viewer-comments'))
      return;
    this.close();
  }

  // ------------------------------------------------------------------------------------ zoom

  protected zoomIn(): void {
    this.zoomTo(this.view.scale * ZOOM_STEP, { x: 0, y: 0 }, 'smooth');
  }

  protected zoomOut(): void {
    this.zoomTo(this.view.scale / ZOOM_STEP, { x: 0, y: 0 }, 'smooth');
  }

  protected resetZoom(): void {
    this.stopGlide();
    this.view = IDENTITY;
    this.applyTransform('smooth');
  }

  protected onPhotoLoad(): void {
    // The photograph's fitted size is only known once it has loaded.
    this.syncBounds();
    this.view = clampPan(this.view, this.stageSize, this.photoSize);
    this.applyTransform('instant');
  }

  protected onWindowResize(): void {
    this.syncBounds();
    this.view = clampPan(this.view, this.stageSize, this.photoSize);
    this.applyTransform('instant');
  }

  protected onDoubleClick(event: MouseEvent): void {
    // Touch double-taps are recognised from the pointer stream, so they are not counted twice.
    if (this.lastPointerType !== 'mouse') return;
    if ((event.target as Element | null)?.closest('button, a')) return;
    event.preventDefault();
    this.toggleZoomAt({ x: event.clientX, y: event.clientY });
  }

  private zoomTo(scale: number, focus: Point, motion: Motion): void {
    this.stopGlide();
    this.syncBounds();
    const next = clampScale(scale);
    this.view = zoomAround(this.view, next, focus, this.stageSize, this.photoSize);
    this.applyTransform(motion);
    this.dismissHint();
  }

  private toggleZoomAt(client: Point): void {
    this.syncBounds();
    if (isZoomed(this.view)) {
      this.resetZoom();
      return;
    }
    this.zoomTo(DOUBLE_TAP_ZOOM, this.toStage(client), 'smooth');
  }

  private panBy(dx: number, dy: number): void {
    this.stopGlide();
    this.syncBounds();
    this.view = clampPan(
      { ...this.view, x: this.view.x + dx, y: this.view.y + dy },
      this.stageSize,
      this.photoSize,
    );
    this.applyTransform('smooth');
  }

  private onWheel(event: WheelEvent): void {
    // The wheel always belongs to the photograph: the page behind never scrolls, the browser
    // never zooms the page or swipes back in history, and the album never moves on.
    event.preventDefault();
    const factor = wheelZoomFactor(event);
    if (factor === 1) return;
    const scale = clampScale(this.view.scale * factor);
    if (Math.abs(scale - this.view.scale) < 1e-6) return;
    this.syncBounds();
    this.zoomTo(
      scale,
      this.toStage({ x: event.clientX, y: event.clientY }),
      event.ctrlKey ? 'instant' : 'wheel',
    );
  }

  /** Safari reports trackpad pinches as gesture events instead of ctrl + wheel. */
  private onSafariGestureStart(event: SafariGestureEvent): void {
    event.preventDefault();
    // On iPhone and iPad the same pinch also arrives as touch pointers, which already zoom.
    if (this.pointers.size > 0) return;
    this.syncBounds();
    this.safariGestureBase = this.view.scale;
    this.safariGestureFocus = this.toStage({ x: event.clientX ?? 0, y: event.clientY ?? 0 });
  }

  private onSafariGestureChange(event: SafariGestureEvent): void {
    event.preventDefault();
    if (this.pointers.size > 0 || !Number.isFinite(event.scale)) return;
    this.zoomTo(this.safariGestureBase * event.scale, this.safariGestureFocus, 'instant');
  }

  // -------------------------------------------------------------------------------- pointers

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as Element | null;
    // The arrows and zoom buttons inside the stage keep their ordinary clicks.
    if (target?.closest('button, a')) return;

    this.lastPointerType = event.pointerType || 'mouse';
    this.stopGlide();
    this.syncBounds();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.capturePointer(event.pointerId);

    if (this.pointers.size === 1 || !this.gesture) {
      this.gesture = {
        kind: isZoomed(this.view) ? 'pan' : 'swipe',
        pointerType: this.lastPointerType,
        multiTouch: this.pointers.size > 1,
        startedOnPhoto: !!target?.closest('.lightbox-image'),
        startTime: event.timeStamp,
        origin: { x: event.clientX, y: event.clientY },
        moved: false,
        panOrigin: { x: event.clientX, y: event.clientY },
        baseline: { ...this.view },
        pinchMid: { x: 0, y: 0 },
        pinchDistance: 1,
        samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
      };
      if (this.pointers.size > 1) this.beginPinch();
    } else {
      this.beginPinch();
    }
    this.gesturing.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || !this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (gesture.kind === 'pinch') {
      const [first, second] = this.pointers.values();
      if (!first || !second) return;
      gesture.moved = true;
      this.view = pinchTransform(
        gesture.baseline,
        gesture.pinchMid,
        gesture.pinchDistance,
        this.toStage(midpointOf(first, second)),
        distanceBetween(first, second),
        this.stageSize,
        this.photoSize,
      );
      this.applyTransform('instant');
      this.dismissHint();
      return;
    }

    if (distanceBetween({ x: event.clientX, y: event.clientY }, gesture.origin) > TAP_SLOP) {
      gesture.moved = true;
    }
    const dx = event.clientX - gesture.panOrigin.x;
    const dy = event.clientY - gesture.panOrigin.y;

    if (gesture.kind === 'pan') {
      this.view = clampPan(
        { ...gesture.baseline, x: gesture.baseline.x + dx, y: gesture.baseline.y + dy },
        this.stageSize,
        this.photoSize,
      );
      gesture.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
      if (gesture.samples.length > 12) gesture.samples.shift();
      this.applyTransform('instant');
      return;
    }

    // A swipe at 1×: the photograph follows a finger or pen sideways (the mouse does not swipe).
    if (gesture.pointerType !== 'mouse' && !gesture.multiTouch) {
      this.swipeOffset = dx;
      this.applyTransform('instant');
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    this.releasePointer(event, false);
  }

  protected onPointerCancel(event: PointerEvent): void {
    this.releasePointer(event, true);
  }

  private releasePointer(event: PointerEvent, cancelled: boolean): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    this.releaseCapture(event.pointerId);

    const gesture = this.gesture;
    if (!gesture) return;

    if (this.pointers.size >= 2) {
      // Three fingers down to two: carry on pinching from where the photograph is now.
      this.beginPinch();
      return;
    }
    if (this.pointers.size === 1) {
      // One finger of a pinch lifted: the other one keeps moving the photograph. The gesture
      // stays marked as multi-touch, so lifting the last finger can never change the photograph.
      const [remaining] = this.pointers.values();
      gesture.kind = 'pan';
      gesture.panOrigin = { ...remaining };
      gesture.baseline = { ...this.view };
      gesture.samples = [];
      return;
    }

    this.gesture = null;
    this.gesturing.set(false);
    this.finishGesture(gesture, event, cancelled);
  }

  private finishGesture(gesture: Gesture, event: PointerEvent, cancelled: boolean): void {
    const dx = event.clientX - gesture.panOrigin.x;
    const dy = event.clientY - gesture.panOrigin.y;

    if (gesture.kind === 'swipe') {
      const elapsed = Math.max(event.timeStamp - gesture.startTime, 1);
      const sideways = Math.abs(dx) > Math.abs(dy) * 1.2;
      const far = Math.abs(dx) >= SWIPE_DISTANCE;
      const flick = Math.abs(dx) >= FLICK_DISTANCE && Math.abs(dx) / elapsed >= FLICK_SPEED;
      const canNavigate =
        !cancelled &&
        !gesture.multiTouch &&
        gesture.pointerType !== 'mouse' &&
        !isZoomed(this.view) &&
        this.total() > 1;

      if (canNavigate && sideways && (far || flick)) {
        this.swipeOffset = 0;
        if (dx < 0) this.showNext();
        else this.showPrevious();
        return;
      }
      if (this.swipeOffset !== 0) {
        this.swipeOffset = 0;
        this.applyTransform('smooth');
      }
    }

    if (cancelled) return;

    if (gesture.kind === 'pan' && !gesture.multiTouch) {
      this.glide(gesture.samples, event.timeStamp);
    }

    if (!gesture.moved && !gesture.multiTouch) {
      this.handleTap(gesture, { x: event.clientX, y: event.clientY }, event.timeStamp);
    }
  }

  private handleTap(gesture: Gesture, point: Point, time: number): void {
    if (gesture.pointerType !== 'mouse') {
      const last = this.lastTap;
      if (
        last &&
        time - last.time <= DOUBLE_TAP_MS &&
        distanceBetween(point, { x: last.x, y: last.y }) <= DOUBLE_TAP_DISTANCE
      ) {
        this.lastTap = null;
        this.toggleZoomAt(point);
        return;
      }
      this.lastTap = { time, ...point };
    }

    // A tap on the dark space around a photograph at rest closes the viewer, as it always has.
    // Once zoomed in, stray taps are ignored so the visitor never loses their place.
    if (!gesture.startedOnPhoto && !isZoomed(this.view)) this.close();
  }

  private beginPinch(): void {
    const gesture = this.gesture;
    const [first, second] = this.pointers.values();
    if (!gesture || !first || !second) return;
    gesture.kind = 'pinch';
    gesture.multiTouch = true;
    gesture.moved = true;
    gesture.baseline = { ...this.view };
    gesture.pinchMid = this.toStage(midpointOf(first, second));
    gesture.pinchDistance = Math.max(distanceBetween(first, second), 1);
    if (this.swipeOffset !== 0) {
      this.swipeOffset = 0;
      this.applyTransform('instant');
    }
  }

  /** After a quick drag, a zoomed photograph keeps sliding and eases to a stop. */
  private glide(samples: Gesture['samples'], releasedAt: number): void {
    const recent = samples.filter((sample) => releasedAt - sample.t <= 100);
    if (recent.length < 2 || typeof requestAnimationFrame !== 'function') return;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const span = last.t - first.t;
    if (span <= 0) return;

    let vx = (last.x - first.x) / span;
    let vy = (last.y - first.y) / span;
    if (Math.hypot(vx, vy) < 0.2) return;

    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min(Math.max(now - previous, 0), 32);
      previous = now;
      const wanted = { ...this.view, x: this.view.x + vx * dt, y: this.view.y + vy * dt };
      const next = clampPan(wanted, this.stageSize, this.photoSize);
      if (next.x !== wanted.x) vx = 0;
      if (next.y !== wanted.y) vy = 0;
      this.view = next;
      this.applyTransform('instant');

      const decay = Math.pow(0.94, dt / 16);
      vx *= decay;
      vy *= decay;
      this.glideFrame = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
    };
    this.glideFrame = requestAnimationFrame(step);
  }

  private stopGlide(): void {
    if (this.glideFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.glideFrame);
    }
    this.glideFrame = 0;
  }

  // --------------------------------------------------------------------------------- helpers

  /** Back to 1× for a new photograph — any gesture in progress is dropped with the old one. */
  private resetView(): void {
    this.stopGlide();
    this.view = IDENTITY;
    this.swipeOffset = 0;
    this.gesture = null;
    this.pointers.clear();
    this.gesturing.set(false);
    this.scale.set(1);
  }

  private dismissHint(): void {
    if (this.hintVisible()) this.hintVisible.set(false);
  }

  private syncBounds(): void {
    const stage = this.stageRef()?.nativeElement;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      this.stageSize = { width: rect.width, height: rect.height };
      this.stageCentre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    const image = this.imageRef()?.nativeElement;
    if (image) this.photoSize = { width: image.offsetWidth, height: image.offsetHeight };
  }

  private toStage(client: Point): Point {
    return { x: client.x - this.stageCentre.x, y: client.y - this.stageCentre.y };
  }

  /**
   * Writes the transform straight to the photograph rather than through a template binding: it
   * changes on every pointer move, and this keeps gestures at the display's frame rate.
   */
  private applyTransform(motion: Motion): void {
    this.scale.set(this.view.scale);
    const image = this.imageRef()?.nativeElement;
    if (!image) return;
    image.style.transition =
      motion === 'smooth'
        ? 'transform 280ms cubic-bezier(0.22, 0.68, 0.32, 1)'
        : motion === 'wheel'
          ? 'transform 130ms ease-out'
          : 'none';
    const { scale, x, y } = this.view;
    image.style.transform = `translate(${x + this.swipeOffset}px, ${y}px) scale(${scale})`;
  }

  private capturePointer(pointerId: number): void {
    const stage = this.stageRef()?.nativeElement;
    try {
      stage?.setPointerCapture?.(pointerId);
    } catch {
      // The pointer is already gone (or the browser refuses) — moves still reach the stage.
    }
  }

  private releaseCapture(pointerId: number): void {
    const stage = this.stageRef()?.nativeElement;
    try {
      if (stage?.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
    } catch {
      // Nothing to release.
    }
  }
}
