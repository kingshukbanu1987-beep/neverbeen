import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityService } from '../../../services/community.service';
import { aiModelProfiles } from '../ai-model-data';
import { LiveChatAccess } from './live-chat-access';
import { allowsLiveChatPlan, requiresRegisteredChat } from './live-chat-policy';

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

const community = {
  currentUser: signal<unknown>(null),
  isAuthenticated: signal(false),
  guestBrowsing: signal(false),
  profile: signal<unknown>(null),
};

function signInAsMember(): void {
  community.currentUser.set({ profileComplete: true, status: 'Active', fullName: 'Test Member' });
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
      providers: [provideRouter([]), { provide: CommunityService, useValue: community }],
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
      '✓ Access to Free NeverBeen Models',
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
      '✓ Access to Free NeverBeen Models',
      '✓ Access to Exclusive NeverBeen Models',
      '✓ Access to Premium NeverBeen Models',
      '✓ More Chat Duration Upto 15 Minutes',
      '✓ Ultimate conversation memory',
      '✓ Ultra Fast response speed',
      '✓ Realtime Human like Response',
    ]);
    fixture.destroy();
  });

  it('starts Free Chat for a Free model with no registration', () => {
    const { fixture, element, started } = chooser('sereenah-noorzai');
    expect(card(element, 'free').classList.contains('is-disabled')).toBe(false);
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
      providers: [provideRouter([]), { provide: CommunityService, useValue: community }],
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
      providers: [provideRouter([]), { provide: CommunityService, useValue: community }],
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

  it('verifies the UPI payment, then — and only then — starts the Premium chat', async () => {
    vi.useFakeTimers();
    try {
      signInAsMember();
      const { fixture, element, premium } = chooser('fiadh-dara');
      expect(element.querySelector('.plan-price-value')?.textContent?.trim()).toBe('₹129');

      element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
      fixture.detectChanges();
      expect(element.querySelector('.access-review')).not.toBeNull();
      expect(element.querySelector('.review-price')?.textContent).toContain('₹129');

      element.querySelector<HTMLButtonElement>('.review-start')!.click();
      fixture.detectChanges();
      const payment = element.querySelector('.access-payment')!;
      expect(payment).not.toBeNull();
      expect(payment.querySelector('.payment-price-value')?.textContent?.trim()).toBe('₹129');
      expect(payment.querySelectorAll('.payment-method').length).toBe(2);
      expect(payment.textContent).toContain('neverbeen@upi');
      expect(payment.textContent?.toLowerCase()).toContain('razorpay');

      // Pay with PhonePe, then paste the UPI transaction reference from the payment app.
      payment.querySelectorAll<HTMLButtonElement>('.payment-method')[1].click();
      const input = payment.querySelector<HTMLInputElement>('.payment-field input')!;
      input.value = '415902783146';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const verify = element.querySelector<HTMLButtonElement>('.access-payment .review-start')!;
      verify.click();
      fixture.detectChanges();
      expect(verify.textContent).toContain('Verifying');
      expect(premium).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1_300);
      fixture.detectChanges();
      expect(element.querySelector('.payment-verified')?.textContent).toContain('Payment verified');
      const start = element.querySelector<HTMLButtonElement>('.access-payment .review-start')!;
      start.click();
      expect(premium).toHaveBeenCalledWith({ name: 'Test Member', avatar: '/member.jpg' });
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses a malformed transaction reference before any verification round trip', () => {
    signInAsMember();
    const { fixture, element, premium } = chooser('fiadh-dara');
    element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.review-start')!.click();
    fixture.detectChanges();
    const input = element.querySelector<HTMLInputElement>('.payment-field input')!;
    input.value = 'oops';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    element.querySelector<HTMLButtonElement>('.access-payment .review-start')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.flow-error')?.textContent).toContain(
      'UPI transaction reference',
    );
    expect(element.querySelector('.payment-verified')).toBeNull();
    expect(premium).not.toHaveBeenCalled();
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
    expect(element.querySelector('.payment-price-value')?.textContent?.trim()).toBe('₹99');
    expect(premium).not.toHaveBeenCalled();
    expect(registered).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('runs the Premium plan for a Free model exactly like the Registered User flow', () => {
    signInAsMember();
    const { fixture, element, premium, registered } = chooser('sereenah-noorzai');
    expect(element.querySelector('.plan-price-value')?.textContent?.trim()).toBe('Included');
    element.querySelector<HTMLButtonElement>('.plan-start-premium')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-review')).not.toBeNull();
    expect(element.querySelector('.review-price')).toBeNull();
    const start = element.querySelector<HTMLButtonElement>('.review-start')!;
    expect(start.textContent).toContain('Premium');
    expect(start.textContent).toContain('15 minutes');
    start.click();
    expect(premium).toHaveBeenCalledWith({ name: 'Test Member', avatar: '/member.jpg' });
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
      providers: [provideRouter([]), { provide: CommunityService, useValue: community }],
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

  it('shows no tick and no sign-in name chip for an ordinary model', () => {
    const ordinary = aiModelProfiles.find((model) => !requiresRegisteredChat(model))!;
    const { fixture, element } = chooser(ordinary.slug);
    expect(element.querySelector('app-model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')).toBeNull();
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
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
      providers: [provideRouter([]), { provide: CommunityService, useValue: community }],
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
  community.currentUser.set(null);
  community.isAuthenticated.set(false);
  community.guestBrowsing.set(false);
  community.profile.set(null);
});
