import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ModelLiveChatCounts, ModelLiveChatService } from '../../services/model-live-chat.service';
import { ModelLiveChatPill } from './model-live-chat-pill';

const SLUG = 'alisha-bhattacharya';
const NAME = 'Alisha Bhattacharya';

/** The pill on its own, with the counts the test hands it instead of a poll of the API. */
@Component({
  imports: [ModelLiveChatPill],
  template: `<app-model-live-chat-pill [slug]="slug" [name]="name" />`,
})
class PillHost {
  readonly slug = SLUG;
  readonly name = NAME;
}

describe('ModelLiveChatPill', () => {
  const counts = signal<Record<string, ModelLiveChatCounts>>({});

  beforeEach(async () => {
    counts.set({});
    await TestBed.configureTestingModule({
      imports: [PillHost],
      providers: [
        {
          provide: ModelLiveChatService,
          useValue: { countsFor: (modelSlug: string) => counts()[modelSlug] ?? null },
        },
      ],
    }).compileComponents();
  });

  /** Renders the pill with one pair of counts and hands back the element it drew. */
  function render(liveNow: number, pastChats: number): HTMLElement {
    counts.set({ [SLUG]: { liveNow, pastChats } });
    const fixture = TestBed.createComponent(PillHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.card-live-pill')!;
  }

  const valueIn = (pill: HTMLElement, segment: string): string =>
    pill
      .querySelector(`.card-live-pill-seg.${segment} .card-live-pill-value`)
      ?.textContent?.trim() ?? '';

  it('writes a count that needs no shortening as it stands', () => {
    const pill = render(3, 12);
    expect(valueIn(pill, 'is-now')).toBe('3');
    expect(valueIn(pill, 'is-past')).toBe('12');
    expect(pill.classList.contains('is-live')).toBe(true);
  });

  it('shortens long counts to K, M, B and T — one decimal, no full figure', () => {
    const thousands = render(1400, 12_400);
    expect(valueIn(thousands, 'is-now')).toBe('1.4K');
    expect(valueIn(thousands, 'is-past')).toBe('12.4K');

    const millions = render(1_700_000, 10_780_000);
    expect(valueIn(millions, 'is-now')).toBe('1.7M');
    expect(valueIn(millions, 'is-past')).toBe('10.78M');

    const billions = render(1_400_000_000, 2_500_000_000);
    expect(valueIn(billions, 'is-now')).toBe('1.4B');
    expect(valueIn(billions, 'is-past')).toBe('2.5B');

    const trillions = render(1_900_000_000_000, 1_470_000_000_000);
    expect(valueIn(trillions, 'is-now')).toBe('1.9T');
    expect(valueIn(trillions, 'is-past')).toBe('1.47T');
  });

  it('keeps the exact figures in the words read out and in the tool-tips', () => {
    const pill = render(1400, 1_900_000_000_000);
    expect(pill.getAttribute('aria-label')).toBe(
      `1,400 live now and 1,900,000,000,000 past chats with ${NAME}`,
    );
    expect(pill.querySelector('.card-live-pill-seg.is-now')?.getAttribute('title')).toBe(
      '1,400 chats live right now',
    );
    expect(pill.querySelector('.card-live-pill-seg.is-past')?.getAttribute('title')).toBe(
      '1,900,000,000,000 past chats in all',
    );
  });

  it('shows the quiet default — a grey dot and two zeroes — while nothing is known', () => {
    const fixture = TestBed.createComponent(PillHost);
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.card-live-pill',
    )!;
    expect(pill.classList.contains('is-live')).toBe(false);
    expect(valueIn(pill, 'is-now')).toBe('0');
    expect(valueIn(pill, 'is-past')).toBe('0');
  });
});
