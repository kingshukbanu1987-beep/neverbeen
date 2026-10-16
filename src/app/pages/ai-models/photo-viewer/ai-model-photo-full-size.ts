import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AiModelPhoto } from '../ai-model-data';
import { downloadPhotograph } from './photo-download';
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
  coverSize,
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
/** How far the arrow keys move the photograph. */
const PAN_STEP = 90;
/** Controls fade away after this long without the visitor touching anything. */
const CHROME_IDLE_MS = 3200;
/** The "Saved to your device" confirmation lingers this long. */
const SAVED_MS = 2400;

type Motion = 'instant' | 'smooth' | 'wheel';
type GestureKind = 'pan' | 'pinch';

interface Gesture {
  kind: GestureKind;
  pointerType: string;
  multiTouch: boolean;
  startTime: number;
  /** Where the first finger landed, for tap detection. */
  origin: Point;
  moved: boolean;
  /** Pointer position and transform when the current pan baseline was taken. */
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

type FullScreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/**
 * The "View Full Size" view: one photograph taken over the whole screen on any device — phone,
 * tablet or laptop.
 *
 * The photograph is painted to cover the screen edge to edge (on a phone in portrait it fills the
 * entire screen and its far sides wait just off the edges), and the visitor drags with a finger or
 * the mouse to bring the left and right of the photograph into view. Pinching, scrolling,
 * double-tapping, or the + / − controls zoom further — up to 500% — for close detail, and the
 * photograph glides to a stop after every drag. A segmented switch flips between 'Original' and
 * 'B/W', and Download saves the photograph. Closing — the button, Escape, or the phone's back
 * gesture — returns to the page the visitor came from.
 */
@Component({
  selector: 'app-ai-model-photo-full-size',
  imports: [],
  templateUrl: './ai-model-photo-full-size.html',
  styleUrl: './ai-model-photo-full-size.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(document:fullscreenchange)': 'onFullscreenChange()',
    '(document:webkitfullscreenchange)': 'onFullscreenChange()',
    '(window:popstate)': 'onPopState()',
    '(window:resize)': 'onWindowResize()',
    '(window:orientationchange)': 'onWindowResize()',
  },
})
export class AiModelPhotoFullScreen {
  /** The photograph the viewer was on when full screen opened. */
  readonly photo = input.required<AiModelPhoto>();
  /** All unlocked photographs in the model's album; Premium Content is never passed here. */
  readonly albumPhotos = input<readonly AiModelPhoto[] | null>(null);
  readonly modelName = input('');
  readonly modelHandle = input('');
  /** The photograph's frame label in the current viewer, e.g. "03". */
  readonly frameLabel = input('');
  /** The album's size as shown beside the frame label, e.g. "12". */
  readonly frameTotal = input('');

  /** Emitted when the visitor closes the view and wants to go back to where they came from. */
  readonly closed = output<void>();
  /** The currently selected unlocked album photograph, emitted after in-full-screen navigation. */
  readonly photoChanged = output<AiModelPhoto>();

  protected readonly maxZoom = MAX_ZOOM;

  /** 'Original' shows the photograph as shot; 'B/W' greys it. */
  protected readonly mode = signal<'original' | 'bw'>('original');
  protected readonly bw = computed(() => this.mode() === 'bw');

  /** The zoom level shown by the controls; the transform itself is written straight to the photo. */
  protected readonly scale = signal(1);
  protected readonly zoomed = computed(() => this.scale() > 1.001);
  protected readonly zoomPercent = computed(() => Math.round(this.scale() * 100));
  protected readonly atMaxZoom = computed(() => this.scale() >= MAX_ZOOM - 0.001);

  /** True while a finger or the mouse is down. */
  protected readonly gesturing = signal(false);
  /** The controls fade out while the photograph is left alone, and return on the next touch. */
  protected readonly chromeVisible = signal(true);
  /** A short "Saved to your device" confirmation after a download. */
  protected readonly saved = signal(false);
  /** The "how to explore" hint, shown when the view opens until the visitor first moves. */
  protected readonly hintVisible = signal(true);
  protected readonly hintText = signal(
    typeof matchMedia === 'function' && matchMedia('(hover: none)').matches
      ? 'Drag to look around · pinch to zoom to 500%'
      : 'Drag to look around · scroll or double-click to zoom',
  );

  protected readonly title = computed(() => {
    const name = this.modelName() || 'Portfolio';
    return this.modelHandle() ? `${name} · ${this.modelHandle()}` : name;
  });

  /** The album is intentionally built only from the model's regular, unlocked photographs. */
  protected readonly frames = computed(() => {
    const album = this.albumPhotos();
    return album?.length ? album : [this.photo()];
  });

  /** Starts on the photograph opened in the lightbox, then stays local while this view is open. */
  protected readonly frameIndex = linkedSignal(() => {
    const source = this.photo().src;
    const index = this.frames().findIndex((frame) => frame.src === source);
    return index >= 0 ? index : 0;
  });

  protected readonly currentPhoto = computed(
    () => this.frames()[this.frameIndex()] ?? this.photo(),
  );
  protected readonly hasAlbumNavigation = computed(() => this.frames().length > 1);
  protected readonly displayFrameLabel = computed(() =>
    this.albumPhotos()?.length ? String(this.frameIndex() + 1).padStart(2, '0') : this.frameLabel(),
  );
  protected readonly displayFrameTotal = computed(() =>
    this.albumPhotos()?.length
      ? String(this.albumPhotos()!.length).padStart(2, '0')
      : this.frameTotal(),
  );

  protected readonly altText = computed(() => {
    const name = this.modelName() || 'Portfolio';
    return this.displayFrameLabel()
      ? `${name} — portfolio photograph ${this.displayFrameLabel()}`
      : `${name} — portfolio photograph`;
  });

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly imageRef = viewChild<ElementRef<HTMLImageElement>>('photoImage');
  private readonly closeRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly rootRef = viewChild<ElementRef<HTMLElement>>('root');

  private view: ZoomTransform = IDENTITY;
  private stageSize: Size = { width: 0, height: 0 };
  private stageCentre: Point = { x: 0, y: 0 };
  /** The size the photograph is painted at: exactly covering the screen at 1×. */
  private photoSize: Size = { width: 0, height: 0 };

  private readonly pointers = new Map<number, Point>();
  private gesture: Gesture | null = null;
  private lastPointerType = 'mouse';
  private lastTap: { time: number; x: number; y: number } | null = null;
  private glideFrame = 0;
  private appliedMotion: Motion | null = null;
  private safariGestureBase = 1;
  private safariGestureView: ZoomTransform = IDENTITY;
  private safariGestureFocus: Point = { x: 0, y: 0 };
  private lastChromeWake = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  /** True once this view owns a history entry, so the phone's back gesture closes it. */
  private pushedState = false;
  /** True while closing, so the back-end of the close cannot fire twice. */
  private closing = false;
  /** True once the browser's own full screen has been entered successfully. */
  private nativeFullscreen = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let visualViewport: VisualViewport | null = null;
    const syncVisualViewport = () => this.onWindowResize();

    // Claim one history entry, so the phone's back gesture (and the browser's Back button) closes
    // this view instead of leaving the page the visitor was on.
    this.pushHistory();

    // Move focus to the close button as soon as the view renders, so the keyboard works straight away.
    effect(() => {
      this.closeRef()?.nativeElement.focus({ preventScroll: true });
    });

    // The wheel and Safari's trackpad gestures need non-passive listeners, so the page behind
    // never scrolls or zooms while the visitor explores the photograph.
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

    // Decode both neighbours before they're needed so album navigation feels immediate on phones.
    effect(() => {
      const frames = this.frames();
      const index = this.frameIndex();
      if (frames.length < 2 || typeof Image === 'undefined') return;
      for (const offset of [1, -1]) {
        const neighbour = frames[(index + offset + frames.length) % frames.length];
        if (!neighbour) continue;
        const image = new Image();
        image.decoding = 'async';
        image.src = neighbour.src;
      }
    });

    // Every device opens full screen: the browser's own full screen where it exists (laptops,
    // tablets, most Android phones) and a screen-filling overlay everywhere else (iPhone Safari
    // keeps the browser chrome, so the overlay is the full screen).
    afterNextRender(() => {
      this.syncBounds();
      this.applyTransform('instant');
      this.requestNativeFullscreen();

      visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
      visualViewport?.addEventListener('resize', syncVisualViewport, { passive: true });
      visualViewport?.addEventListener('scroll', syncVisualViewport, { passive: true });
    });

    this.scheduleIdleHide();

    destroyRef.onDestroy(() => {
      this.stopGlide();
      visualViewport?.removeEventListener('resize', syncVisualViewport);
      visualViewport?.removeEventListener('scroll', syncVisualViewport);
      if (this.hintTimer) clearTimeout(this.hintTimer);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.teardownHistory();
    });
  }

  // ------------------------------------------------------------------------------ lifecycle

  /**
   * Claims one history entry so the phone's back gesture (and the browser's back button) closes
   * this view instead of leaving the page the visitor was on.
   */
  private pushHistory(): void {
    if (typeof history === 'undefined' || typeof history.pushState !== 'function') return;
    try {
      history.pushState({ ...(history.state ?? {}), neverBeenFullSize: true }, '');
      this.pushedState = true;
    } catch {
      // Some embedded browsers refuse pushState — the close button still works.
    }
  }

  /** The back button / back gesture popped our history entry: leave the full-size view. */
  protected onPopState(): void {
    if (this.closing) return;
    this.pushedState = false;
    this.close();
  }

  private teardownHistory(): void {
    // If the view is destroyed without passing through `close` (its page tore the viewer down),
    // strip our marker from the current entry so one later press of Back is not swallowed.
    if (!this.pushedState) return;
    this.pushedState = false;
    if (typeof history === 'undefined' || typeof history.replaceState !== 'function') return;
    try {
      const state = { ...(history.state ?? {}) };
      delete (state as Record<string, unknown>)['neverBeenFullSize'];
      history.replaceState(state, '');
    } catch {
      // Nothing to clean up.
    }
  }

  private requestNativeFullscreen(): void {
    const element = (this.rootRef()?.nativeElement ?? null) as FullScreenElement | null;
    if (!element?.requestFullscreen && !element?.webkitRequestFullscreen) return;
    try {
      const result =
        element.requestFullscreen?.({ navigationUI: 'hide' }) ??
        element.webkitRequestFullscreen?.();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // iPhone Safari and locked-down browsers decline — the overlay already fills the screen.
        });
      }
    } catch {
      // Same fallback.
    }
  }

  private exitNativeFullscreen(): void {
    if (typeof document === 'undefined') return;
    try {
      const active = document.fullscreenElement ?? null;
      const webkitExit = (document as Document & { webkitExitFullscreen?: () => void })
        .webkitExitFullscreen;
      if (typeof document.exitFullscreen === 'function' && (active || this.nativeFullscreen)) {
        void document.exitFullscreen().catch(() => undefined);
      } else if (typeof webkitExit === 'function' && this.nativeFullscreen) {
        webkitExit();
      }
    } catch {
      // Nothing to leave.
    }
    this.nativeFullscreen = false;
  }

  /** The browser's full screen ended on its own (Escape, the browser's own controls): go back. */
  protected onFullscreenChange(): void {
    const element = this.rootRef()?.nativeElement ?? null;
    const active =
      typeof document !== 'undefined'
        ? (document.fullscreenElement ?? null) ||
          ((document as Document & { webkitFullscreenElement?: Element | null })
            .webkitFullscreenElement ??
            null)
        : null;
    if (active === element) {
      this.nativeFullscreen = true;
      return;
    }
    if (this.nativeFullscreen && !this.closing) {
      this.nativeFullscreen = false;
      this.close();
    }
  }

  // ------------------------------------------------------------------------------ navigation

  /** Closes the view and hands the visitor back to the page they came from. */
  protected close(): void {
    if (this.closing) return;
    this.closing = true;
    if (this.pushedState) {
      this.pushedState = false;
      if (typeof history !== 'undefined' && typeof history.back === 'function') {
        // Unwind our history entry in the background; `onPopState` ignores it (`closing` is set).
        history.back();
      }
    }
    this.exitNativeFullscreen();
    this.closed.emit();
  }

  /** Moves around the regular album, wrapping at either end just like the lightbox. */
  protected showNextPhoto(): void {
    if (!this.hasAlbumNavigation()) return;
    this.selectFrame((this.frameIndex() + 1) % this.frames().length);
  }

  protected showPreviousPhoto(): void {
    if (!this.hasAlbumNavigation()) return;
    this.selectFrame((this.frameIndex() - 1 + this.frames().length) % this.frames().length);
  }

  private selectFrame(index: number): void {
    const selected = this.frames()[index];
    if (!selected || index === this.frameIndex()) return;

    this.stopGlide();
    for (const pointerId of this.pointers.keys()) this.releaseCapture(pointerId);
    this.pointers.clear();
    this.gesture = null;
    this.gesturing.set(false);
    this.lastTap = null;
    this.view = IDENTITY;
    this.photoSize = { width: 0, height: 0 };
    this.frameIndex.set(index);

    const image = this.imageRef()?.nativeElement;
    if (image) {
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.opacity = '0.68';
    }
    this.applyTransform('instant');
    this.dismissHint();
    this.wakeChrome();
    this.photoChanged.emit(selected);
  }

  // ------------------------------------------------------------------------------- download

  /** Saves the photograph to the visitor's device and confirms with a brief pill. */
  protected async download(): Promise<void> {
    const photo = this.currentPhoto();
    if (!photo?.src) return;
    await downloadPhotograph(photo.src);
    this.saved.set(true);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.saved.set(false), SAVED_MS);
    this.wakeChrome();
  }

  // ---------------------------------------------------------------------------- colour mode

  protected setOriginal(): void {
    this.mode.set('original');
    this.wakeChrome();
  }

  protected setBlackAndWhite(): void {
    this.mode.set('bw');
    this.wakeChrome();
  }

  protected toggleMode(): void {
    this.mode.update((mode) => (mode === 'bw' ? 'original' : 'bw'));
    this.wakeChrome();
  }

  // -------------------------------------------------------------------------------- gestures

  protected onPointerDown(event: PointerEvent): void {
    if ((event.target as Element | null)?.closest('button')) return;
    this.lastPointerType = event.pointerType || 'mouse';
    this.stopGlide();
    this.dismissHint();
    this.wakeChrome();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.capturePointer(event.pointerId);

    if (this.pointers.size === 1 || !this.gesture) {
      this.gesture = {
        kind: 'pan',
        pointerType: this.lastPointerType,
        multiTouch: this.pointers.size > 1,
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
    // A moving mouse wakes the controls even before it presses anything.
    if (
      !this.gesture &&
      (event.pointerType || this.lastPointerType) === 'mouse' &&
      Date.now() - this.lastChromeWake >= 800
    ) {
      this.wakeChrome();
    }
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
      return;
    }

    if (distanceBetween({ x: event.clientX, y: event.clientY }, gesture.origin) > TAP_SLOP) {
      gesture.moved = true;
    }
    const dx = event.clientX - gesture.panOrigin.x;
    const dy = event.clientY - gesture.panOrigin.y;

    // The photograph follows the finger or the mouse; the edges of the screen stop it.
    this.view = clampPan(
      { ...gesture.baseline, x: gesture.baseline.x + dx, y: gesture.baseline.y + dy },
      this.stageSize,
      this.photoSize,
    );
    gesture.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    if (gesture.samples.length > 12) gesture.samples.shift();
    this.applyTransform('instant');
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
      // One finger of a pinch lifted: the other one keeps moving the photograph.
      const [remaining] = this.pointers.values();
      gesture.kind = 'pan';
      gesture.panOrigin = { ...remaining };
      gesture.baseline = { ...this.view };
      gesture.samples = [];
      return;
    }

    this.gesture = null;
    this.gesturing.set(false);
    this.wakeChrome();
    if (cancelled) return;

    this.glide(gesture.samples, event.timeStamp);
    if (!gesture.moved && !gesture.multiTouch) {
      this.handleTap(gesture, { x: event.clientX, y: event.clientY }, event.timeStamp);
    }
  }

  private handleTap(gesture: Gesture, point: Point, time: number): void {
    if (gesture.pointerType === 'mouse') return;
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
  }

  /** After a quick drag, the photograph keeps sliding and eases to a stop. */
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

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.dismissHint();
    this.wakeChrome();
    if (event.deltaY === 0 && event.deltaX === 0) return;
    this.stopGlide();
    this.syncBounds();
    const focus = this.toStage({ x: event.clientX, y: event.clientY });
    this.view = zoomAround(
      this.view,
      clampScale(this.view.scale * wheelZoomFactor(event)),
      focus,
      this.stageSize,
      this.photoSize,
    );
    this.applyTransform('wheel');
  }

  protected onDoubleClick(event: MouseEvent): void {
    // Touch double-taps are recognised from the pointer stream, so they are not counted twice.
    if (this.lastPointerType !== 'mouse') return;
    if ((event.target as Element | null)?.closest('button')) return;
    event.preventDefault();
    this.toggleZoomAt({ x: event.clientX, y: event.clientY });
  }

  private toggleZoomAt(client: Point): void {
    this.syncBounds();
    if (isZoomed(this.view)) {
      this.resetZoom();
      return;
    }
    this.zoomTo(DOUBLE_TAP_ZOOM, this.toStage(client), 'smooth');
  }

  private onSafariGestureStart(event: SafariGestureEvent): void {
    event.preventDefault();
    // iOS may send both legacy gesture events and pointer events for the same pinch. The pointer
    // stream already handles that gesture, so applying both would double the zoom and feel stuck.
    if (this.pointers.size > 0) return;
    this.stopGlide();
    this.syncBounds();
    this.safariGestureView = { ...this.view };
    this.safariGestureBase = this.view.scale;
    this.safariGestureFocus = this.toStage({ x: event.clientX, y: event.clientY });
  }

  private onSafariGestureChange(event: SafariGestureEvent): void {
    event.preventDefault();
    if (this.pointers.size > 0 || !Number.isFinite(event.scale)) return;
    this.dismissHint();
    this.view = zoomAround(
      this.safariGestureView,
      clampScale(this.safariGestureBase * event.scale),
      this.safariGestureFocus,
      this.stageSize,
      this.photoSize,
    );
    this.applyTransform('instant');
  }

  // -------------------------------------------------------------------------------- keyboard

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        if (this.hasAlbumNavigation() && !isZoomed(this.view)) this.showNextPhoto();
        else this.panBy(-PAN_STEP, 0);
        break;
      case 'ArrowLeft':
        if (this.hasAlbumNavigation() && !isZoomed(this.view)) this.showPreviousPhoto();
        else this.panBy(PAN_STEP, 0);
        break;
      case 'ArrowUp':
        this.panBy(0, PAN_STEP);
        break;
      case 'ArrowDown':
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
      case 'b':
      case 'B':
        this.toggleMode();
        break;
      default:
        return;
    }
    event.preventDefault();
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
    this.wakeChrome();
  }

  protected onPhotoLoad(): void {
    // The photograph's own size is only known once it has loaded; it is then painted to cover
    // the whole screen exactly. A new album frame fades in as soon as it is decoded.
    const image = this.imageRef()?.nativeElement;
    if (image) image.style.opacity = '1';
    this.syncBounds();
    this.view = clampPan(this.view, this.stageSize, this.photoSize);
    this.applyTransform('instant');
  }

  protected onWindowResize(): void {
    this.syncBounds();
    this.view = clampPan(this.view, this.stageSize, this.photoSize);
    this.applyTransform('instant');
    this.wakeChrome();
  }

  private zoomTo(scale: number, focus: Point, motion: Motion): void {
    this.stopGlide();
    this.syncBounds();
    this.view = zoomAround(this.view, clampScale(scale), focus, this.stageSize, this.photoSize);
    this.applyTransform(motion);
    this.dismissHint();
    this.wakeChrome();
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

  // ---------------------------------------------------------------------------------- chrome

  protected wakeChrome(): void {
    this.lastChromeWake = Date.now();
    this.chromeVisible.set(true);
    this.scheduleIdleHide();
  }

  /** Pointer movement reveals controls on desktop without restarting a timer on every touch sample. */
  protected onRootPointerMove(event: PointerEvent): void {
    if (
      (event.pointerType || this.lastPointerType) === 'mouse' &&
      Date.now() - this.lastChromeWake >= 800
    ) {
      this.wakeChrome();
    }
  }

  private scheduleIdleHide(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.chromeVisible.set(false), CHROME_IDLE_MS);
  }

  private dismissHint(): void {
    if (this.hintVisible()) this.hintVisible.set(false);
  }

  // -------------------------------------------------------------------------------- helpers

  private syncBounds(): void {
    const stage = this.stageRef()?.nativeElement;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      this.stageSize = { width: rect.width, height: rect.height };
      this.stageCentre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    const image = this.imageRef()?.nativeElement;
    if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
      this.photoSize = coverSize(
        { width: image.naturalWidth, height: image.naturalHeight },
        this.stageSize,
      );
      // The photograph is painted exactly screen-covering at 1×; the transform zooms from there.
      image.style.width = `${this.photoSize.width}px`;
      image.style.height = `${this.photoSize.height}px`;
    }
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

    if (this.appliedMotion !== motion) {
      const transformTransition =
        motion === 'smooth'
          ? 'transform 280ms cubic-bezier(0.22, 0.68, 0.32, 1)'
          : motion === 'wheel'
            ? 'transform 130ms ease-out'
            : 'transform 0s linear';
      image.style.transition = `filter 420ms cubic-bezier(0.3, 0.7, 0.3, 1), opacity 160ms ease, ${transformTransition}`;
      this.appliedMotion = motion;
    }
    const { scale, x, y } = this.view;
    // The percentage translate centres the over-sized cover image on the stage; x/y then pan it
    // independently of scale, which keeps the mathematically clamped edges aligned with the screen.
    image.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
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
