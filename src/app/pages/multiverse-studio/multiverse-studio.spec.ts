import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { promotionSlides } from '../../home/multiverse/promotion-slides';
import { MultiverseStudioPage } from './multiverse-studio';

@Component({ template: '<p class="home-stub">Home</p>' })
class HomeStub {}

describe('MultiverseStudioPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: HomeStub },
          { path: 'multiverse-studio', component: MultiverseStudioPage },
        ]),
      ],
    }).compileComponents();
  });

  async function openPage(): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create('/multiverse-studio');
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  it('routes /multiverse-studio to MultiverseStudioPage', async () => {
    const studioRoute = routes.find((route) => route.path === 'multiverse-studio');
    expect(studioRoute).toBeDefined();

    const loaded = await (studioRoute!.loadComponent as () => Promise<unknown>)();
    expect(loaded).toBe(MultiverseStudioPage);
  });

  it('renders every photograph from the Promotion folder in the View All bento mosaic with no Seen, Likes, Share or Comments options', async () => {
    const harness = await openPage();
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('h1.album-title')?.textContent?.trim()).toBe(
      'The NeverBeen Multiverse Studio',
    );

    // No Seen, Likes, Comments or Shares summary or tile engagement bars anywhere on the page.
    expect(element.querySelector('.album-count')).toBeNull();
    expect(element.querySelector('app-model-media-engagement')).toBeNull();
    expect(element.querySelector('app-model-media-comments-dialog')).toBeNull();
    expect(element.querySelector('.tile-engagement')).toBeNull();

    const tiles = Array.from(element.querySelectorAll<HTMLButtonElement>('button.mosaic-tile'));
    expect(tiles.length).toBe(promotionSlides.length);
    expect(tiles.length).toBeGreaterThan(0);

    const sources = tiles.map((tile) => tile.querySelector('img')?.getAttribute('src'));
    expect(sources).toEqual(promotionSlides.map((slide) => slide.src));
    expect(sources.every((src) => src?.startsWith('/promotion/'))).toBe(true);

    // Varied tile sizes in the View All responsive bento mosaic (--c2/--r2 … --c4/--r4).
    const cells = Array.from(element.querySelectorAll<HTMLElement>('.mosaic-cell'));
    expect(cells.length).toBe(promotionSlides.length);
    const desktopSpans = new Set(
      cells.map(
        (cell) =>
          `${cell.style.getPropertyValue('--c4').split('span')[1]}x${
            cell.style.getPropertyValue('--r4').split('span')[1]
          }`,
      ),
    );
    expect(desktopSpans.size).toBeGreaterThanOrEqual(3);
    expect(cells[0].style.getPropertyValue('--c4')).toBe('1 / span 3');
  });

  it('opens a tapped photograph full screen with no Seen/Likes/Share/Comments, and zooms in and out using options or finger taps', async () => {
    const harness = await openPage();
    const element = harness.routeNativeElement as HTMLElement;

    const tile = element.querySelectorAll<HTMLButtonElement>('button.mosaic-tile')[2];
    tile.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();

    const viewer = element.querySelector<HTMLElement>('.lightbox');
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
      promotionSlides[2].src,
    );

    // No Seen, Likes, Share or Comments inside the opened viewer either.
    expect(element.querySelector('.lightbox-engage')).toBeNull();
    expect(element.querySelector('.viewer-comments')).toBeNull();
    expect(element.querySelector('app-model-media-engagement')).toBeNull();
    expect(element.querySelector('app-model-media-comments')).toBeNull();

    // Give stage & image layout bounds in jsdom so zoom controls and finger taps can be exercised.
    const stage = element.querySelector<HTMLElement>('.lightbox-stage')!;
    stage.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        right: 1000,
        bottom: 600,
        toJSON: () => ({}),
      }) as DOMRect;
    const image = element.querySelector<HTMLImageElement>('.lightbox-image')!;
    Object.defineProperty(image, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(image, 'offsetHeight', { configurable: true, value: 600 });

    const readout = () => element.querySelector('.zoom-readout .num')?.textContent?.trim();
    const zoomInBtn = element.querySelector<HTMLButtonElement>('button.zoom-in')!;
    const zoomOutBtn = element.querySelector<HTMLButtonElement>('button.zoom-out')!;

    expect(readout()).toBe('100');

    // Zoom in and out using the zoom options (+ / -).
    zoomInBtn.click();
    harness.detectChanges();
    expect(readout()).toBe('150');

    zoomOutBtn.click();
    harness.detectChanges();
    expect(readout()).toBe('100');

    // Zoom in and out by tapping with fingers (touch double-tap).
    const pointer = (type: string, timeStamp: number): PointerEvent => {
      const event = new Event(type, { bubbles: true }) as PointerEvent;
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: 'touch' },
        clientX: { value: 500 },
        clientY: { value: 300 },
        button: { value: 0 },
        timeStamp: { value: timeStamp },
      });
      return event;
    };
    const tapFinger = (timeStamp: number) => {
      image.dispatchEvent(pointer('pointerdown', timeStamp));
      stage.dispatchEvent(pointer('pointerup', timeStamp + 20));
    };

    tapFinger(100);
    tapFinger(220);
    harness.detectChanges();
    expect(readout()).toBe('250');

    tapFinger(700);
    tapFinger(820);
    harness.detectChanges();
    expect(readout()).toBe('100');
  });
});
