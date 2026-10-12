import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityService } from '../../services/community.service';
import { ModelMediaEngagementService } from '../../services/model-media-engagement.service';
import { ModelMediaComments } from './model-media-comments';

const MEDIA_SRC = '/NeverBeenModels/TestStudioModel/frame-1.jpg';
const EXISTING_COMMENT = {
  id: 'existing-comment',
  text: 'The light in this frame is beautiful.',
  createdAtUtc: '2026-10-11T12:00:00.000Z',
  author: { id: 7, fullName: 'Sam Rivera', activeStatus: 'Active' },
};

@Component({
  imports: [ModelMediaComments],
  template: `
    <app-model-media-comments
      modelSlug="test-studio-model"
      mediaType="photo"
      [mediaSrc]="mediaSrc()"
    />
  `,
})
class CommentsHost {
  readonly mediaSrc = signal(MEDIA_SRC);
}

describe('ModelMediaComments', () => {
  let fixture: ComponentFixture<CommentsHost>;
  let element: HTMLElement;
  let authenticated: ReturnType<typeof signal<boolean>>;
  let mediaApi: {
    fetchComments: ReturnType<typeof vi.fn>;
    addComment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authenticated = signal(false);
    mediaApi = {
      fetchComments: vi.fn().mockResolvedValue({
        items: [EXISTING_COMMENT],
        totalCount: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      }),
      addComment: vi.fn().mockResolvedValue({
        id: 'new-comment',
        text: 'A lovely portrait.',
        createdAtUtc: '2026-10-12T12:00:00.000Z',
        author: { id: 3, fullName: 'Taylor Morgan', activeStatus: 'Active' },
      }),
    };

    const communityMock = {
      isAuthenticated: () => authenticated(),
      token: () => (authenticated() ? 'member-token' : null),
      currentUser: () => (authenticated() ? { id: 3, fullName: 'Taylor Morgan' } : null),
      apiUrl: 'https://neverbeen-api.test',
    };

    await TestBed.configureTestingModule({
      imports: [CommentsHost],
      providers: [
        provideRouter([]),
        { provide: CommunityService, useValue: communityMock },
        { provide: ModelMediaEngagementService, useValue: mediaApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentsHost);
    element = fixture.nativeElement as HTMLElement;
    await settle();
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows public comments and offers Google sign-in without a create-account path to guests', async () => {
    expect(element.querySelector('.mc-text')?.textContent).toContain(EXISTING_COMMENT.text);
    expect(mediaApi.fetchComments).toHaveBeenCalledWith(
      'test-studio-model',
      'photo',
      MEDIA_SRC,
      1,
      50,
    );
    expect(element.querySelector('.mc-signin-cta')?.textContent).toContain('Continue with Google');
    expect(element.textContent).not.toContain('Create your Community account');

    element.querySelector<HTMLButtonElement>('.mc-signin-cta')!.click();
    await settle();

    expect(element.querySelector('.signin-google')?.textContent).toContain('Continue with Google');
    expect(element.querySelector('.signin-join')).toBeNull();
    expect(element.querySelector('.signin-divider')).toBeNull();
    expect(element.querySelector('.signin-later')).toBeNull();
  });

  it('shows the comment composer to a signed-in Community member and posts in place', async () => {
    authenticated.set(true);
    await settle();

    const textarea = element.querySelector<HTMLTextAreaElement>('.mc-field textarea');
    expect(textarea).not.toBeNull();
    expect(element.querySelector('.mc-signin-cta')).toBeNull();

    textarea!.value = 'A lovely portrait.';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    element.querySelector<HTMLButtonElement>('.mc-post')!.click();
    await settle();

    expect(mediaApi.addComment).toHaveBeenCalledWith(
      'test-studio-model',
      'photo',
      MEDIA_SRC,
      'A lovely portrait.',
    );
    expect(element.querySelector('.mc-item .mc-text')?.textContent).toContain('A lovely portrait.');
  });
});
