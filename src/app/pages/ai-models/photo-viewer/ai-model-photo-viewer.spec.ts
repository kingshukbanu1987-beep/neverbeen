import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModelMediaEngagementService } from '../../../services/model-media-engagement.service';
import { AiModelPhoto } from '../ai-model-data';
import { AiModelPhotoViewer } from './ai-model-photo-viewer';

const photos: AiModelPhoto[] = Array.from({ length: 5 }, (_, index) => ({
  src: `/NeverBeenModels/TestStudioModel/frame-${index + 1}.jpg`,
  caption: `Frame ${index + 1} caption`,
}));

@Component({
  imports: [AiModelPhotoViewer],
  template: `
    <app-ai-model-photo-viewer
      [photos]="photos"
      [startIndex]="0"
      modelName="Test Studio Model"
      modelHandle="@test.studio.model"
      modelSlug="test-studio-model"
      [albumLink]="albumLink()"
      [albumSize]="20"
      (closed)="closed = closed + 1"
    />
  `,
})
class ViewerHost {
  readonly photos = photos;
  readonly albumLink = signal<string[] | null>(null);
  closed = 0;
}

/** jsdom has no layout: give the stage and the photograph the sizes a laptop screen would. */
const STAGE = { left: 100, top: 50, width: 1000, height: 600 };
const PHOTO = { width: 800, height: 600 };
/** The centre of the stage, in client coordinates. */
const CX = STAGE.left + STAGE.width / 2;
const CY = STAGE.top + STAGE.height / 2;

describe('AiModelPhotoViewer', () => {
  let fixture: ComponentFixture<ViewerHost>;
  let element: HTMLElement;
  let mediaApi: {
    statsFor: ReturnType<typeof vi.fn>;
    recordView: ReturnType<typeof vi.fn>;
    fetchComments: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mediaApi = {
      statsFor: vi.fn(() => ({ seen: 0, likes: 0, comments: 0, shares: 0, likedByMe: false })),
      recordView: vi.fn().mockResolvedValue(undefined),
      fetchComments: vi.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ViewerHost],
      providers: [provideRouter([]), { provide: ModelMediaEngagementService, useValue: mediaApi }],
    }).compileComponents();
    fixture = TestBed.createComponent(ViewerHost);
    element = fixture.nativeElement as HTMLElement;
    await settle();
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    layout();
  }

  /** Re-applies the fake layout (the photograph element is replaced on every navigation). */
  function layout(): void {
    const stage = element.querySelector<HTMLElement>('.lightbox-stage');
    if (stage) {
      stage.getBoundingClientRect = () =>
        ({
          ...STAGE,
          x: STAGE.left,
          y: STAGE.top,
          right: STAGE.left + STAGE.width,
          bottom: STAGE.top + STAGE.height,
          toJSON: () => ({}),
        }) as DOMRect;
    }
    const image = element.querySelector<HTMLImageElement>('.lightbox-image');
    if (image) {
      Object.defineProperty(image, 'offsetWidth', { configurable: true, value: PHOTO.width });
      Object.defineProperty(image, 'offsetHeight', { configurable: true, value: PHOTO.height });
    }
  }

  const image = () => element.querySelector<HTMLImageElement>('.lightbox-image')!;
  const frame = () => element.querySelector<HTMLElement>('.viewer-frame')!;
  const counter = () =>
    element.querySelector('.lightbox-counter')?.textContent?.replace(/\s+/g, ' ').trim();
  const readout = () =>
    element.querySelector('.zoom-readout')?.textContent?.replace(/\s+/g, '').trim();

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
  ): PointerEvent {
    const event = new PointerEvent(type, {
      pointerId: id,
      pointerType,
      isPrimary: id === 1,
      clientX: x,
      clientY: y,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  }

  function wheel(deltaY: number, x = CX, y = CY, ctrlKey = false): WheelEvent {
    const event = new WheelEvent('wheel', {
      deltaY,
      deltaMode: 0,
      clientX: x,
      clientY: y,
      ctrlKey,
      bubbles: true,
      cancelable: true,
    });
    image().dispatchEvent(event);
    return event;
  }

  async function key(name: string): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    await settle();
  }

  async function tap(target: Element, x: number, y: number, pointerType = 'touch'): Promise<void> {
    pointer('pointerdown', target, 1, x, y, pointerType);
    pointer('pointerup', target, 1, x, y, pointerType);
    await settle();
  }

  it('opens the public comments thread directly below the photograph', async () => {
    const comments = element.querySelector<HTMLElement>('.viewer-comments');

    expect(comments).not.toBeNull();
    expect(comments?.previousElementSibling?.classList.contains('lightbox-stage')).toBe(true);
    expect(comments?.nextElementSibling?.classList.contains('lightbox-foot')).toBe(true);
    expect(mediaApi.fetchComments).toHaveBeenCalledWith(
      'test-studio-model',
      'photo',
      photos[0].src,
      1,
      50,
    );
  });

  it('zooms with the mouse wheel around the cursor and never changes photograph', async () => {
    expect(counter()).toBe('01 / 05');
    expect(readout()).toBe('100%');

    const event = wheel(-100, CX + 200, CY - 100);
    await settle();

    expect(event.defaultPrevented).toBe(true);
    const zoomed = transform();
    expect(zoomed.scale).toBeCloseTo(1.246, 2);
    expect(readout()).toBe('125%');
    // The detail under the cursor (100px above the centre) stays under it. Across, the photograph
    // is still narrower than the stage at 125%, so it stays centred that way.
    expect(zoomed.y + zoomed.scale * -100).toBeCloseTo(-100, 0);
    expect(zoomed.x).toBe(0);
    expect(counter()).toBe('01 / 05');

    for (let turn = 0; turn < 20; turn += 1) wheel(-100);
    await settle();
    expect(transform().scale).toBe(5);
    expect(readout()).toBe('500%');
    expect(counter()).toBe('01 / 05');

    for (let turn = 0; turn < 30; turn += 1) wheel(100);
    await settle();
    expect(transform()).toEqual({ x: 0, y: 0, scale: 1 });
    expect(readout()).toBe('100%');
    expect(counter()).toBe('01 / 05');
  });

  it('zooms with a laptop trackpad pinch (ctrl + wheel) and with Safari gesture events', async () => {
    for (let step = 0; step < 6; step += 1) wheel(-8, CX, CY, true);
    await settle();
    expect(transform().scale).toBeGreaterThan(1.5);
    expect(counter()).toBe('01 / 05');

    await key('0');
    const stage = element.querySelector('.lightbox-stage')!;
    const gesture = (type: string, scale: number) => {
      const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
        scale,
        clientX: CX,
        clientY: CY,
      });
      stage.dispatchEvent(event);
      return event;
    };
    gesture('gesturestart', 1);
    const change = gesture('gesturechange', 2);
    gesture('gestureend', 2);
    await settle();

    expect(change.defaultPrevented).toBe(true);
    expect(transform().scale).toBeCloseTo(2);
    expect(readout()).toBe('200%');
  });

  it('pinch-zooms with two fingers without moving to another photograph, however the fingers travel', async () => {
    pointer('pointerdown', image(), 1, CX - 100, CY);
    pointer('pointerdown', image(), 2, CX + 100, CY);
    // Spread the fingers to twice their distance: 2×.
    pointer('pointermove', image(), 2, CX + 300, CY);
    expect(transform().scale).toBeCloseTo(2);

    // Sweep both fingers far to the left, as a careless pinch does — it drags, it never swipes.
    pointer('pointermove', image(), 1, CX - 400, CY);
    pointer('pointermove', image(), 2, CX, CY);
    pointer('pointerup', image(), 1, CX - 400, CY);
    pointer('pointerup', image(), 2, CX, CY);
    await settle();

    expect(counter()).toBe('01 / 05');
    expect(transform().scale).toBeCloseTo(2);
    expect(readout()).toBe('200%');
  });

  it('never swipes after a pinch, even when the last finger slides away at 1×', async () => {
    pointer('pointerdown', image(), 1, CX - 150, CY);
    pointer('pointerdown', image(), 2, CX + 150, CY);
    // Pinch in: the photograph stays at 1× (it cannot shrink below the fitted size).
    pointer('pointermove', image(), 2, CX - 100, CY);
    pointer('pointerup', image(), 2, CX - 100, CY);
    // The remaining finger sweeps a full swipe's distance before lifting.
    pointer('pointermove', image(), 1, CX - 450, CY);
    pointer('pointerup', image(), 1, CX - 450, CY);
    await settle();

    expect(counter()).toBe('01 / 05');
    expect(transform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('swipes to the next and the previous photograph with one finger at 1×', async () => {
    pointer('pointerdown', image(), 1, CX + 150, CY);
    pointer('pointermove', image(), 1, CX - 20, CY + 6);
    pointer('pointerup', image(), 1, CX - 20, CY + 6);
    await settle();
    expect(counter()).toBe('02 / 05');

    pointer('pointerdown', image(), 1, CX - 150, CY);
    pointer('pointermove', image(), 1, CX + 20, CY);
    pointer('pointerup', image(), 1, CX + 20, CY);
    await settle();
    expect(counter()).toBe('01 / 05');

    // A short nudge or a mostly vertical drag is not a swipe.
    pointer('pointerdown', image(), 1, CX, CY);
    pointer('pointerup', image(), 1, CX - 20, CY);
    pointer('pointerdown', image(), 1, CX, CY - 150);
    pointer('pointerup', image(), 1, CX - 70, CY + 150);
    await settle();
    expect(counter()).toBe('01 / 05');
  });

  it('pans a zoomed photograph with one finger, stopping at its edges, instead of changing photograph', async () => {
    element.querySelector<HTMLButtonElement>('.zoom-in')!.click();
    element.querySelector<HTMLButtonElement>('.zoom-in')!.click();
    await settle();
    expect(transform().scale).toBeCloseTo(2.25);

    pointer('pointerdown', image(), 1, CX, CY);
    pointer('pointermove', image(), 1, CX - 300, CY - 50);
    expect(transform()).toEqual({ x: -300, y: -50, scale: 2.25 });

    // Far past the edge: 800 × 2.25 = 1800px wide in a 1000px stage leaves 400px each way.
    pointer('pointermove', image(), 1, CX - 1200, CY);
    pointer('pointerup', image(), 1, CX - 1200, CY);
    await settle();

    expect(transform().x).toBe(-400);
    expect(transform().y).toBe(0);
    expect(counter()).toBe('01 / 05');
  });

  it('does not swipe with the mouse — dragging a photograph at 1× keeps it in place', async () => {
    pointer('pointerdown', image(), 1, CX + 200, CY, 'mouse');
    pointer('pointermove', image(), 1, CX - 200, CY, 'mouse');
    pointer('pointerup', image(), 1, CX - 200, CY, 'mouse');
    await settle();

    expect(counter()).toBe('01 / 05');
    expect(transform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('zooms in where a finger double-taps and back out on the next double-tap', async () => {
    await tap(image(), CX + 120, CY - 60);
    await tap(image(), CX + 120, CY - 60);
    expect(readout()).toBe('250%');
    const zoomed = transform();
    expect(zoomed.x + zoomed.scale * 120).toBeCloseTo(120, 0);
    expect(counter()).toBe('01 / 05');

    await tap(image(), CX, CY);
    await tap(image(), CX, CY);
    expect(readout()).toBe('100%');
    expect(transform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('toggles zoom with a mouse double-click', async () => {
    await tap(image(), CX, CY, 'mouse');
    image().dispatchEvent(
      new MouseEvent('dblclick', { clientX: CX, clientY: CY, bubbles: true, cancelable: true }),
    );
    await settle();
    expect(readout()).toBe('250%');

    image().dispatchEvent(
      new MouseEvent('dblclick', { clientX: CX, clientY: CY, bubbles: true, cancelable: true }),
    );
    await settle();
    expect(readout()).toBe('100%');
  });

  it('zooms from the keyboard; the arrows explore a zoomed photograph and browse at 1×', async () => {
    await key('+');
    expect(readout()).toBe('150%');

    await key('ArrowRight');
    expect(counter()).toBe('01 / 05');
    expect(transform().x).toBeLessThan(0);

    await key('-');
    expect(readout()).toBe('100%');
    await key('=');
    await key('0');
    expect(readout()).toBe('100%');

    await key('ArrowRight');
    expect(counter()).toBe('02 / 05');
    await key('ArrowLeft');
    await key('ArrowLeft');
    expect(counter()).toBe('05 / 05');
  });

  it('starts every photograph at 1×, whichever way the visitor moves on', async () => {
    await key('+');
    expect(readout()).toBe('150%');

    element.querySelector<HTMLButtonElement>('.lightbox-next')!.click();
    await settle();
    expect(counter()).toBe('02 / 05');
    expect(readout()).toBe('100%');
    expect(image().style.transform).toBe('');

    await key('+');
    element.querySelectorAll<HTMLButtonElement>('.lightbox-thumb')[3].click();
    await settle();
    expect(counter()).toBe('04 / 05');
    expect(readout()).toBe('100%');
    expect(element.querySelector('.zoom-readout')?.hasAttribute('disabled')).toBe(true);
  });

  it('closes on a tap of the dark space around a photograph at 1×, but not while zoomed in', async () => {
    const host = fixture.componentInstance;

    await key('+');
    await tap(frame(), STAGE.left + 20, STAGE.top + 20, 'mouse');
    expect(host.closed).toBe(0);

    await key('0');
    await tap(image(), CX, CY, 'mouse');
    expect(host.closed).toBe(0);

    await tap(frame(), STAGE.left + 20, STAGE.top + 20, 'mouse');
    expect(host.closed).toBe(1);
  });

  it('offers the complete album when it holds more than the viewer shows', async () => {
    expect(element.querySelector('.viewer-album-link')).toBeNull();

    fixture.componentInstance.albumLink.set(['/ai-models', 'test-studio-model', 'photos']);
    await settle();

    const link = element.querySelector<HTMLAnchorElement>('.viewer-album-link')!;
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^View all 20\s?↗$/);
    expect(link.getAttribute('href')).toBe('/ai-models/test-studio-model/photos');
  });
});
