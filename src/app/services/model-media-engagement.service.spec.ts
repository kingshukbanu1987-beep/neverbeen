import { TestBed } from '@angular/core/testing';
import { CommunityService } from './community.service';
import {
  ModelMediaEngagementService,
  SignInRequiredError,
} from './model-media-engagement.service';

const SLUG = 'test-studio-model';
const PHOTO = '/NeverBeenModels/TestStudioModel/frame-1.jpg';
const VIDEO = '/NeverBeenModels/TestStudioModel/video/clip-1.mp4';

describe('ModelMediaEngagementService', () => {
  let session: { authenticated: boolean; token: string | null; userId: number | null };

  const communityMock = () => ({
    isAuthenticated: () => session.authenticated,
    currentUser: () => (session.userId == null ? null : { id: session.userId, fullName: 'Test Member' }),
    token: () => session.token,
    guestBrowsing: () => false,
    apiUrl: 'https://neverbeen-api.test',
    apiLive: false,
  });

  beforeEach(() => {
    localStorage.clear();
    session = { authenticated: false, token: null, userId: null };
    TestBed.configureTestingModule({
      providers: [{ provide: CommunityService, useValue: communityMock() }],
    });
  });

  function service(): ModelMediaEngagementService {
    return TestBed.inject(ModelMediaEngagementService);
  }

  it('shows demo counters for every registered photograph without any sign-in', async () => {
    const api = service();
    api.registerModel(SLUG, [{ kind: 'photo', src: PHOTO }]);
    await api.loadStats(SLUG);

    const stats = api.statsFor(SLUG, 'photo', PHOTO);
    expect(stats.seen).toBeGreaterThan(0);
    expect(stats.likes).toBeGreaterThan(0);
    expect(stats.comments).toBeGreaterThanOrEqual(0);
    expect(stats.shares).toBeGreaterThanOrEqual(0);
    expect(stats.likedByMe).toBe(false);
  });

  it('counts an opened photograph once per visitor, even when it is re-opened', async () => {
    const api = service();
    api.registerModel(SLUG, [{ kind: 'photo', src: PHOTO }]);
    await api.loadStats(SLUG);

    const before = api.statsFor(SLUG, 'photo', PHOTO).seen;
    await api.recordView(SLUG, 'photo', PHOTO);
    const afterFirst = api.statsFor(SLUG, 'photo', PHOTO).seen;
    expect(afterFirst).toBe(before + 1);

    await api.recordView(SLUG, 'photo', PHOTO);
    expect(api.statsFor(SLUG, 'photo', PHOTO).seen).toBe(afterFirst);
  });

  it('refuses likes and comments without a Community session', async () => {
    const api = service();
    api.registerModel(SLUG, [{ kind: 'photo', src: PHOTO }]);

    await expect(api.toggleLike(SLUG, 'photo', PHOTO)).rejects.toBeInstanceOf(SignInRequiredError);
    await expect(api.addComment(SLUG, 'photo', PHOTO, 'hello')).rejects.toBeInstanceOf(
      SignInRequiredError,
    );
  });

  it('lets a signed-in member like, unlike and comment in the browser store', async () => {
    session = { authenticated: true, token: 'token-1', userId: 7 };
    const api = service();
    api.registerModel(SLUG, [{ kind: 'photo', src: PHOTO }, { kind: 'video', src: VIDEO }]);
    await api.loadStats(SLUG);

    const beforeLikes = api.statsFor(SLUG, 'photo', PHOTO).likes;
    const beforeComments = api.statsFor(SLUG, 'photo', PHOTO).comments;
    const liked = await api.toggleLike(SLUG, 'photo', PHOTO);
    expect(liked.likedByMe).toBe(true);
    expect(liked.likes).toBe(beforeLikes + 1);

    const unliked = await api.toggleLike(SLUG, 'photo', PHOTO);
    expect(unliked.likedByMe).toBe(false);
    expect(unliked.likes).toBe(beforeLikes);

    const comment = await api.addComment(SLUG, 'photo', PHOTO, '  A wonderful frame.  ');
    expect(comment.text).toBe('A wonderful frame.');
    expect(api.statsFor(SLUG, 'photo', PHOTO).comments).toBe(beforeComments + 1);
  });

  it('serves the conversation of each photograph publicly, including seeded voices', async () => {
    const api = service();
    api.registerModel(SLUG, [{ kind: 'photo', src: PHOTO }]);

    const page = await api.fetchComments(SLUG, 'photo', PHOTO);
    expect(page.items.length).toBeGreaterThanOrEqual(0);
    // The stored count and the thread always agree — no dangling counts.
    expect(api.statsFor(SLUG, 'photo', PHOTO).comments).toBe(page.totalCount);
    for (const item of page.items) {
      expect(item.text.length).toBeGreaterThan(0);
      expect(item.author.fullName || 'Community member').toBeTruthy();
    }
  });

  it('counts one share of a clip per visitor', async () => {
    const api = service();
    api.registerModel(SLUG, [{ kind: 'video', src: VIDEO }]);
    await api.loadStats(SLUG);

    const before = api.statsFor(SLUG, 'video', VIDEO).shares;
    await api.recordShare(SLUG, 'video', VIDEO);
    expect(api.statsFor(SLUG, 'video', VIDEO).shares).toBe(before + 1);
    await api.recordShare(SLUG, 'video', VIDEO);
    expect(api.statsFor(SLUG, 'video', VIDEO).shares).toBe(before + 1);
  });

  it('keeps every media separate — a video’s numbers never leak onto the photograph', async () => {
    const api = service();
    api.registerModel(SLUG, [
      { kind: 'photo', src: PHOTO },
      { kind: 'video', src: VIDEO },
    ]);
    await api.loadStats(SLUG);

    const videoSeenBefore = api.statsFor(SLUG, 'video', VIDEO).seen;
    const photoSeenBefore = api.statsFor(SLUG, 'photo', PHOTO).seen;
    await api.recordView(SLUG, 'photo', PHOTO);

    expect(api.statsFor(SLUG, 'photo', PHOTO).seen).toBe(photoSeenBefore + 1);
    expect(api.statsFor(SLUG, 'video', VIDEO).seen).toBe(videoSeenBefore);
    expect(api.key(SLUG, 'photo', PHOTO)).not.toBe(api.key(SLUG, 'video', VIDEO));
  });
});
