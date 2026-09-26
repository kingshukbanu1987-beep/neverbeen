import { Component } from '@angular/core';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { COMMUNITY_THEMES, COMMUNITY_THEME_KEY, CommunityThemeService, communityTheme, communityThemeArtwork } from './community-themes';
import { CommunityService, TOKEN_KEY, deleteCookie } from '../../services/community.service';

@Component({ template: '' })
class Blank {}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const root = () => document.documentElement;

async function navbarAt(url: string) {
  await TestBed.configureTestingModule({
    imports: [Navbar],
    providers: [
      provideRouter([
        { path: '', component: Blank },
        { path: 'community', component: Blank, children: [{ path: 'profile', component: Blank }, { path: 'message-book', component: Blank }] },
        { path: 'profile', component: Blank },
        { path: 'collection', component: Blank },
      ]),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Navbar);
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  fixture.detectChanges();
  await renderDefer(fixture);
  return { fixture, router, el: fixture.nativeElement as HTMLElement };
}

async function renderDefer(fixture: { detectChanges: () => void; getDeferBlocks: () => Promise<{ render: (s: DeferBlockState) => Promise<void> }[]> }) {
  for (const block of await fixture.getDeferBlocks()) await block.render(DeferBlockState.Complete);
  fixture.detectChanges();
}

function openPicker(el: HTMLElement) {
  (el.querySelector('.ctp-trigger') as HTMLButtonElement).click();
}

describe('Community theme dropdown', () => {
  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    root().removeAttribute('data-ctheme');
    root().removeAttribute('data-ctheme-mode');
  });

  it('is shown in the header on Community pages only, with Default selected', async () => {
    const { el, fixture, router } = await navbarAt('/community');
    const trigger = el.querySelector('.theme-slot .ctp-trigger');
    expect(trigger).toBeTruthy();
    expect(text(trigger)).toContain('Default');
    expect(root().hasAttribute('data-ctheme')).toBe(false);

    await router.navigateByUrl('/collection');
    fixture.detectChanges();
    expect(el.querySelector('.theme-slot')).toBeNull();
    expect(el.querySelector('.ctp-trigger')).toBeNull();
  });

  it('lists all twenty-two themes with their colours and audience, Default first', async () => {
    const { el, fixture } = await navbarAt('/community/profile');
    openPicker(el);
    fixture.detectChanges();
    const options = Array.from(el.querySelectorAll<HTMLButtonElement>('.ctp-panel [role="option"]'));
    expect(options.map((o) => o.dataset['theme'])).toEqual(COMMUNITY_THEMES.map((t) => t.id));
    const names = options.map((o) => text(o.querySelector('.ctp-option-text b')).replace(/^\W+/u, ''));
    expect(names).toEqual([
      'Default',
      'Winter Wonderland',
      'City Explorer',
      'Green Nature',
      'Travel Classic',
      'Midnight',
      'Cherry Blossom',
      'Tropical Paradise',
      'Mountain Escape',
      'Ocean Breeze',
      'Dreamscape',
      'Boarding Pass',
      'Cosmic',
      'Pixel World',
      'Social Snap',
      'Retro 90s',
      'Graffiti',
      'Fantasy',
      'Disney World',
      'Peppa Pig',
      'Dino World',
      'Unicorn Magic',
    ]);
    const byId = (id: string) => text(options.find((o) => o.dataset['theme'] === id));
    expect(byId('winter-wonderland')).toContain('Snow destinations');
    expect(byId('city-explorer')).toContain('Urban travelers');
    expect(byId('travel-classic')).toContain('Clean, professional profile');
    expect(byId('ocean-breeze')).toContain('Beach & island travelers');
    expect(byId('boarding-pass')).toContain('Aviation-inspired');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options.filter((o) => o.classList.contains('is-selected')).length).toBe(1);
  });

  it('applies a picked theme immediately, remembers it, and reverts to Default outside the Community', async () => {
    const { el, fixture, router } = await navbarAt('/community');
    openPicker(el);
    fixture.detectChanges();
    (el.querySelector('[data-theme="midnight"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root().getAttribute('data-ctheme')).toBe('midnight');
    expect(root().getAttribute('data-ctheme-mode')).toBe('dark');
    expect(el.querySelector('.ctp-panel')).toBeNull();
    expect(text(el.querySelector('.ctp-trigger'))).toContain('Midnight');
    expect(JSON.parse(localStorage.getItem(COMMUNITY_THEME_KEY)!)).toEqual({ guest: 'midnight' });
    // The token sheet for the theme is on the page.
    const sheets = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '');
    expect(sheets.some((s) => /data-ctheme=["']?midnight/.test(s) && s.includes('--ct-sf'))).toBe(true);

    // Profile / Message Book keep it…
    await router.navigateByUrl('/community/message-book');
    fixture.detectChanges();
    expect(root().getAttribute('data-ctheme')).toBe('midnight');

    // …leaving the Community via the header restores the website's default look.
    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(root().hasAttribute('data-ctheme-mode')).toBe(false);

    // Coming back re-applies the member's theme.
    await router.navigateByUrl('/profile');
    fixture.detectChanges();
    await renderDefer(fixture);
    expect(root().getAttribute('data-ctheme')).toBe('midnight');

    // Choosing Default again removes it.
    openPicker(el);
    fixture.detectChanges();
    (el.querySelector('[data-theme="default"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(JSON.parse(localStorage.getItem(COMMUNITY_THEME_KEY)!)).toEqual({});
  });

  it('provides local artwork for every non-default theme and renders decorative previews', async () => {
    const { el, fixture } = await navbarAt('/community');
    openPicker(el);
    fixture.detectChanges();
    expect(new Set(COMMUNITY_THEMES.map((t) => t.id)).size).toBe(22);
    expect(communityThemeArtwork('default')).toBeNull();
    expect(el.querySelector('[data-theme="default"] img')).toBeNull();
    for (const theme of COMMUNITY_THEMES.slice(1)) {
      const preview = el.querySelector(`[data-theme="${theme.id}"] .ctp-scene-preview`);
      expect(preview?.getAttribute('src')).toBe(communityThemeArtwork(theme.id));
      expect(preview?.getAttribute('alt')).toBe('');
    }
  });

  it('applies and persists every new world, including the correct light or dark mode', async () => {
    const { el, fixture } = await navbarAt('/community/profile');
    for (const theme of COMMUNITY_THEMES.slice(12)) {
      openPicker(el);
      fixture.detectChanges();
      (el.querySelector(`[data-theme="${theme.id}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(root().getAttribute('data-ctheme')).toBe(theme.id);
      expect(root().getAttribute('data-ctheme-mode')).toBe(theme.mode);
      expect(JSON.parse(localStorage.getItem(COMMUNITY_THEME_KEY)!)).toEqual({ guest: theme.id });
    }
    openPicker(el);
    fixture.detectChanges();
    (el.querySelector('[data-theme="default"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(root().hasAttribute('data-ctheme-mode')).toBe(false);
  });

  it('restores a saved new theme on load and ignores unrecognized theme IDs', async () => {
    localStorage.setItem(COMMUNITY_THEME_KEY, JSON.stringify({ guest: 'cosmic', invalid: 'not-a-theme' }));
    const { el } = await navbarAt('/community');
    expect(root().getAttribute('data-ctheme')).toBe('cosmic');
    expect(text(el.querySelector('.ctp-trigger'))).toContain('Cosmic');
    expect(communityTheme('not-a-theme').id).toBe('default');
  });

  it('keeps a separate theme per member', async () => {
    const { el, fixture } = await navbarAt('/community/profile');
    const community = TestBed.inject(CommunityService);
    const themes = TestBed.inject(CommunityThemeService);
    community.loginAsDemoUser('active_member');
    const id = String(community.currentUser()!.id);
    fixture.detectChanges();

    openPicker(el);
    fixture.detectChanges();
    (el.querySelector('[data-theme="cherry-blossom"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().getAttribute('data-ctheme')).toBe('cherry-blossom');
    expect(root().getAttribute('data-ctheme-mode')).toBe('light');
    expect(JSON.parse(localStorage.getItem(COMMUNITY_THEME_KEY)!)[id]).toBe('cherry-blossom');

    community.logout();
    fixture.detectChanges();
    expect(themes.userKey()).toBe('guest');
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(text(el.querySelector('.ctp-trigger'))).toContain('Default');

    community.loginAsDemoUser('active_member');
    fixture.detectChanges();
    expect(root().getAttribute('data-ctheme')).toBe('cherry-blossom');
  });

  it('dropdown is keyboard friendly: arrows move between themes, Escape closes and returns focus', async () => {
    const { el, fixture } = await navbarAt('/community');
    const trigger = el.querySelector('.ctp-trigger') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const options = Array.from(el.querySelectorAll<HTMLButtonElement>('.ctp-option'));
    options[0].focus();
    el.querySelector('.ctp-panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(options[1]);
    el.querySelector('.ctp-panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(options[options.length - 1]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.ctp-panel')).toBeNull();

    // Clicking outside also closes it.
    trigger.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(el.querySelector('.ctp-panel')).toBeNull();
  });
});
