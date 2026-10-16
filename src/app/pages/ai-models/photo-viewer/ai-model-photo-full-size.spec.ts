import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiModelPhoto } from '../ai-model-data';
import { AiModelPhotoFullScreen } from './ai-model-photo-full-size';

const photo: AiModelPhoto = {
  src: '/NeverBeenModels/TestStudioModel/frame-03.jpg',
  caption: 'Frame 3 caption',
};

@Component({
  imports: [AiModelPhotoFullScreen],
  template: `
    <app-ai-model-photo-full-size
      [photo]="current"
      modelName="Test Studio Model"
      modelHandle="@test.studio.model"
      frameLabel="03"
      frameTotal="12"
      (closed)="closed = closed + 1"
    />
  `,
})
class FullSizeHost {
  readonly current = photo;
  closed = 0;
}

/** jsdom has no layout: a phone in portrait, as the full-size view is designed for. */
const SCREEN = { left: 0, top: 0, width: 390, height: 844 };
/** A landscape photograph: it covers the screen top to bottom and overflows sideways. */
const NATURAL = { width: 1200, height: 800 };
/** `coverSize(NATURAL, SCREEN)` — painted at 105.5%, so 1266 × 844. */
const PAINTED = { width: 1266, height: 844 };
/** The furthest the photograph may travel sideways at 1×: half the overflow. */
const MAX_X = (PAINTED.width - SCREEN.width) / 2;
/** The centre of the screen. */
const CX = SCREEN.width / 2;
const CY = SCREEN.height / 2;

describe('AiModelPhotoFullScreen', () => {
  let fixture: ComponentFixture<FullSizeHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullSizeHost],
    }).compileComponents();
    fixture = TestBed.createComponent(FullSizeHost);
    element = fixture.nativeElement as HTMLElement;
    await settle();
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    layout();
  }

  /** Re-applies the fake layout (the photograph element is replaced only by the host's template). */
  function layout(): void {
    const stage = element.querySelector<HTMLElement>('.full-size-stage');
    if (stage) {
      stage.getBoundingClientRect = () =>
        ({
          ...SCREEN,
          x: SCREEN.left,
          y: SCREEN.top,
          right: SCREEN.left + SCREEN.width,
          bottom: SCREEN.top + SCREEN.height,
          toJSON: () => ({}),
        }) as DOMRect;
    }
    const image = element.querySelector<HTMLImageElement>('.full-size-image');
    if (image) {
      Object.defineProperty(image, 'naturalWidth', {
        configurable: true,
        value: NATURAL.width,
      });
      Object.defineProperty(image, 'naturalHeight', {
        configurable: true,
        value: NATURAL.height,
      });
    }
  }

  const image = () => element.querySelector<HTMLImageElement>('.full-size-image')!;
  const chrome = () => element.querySelector<HTMLElement>('.full-size-chrome')!;
  const readout = () =>
    element.querySelector('.fs-zoom-readout')?.textContent?.replace(/\s+/g, '').trim();

  /** The transform currently written to the photograph. */
  function transform(): { x: number; y: number; scale: number } {
    const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(
      image().style.transform,
    );
    return match
      ? { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) }
      : { x: 0, y: 0, scale: 1 };
  }

  function pointer(
    type: string,
    target: Element,
    id: number,
    x: number,
    y: number,
    pointerType = 'touch',
  ): void {
    target.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType,
        isPrimary: id === 1,
        clientX: x,
        clientY: y,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  function wheel(deltaY: number, x = CX, y = CY, ctrlKey = false): void {
    image().dispatchEvent(
      new WheelEvent('wheel', {
        deltaY,
        deltaMode: 0,
        clientX: x,
        clientY: y,
        ctrlKey,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  async function key(name: string): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    await settle();
  }

  async function tap(x: number, y: number): Promise<void> {
    pointer('pointerdown', image(), 1, x, y);
    pointer('pointerup', image(), 1, x, y);
    await settle();
  }

  it('paints the photograph to cover the entire screen on load', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();

    expect(image().style.width).toBe(`${PAINTED.width}px`);
    expect(image().style.height).toBe(`${PAINTED.height}px`);
    expect(transform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('shows who the photograph is and which frame of the album it is', () => {
    const title = element.querySelector('.fs-title')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(title).toContain('Test Studio Model');
    expect(title).toContain('@test.studio.model');
    expect(title).toContain('03');
    expect(title).toContain('12');
  });

  it('drags with one finger to the left and the right of the photograph, stopping at its edges', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();

    pointer('pointerdown', image(), 1, CX, CY);
    pointer('pointermove', image(), 1, CX - 120, CY);
    expect(transform()).toEqual({ x: -120, y: 0, scale: 1 });

    // Far past the right edge of the screen: the photograph stops exactly at its own edge,
    // so the screen never shows the void beside it.
    pointer('pointermove', image(), 1, CX - 3000, CY);
    pointer('pointerup', image(), 1, CX - 3000, CY);
    await settle();
    expect(transform()).toEqual({ x: -MAX_X, y: 0, scale: 1 });

    pointer('pointerdown', image(), 1, CX, CY);
    pointer('pointermove', image(), 1, CX + 3000, CY);
    pointer('pointerup', image(), 1, CX + 3000, CY);
    await settle();
    expect(transform()).toEqual({ x: MAX_X, y: 0, scale: 1 });
  });

  it('drags with the mouse exactly as with a finger', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();

    pointer('pointerdown', image(), 1, CX, CY, 'mouse');
    pointer('pointermove', image(), 1, CX - 240, CY, 'mouse');
    pointer('pointerup', image(), 1, CX - 240, CY, 'mouse');
    await settle();

    expect(transform()).toEqual({ x: -240, y: 0, scale: 1 });
  });

  it('zooms from the screen fit to 500% and no further, with wheel, keys and buttons', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();
    expect(readout()).toBe('100%');

    // A mouse wheel zooms around the cursor until the 500% ceiling stops it.
    for (let i = 0; i < 30; i += 1) wheel(-100);
    await settle();
    expect(readout()).toBe('500%');

    await key('0');
    expect(readout()).toBe('100%');

    await key('+');
    expect(readout()).toBe('150%');
    await key('-');
    expect(readout()).toBe('100%');

    element.querySelector<HTMLButtonElement>('.fs-zoom-button:last-child')!.click();
    await settle();
    expect(readout()).toBe('150%');
    element.querySelector<HTMLButtonElement>('.fs-zoom-readout')!.click();
    await settle();
    expect(readout()).toBe('100%');
  });

  it('pinch-zooms with two fingers around their midpoint', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();

    pointer('pointerdown', image(), 1, CX - 100, CY);
    pointer('pointerdown', image(), 2, CX + 100, CY);
    // The fingers spread from 200px to 400px apart: the photograph doubles.
    pointer('pointermove', image(), 2, CX + 300, CY);
    await settle();

    const zoomed = transform();
    expect(zoomed.scale).toBeCloseTo(2, 1);
    // The photograph keeps covering the screen while it zooms.
    expect(Math.abs(zoomed.x)).toBeLessThanOrEqual(
      (PAINTED.width * zoomed.scale - SCREEN.width) / 2 + 1,
    );
  });

  it('zooms to 250% where a finger double-taps and back out on the next double-tap', async () => {
    image().dispatchEvent(new Event('load'));
    await settle();

    await tap(CX + 60, CY);
    await tap(CX + 60, CY);
    expect(readout()).toBe('250%');

    await tap(CX, CY);
    await tap(CX, CY);
    expect(readout()).toBe('100%');
  });

  it('toggles between Original and B/W and back', async () => {
    const buttons = () => element.querySelectorAll<HTMLButtonElement>('.fs-mode-option');
    expect(buttons()[0].textContent?.trim()).toBe('Original');
    expect(buttons()[1].textContent?.trim()).toBe('B/W');
    expect(image().classList.contains('is-bw')).toBe(false);

    buttons()[1].click();
    await settle();
    expect(image().classList.contains('is-bw')).toBe(true);
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');

    buttons()[0].click();
    await settle();
    expect(image().classList.contains('is-bw')).toBe(false);

    await key('b');
    expect(image().classList.contains('is-bw')).toBe(true);
    await key('b');
    expect(image().classList.contains('is-bw')).toBe(false);
  });

  it('downloads the photograph and confirms it', async () => {
    const clicks: string[] = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(`${this.getAttribute('download')}@${this.getAttribute('href')}`);
    };
    try {
      const download = element.querySelector<HTMLButtonElement>('.fs-download')!;
      expect(download.textContent).toContain('Download');

      download.click();
      // The save finishes on the microtask queue; a macrotask turn lets it all land.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await settle();
      expect(clicks.join()).toContain('frame-03.jpg');
      expect(element.querySelector('.fs-toast')?.textContent).toContain('Saved to your device');
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it('goes back when the visitor closes the view with the close button', async () => {
    const host = fixture.componentInstance;
    expect(host.closed).toBe(0);

    element.querySelector<HTMLButtonElement>('.fs-close')!.click();
    await settle();
    expect(host.closed).toBe(1);
  });

  it('goes back when the visitor presses Escape', async () => {
    const host = fixture.componentInstance;
    await key('Escape');
    expect(host.closed).toBe(1);
  });

  it('explains how to explore the photograph until the visitor first moves it', async () => {
    expect(element.querySelector('.fs-hint')?.textContent).toContain('zoom');
    pointer('pointerdown', image(), 1, CX, CY);
    pointer('pointerup', image(), 1, CX, CY);
    await settle();
    expect(element.querySelector('.fs-hint')).toBeNull();
  });

  it('fades the controls away while the photograph is left alone, and brings them back', async () => {
    vi.useFakeTimers();
    try {
      // Re-arm the idle hide under the fake clock, then leave the photograph alone.
      pointer('pointerdown', image(), 1, CX, CY);
      pointer('pointerup', image(), 1, CX, CY);
      fixture.detectChanges();
      expect(chrome().classList.contains('is-idle')).toBe(false);

      vi.advanceTimersByTime(3400);
      fixture.detectChanges();
      expect(chrome().classList.contains('is-idle')).toBe(true);

      // The lightest touch brings the controls straight back.
      pointer('pointerdown', image(), 1, CX, CY);
      fixture.detectChanges();
      expect(chrome().classList.contains('is-idle')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
