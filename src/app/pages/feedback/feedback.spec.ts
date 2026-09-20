import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Feedback, feedbackNotesLimit, feedbackTypes, feedbackWhatsAppDial } from './feedback';

function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function submit(element: HTMLElement): void {
  element.querySelector('form')!.dispatchEvent(new Event('submit'));
}

describe('Feedback page', () => {
  let opened: string[];

  beforeEach(async () => {
    opened = [];
    vi.spyOn(window, 'open').mockImplementation((url?: string | URL | null) => {
      opened.push(String(url));
      return null;
    });

    await TestBed.configureTestingModule({
      imports: [Feedback],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create() {
    const fixture = TestBed.createComponent(Feedback);
    fixture.detectChanges();
    return fixture;
  }

  it('explains what feedback is for above the form', () => {
    const element: HTMLElement = create().nativeElement;
    const text = element.textContent ?? '';

    expect(text).toContain('Tell us how NeverBeen can be better');
    expect(text).toContain('What you can share');
    expect(text).toContain('Where it goes');
    expect(text).toContain('What happens next');
    expect(text).toContain('+91 90518 88116');

    // the explanation sits before the form in the page
    const intro = element.querySelector('.intro')!;
    const form = element.querySelector('form')!;
    expect(intro.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('tells the visitor their message opens in WhatsApp addressed to the team', () => {
    const element: HTMLElement = create().nativeElement;
    const note = element.querySelector('.submit-note')?.textContent?.replace(/\s+/g, ' ').trim();

    expect(note).toContain('Opens WhatsApp to The Neverbeen Team with your message filled in.');
    expect(note).toContain('Nothing is posted publicly, and no account is created.');
  });

  it('offers all four required fields and every feedback type', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('#feedback-name')).not.toBeNull();
    expect(element.querySelector('#feedback-email')).not.toBeNull();
    expect(element.querySelector('#feedback-type')).not.toBeNull();
    expect(element.querySelector('#feedback-notes')).not.toBeNull();

    const options = Array.from(element.querySelectorAll<HTMLOptionElement>('#feedback-type option'))
      .map((option) => option.value)
      .filter((value) => value !== '');
    expect(options).toEqual([...feedbackTypes]);
    expect(options.length).toBe(7);
  });

  it('is a live page reachable from its own route', async () => {
    const harness = await RouterTestingHarness.create('/feedback');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain(
      'Tell us how NeverBeen can be better',
    );
    expect(harness.routeDebugElement?.componentInstance instanceof Feedback).toBe(true);
  });

  it('blocks submission and reports every missing field', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    submit(element);
    fixture.detectChanges();

    const errors = Array.from(element.querySelectorAll('.field-error')).map((node) =>
      node.textContent?.trim(),
    );
    expect(errors.length).toBe(4);
    expect(errors.some((message) => message?.includes('your name'))).toBe(true);
    expect(errors.some((message) => message?.includes('valid email'))).toBe(true);
    expect(errors.some((message) => message?.includes('type of feedback'))).toBe(true);
    expect(errors.some((message) => message?.includes('write your feedback'))).toBe(true);
    expect(opened).toEqual([]);
  });

  it('asks for a full name of at least two words', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const name = element.querySelector<HTMLInputElement>('#feedback-name')!;

    type(name, 'Asha');
    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@example.com');
    choose(element.querySelector<HTMLSelectElement>('#feedback-type')!, 'Testimonials');
    type(element.querySelector('textarea')!, 'The Bali set looked exactly like us.');
    fixture.detectChanges();

    submit(element);
    fixture.detectChanges();

    // A single word is not a full name: the message says so and nothing is sent.
    expect(element.textContent).toContain('Please tell us your name (at least 2 words).');
    expect(opened).toEqual([]);

    // Two words are accepted, extra spaces and all, and the message goes away.
    type(name, '  Asha   Menon  ');
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Please tell us your name (at least 2 words).');

    submit(element);
    fixture.detectChanges();
    expect(opened.length).toBe(1);
  });

  it('names the founder and his details, sourced from the founder page', () => {
    const element: HTMLElement = create().nativeElement;
    const founder = element.querySelector('.aside-list li:last-child')!;

    expect(founder.textContent).toContain('Kingshuk');
    expect(founder.textContent).toContain('Senior Software Engineer and founder of NeverBeen');
    expect(founder.textContent).toContain('Indian');
    expect(founder.textContent).toContain('Heritage Institute of Technology, Kolkata');
    expect(founder.textContent).toContain('Continental AG');
    expect(founder.querySelector('img')?.getAttribute('alt')).toBe(
      'Kingshuk, founder of NeverBeen',
    );

    const link = founder.querySelector<HTMLAnchorElement>('a')!;
    expect(link.textContent?.trim()).toBe('Meet the founder');
    expect(link.getAttribute('href')).toBe('/founder');
  });

  it('validates the email address format', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    type(element.querySelector('#feedback-name')!, 'Asha Menon');
    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@invalid');
    choose(element.querySelector<HTMLSelectElement>('#feedback-type')!, 'General Query');
    type(element.querySelector('textarea')!, 'How long does a request take?');
    fixture.detectChanges();

    submit(element);
    fixture.detectChanges();

    expect(element.textContent).toContain('Enter a valid email address');
    expect(opened).toEqual([]);

    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@example.com');
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Enter a valid email address');
  });

  it('accepts exactly 2500 characters but blocks anything longer', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const notes = element.querySelector('textarea')!;

    type(element.querySelector('#feedback-name')!, 'Asha Menon');
    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@example.com');
    choose(element.querySelector<HTMLSelectElement>('#feedback-type')!, 'Improvement Ideas');

    type(notes, 'a'.repeat(feedbackNotesLimit + 1));
    fixture.detectChanges();

    expect(element.querySelector('.counter')?.classList.contains('over')).toBe(true);
    expect(element.textContent).toContain('1 over the 2500 limit');
    expect(element.textContent).toContain('shorten your notes to 2500 characters');
    expect(element.querySelector<HTMLButtonElement>('.btn-send')!.disabled).toBe(true);

    submit(element);
    expect(opened).toEqual([]);

    type(notes, 'a'.repeat(feedbackNotesLimit));
    fixture.detectChanges();

    expect(element.querySelector('.counter')?.classList.contains('over')).toBe(false);
    expect(element.textContent).toContain(`2500 / ${feedbackNotesLimit} characters`);
    expect(element.querySelector<HTMLButtonElement>('.btn-send')!.disabled).toBe(false);
  });

  it('sends every field and value to the studio WhatsApp number on submit', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    type(element.querySelector('#feedback-name')!, 'Asha Menon');
    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@example.com');
    choose(element.querySelector<HTMLSelectElement>('#feedback-type')!, 'Urgent Query');
    type(
      element.querySelector('textarea')!,
      'My request from 12 August still has no preview — can someone check?',
    );
    fixture.detectChanges();

    submit(element);
    fixture.detectChanges();

    expect(opened.length).toBe(1);
    const url = new URL(opened[0]);
    expect(url.origin + url.pathname).toBe(`https://wa.me/${feedbackWhatsAppDial}`);
    expect(feedbackWhatsAppDial).toBe('919051888116');

    const message = url.searchParams.get('text') ?? '';
    expect(message).toContain('Name: Asha Menon');
    expect(message).toContain('Email: asha@example.com');
    expect(message).toContain('Type of Feedback: Urgent Query');
    expect(message).toContain('My request from 12 August still has no preview');

    // a confirmation panel with a fallback link, in case the tab was blocked
    expect(element.querySelector('.sent-panel')).not.toBeNull();
    expect(element.textContent).toContain('Your message is ready in WhatsApp');
    expect(element.querySelector<HTMLAnchorElement>('.sent-help a')!.href).toBe(opened[0]);
  });

  it('lets the visitor send another message afterwards', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    type(element.querySelector('#feedback-name')!, 'Asha Menon');
    type(element.querySelector<HTMLInputElement>('#feedback-email')!, 'asha@example.com');
    choose(element.querySelector<HTMLSelectElement>('#feedback-type')!, 'Reviews');
    type(element.querySelector('textarea')!, 'Beautiful work on the Santorini set.');
    fixture.detectChanges();
    submit(element);
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.btn-link')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.sent-panel')).toBeNull();
    expect(element.querySelector('form')).not.toBeNull();

    const values = fixture.componentInstance['form'].getRawValue();
    expect(values.notes).toBe('');
    expect(values.type).toBe('');
    expect(values.name).toBe('Asha Menon');
  });
});
