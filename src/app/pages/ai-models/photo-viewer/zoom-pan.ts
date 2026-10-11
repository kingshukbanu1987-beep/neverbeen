/**
 * Zoom-and-pan arithmetic for the photo viewer, kept free of the DOM so it can be reasoned about and
 * tested on its own.
 *
 * Coordinates are measured from the centre of the stage (the area the photograph sits in). The
 * photograph is centred in the stage at rest and is moved with `translate(x, y) scale(scale)`
 * around its own centre, so a point `d` pixels from the photograph's centre appears on screen at
 * `(x, y) + scale × d`.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ZoomTransform {
  scale: number;
  x: number;
  y: number;
}

/** The photograph at rest: fitted to the stage and centred. */
export const IDENTITY: ZoomTransform = { scale: 1, x: 0, y: 0 };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
/** One press of the zoom buttons or the + / − keys. */
export const ZOOM_STEP = 1.5;
/** Where a double-click or a double-tap takes the photograph. */
export const DOUBLE_TAP_ZOOM = 2.5;

/** Anything this close to 1× counts as "not zoomed" — keeps floating-point noise out of the UI. */
export function isZoomed(transform: ZoomTransform): boolean {
  return transform.scale > MIN_ZOOM + 0.001;
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/**
 * Keeps the zoomed photograph covering the stage: it can be dragged until its edge reaches the edge
 * of the stage but no further, and along any axis where it is still smaller than the stage it stays
 * centred. At 1× this always returns the photograph to the centre.
 */
export function clampPan(transform: ZoomTransform, stage: Size, photo: Size): ZoomTransform {
  const maxX = Math.max(0, (photo.width * transform.scale - stage.width) / 2);
  const maxY = Math.max(0, (photo.height * transform.scale - stage.height) / 2);
  return {
    scale: transform.scale,
    x: clamp(transform.x, -maxX, maxX),
    y: clamp(transform.y, -maxY, maxY),
  };
}

/**
 * Zooms to `scale` while the point of the photograph under `focus` stays under it — the cursor for
 * the mouse wheel, the tapped point for a double-tap, the stage centre for the buttons.
 */
export function zoomAround(
  transform: ZoomTransform,
  scale: number,
  focus: Point,
  stage: Size,
  photo: Size,
): ZoomTransform {
  return pinchTransform(transform, focus, 1, focus, 1, stage, photo, scale);
}

/**
 * The transform during a two-finger pinch. `start` is the transform when the second finger landed,
 * `startMid`/`startDistance` the midpoint of and the distance between the fingers then, and
 * `mid`/`distance` the same measurements now. The photograph scales with the spread of the fingers
 * and the point that was under their midpoint follows the midpoint, so pinching and dragging with
 * two fingers work together.
 */
export function pinchTransform(
  start: ZoomTransform,
  startMid: Point,
  startDistance: number,
  mid: Point,
  distance: number,
  stage: Size,
  photo: Size,
  targetScale = start.scale * (distance / Math.max(startDistance, 1)),
): ZoomTransform {
  const scale = clampScale(targetScale);
  const ratio = scale / start.scale;
  return clampPan(
    {
      scale,
      x: mid.x - ratio * (startMid.x - start.x),
      y: mid.y - ratio * (startMid.y - start.y),
    },
    stage,
    photo,
  );
}

/** The minimal shape of a wheel event the viewer needs. */
export interface WheelLike {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

/**
 * How much one wheel event zooms the photograph (above 1 zooms in). A mouse wheel sends about 100px
 * per notch, which zooms by about a quarter; a laptop trackpad pinch arrives as a stream of small
 * wheel events with `ctrlKey` set, which get a finer, steadier response. Deltas reported in lines or
 * pages are converted to pixels first, and every event is capped so a fast wheel cannot leap.
 */
export function wheelZoomFactor(event: WheelLike): number {
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 33;
  else if (event.deltaMode === 2) delta *= 400;
  if (!Number.isFinite(delta) || delta === 0) return 1;

  const limit = event.ctrlKey ? 25 : 120;
  const sensitivity = event.ctrlKey ? 0.011 : 0.0022;
  return Math.exp(-clamp(delta, -limit, limit) * sensitivity);
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpointOf(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  // `+ 0` folds a negative zero into zero so a centred photograph reads as exactly (0, 0).
  return Math.min(max, Math.max(min, value)) + 0;
}
