import { Component } from '@angular/core';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { COMMUNITY_THEME_KEY, CommunityThemeService, communityTheme, communityThemeArtwork } from './community-themes';
import { deleteCookie, TOKEN_KEY } from '../../services/community.service';

@Component({ template: '' })
class Blank {}

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
  for (const block of await fixture.getDeferBlocks()) await block.render(DeferBlockState.Complete);
  fixture.detectChanges();
  return { fixture, router, el: fixture.nativeElement as HTMLElement };
}

describe('Community themes (hidden)', () => {
  beforeEach(() => {
    localStorage.clear();
    deleteCookie(TOKEN_KEY);
    root().removeAttribute('data-ctheme');
    root().removeAttribute('data-ctheme-mode');
  });

  it('shows no theme dropdown in the Community header — Default is the only look', async () => {
    const { el, fixture, router } = await navbarAt('/community/message-book');
    expect(el.querySelector('.theme-slot')).toBeNull();
    expect(el.querySelector('.ctp-trigger')).toBeNull();
    expect(el.querySelector('.ctp-panel')).toBeNull();
    // The Community always renders with the Default look (no theme attribute).
    expect(root().hasAttribute('data-ctheme')).toBe(false);

    await router.navigateByUrl('/community/profile');
    fixture.detectChanges();
    expect(el.querySelector('.theme-slot')).toBeNull();
    expect(el.querySelector('.ctp-trigger')).toBeNull();
    expect(root().hasAttribute('data-ctheme')).toBe(false);

    await router.navigateByUrl('/collection');
    fixture.detectChanges();
    expect(el.querySelector('.theme-slot')).toBeNull();
    expect(el.querySelector('.ctp-trigger')).toBeNull();
  });

  it('keeps the Default theme even when a different theme was stored earlier', async () => {
    localStorage.setItem(COMMUNITY_THEME_KEY, JSON.stringify({ guest: 'midnight' }));
    TestBed.configureTestingModule({});
    const themes = TestBed.inject(CommunityThemeService);
    expect(themes.themeId()).toBe('default');
    expect(themes.theme().id).toBe('default');
    themes.apply();
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(root().hasAttribute('data-ctheme-mode')).toBe(false);
  });

  it('ignores theme selections — the choice is locked to Default', async () => {
    TestBed.configureTestingModule({});
    const themes = TestBed.inject(CommunityThemeService);
    themes.select('midnight');
    expect(themes.themeId()).toBe('default');
    themes.apply(true);
    expect(root().hasAttribute('data-ctheme')).toBe(false);
    expect(root().hasAttribute('data-ctheme-mode')).toBe(false);
    themes.select('default');
    expect(themes.themeId()).toBe('default');
  });

  it('falls back to Default for unknown ids and has no artwork for it', () => {
    expect(communityTheme('not-a-theme').id).toBe('default');
    expect(communityTheme(null).id).toBe('default');
    expect(communityThemeArtwork('default')).toBeNull();
  });
});
