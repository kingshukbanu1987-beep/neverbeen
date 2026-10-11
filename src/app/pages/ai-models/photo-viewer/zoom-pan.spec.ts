import {
  IDENTITY,
  MAX_ZOOM,
  MIN_ZOOM,
  clampPan,
  clampScale,
  isZoomed,
  pinchTransform,
  wheelZoomFactor,
  zoomAround,
} from './zoom-pan';

/** A landscape photograph fitted into a wide stage, as in the viewer on a laptop. */
const stage = { width: 1000, height: 600 };
const photo = { width: 800, height: 600 };

/** Where a point of the photograph (measured from its centre) appears on screen. */
function screenPoint(
  transform: { scale: number; x: number; y: number },
  point: { x: number; y: number },
) {
  return { x: transform.x + transform.scale * point.x, y: transform.y + transform.scale * point.y };
}

describe('zoom-pan', () => {
  it('keeps the zoom between 1× and 5×', () => {
    expect(clampScale(0.4)).toBe(MIN_ZOOM);
    expect(clampScale(3)).toBe(3);
    expect(clampScale(12)).toBe(MAX_ZOOM);
    expect(clampScale(Number.NaN)).toBe(MIN_ZOOM);
    expect(isZoomed(IDENTITY)).toBe(false);
    expect(isZoomed({ scale: 1.2, x: 0, y: 0 })).toBe(true);
  });

  it('keeps the photograph centred at 1× and stops a zoomed photograph at its edges', () => {
    expect(clampPan({ scale: 1, x: 140, y: -60 }, stage, photo)).toEqual(IDENTITY);

    // At 2× the photograph is 1600×1200 in a 1000×600 stage: 300px of slack each way across, and
    // 300px each way down.
    expect(clampPan({ scale: 2, x: 900, y: -900 }, stage, photo)).toEqual({
      scale: 2,
      x: 300,
      y: -300,
    });
    expect(clampPan({ scale: 2, x: -120, y: 80 }, stage, photo)).toEqual({
      scale: 2,
      x: -120,
      y: 80,
    });

    // At 1.2× it is 960 wide — still narrower than the stage, so it stays centred across.
    expect(clampPan({ scale: 1.2, x: 50, y: 50 }, stage, photo)).toEqual({
      scale: 1.2,
      x: 0,
      y: 50,
    });
  });

  it('zooms around the focus point, so the detail under the cursor stays under it', () => {
    const focus = { x: 120, y: -80 };
    const zoomed = zoomAround(IDENTITY, 2.5, focus, stage, photo);

    expect(zoomed.scale).toBe(2.5);
    // The photograph point that was under the cursor (120, -80) is still there.
    const after = screenPoint(zoomed, focus);
    expect(after.x).toBeCloseTo(focus.x);
    expect(after.y).toBeCloseTo(focus.y);

    // Zooming back to 1× returns the photograph to rest.
    expect(zoomAround(zoomed, 1, focus, stage, photo)).toEqual(IDENTITY);
  });

  it('pinches around the fingers and lets the fingers drag the photograph at the same time', () => {
    const startMid = { x: -100, y: 40 };
    const pinched = pinchTransform(IDENTITY, startMid, 100, startMid, 300, stage, photo);
    expect(pinched.scale).toBe(3);
    const anchored = screenPoint(pinched, startMid);
    expect(anchored.x).toBeCloseTo(startMid.x);
    expect(anchored.y).toBeCloseTo(startMid.y);

    // Moving both fingers 50px right while keeping their spread drags the photograph with them.
    const dragged = pinchTransform(pinched, startMid, 300, { x: -50, y: 40 }, 300, stage, photo);
    expect(dragged.scale).toBe(3);
    expect(dragged.x - pinched.x).toBeCloseTo(50);

    // Spreading the fingers past the limit stops at 5×; pinching in stops at 1×.
    expect(pinchTransform(IDENTITY, startMid, 50, startMid, 900, stage, photo).scale).toBe(
      MAX_ZOOM,
    );
    expect(pinchTransform(pinched, startMid, 300, startMid, 10, stage, photo)).toEqual(IDENTITY);
  });

  it('turns wheel events into steady zoom steps', () => {
    const notchIn = wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false });
    const notchOut = wheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false });
    expect(notchIn).toBeGreaterThan(1.2);
    expect(notchIn).toBeLessThan(1.3);
    expect(notchIn * notchOut).toBeCloseTo(1);

    // A fast wheel is capped, line-based deltas are converted, and sideways scrolls do not zoom.
    expect(wheelZoomFactor({ deltaY: -2000, deltaMode: 0, ctrlKey: false })).toBeLessThan(1.31);
    expect(wheelZoomFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false })).toBeGreaterThan(1.2);
    expect(wheelZoomFactor({ deltaY: 0, deltaMode: 0, ctrlKey: false })).toBe(1);

    // Trackpad pinches (ctrl + wheel) arrive as small deltas and still zoom noticeably.
    const pinchStep = wheelZoomFactor({ deltaY: -8, deltaMode: 0, ctrlKey: true });
    expect(pinchStep).toBeGreaterThan(1.05);
    expect(pinchStep).toBeLessThan(1.2);
  });
});
