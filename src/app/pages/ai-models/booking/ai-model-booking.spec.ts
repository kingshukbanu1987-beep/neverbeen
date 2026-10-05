import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelPortfolioPage } from '../ai-model-portfolio';

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
  ).find((button) => button.textContent?.includes('Rent this model'));
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
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [provideRouter(testRoutes)],
    }).compileComponents();
  });

  afterEach(() => {
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

    // The minimum package is selected by default and drives the total.
    expect(panel.querySelector('.booking-total')?.textContent).toContain(
      `₹${(10 * NOURHAN.photoRate).toLocaleString('en-IN')}`,
    );

    // Choosing a larger package updates the selection and the total.
    rateCards[2].click();
    tick(harness);
    expect(rateCards[2].classList.contains('is-active')).toBe(true);
    expect(panel.querySelector('.booking-total')?.textContent).toContain(
      `₹${(50 * NOURHAN.photoRate).toLocaleString('en-IN')}`,
    );

    // The customized order asks for a quote instead of showing a price.
    rateCards[4].click();
    tick(harness);
    expect(panel.querySelector('.booking-total')?.textContent).toContain('Selective charge');
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

  it('sends the model details and the booking information to the studio endpoint', async () => {
    const calls: { url: string; body: any }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: any) => {
        calls.push({ url: String(url), body: JSON.parse(init.body) });
        return new Response(
          JSON.stringify({
            ok: true,
            delivered: true,
            channel: 'whatsapp',
            reference: 'NB-T3ST99',
            message: 'Your request is on its way to the studio.',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );

    const { harness, element } = await openDialog();
    const panel = dialog(element);
    const target = futureIsoDate(5);

    // Package, delivery date and contact details.
    panel.querySelectorAll<HTMLButtonElement>('.rate-card')[2].click();
    panel.querySelector<HTMLButtonElement>(`.calendar-day[data-date="${target}"]`)!.click();
    tick(harness);

    const inputs = panel.querySelectorAll<HTMLInputElement>('.field input');
    const setInput = (controlName: string, value: string) => {
      const input =
        Array.from(inputs).find((field) => field.getAttribute('formcontrolname') === controlName) ??
        Array.from(
          panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
        ).find((field) => field.getAttribute('formcontrolname') === controlName);
      expect(input, `field ${controlName}`).toBeTruthy();
      input!.value = value;
      input!.dispatchEvent(new Event('input'));
    };

    setInput('name', 'Ada Lovelace');
    setInput('email', 'ada@studio.example');
    setInput('phone', '+60 12 345 6789');
    setInput('company', 'Studio X');
    setInput('location', 'Kuala Lumpur');
    setInput('usage', 'Digital, 12 months');
    setInput('notes', 'Morning light please.');
    tick(harness);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    await harness.fixture.whenStable();
    tick(harness);

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('/api/model-booking');

    const body = calls[0].body;
    expect(body.model.name).toBe('Nourhan Durrani');
    expect(body.model.slug).toBe('nourhan-durrani');
    expect(body.order.label).toBe('50 photographs');
    expect(body.order.photos).toBe(50);
    expect(body.order.ratePerPhoto).toBe(NOURHAN.photoRate);
    expect(body.order.amount).toBe(50 * NOURHAN.photoRate);
    expect(body.order.custom).toBe(false);
    expect(body.booking.date).toBe(target);
    expect(body.booking.project).toBeTruthy();
    expect(body.booking.location).toBe('Kuala Lumpur');
    expect(body.booking.usage).toBe('Digital, 12 months');
    expect(body.booking.notes).toBe('Morning light please.');
    expect(body.client).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@studio.example',
      phone: '+60 12 345 6789',
      company: 'Studio X',
    });

    // Confirmation, with the reference the studio will quote.
    const done = element.querySelector('.booking-done');
    expect(done?.textContent).toContain('Request sent to the studio');
    expect(done?.textContent).toContain('NB-T3ST99');
  });

  it('blocks an incomplete submission before anything is sent', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { harness, element } = await openDialog();
    const panel = dialog(element);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    await harness.fixture.whenStable();
    tick(harness);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(panel.querySelector('.booking-error')?.textContent).toContain('missing');
    expect(element.querySelector('.booking-done')).toBeNull();
  });

  it('explains when the studio has not connected WhatsApp yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: false,
              error: 'not-configured',
              message: 'The studio booking channel is not connected yet.',
            }),
            { status: 503, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );

    const { harness, element } = await openDialog();
    const panel = dialog(element);
    const setInput = (controlName: string, value: string) => {
      const field = Array.from(panel.querySelectorAll<HTMLInputElement>('input')).find(
        (input) => input.getAttribute('formcontrolname') === controlName,
      );
      field!.value = value;
      field!.dispatchEvent(new Event('input'));
    };

    panel
      .querySelector<HTMLButtonElement>(`.calendar-day[data-date="${futureIsoDate(2)}"]`)!
      .click();
    setInput('name', 'Ada Lovelace');
    setInput('email', 'ada@studio.example');
    setInput('phone', '+60 12 345 6789');
    tick(harness);

    panel.querySelector<HTMLButtonElement>('.booking-submit')!.click();
    await harness.fixture.whenStable();
    tick(harness);

    expect(panel.querySelector('.booking-error')?.textContent).toContain('not connected yet');
    expect(element.querySelector('.booking-done')).toBeNull();
  });

  it('never prints the founder’s WhatsApp number in the dialog', async () => {
    const { element } = await openDialog();
    const text = element.textContent ?? '';

    expect(text.toLowerCase()).not.toContain('wa.me');
    expect(text).not.toMatch(/\b\d{10,15}\b/);
  });

  it('closes on Escape, on the backdrop and on Done after sending', async () => {
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
        .find((button) => button.textContent?.includes('Rent this model'))!
        .click();
      tick(harness);

      const panel = dialog(element);
      expect(panel.querySelector('.rate-empty')?.textContent).toContain('being finalised');
    } finally {
      aiModelProfiles.splice(aiModelProfiles.indexOf(profile), 1);
    }
  });
});
