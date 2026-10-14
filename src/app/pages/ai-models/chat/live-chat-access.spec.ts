import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityService } from '../../../services/community.service';
import { aiModelProfiles } from '../ai-model-data';
import { LiveChatAccess } from './live-chat-access';
import { requiresRegisteredChat } from './live-chat-policy';

const exclusiveSlugs = [
  'fiadh-dara',
  'alisha-bhattacharya',
  'rozalin-el-masry',
  'nour-el-sherif',
  'priyanka-chatterjee',
];

const community = {
  currentUser: signal<unknown>(null),
  isAuthenticated: signal(false),
  guestBrowsing: signal(false),
  profile: signal<unknown>(null),
};

function chooser(slug: string) {
  const model = aiModelProfiles.find((profile) => profile.slug === slug)!;
  expect(model).toBeDefined();
  const fixture = TestBed.createComponent(LiveChatAccess);
  fixture.componentRef.setInput('model', model);
  fixture.componentRef.setInput('returnTo', `/ai-models/${slug}?liveChatPlan=registered`);
  const started = vi.fn();
  fixture.componentInstance.freeStarted.subscribe(started);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, model, started };
}

describe('exclusive Live Chat access', () => {
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
      const free = element.querySelector<HTMLElement>('.plan-card-free')!;
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
      // Even a synthetic click that bypasses the native disabled button cannot emit a Free start.
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(started).not.toHaveBeenCalled();
      expect(free.getAttribute('aria-selected')).toBe('false');
      expect(element.querySelector('.plan-card-registered')?.getAttribute('aria-selected')).toBe(
        'true',
      );
      fixture.destroy();
    },
  );

  it('keeps Free Chat available for every other model', () => {
    const ordinary = aiModelProfiles.filter((model) => !exclusiveSlugs.includes(model.slug));
    expect(ordinary.length).toBeGreaterThan(0);
    for (const model of ordinary) expect(requiresRegisteredChat(model)).toBe(false);
    const { fixture, element, started } = chooser(ordinary[0].slug);
    expect(element.querySelector('.exclusive-notice')).toBeNull();
    expect(element.querySelector('.plan-unavailable-overlay')).toBeNull();
    const button = element.querySelector<HTMLButtonElement>('.plan-start-free')!;
    expect(button.disabled).toBe(false);
    button.click();
    expect(started).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('requires Community sign-in for an exclusive-model guest', () => {
    const { fixture, element, started } = chooser(exclusiveSlugs[0]);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-community-sign-in-card')).not.toBeNull();
    expect(element.querySelector('.exclusive-notice')?.textContent).toContain('Fiadh Dara');
    expect(started).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('uses the existing verified member review for exclusive models', () => {
    community.currentUser.set({ profileComplete: true, status: 'Active', fullName: 'Test Member' });
    community.isAuthenticated.set(true);
    community.profile.set({ fullName: 'Test Member', profilePhotoUrl: '/member.jpg' });
    const { fixture, element } = chooser(exclusiveSlugs[0]);
    element.querySelector<HTMLButtonElement>('.plan-start-registered')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.access-review')).not.toBeNull();
    const registered = vi.fn();
    fixture.componentInstance.registeredStarted.subscribe(registered);
    const start = element.querySelector<HTMLButtonElement>('.review-start')!;
    expect(start.disabled).toBe(false);
    start.click();
    expect(registered).toHaveBeenCalledWith({ name: 'Test Member', avatar: '/member.jpg' });
    fixture.destroy();
  });

  it('updates the restriction and selected mode when the model changes', () => {
    const ordinary = aiModelProfiles.find((model) => !requiresRegisteredChat(model))!;
    const { fixture, element } = chooser(ordinary.slug);
    fixture.componentRef.setInput(
      'model',
      aiModelProfiles.find((model) => model.slug === exclusiveSlugs[0])!,
    );
    fixture.detectChanges();
    expect(element.querySelector<HTMLButtonElement>('.plan-start-free')!.disabled).toBe(true);
    expect(element.querySelector('.selected-mode')?.textContent).toContain('Registered User');
    fixture.componentRef.setInput('model', ordinary);
    fixture.detectChanges();
    expect(element.querySelector<HTMLButtonElement>('.plan-start-free')!.disabled).toBe(false);
    fixture.destroy();
  });
});

describe('blue tick beside Registered User model names', () => {
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

  it('shows the tick after the name in the plan form and the safety notice of an exclusive model', () => {
    const { fixture, element } = chooser(exclusiveSlugs[0]);
    expect(element.querySelector('.selected-model-name .model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.exclusive-notice .model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')?.getAttribute('title')).toContain(
      'Registered Users only',
    );
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
