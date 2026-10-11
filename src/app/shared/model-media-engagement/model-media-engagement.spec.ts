import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityService } from '../../services/community.service';
import {
  MediaEngagementStats,
  ModelMediaEngagementService,
} from '../../services/model-media-engagement.service';
import { ModelMediaEngagementBar } from './model-media-engagement';

const ZERO: MediaEngagementStats = { seen: 128, likes: 42, comments: 7, shares: 12, likedByMe: false };

@Component({
  imports: [ModelMediaEngagementBar],
  template: `
    <app-model-media-engagement
      [modelSlug]="slug"
      [mediaType]="type"
      [mediaSrc]="src"
      [layout]="layout()"
      [commentsAction]="action()"
      (comments)="comments += 1"
    />
  `,
})
class BarHost {
  readonly slug = 'test-studio-model';
  readonly type: 'photo' | 'video' = 'photo';
  readonly src = '/NeverBeenModels/TestStudioModel/frame-1.jpg';
  readonly layout = signal<'overlay' | 'row'>('overlay');
  readonly action = signal<'gate' | 'open'>('gate');
  comments = 0;
}

describe('ModelMediaEngagementBar', () => {
  let session: { authenticated: boolean };
  let fixture: ComponentFixture<BarHost>;
  let element: HTMLElement;
  let toggleLike: ReturnType<typeof vi.fn>;
  let recordedShare: ReturnType<typeof vi.fn>;

  const stats = signal<MediaEngagementStats>({ ...ZERO });

  beforeEach(async () => {
    session = { authenticated: false };
    stats.set({ ...ZERO });
    toggleLike = vi.fn().mockImplementation(async () => {
      stats.update((current) => ({ ...current, likedByMe: !current.likedByMe, likes: current.likes + 1 }));
      return stats();
    });
    recordedShare = vi.fn().mockResolvedValue(undefined);

    const engagementMock = {
      statsFor: () => stats(),
      toggleLike,
      recordShare: recordedShare,
      fetchComments: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 }),
    };
    const communityMock = {
      isAuthenticated: () => session.authenticated,
      currentUser: () => (session.authenticated ? { id: 3, fullName: 'Test Member' } : null),
      token: () => (session.authenticated ? 'token' : null),
      apiUrl: 'https://neverbeen-api.test',
      apiLive: false,
      guestBrowsing: () => false,
    };

    await TestBed.configureTestingModule({
      imports: [BarHost],
      providers: [
        provideRouter([]),
        { provide: ModelMediaEngagementService, useValue: engagementMock },
        { provide: CommunityService, useValue: communityMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarHost);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const seen = () => element.querySelector('.eng-seen .eng-count')?.textContent?.trim();
  const like = () => element.querySelector<HTMLButtonElement>('.eng-like')!;
  const comment = () => element.querySelector<HTMLButtonElement>('.eng-comment')!;
  const share = () => element.querySelector<HTMLButtonElement>('.eng-share')!;

  it('shows four separate opinions with their own counts', async () => {
    expect(element.querySelector('.eng-seen')).not.toBeNull();
    expect(like()).not.toBeNull();
    expect(comment()).not.toBeNull();
    expect(share()).not.toBeNull();
    expect(seen()).toBe('128');
    expect(like().querySelector('.eng-count')?.textContent?.trim()).toBe('42');
    expect(comment().querySelector('.eng-count')?.textContent?.trim()).toBe('7');
    expect(share().querySelector('.eng-count')?.textContent?.trim()).toBe('12');

    // The icons are real, transparent line icons — no emoji glyphs.
    expect(element.querySelectorAll('.eng-icon').length).toBe(4);
    expect(element.textContent).not.toContain('👁');
  });

  it('pops the Community sign-in when a visitor taps Like or Comments', async () => {
    expect(element.querySelector('.signin-overlay')).toBeNull();

    like().click();
    fixture.detectChanges();
    expect(element.querySelector('.signin-overlay')).not.toBeNull();
    expect(element.querySelector('.signin-card')?.textContent).toContain('Continue with Google');
    expect(toggleLike).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('.signin-close')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.signin-overlay')).toBeNull();

    comment().click();
    fixture.detectChanges();
    expect(element.querySelector('.signin-overlay')).not.toBeNull();
    expect(fixture.componentInstance.comments).toBe(0);
  });

  it('likes in place for a signed-in member and hands the thread to the host', async () => {
    session.authenticated = true;

    like().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toggleLike).toHaveBeenCalledTimes(1);
    expect(like().getAttribute('aria-pressed')).toBe('true');
    expect(like().classList).toContain('is-on');

    comment().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.comments).toBe(1);
    expect(element.querySelector('.signin-overlay')).toBeNull();
  });

  it('always lets the host open comments when the pop-up owns the thread', async () => {
    fixture.componentInstance.action.set('open');
    fixture.detectChanges();

    comment().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.comments).toBe(1);
    expect(element.querySelector('.signin-overlay')).toBeNull();
  });

  it('records a share once the link is copied, and says so', async () => {
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    share().click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(recordedShare).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.eng-toast')?.textContent).toContain('Link copied');
  });
});
