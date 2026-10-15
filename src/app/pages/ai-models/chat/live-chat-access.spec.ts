import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityService } from '../../../services/community.service';
import { aiModelProfiles } from '../ai-model-data';
import { LiveChatAccess } from './live-chat-access';
import { allowsLiveChatPlan, requiresRegisteredChat } from './live-chat-policy';
import { PremiumPaymentRequest } from './premium-payment';
import { UpiAppLauncher } from './upi-app-launcher';

const exclusiveSlugs = [
  'rozalin-el-masry',
  'reema-ganguly',
  'fatima-al-mansoor',
  'shirina-o-brien',
];

/** The Premium models and their per-model amounts, exactly as the plan brief lists them. */
const premiumPrices: Readonly<Record<string, number>> = {
  'fiadh-dara': 129,
  'nourhan-durrani': 119,
  'alisha-bhattacharya': 199,
  'nour-el-sherif': 99,
  'priyanka-chatterjee': 129,
  'tasneem-al-rifai': 99,
  'fatima-sana-hussaini': 109,
};

const upiLauncher = {
  open: vi.fn<(request: PremiumPaymentRequest, signal: AbortSignal) => Promise<void>>(),
};

const community = {
  currentUser: signal<unknown>(null),
  isAuthenticated: signal(false),
  guestBrowsing: signal(false),
  profile: signal<unknown>(null),
};

function signInAsMember(): void {
  community.currentUser.set({
    id: 42,
    profileComplete: true,
    status: 'Active',
    fullName: 'Test Member',
  });
  community.isAuthenticated.set(true);
  community.profile.set({ fullName: 'Test Member', profilePhotoUrl: '/member.jpg' });
}

function chooser(slug: string) {
  const model = aiModelProfiles.find((profile) => profile.slug === slug)!;
  expect(model).toBeDefined();
  const fixture = TestBed.createComponent(LiveChatAccess);
  fixture.componentRef.setInput('model', model);
  fixture.componentRef.setInput('returnTo', `/ai-models?liveChatModel=${slug}`);
  const started = vi.fn();
  const registered = vi.fn();
  const premium = vi.fn();
  fixture.componentInstance.freeStarted.subscribe(started);
  fixture.componentInstance.registeredStarted.subscribe(registered);
  fixture.componentInstance.premiumStarted.subscribe(premium);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, model, started, registered, premium };
}

function paymentPage(slug = 'nourhan-durrani') {
  signInAsMember();
  const result = chooser(slug);
  result.element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
  result.fixture.detectChanges();
  result.element.querySelector<HTMLButtonElement>('.review-start')!.click();
  result.fixture.detectChanges();
  return result;
}

function appHandoff() {
  let returned!: () => void;
  let failed!: (error: Error) => void;
  const pending = new Promise<void>((resolve, reject) => {
    returned = resolve;
    failed = reject;
  });
  upiLauncher.open.mockReturnValue(pending);
  return { returned, failed };
}

async function flushHandoff() {
  await Promise.resolve();
  await Promise.resolve();
}

function card(element: HTMLElement, plan: 'free' | 'registered' | 'premium'): HTMLElement {
  return element.querySelector<HTMLElement>(`.plan-card-${plan}`)!;
}

function durationText(element: HTMLElement, plan: 'free' | 'registered' | 'premium'): string {
  return (
    card(element, plan).querySelector('.plan-duration')?.textContent?.replace(/\s+/g, ' ').trim() ??
    ''
  );
}

function featureLines(element: HTMLElement, plan: 'free' | 'registered' | 'premium'): string[] {
  return Array.from(card(element, plan).querySelectorAll('.plan-features li')).map((li) =>
    (li.textContent ?? '')
      .replace(/\s+/g, ' ')
      .replace(/^([✓—])\s*/, '$1 ')
      .trim(),
  );
}

describe('the three Live Chat plan blocks', () => {
  beforeEach(async () => {
    community.currentUser.set(null);
    community.isAuthenticated.set(false);
    community.guestBrowsing.set(false);
    community.profile.set(null);
    await TestBed.configureTestingModule({
      imports: [LiveChatAccess],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        { provide: UpiAppLauncher, useValue: upiLauncher },
      ],
    }).compileComponents();
  });

  it('shows every chat duration in its own Calibri duration block of the plan', () => {
    const { fixture, element } = chooser('sereenah-noorzai');
    expect(durationText(element, 'free')).toContain('45');
    expect(durationText(element, 'free')).toContain('SECONDS');
    expect(durationText(element, 'registered')).toContain('2');
    expect(durationText(element, 'registered')).toContain('MINUTES');
    expect(durationText(element, 'premium')).toContain('15');
    expect(durationText(element, 'premium')).toContain('MINUTES');
    for (const plan of ['free', 'registered', 'premium'] as const) {
      const block = card(element, plan).querySelector<HTMLElement>('.plan-duration')!;
      expect(block.getAttribute('aria-label')).toContain('Chat duration');
      // The duration block is styled in Calibri, with modern fallbacks for systems without it.
      expect(block.className).toContain('plan-duration');
    }
    fixture.destroy();
  });

  it('lists the Free Chat plan features exactly as the brief words them', () => {
    const { fixture, element } = chooser('sereenah-noorzai');
    expect(featureLines(element, 'free')).toEqual([
      '✓ No Registration is Required',
      '✓ Text-based Chat Conversations',
      '— No Photo or Video Sharing is Allowed',
      '✓ Access to Free NeverBeen Models',
      '— No Access to Exclusive NeverBeen Models',
      '— No Access to Premium NeverBeen Models',
      '✓ Chat Duration is Limited to 45 Seconds',
      '✓ Basic conversational memory',
      '✓ Standard response speed',
      '✓ Limited Human like Response',
    ]);
    fixture.destroy();
  });

  it('lists the Registered User plan features exactly as the brief words them', () => {
    const { fixture, element } = chooser('sereenah-noorzai');
    expect(featureLines(element, 'registered')).toEqual([
      '✓ User Registration to Community is Required',
      '✓ Text-based Chat Conversations',
      '— No Photo or Video Sharing is Allowed',
      '✓ Chat Duration is Limited to 2 Minutes',
      '— No Access to Free NeverBeen Models',
      '✓ Access to Exclusive NeverBeen Models',
      '— No Access to Premium NeverBeen Models',
      '✓ Moderate Response Speed',
      '✓ More Human like Response',
    ]);
    fixture.destroy();
  });

  it('lists the Premium plan features exactly as the brief words them', () => {
    const { fixture, element } = chooser('sereenah-noorzai');
    expect(featureLines(element, 'premium')).toEqual([
      '✓ User Registration to Community is Required',
      '✓ Text-based Chat Conversations',
      '✓ Photo & Video sharing is Allowed',
      '— No Access to Free NeverBeen Models',
      '✓ Access to Exclusive NeverBeen Models',
      '✓ Access to Premium NeverBeen Models',
      '✓ More Chat Duration Upto 15 Minutes',
      '✓ Ultimate conversation memory',
      '✓ Ultra Fast response speed',
      '✓ Realtime Human like Response',
    ]);
    fixture.destroy();
  });

  it('locks a Free model to Free Chat alone — the other two plans are Not Available', () => {
    const { fixture, element, started, registered, premium } = chooser('sereenah-noorzai');
    expect(card(element, 'free').classList.contains('is-disabled')).toBe(false);
    for (const plan of ['registered', 'premium'] as const) {
      const block = card(element, plan);
      expect(block.classList.contains('is-disabled')).toBe(true);
      expect(block.getAttribute('aria-disabled')).toBe('true');
      expect(block.querySelector('.plan-unavailable-overlay')?.textContent?.trim()).toBe(
        'Not Available',
      );
      block.querySelector<HTMLButtonElement>('button')!.click();
    }
    expect(registered).not.toHaveBeenCalled();
    expect(premium).not.toHaveBeenCalled();
    element.querySelector<HTMLButtonElement>('.plan-start-free')!.click();
    expect(started).toHaveBeenCalledOnce();
    fixture.destroy();
  });
});

describe('exclusive model access', () => {
  beforeEach(async () => {
    community.currentUser.set(null);
    community.isAuthenticated.set(false);
    community.guestBrowsing.set(false);
    community.profile.set(null);
    await TestBed.configureTestingModule({
      imports: [LiveChatAccess],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        { provide: UpiAppLauncher, useValue: upiLauncher },
      ],
    }).compileComponents();
  });

  it.each(exclusiveSlugs)(
    'disables Free Chat completely for %s and names her in the safety notice',
    (slug) => {
      const { fixture, element, model, started } = chooser(slug);
      const free = card(element, 'free');
      const button = free.querySelector<HTMLButtonElement>('button')!;
      expect(free.classList.contains('is-disabled')).toBe(true);
      expect(free.getAttribute('aria-disabled')).toBe('true');
      expect(free.getAttribute('tabindex')).toBe('-1');
      expect(button.disabled).toBe(true);
      expect(free.querySelector('.plan-unavailable-overlay')?.textContent?.trim()).toBe(
        'Not Available',
      );
      const notice = element.querySelector('.exclusive-notice')!;
      expect(notice.textContent).toContain(model.name);
      expect(notice.textContent).toContain('Registered User');
      expect(notice.textContent).toContain('safety');
      expect(notice.nextElementSibling?.classList.contains('access-model-bar')).toBe(true);
      button.click();
      free.click();
      free.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      free.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(started).not.toHaveBeenCalled();
      expect(free.getAttribute('aria-selected')).toBe('false');
      // The Registered User plan is selected for her, with the Premium plan alongside.
      expect(card(element, 'registered').getAttribute('aria-selected')).toBe('true');
      expect(card(element, 'registered').classList.contains('is-disabled')).toBe(false);
      expect(card(element, 'premium').classList.contains('is-disabled')).toBe(false);
      fixture.destroy();
    },
  );

  it('requires Community sign-in for an exclusive-model guest', () => {
    const { fixture, element, registered } = chooser(exclusiveSlugs[0]);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-community-sign-in-card')).not.toBeNull();
    expect(element.querySelector('.exclusive-notice')?.textContent).toContain('Rozalin El Masry');
    expect(registered).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('uses the verified member review for exclusive models, then starts the registered chat', () => {
    signInAsMember();
    const { fixture, element, registered } = chooser(exclusiveSlugs[0]);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-review')).not.toBeNull();
    const start = element.querySelector<HTMLButtonElement>('.review-start')!;
    expect(start.disabled).toBe(false);
    expect(start.textContent).toContain('2 minutes');
    start.click();
    expect(registered).toHaveBeenCalledWith({ name: 'Test Member', avatar: '/member.jpg' });
    fixture.destroy();
  });
});

describe('premium model access and UPI payment', () => {
  beforeEach(async () => {
    community.currentUser.set(null);
    community.isAuthenticated.set(false);
    community.guestBrowsing.set(false);
    community.profile.set(null);
    await TestBed.configureTestingModule({
      imports: [LiveChatAccess],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        { provide: UpiAppLauncher, useValue: upiLauncher },
      ],
    }).compileComponents();
  });

  it.each(Object.entries(premiumPrices))(
    'locks %s to the Premium plan and shows her amount ₹%i big on the card',
    (slug, amount) => {
      const { fixture, element, model, started, registered } = chooser(slug);
      expect(card(element, 'free').classList.contains('is-disabled')).toBe(true);
      expect(card(element, 'registered').classList.contains('is-disabled')).toBe(true);
      expect(card(element, 'premium').classList.contains('is-disabled')).toBe(false);
      expect(element.querySelector('.plan-price-value')?.textContent?.trim()).toBe(`₹${amount}`);
      expect(element.querySelector('.exclusive-notice')?.textContent).toContain(model.name);
      expect(element.querySelector('.exclusive-notice-badge')?.textContent).toContain(`₹${amount}`);
      // The blocked plans cannot start a chat even when clicked directly.
      element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
      element.querySelector<HTMLButtonElement>('.plan-start-free')!.click();
      expect(started).not.toHaveBeenCalled();
      expect(registered).not.toHaveBeenCalled();
      fixture.destroy();
    },
  );

  it('shows a guest the same Community sign-in interface before any payment', () => {
    const { fixture, element, premium } = chooser('fiadh-dara');
    element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-community-sign-in-card')).not.toBeNull();
    expect(element.querySelector('.sign-in-model-tag')?.textContent).toContain('Fiadh Dara');
    // The plan being resumed travels in the sign-in return path.
    const returnTo = (
      fixture.componentInstance as unknown as { signInReturnTo: () => string }
    ).signInReturnTo();
    expect(returnTo).toContain('liveChatModel=fiadh-dara');
    expect(returnTo).toContain('liveChatPlan=premium');
    expect(premium).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('shows only the app choices and Pay & Chat, with NeverBeen instead of receiver IDs', () => {
    const { fixture, element, premium } = paymentPage();
    const payment = element.querySelector('.access-payment')!;
    expect(payment.querySelector('.payment-price-value')?.textContent?.trim()).toBe('15 minutes');
    expect(payment.querySelectorAll('.payment-method').length).toBe(2);
    expect(
      payment.querySelector('.payment-summary')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Pay ₹124.95 to NeverBeen with Google Pay or PhonePe.');
    expect(payment.querySelector('.review-start')?.textContent).toContain('Pay ₹124.95 & Chat');
    expect(payment.querySelector('input')).toBeNull();
    expect(payment.textContent).not.toMatch(/@|UTR|transaction reference|Verify payment|Razorpay/i);
    expect(payment.textContent).toContain('verification is temporarily disabled');
    expect(premium).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it.each(['gpay', 'phonepe'] as const)(
    'opens %s with the model’s amount, then automatically starts chat on return (unverified)',
    async (method) => {
      const handoff = appHandoff();
      const { fixture, element, premium } = paymentPage();
      element
        .querySelectorAll<HTMLButtonElement>('.payment-method')
        [method === 'gpay' ? 0 : 1].click();
      fixture.detectChanges();
      const pay = element.querySelector<HTMLButtonElement>('.access-payment .review-start')!;
      pay.click();
      fixture.detectChanges();
      expect(upiLauncher.open).toHaveBeenCalledWith(
        { modelSlug: 'nourhan-durrani', amount: 124.95, method },
        expect.any(AbortSignal),
      );
      expect(pay.disabled).toBe(true);
      expect(pay.textContent).toContain(method === 'gpay' ? 'Google Pay' : 'PhonePe');
      expect(premium).not.toHaveBeenCalled();
      // A second click or switching apps while opening cannot create a duplicate handoff.
      pay.click();
      element.querySelectorAll<HTMLButtonElement>('.payment-method')[1].click();
      expect(upiLauncher.open).toHaveBeenCalledOnce();

      handoff.returned();
      await flushHandoff();
      fixture.detectChanges();
      // No UTR or second "Start chat" click. Returning is deliberately NOT bank verification.
      expect(premium).toHaveBeenCalledExactlyOnceWith({
        name: 'Test Member',
        avatar: '/member.jpg',
        paymentPackageId: 'basic',
      });
      expect(element.querySelector('.payment-verified')).toBeNull();
      expect(element.textContent).not.toContain('Payment verified');
      pay.click();
      expect(premium).toHaveBeenCalledOnce();
      fixture.destroy();
    },
  );

  it('updates upgrade pricing, freezes selection during handoff and emits its duration package', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    const packages = element.querySelectorAll<HTMLButtonElement>('.payment-package');
    expect(packages.length).toBe(4);
    expect(packages[0].getAttribute('aria-checked')).toBe('true');
    expect(element.querySelectorAll('.payment-method-mark img').length).toBe(2);
    packages[1].click();
    fixture.detectChanges();
    expect(element.querySelector('.payment-price-value')?.textContent).toContain('45');
    expect(element.querySelector('.payment-total b')?.textContent).toBe('₹437.85');
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    fixture.detectChanges();
    expect(upiLauncher.open).toHaveBeenCalledWith(
      { modelSlug: 'nourhan-durrani', amount: 437.85, method: 'gpay' },
      expect.any(AbortSignal),
    );
    expect(packages[2].disabled).toBe(true);
    packages[2].click();
    handoff.returned();
    await flushHandoff();
    expect(premium).toHaveBeenCalledExactlyOnceWith({
      name: 'Test Member',
      avatar: '/member.jpg',
      paymentPackageId: 'extended',
    });
    fixture.destroy();
  });

  it('keeps a failed launch on the same page with Payment Failed and a working Try again', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    handoff.failed(new Error('We couldn’t open Google Pay. Make sure the app is installed.'));
    await flushHandoff();
    fixture.detectChanges();
    expect(element.querySelector('.access-payment')).not.toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Payment Failed');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Make sure the app is installed',
    );
    const retry = element.querySelector<HTMLButtonElement>('.access-payment .review-start')!;
    expect(retry.disabled).toBe(false);
    expect(retry.textContent).toContain('Try again');
    expect(premium).not.toHaveBeenCalled();

    const retryHandoff = appHandoff();
    retry.click();
    fixture.detectChanges();
    expect(upiLauncher.open).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    retryHandoff.returned();
    await flushHandoff();
    expect(premium).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('can cancel the handoff on this page and ignores a late return', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    fixture.detectChanges();
    const signal = upiLauncher.open.mock.calls[0][1];
    element.querySelector<HTMLButtonElement>('.payment-cancel')!.click();
    fixture.detectChanges();
    expect(signal.aborted).toBe(true);
    expect(element.querySelector('.payment-error')?.textContent).toContain('Payment Failed');
    expect(element.querySelector('.access-payment .review-start')?.textContent).toContain(
      'Try again',
    );
    handoff.returned();
    await flushHandoff();
    expect(premium).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it.each(['back', 'close', 'destroy'] as const)(
    'aborts a pending handoff on %s, without starting a hidden chat later',
    async (action) => {
      const handoff = appHandoff();
      const { fixture, element, premium } = paymentPage();
      element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
      const signal = upiLauncher.open.mock.calls[0][1];
      if (action === 'back')
        element.querySelector<HTMLButtonElement>('.access-payment .flow-back')!.click();
      if (action === 'close') element.querySelector<HTMLButtonElement>('.access-close')!.click();
      if (action === 'destroy') fixture.destroy();
      expect(signal.aborted).toBe(true);
      handoff.returned();
      await flushHandoff();
      expect(premium).not.toHaveBeenCalled();
      if (action !== 'destroy') fixture.destroy();
    },
  );

  it('does not apply a returning handoff to a different model', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    fixture.componentRef.setInput(
      'model',
      aiModelProfiles.find((model) => model.slug === 'fiadh-dara')!,
    );
    fixture.detectChanges();
    handoff.returned();
    await flushHandoff();
    fixture.detectChanges();
    expect(premium).not.toHaveBeenCalled();
    expect(element.querySelector('.payment-error')?.textContent).toContain('chat details');
    fixture.destroy();
  });

  it('requires the same active Community member when returning from the payment app', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    community.isAuthenticated.set(false);
    handoff.returned();
    await flushHandoff();
    fixture.detectChanges();
    expect(premium).not.toHaveBeenCalled();
    expect(element.querySelector('.payment-error')?.textContent).toContain('Community session');
    fixture.destroy();
  });

  it('keeps automatic continuation working when the same member’s presence data refreshes', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    community.currentUser.set({
      id: 42,
      profileComplete: true,
      status: 'Active',
      fullName: 'Test Member',
      lastSeenUtc: new Date().toISOString(),
    });
    handoff.returned();
    await flushHandoff();
    expect(premium).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('does not give a different member access from the previous member’s handoff', async () => {
    const handoff = appHandoff();
    const { fixture, element, premium } = paymentPage();
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    community.currentUser.set({
      id: 99,
      profileComplete: true,
      status: 'Active',
      fullName: 'Other Member',
    });
    handoff.returned();
    await flushHandoff();
    fixture.detectChanges();
    expect(premium).not.toHaveBeenCalled();
    expect(element.querySelector('.payment-error')?.textContent).toContain('Community session');
    fixture.destroy();
  });

  it('applies the light checkout theme only during the payment step', () => {
    const { fixture, element } = paymentPage();
    expect(element.querySelector('.access-backdrop.is-payment')).not.toBeNull();
    expect(element.querySelector('.access-shell.is-payment')).not.toBeNull();
    expect(element.querySelector('.access-payment')?.textContent).toContain('Payment method');
    expect(
      element.querySelector('.payment-package.is-selected')?.getAttribute('aria-checked'),
    ).toBe('true');
    expect(element.querySelector('.payment-method.is-selected')?.getAttribute('aria-checked')).toBe(
      'true',
    );

    element.querySelector<HTMLButtonElement>('.access-payment .flow-back')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-backdrop.is-payment')).toBeNull();
    expect(element.querySelector('.access-shell.is-payment')).toBeNull();
    expect(element.querySelector('.access-review')).not.toBeNull();
    fixture.destroy();
  });

  it('lets a paid member walk back from payment to the chat details', () => {
    signInAsMember();
    const { fixture, element } = chooser('fiadh-dara');
    element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.review-start')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.access-payment .flow-back')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-review')).not.toBeNull();
    expect(element.querySelector('.access-payment')).toBeNull();
    fixture.destroy();
  });

  it('prices an Exclusive model at ₹99 for Premium and takes her through UPI payment', () => {
    signInAsMember();
    const { fixture, element, premium, registered } = chooser('rozalin-el-masry');
    // The Premium card carries the ₹99 Exclusive rate, and the notice names it too.
    expect(element.querySelector('.plan-price-value')?.textContent?.trim()).toBe('₹99');
    expect(element.querySelector('.exclusive-notice')?.textContent).toContain('₹99');
    element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-review')).not.toBeNull();
    expect(element.querySelector('.review-price')?.textContent).toContain('₹99');
    element.querySelector<HTMLButtonElement>('.review-start')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-payment')).not.toBeNull();
    expect(element.querySelector('.payment-total b')?.textContent?.trim()).toBe('₹103.95');
    expect(premium).not.toHaveBeenCalled();
    expect(registered).not.toHaveBeenCalled();
    fixture.destroy();
  });
});

describe('blue tick beside Exclusive and Premium model names', () => {
  beforeEach(async () => {
    community.currentUser.set(null);
    community.isAuthenticated.set(false);
    community.guestBrowsing.set(false);
    community.profile.set(null);
    await TestBed.configureTestingModule({
      imports: [LiveChatAccess],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        { provide: UpiAppLauncher, useValue: upiLauncher },
      ],
    }).compileComponents();
  });

  it('shows the tick after the name in the plan form and the notice of an exclusive model', () => {
    const { fixture, element } = chooser(exclusiveSlugs[0]);
    expect(element.querySelector('.selected-model-name .model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.exclusive-notice .model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')?.getAttribute('title')).toContain(
      'Exclusive or Premium',
    );
    fixture.destroy();
  });

  it('shows the tick for a Premium model too', () => {
    const { fixture, element } = chooser('alisha-bhattacharya');
    expect(element.querySelector('.selected-model-name .model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.exclusive-notice .model-verified-tick')).not.toBeNull();
    fixture.destroy();
  });

  it('shows the tick in the Community sign-in step, where it names the model above the form', () => {
    const { fixture, element } = chooser(exclusiveSlugs[0]);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.sign-in-model-tag b .model-verified-tick')).not.toBeNull();
    fixture.destroy();
  });

  it('shows no tick for a Free model, whose disabled member plans open no sign-in', () => {
    const ordinary = aiModelProfiles.find((model) => !requiresRegisteredChat(model))!;
    const { fixture, element } = chooser(ordinary.slug);
    expect(element.querySelector('app-model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.plan-start-registered')!.disabled).toBe(true);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-community-sign-in-card')).toBeNull();
    expect(element.querySelector('.sign-in-model-tag')).toBeNull();
    fixture.destroy();
  });
});

describe('availability follows the model in front of the chooser', () => {
  beforeEach(async () => {
    community.currentUser.set(null);
    community.isAuthenticated.set(false);
    community.guestBrowsing.set(false);
    community.profile.set(null);
    await TestBed.configureTestingModule({
      imports: [LiveChatAccess],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: community },
        { provide: UpiAppLauncher, useValue: upiLauncher },
      ],
    }).compileComponents();
  });

  it('updates the restrictions and the selected mode when the model changes', () => {
    const ordinary = aiModelProfiles.find((model) => model.slug === 'sereenah-noorzai')!;
    const { fixture, element } = chooser(ordinary.slug);
    expect(element.querySelector<HTMLButtonElement>('.plan-start-free')!.disabled).toBe(false);
    fixture.componentRef.setInput(
      'model',
      aiModelProfiles.find((m) => m.slug === 'fiadh-dara')!,
    );
    fixture.detectChanges();
    expect(element.querySelector<HTMLButtonElement>('.plan-start-free')!.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('.plan-start-registered')!.disabled).toBe(true);
    expect(element.querySelector('.selected-mode')?.textContent).toContain('Premium');
    expect(element.querySelector('.plan-price-value')?.textContent?.trim()).toBe('₹129');
    fixture.componentRef.setInput('model', ordinary);
    fixture.detectChanges();
    expect(element.querySelector<HTMLButtonElement>('.plan-start-free')!.disabled).toBe(false);
    expect(element.querySelector('.selected-mode')?.textContent).toContain('Free Chat');
    fixture.destroy();
  });

  it('keeps the access matrix honest for every model and plan pair', () => {
    const { fixture, element } = chooser('sereenah-noorzai');
    for (const model of aiModelProfiles) {
      fixture.componentRef.setInput('model', model);
      fixture.detectChanges();
      for (const plan of ['free', 'registered', 'premium'] as const) {
        expect(card(element, plan).classList.contains('is-disabled')).toBe(
          !allowsLiveChatPlan(model, plan),
        );
      }
    }
    fixture.destroy();
  });

  it('resumes the member check for the plan that opened the sign-in round trip', () => {
    signInAsMember();
    const model = aiModelProfiles.find((m) => m.slug === 'fiadh-dara')!;
    const fixture = TestBed.createComponent(LiveChatAccess);
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('returnTo', '/ai-models?liveChatModel=fiadh-dara');
    fixture.componentRef.setInput('resumePlan', 'premium');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.access-review')).not.toBeNull();
    expect(element.querySelector('.review-price')?.textContent).toContain('₹129');
    fixture.destroy();
  });
});

afterEach(() => {
  upiLauncher.open.mockReset();
  community.currentUser.set(null);
  community.isAuthenticated.set(false);
  community.guestBrowsing.set(false);
  community.profile.set(null);
});
