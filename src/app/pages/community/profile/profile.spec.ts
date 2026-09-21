import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityProfile } from './profile';
import { CommunityService, getCookie, TOKEN_KEY, deleteCookie } from '../../../services/community.service';

describe('CommunityProfile', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [CommunityProfile],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    service = TestBed.inject(CommunityService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Set up active user
    service.loginAsDemoUser('active_member');
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    return fixture;
  }

  it('renders left side panel with colorful icons in the specified order', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const leftPanel = element.querySelector('.left-side-panel');
    expect(leftPanel).toBeTruthy();

    expect(leftPanel!.querySelector('.user-avatar-img')).toBeTruthy();
    expect(leftPanel!.querySelector('.profile-full-name')?.textContent?.trim()).toContain('Sophia Laurent');
    expect(leftPanel!.querySelector('.profile-location')?.textContent?.trim()).toContain('Paris');

    const menuButtons = Array.from(leftPanel!.querySelectorAll<HTMLButtonElement>('.menu-btn'));
    const menuLabels = menuButtons.map((b) => b.textContent?.trim());

    // Verify order: About me, Journey, Gallery, MessageBook, Companions, Circles, Messenger, Notifications, Settings, Log Out
    expect(menuLabels[0]).toContain('About me');
    expect(menuLabels[1]).toContain('Journey');
    expect(menuLabels[2]).toContain('Gallery');
    expect(menuLabels[3]).toContain('MessageBook');
    expect(menuLabels[4]).toContain('Companions');
    expect(menuLabels[5]).toContain('Circles');
    expect(menuLabels[6]).toContain('Messenger');
    expect(menuLabels[7]).toContain('Notifications');
    expect(menuLabels[8]).toContain('Settings');
    expect(menuLabels[9]).toContain('Log Out');

    // Verify colorful icon badges
    const iconPills = Array.from(leftPanel!.querySelectorAll('.icon-pill'));
    expect(iconPills.length).toBe(10);
    expect(leftPanel!.querySelector('.pill-violet')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-emerald')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-amber')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-blue')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-rose')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-indigo')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-cyan')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-coral')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-slate')).toBeTruthy();
    expect(leftPanel!.querySelector('.pill-red')).toBeTruthy();
  });

  it('opens Journey section by default in the right side wide panel showing traveler feeds and wall post composer', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const widePanel = element.querySelector('.right-wide-panel');
    expect(widePanel).toBeTruthy();
    expect(widePanel!.querySelector('.section-title')?.textContent?.trim()).toBe('Journey');
    expect(widePanel!.querySelector('.journey-composer-card')).toBeTruthy();
    expect(widePanel!.querySelectorAll('.journey-post-card').length).toBeGreaterThan(0);
  });

  it('allows posting text to Journey and toggling likes and comments', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const initialPostsCount = service.journeyPosts().length;

    // Compose a new Journey post
    (component as any).newJourneyText = 'Exploring secret alleys in Montmartre with my Leica!';
    (component as any).selectedLocation = 'Paris, France';
    component['submitJourneyPost']();
    fixture.detectChanges();

    expect(service.journeyPosts().length).toBe(initialPostsCount + 1);
    expect(service.journeyPosts()[0].text).toContain('Montmartre');

    // Like the post
    const postId = service.journeyPosts()[0].id;
    const initialLikes = service.journeyPosts()[0].likeCount;
    component['toggleLikePost'](postId);
    fixture.detectChanges();
    expect(service.journeyPosts()[0].likeCount).toBe(initialLikes + 1);

    // Comment on the post
    (component as any).journeyCommentText = 'Magnificent view!';
    component['submitJourneyComment'](postId);
    fixture.detectChanges();
    expect(service.journeyPosts()[0].comments.some((c) => c.text === 'Magnificent view!')).toBe(true);
  });

  it('renders Circles side panel below main side panel and limits circles to maximum 5', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const circlesSidePanel = element.querySelector('.circles-side-panel');
    expect(circlesSidePanel).toBeTruthy();
    expect(circlesSidePanel!.querySelector('.circles-subhead')?.textContent?.trim()).toBe('My Circles');

    // Seed circles should be present
    expect(service.circles().length).toBeGreaterThan(0);
    expect(service.circles().length).toBeLessThanOrEqual(5);

    // Try adding more than 5 circles
    const comp = fixture.componentInstance;
    while (service.circles().length < 5) {
      service.createCircle(`Circle ${service.circles().length + 1}`, 'Description', [2, 3]);
    }
    expect(service.circles().length).toBe(5);

    // Attempt 6th circle should fail / be rejected
    const sixthCircle = service.createCircle('6th Circle', 'Overflow', []);
    expect(sixthCircle).toBeNull();
    expect(service.circles().length).toBe(5);
  });

  it('provides search for travelers and circles at top left with companionship request', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    (component as any).searchQuery.set('Marco');
    component['onSearchInput']();
    fixture.detectChanges();

    const results = component['searchResults']();
    expect(results.travelers.length).toBeGreaterThan(0);
    expect(results.travelers[0].fullName).toContain('Marco');

    // Request companionship for a traveler not yet connected
    const targetTraveler = service.companions().find((c) => c.status === 'none');
    if (targetTraveler) {
      component['requestCompanionship'](targetTraveler.id);
      expect(service.companions().find((c) => c.id === targetTraveler.id)?.status).toBe('pending_outgoing');
    }
  });

  it('manages companionship requests in Notifications with Approve and Reject actions', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    // Switch to notifications
    component.setSection('notifications');
    fixture.detectChanges();

    const requestNotif = service.notifications().find((n) => n.type === 'companionship_request' && n.status === 'pending');
    expect(requestNotif).toBeTruthy();

    if (requestNotif) {
      const applicantId = requestNotif.fromUser.id;
      component['approveRequest'](requestNotif.id, applicantId);
      fixture.detectChanges();

      // Should now be approved
      const updatedNotif = service.notifications().find((n) => n.id === requestNotif.id);
      expect(updatedNotif?.status).toBe('approved');

      // The applicant should now be connected in Companions
      const companion = service.companions().find((c) => c.id === applicantId);
      expect(companion?.status).toBe('connected');
    }
  });

  it('opens floating chat boxes at the bottom via Messenger and allows minimize/close up to 5', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Open chat with Elena
    const elena = service.companions().find((c) => c.fullName.includes('Elena'))!;
    component['openChatWith'](elena);
    fixture.detectChanges();

    expect(service.activeChatBoxes().length).toBe(1);
    expect(element.querySelector('.floating-chat-dock')).toBeTruthy();
    expect(element.querySelector('.chat-popup-box')).toBeTruthy();
    expect(element.querySelector('.chat-user-name')?.textContent).toContain('Elena');

    // Send a message
    component['sendChat'](elena.id, 'Hello Elena! Are you ready for Tokyo?');
    fixture.detectChanges();
    const chatBox = service.activeChatBoxes().find((b) => b.companionId === elena.id);
    expect(chatBox?.messages.some((m) => m.text.includes('Tokyo'))).toBe(true);

    // Minimize and close
    component['toggleMinimize'](elena.id);
    fixture.detectChanges();
    expect(service.activeChatBoxes().find((b) => b.companionId === elena.id)?.isMinimized).toBe(true);

    component['closeChat'](elena.id);
    fixture.detectChanges();
    expect(service.activeChatBoxes().length).toBe(0);
  });

  it('navigates cleanly across all sections in the wide panel', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // About me
    component.setSection('about');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('About Me');

    // Gallery
    component.setSection('gallery');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Vacation Gallery');

    // MessageBook
    component.setSection('messagebook');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Community MessageBook');

    // Companions
    component.setSection('companions');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Travel Companions');

    // Circles
    component.setSection('circles');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Travel Circles');

    // Messenger
    component.setSection('messenger');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Messenger');

    // Notifications
    component.setSection('notifications');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Notifications');

    // Settings
    component.setSection('settings');
    fixture.detectChanges();
    expect(element.querySelector('.right-wide-panel .section-title')?.textContent?.trim()).toBe('Settings');
  });

  it('terminates user session and navigates to Sign in page on clicking Log Out', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(getCookie(TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/community']);
  });
});
