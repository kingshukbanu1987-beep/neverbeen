import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityMessageBook } from './message-book';
import { CommunityService } from '../../../services/community.service';

describe('CommunityMessageBook', () => {
  let service: CommunityService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityMessageBook],
      providers: [provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(CommunityService);
    service.loginAsDemoUser('active_member');
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityMessageBook);
    fixture.detectChanges();
    return fixture;
  }

  it('renders threads and posts', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const cards = element.querySelectorAll('.post-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('allows authenticated members to submit a new message', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const initialCount = service.comments().length;

    component['newPostText'] = 'Testing the NeverBeen Message Book!';
    await component.submitPost();

    expect(service.comments().length).toBe(initialCount + 1);
    expect(service.comments()[0].text).toBe('Testing the NeverBeen Message Book!');
  });

  it('allows reacting to messages with likes', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const firstComment = service.comments()[0];
    const initialLikes = firstComment.likeCount;

    await component.react(firstComment.id, 'like');
    const updated = service.comments().find((c) => c.id === firstComment.id);
    expect(updated?.likeCount).toBe(initialLikes + 1);
  });
});
