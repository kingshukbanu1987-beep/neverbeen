import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompactCount } from './compact-count';
import { compactCount, exactCount } from './count-format';
import { ExactCountPopover } from './exact-count-popover';

@Component({
  imports: [CompactCount, ExactCountPopover],
  template: `
    <app-compact-count [value]="value()" label="Seen" [subject]="subject()" />
    <p class="elsewhere">Somewhere else on the page</p>
    <app-exact-count-popover />
  `,
})
class PopoverHost {
  readonly value = signal(21400);
  readonly subject = signal('Fiadh Dara');
}

describe('count formatting', () => {
  it('writes counts under a thousand exactly as they are', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(7)).toBe('7');
    expect(compactCount(999)).toBe('999');
  });

  it('compacts every count the way the counters are read', () => {
    expect(compactCount(1004)).toBe('1K');
    expect(compactCount(1400)).toBe('1.4K');
    expect(compactCount(21400)).toBe('21.4K');
    expect(compactCount(1_078_000)).toBe('1.08M');
    expect(compactCount(10_780_000)).toBe('10.78M');
    expect(compactCount(1_700_000_000)).toBe('1.7B');
    expect(compactCount(1_470_000_000_000)).toBe('1.47T');
    expect(compactCount(1_000)).toBe('1K');
    expect(compactCount(1_000_000)).toBe('1M');
  });

  it('steps up a unit when rounding carries the count over', () => {
    expect(compactCount(999_999)).toBe('1M');
    expect(compactCount(999_999_999)).toBe('1B');
    expect(compactCount(999_999_999_999)).toBe('1T');
  });

  it('keeps the exact figure, grouped for reading', () => {
    expect(exactCount(21400)).toBe('21,400');
    expect(exactCount(1004)).toBe('1,004');
    expect(exactCount(1_470_000_000_000)).toBe('1,470,000,000,000');
  });
});

describe('ExactCountPopover', () => {
  let fixture: ComponentFixture<PopoverHost>;
  let element: HTMLElement;

  const counter = (): HTMLButtonElement => element.querySelector('button.compact-count')!;
  const card = (): HTMLElement | null => element.querySelector('.ecp-card');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PopoverHost] }).compileComponents();
    fixture = TestBed.createComponent(PopoverHost);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the counter compactly and opens its exact figure on a click', () => {
    expect(counter().textContent?.trim()).toBe('21.4K');
    expect(card()).toBeNull();
    expect(counter().getAttribute('aria-expanded')).toBe('false');

    counter().click();
    fixture.detectChanges();

    // The pop-up shows the exact number only, and describes itself to assistive tech.
    expect(card()?.textContent?.trim()).toBe('21,400');
    expect(card()?.getAttribute('role')).toBe('tooltip');
    expect(card()?.getAttribute('aria-label')).toBe('Seen for Fiadh Dara: 21,400');
    expect(counter().getAttribute('aria-expanded')).toBe('true');
    expect(counter().getAttribute('aria-label')).toContain('21,400');
  });

  it('closes again when the same number is clicked twice', () => {
    counter().click();
    fixture.detectChanges();
    expect(card()).not.toBeNull();

    counter().click();
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('re-writes both readouts as the count grows', () => {
    fixture.componentInstance.value.set(1_470_000_000_000);
    fixture.detectChanges();
    expect(counter().textContent?.trim()).toBe('1.47T');

    counter().click();
    fixture.detectChanges();
    expect(card()?.textContent?.trim()).toBe('1,470,000,000,000');
  });

  it('closes itself five seconds after it opens', () => {
    vi.useFakeTimers();
    counter().click();
    fixture.detectChanges();
    expect(card()).not.toBeNull();

    vi.advanceTimersByTime(4999);
    fixture.detectChanges();
    expect(card(), 'still open after 4.999s').not.toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(card(), 'closed after 5s').toBeNull();
  });

  it('closes when the visitor clicks anywhere else on the page', () => {
    counter().click();
    fixture.detectChanges();
    expect(card()).not.toBeNull();

    element
      .querySelector('.elsewhere')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('stays open when the visitor clicks inside the pop-up itself', () => {
    counter().click();
    fixture.detectChanges();

    card()!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(card()).not.toBeNull();

    // …but a click on the number it belongs to still closes it.
    counter().click();
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('closes on Escape', () => {
    counter().click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(card()).toBeNull();
  });

  it('anchors the pop-up to the number, opening under it near the top of the window', () => {
    const anchor = element.querySelector('app-compact-count')!;
    const rect = (top: number): DOMRect =>
      ({ left: 100, right: 160, top, bottom: top + 28, width: 60, height: 28 }) as DOMRect;

    anchor.getBoundingClientRect = () => rect(240);
    counter().click();
    fixture.detectChanges();

    // Centred on the number, sitting just above it.
    expect(card()?.style.left).toBe('130px');
    expect(card()?.style.top).toBe('228px');
    expect(card()?.classList.contains('is-below')).toBe(false);

    counter().click();
    fixture.detectChanges();
    expect(card()).toBeNull();

    // No room above the number this time: the card opens below it instead.
    anchor.getBoundingClientRect = () => rect(4);
    counter().click();
    fixture.detectChanges();

    expect(card()?.style.top).toBe('44px');
    expect(card()?.classList.contains('is-below')).toBe(true);
  });
});
