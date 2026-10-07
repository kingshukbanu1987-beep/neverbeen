import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelPortfolioPage } from '../ai-model-portfolio';
import {
  ModelBookingService,
  formatInr,
  serviceTaxFor,
  validateBookingCoupon,
} from '../../../services/model-booking.service';

const testRoutes = [{ path: 'ai-models/:slug', component: AiModelPortfolioPage }];

const NOURHAN = aiModelProfiles.find((profile) => profile.slug === 'nourhan-durrani')!;

function tick(harness: RouterTestingHarness): void {
  harness.detectChanges();
}

async function openDialog(): Promise<{ harness: RouterTestingHarness; element: HTMLElement }> {
  const harness = await RouterTestingHarness.create('/ai-models/nourhan-durrani');
  tick(harness);
  const element = harness.routeNativeElement as HTMLElement;

  const rent = Array.from(
    element.querySelectorAll<HTMLButtonElement>('.profile-actions button'),
  ).find((button) => button.textContent?.includes('Rent Me'));
  expect(rent, 'Rent button').toBeTruthy();
  rent!.click();
  tick(harness);

  return { harness, element };
}

function dialog(element: HTMLElement): HTMLElement {
  const panel = element.querySelector<HTMLElement>('.booking-panel');
  expect(panel, 'booking dialog').toBeTruthy();
  return panel!;
}

function futureIsoDate(offsetDays: number): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return date.toISOString().slice(0, 10);
}

describe('Rent this model', () => {
  let opened: string[];

  beforeEach(async () => {
    opened = [];
    vi.spyOn(window, 'open').mockImplementation((url?: string | URL | null) => {
      opened.push(String(url));
      return null;
    });

    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [provideRouter(testRoutes)],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('shows a rate hint on the portfolio and opens the booking pop-up from the Rent button', async () => {
    const { element } = await openDialog();

    const panel = dialog(element);
    const backdrop = element.querySelector('.booking-backdrop');
    expect(backdrop?.getAttribute('role')).toBe('dialog');
    expect(backdrop?.getAttribute('aria-modal')).toBe('true');
    expect(panel.textContent).toContain('Book a shoot');
    expect(panel.textContent).toContain('Select a Delivery Date?');
    expect(panel.textContent).toContain('Rate per Photo');
    expect(panel.querySelector('.calendar')?.textContent).toBeTruthy();
    expect(panel.querySelectorAll('.rate-card').length).toBeGreaterThan(0);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('carries the model’s booking information alongside the calendar and the rates', async () => {
    const { element } = await openDialog();
    const panel = dialog(element);

    const facts = panel.querySelector('.booking-facts');
    expect(facts, 'booking facts').toBeTruthy();
    expect(panel.textContent).toContain('Booking information');
    expect(facts?.textContent).toContain(NOURHAN.availability);
    expect(facts?.textContent).toContain(NOURHAN.height);
    expect(facts?.textContent).toContain(NOURHAN.bodyShape);
    expect(facts?.textContent).toContain('Based in');

    const tags = Array.from(panel.querySelectorAll('.booking-tags li')).map((tag) =>
      tag.textContent?.trim(),
    );
    expect(tags).toEqual(NOURHAN.tags);
  });

  it('prices every photo package in INR at the model’s own per-photo rate', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);

    expect(panel.querySelector('.rate-per-photo')?.textContent).toContain(
      `₹${NOURHAN.photoRate.toLocaleString('en-IN')}`,
    );
    expect(formatInr(687.5)).toBe('₹687.50');

    const rateCards = Array.from(panel.querySelectorAll<HTMLButtonElement>('.rate-card'));
    expect(rateCards.length).toBe(5);

    const photos = [10, 25, 50, 100];
    for (const [index, count] of photos.entries()) {
      const amount = count * NOURHAN.photoRate;
      expect(rateCards[index].textContent).toContain(`${count} photographs`);
      expect(rateCards[index].textContent).toContain(`₹${amount.toLocaleString('en-IN')}`);
    }

    // The customized order is the last card and carries no price.
    const custom = rateCards[4];
    expect(custom.textContent).toContain('Customized order');
    expect(custom.textContent).toContain('On request');
    expect(custom.classList.contains('is-custom')).toBe(true);

    // The 25-photo editorial package is selected by default, with 5% service tax in the total.
    expect(rateCards[1].classList.contains('is-active')).toBe(true);
    const defaultSubtotal = 25 * NOURHAN.photoRate;
    const defaultTax = serviceTaxFor(defaultSubtotal);
    const priceSummary = panel.querySelector('.booking-pricing')?.textContent ?? '';
    expect(priceSummary).toContain('Subtotal · 25 photographs');
    expect(priceSummary).toContain(formatInr(defaultSubtotal));
    expect(priceSummary).toContain('Service tax (5%)');
    expect(priceSummary).toContain(formatInr(defaultTax));
    expect(priceSummary).toContain(formatInr(defaultSubtotal + defaultTax));

    // Choosing a larger package updates the subtotal and tax-inclusive final total.
    rateCards[2].click();
    tick(harness);
    expect(rateCards[2].classList.contains('is-active')).toBe(true);
    const largerSubtotal = 50 * NOURHAN.photoRate;
    expect(panel.querySelector('.booking-pricing')?.textContent).toContain(
      formatInr(largerSubtotal + serviceTaxFor(largerSubtotal)),
    );

    // The customized order asks for a quote and disables coupons until a priced package is selected.
    rateCards[4].click();
    tick(harness);
    expect(panel.querySelector('.booking-pricing')?.textContent).toContain('Selective charge');
    expect(panel.querySelector<HTMLInputElement>('#booking-coupon-code')?.disabled).toBe(true);
  });

  it('renders a delivery-date calendar that blocks past dates and records the choice', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);

    const days = Array.from(panel.querySelectorAll<HTMLButtonElement>('.calendar-day'));
    expect(days.length).toBeGreaterThan(27);
    expect(panel.querySelector('.calendar-month')?.textContent?.trim()).toBeTruthy();

    // Yesterday (when it exists in the current grid) cannot be chosen.
    const yesterday = futureIsoDate(-1);
    const past = panel.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${yesterday}"]`);
    if (past) expect(past.disabled).toBe(true);

    const target = futureIsoDate(3);
    const chosen = panel.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${target}"]`);
    expect(chosen, `calendar day ${target}`).toBeTruthy();
    chosen!.click();
    tick(harness);

    expect(chosen!.classList.contains('is-selected')).toBe(true);
    expect(chosen!.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('.calendar-selection')?.textContent).toContain(
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${target}T00:00:00Z`)),
    );
  });

  it('moves between months but never before the current one', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);

    const [back] = Array.from(panel.querySelectorAll<HTMLButtonElement>('.calendar-nav'));
    expect(back.disabled, 'previous month disabled in the current month').toBe(true);

    const forward = Array.from(panel.querySelectorAll<HTMLButtonElement>('.calendar-nav'))[1];
    const before = panel.querySelector('.calendar-month')?.textContent?.trim();
    forward.click();
    tick(harness);
    expect(panel.querySelector('.calendar-month')?.textContent?.trim()).not.toBe(before);

    back.click();
    tick(harness);
    expect(panel.querySelector('.calendar-month')?.textContent?.trim()).toBe(before);
  });

  it('opens a prefilled WhatsApp booking addressed to the founder', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);
    const target = futureIsoDate(5);

    panel.querySelectorAll<HTMLButtonElement>('.rate-card')[2].click();
    panel.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${target}"]`)!.click();
    tick(harness);

    const setInput = (controlName: string, value: string) => {
      const field = Array.from(
        panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
      ).find((input) => input.getAttribute('formcontrolname') === controlName);
      expect(field, `field ${controlName}`).toBeTruthy();
      field!.value = value;
      field!.dispatchEvent(new Event('input'));
    };

    setInput('name', 'Ada Lovelace');
    setInput('email', 'ada@studio.example');
    setInput('phone', '+60 12 345 6789');
    setInput('company', 'Studio X');
    setInput('location', 'Kuala Lumpur');
    setInput('usage', 'Digital, 12 months');
    setInput('notes', 'Morning light please.');
    const couponInput = panel.querySelector<HTMLInputElement>('#booking-coupon-code')!;
    couponInput.value = 'SPECIALREQUEST';
    couponInput.dispatchEvent(new Event('input'));
    panel.querySelector<HTMLButtonElement>('.coupon-validate')!.click();
    tick(harness);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    tick(harness);

    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.origin + url.pathname).toBe('https://wa.me/919051888116');

    const message = url.searchParams.get('text') ?? '';
    expect(message).toContain('New booking request — NeverBeen AI Models');
    expect(message).toContain('Nourhan Durrani (@nourhan.durrani)');
    expect(message).toContain('Portfolio: /ai-models/nourhan-durrani');
    expect(message).toContain('50 photographs — Campaign set');
    expect(message).toContain(`Rate: ${formatInr(NOURHAN.photoRate)} per photograph`);
    const subtotal = 50 * NOURHAN.photoRate;
    const discountedSubtotal = subtotal - 2000;
    const serviceTax = serviceTaxFor(discountedSubtotal);
    expect(message).toContain(`Subtotal before coupon: ${formatInr(subtotal)} INR`);
    expect(message).toContain('Coupon: SPECIALREQUEST');
    expect(message).toContain('Discount: -₹2,000 INR');
    expect(message).toContain(`Subtotal: ${formatInr(discountedSubtotal)} INR`);
    expect(message).toContain(`Service tax (5%): ${formatInr(serviceTax)} INR`);
    expect(message).toContain(`Final total: ${formatInr(discountedSubtotal + serviceTax)} INR`);
    expect(message).toContain(
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${target}T00:00:00Z`)),
    );
    expect(message).toContain('Ada Lovelace');
    expect(message).toContain('ada@studio.example');
    expect(message).toContain('+60 12 345 6789');
    expect(message).toContain('Company: Studio X');
    expect(message).toContain('Project: Editorial shoot');
    expect(message).toContain('Shoot location: Kuala Lumpur');
    expect(message).toContain('Usage / territory: Digital, 12 months');
    expect(message).toContain('Notes: Morning light please.');

    const done = element.querySelector('.booking-done');
    expect(done?.textContent).toContain('Your booking message is ready in WhatsApp');
    expect(done?.textContent).toContain('press Send in WhatsApp to submit it');
    expect(done?.textContent).toContain('+91 90518 88116');
    expect(done?.querySelector<HTMLAnchorElement>('a')?.href).toBe(opened[0]);
  });

  it('blocks an incomplete submission before opening WhatsApp', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    tick(harness);

    expect(opened).toEqual([]);
    expect(panel.querySelector('.booking-error')?.textContent).toContain('missing');
    expect(element.querySelector('.booking-done')).toBeNull();
  });

  it('loads the coupon codes from JSON and treats the expiry date as inclusive in IST', () => {
    expect(
      validateBookingCoupon(' newtoneverbeen ', new Date('2027-12-31T18:29:59.999Z')),
    ).toMatchObject({
      status: 'valid',
      coupon: { code: 'NEWTONEVERBEEN', discountInr: 1500, expiresOn: '2027-12-31' },
    });
    expect(
      validateBookingCoupon('NEWTONEVERBEEN', new Date('2027-12-31T18:30:00.000Z')).status,
    ).toBe('expired');
    expect(validateBookingCoupon('FIRST', new Date('2026-10-07T12:00:00.000Z')).status).toBe(
      'valid',
    );
    expect(validateBookingCoupon('NOT-A-COUPON').status).toBe('unavailable');
  });

  it('applies the fixed discount to the subtotal before tax and shows the success message', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);
    const couponInput = panel.querySelector<HTMLInputElement>('#booking-coupon-code')!;
    couponInput.value = ' first ';
    couponInput.dispatchEvent(new Event('input'));
    panel.querySelector<HTMLButtonElement>('.coupon-validate')!.click();
    tick(harness);

    expect(panel.querySelector('.coupon-message')?.textContent?.trim()).toBe(
      'Congratulations! Coupon Applied Successfully!',
    );
    expect(panel.querySelector('.coupon-message')?.classList.contains('is-success')).toBe(true);

    const subtotal = 25 * NOURHAN.photoRate;
    const discount = Math.min(500, subtotal);
    const discountedSubtotal = subtotal - discount;
    const tax = serviceTaxFor(discountedSubtotal);
    expect(panel.querySelector('.price-discount')?.textContent).toContain(
      `−${formatInr(discount)}`,
    );
    expect(panel.querySelector('.price-net-subtotal')?.textContent).toContain(
      formatInr(discountedSubtotal),
    );
    expect(panel.querySelector('.booking-pricing')?.textContent).toContain(
      formatInr(discountedSubtotal + tax),
    );

    couponInput.value = 'NOT-A-COUPON';
    couponInput.dispatchEvent(new Event('input'));
    panel.querySelector<HTMLButtonElement>('.coupon-validate')!.click();
    tick(harness);
    expect(panel.querySelector('.coupon-message')?.textContent?.trim()).toBe(
      'Coupon not available!',
    );
    expect(panel.querySelector('.price-discount')).toBeNull();
  });

  it('shows the requested expired-coupon message', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);
    const bookingService = TestBed.inject(ModelBookingService);
    vi.spyOn(bookingService, 'validateCoupon').mockReturnValue({
      status: 'expired',
      coupon: null,
    });

    const couponInput = panel.querySelector<HTMLInputElement>('#booking-coupon-code')!;
    couponInput.value = 'FIRST';
    couponInput.dispatchEvent(new Event('input'));
    panel.querySelector<HTMLButtonElement>('.coupon-validate')!.click();
    tick(harness);

    expect(panel.querySelector('.coupon-message')?.textContent?.trim()).toBe('Coupon Expired!');
    expect(panel.querySelector('.price-discount')).toBeNull();
  });

  it('offers a retry button and direct WhatsApp link if the new tab is blocked', async () => {
    const { harness, element } = await openDialog();
    const panel = dialog(element);

    panel
      .querySelector<HTMLButtonElement>(`.calendar-day[data-date="${futureIsoDate(2)}"]`)!
      .click();
    const setInput = (controlName: string, value: string) => {
      const field = Array.from(panel.querySelectorAll<HTMLInputElement>('input')).find(
        (input) => input.getAttribute('formcontrolname') === controlName,
      );
      expect(field, `field ${controlName}`).toBeTruthy();
      field!.value = value;
      field!.dispatchEvent(new Event('input'));
    };
    setInput('name', 'Ada Lovelace');
    setInput('email', 'ada@studio.example');
    setInput('phone', '+60 12 345 6789');
    tick(harness);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    tick(harness);

    const done = element.querySelector('.booking-done')!;
    const directLink = done.querySelector<HTMLAnchorElement>('a')!;
    expect(directLink.href).toBe(opened[0]);
    expect(done.querySelector('.booking-done-close')?.textContent).toContain('Done');

    done.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    expect(opened).toHaveLength(2);
    expect(opened[1]).toBe(opened[0]);

    done.querySelector<HTMLButtonElement>('.booking-done-close')!.click();
    tick(harness);
    expect(element.querySelector('.booking-panel')).toBeNull();
  });

  it('closes on Escape and restores body scrolling', async () => {
    const { harness, element } = await openDialog();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    tick(harness);
    expect(element.querySelector('.booking-panel')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps a model without published rates usable', async () => {
    const profile: AiModelProfile = { ...NOURHAN, slug: 'rate-test-model', photoRate: 0 };
    aiModelProfiles.push(profile);

    try {
      const harness = await RouterTestingHarness.create('/ai-models/rate-test-model');
      tick(harness);
      const element = harness.routeNativeElement as HTMLElement;

      expect(element.querySelector('.rate-hint')).toBeNull();
      Array.from(element.querySelectorAll<HTMLButtonElement>('.profile-actions button'))
        .find((button) => button.textContent?.includes('Rent Me'))!
        .click();
      tick(harness);

      const panel = dialog(element);
      expect(panel.querySelector('.rate-empty')?.textContent).toContain('being finalised');
    } finally {
      aiModelProfiles.splice(aiModelProfiles.indexOf(profile), 1);
    }
  });
});
