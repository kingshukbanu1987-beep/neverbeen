import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityProfile } from './profile';
import { CommunityService, getCookie, TOKEN_KEY, deleteCookie } from '../../../services/community.service';
import { GoogleMapsService, VERIFIED_GOOGLE_MAP_LOCATIONS } from '../../../services/google-maps.service';

describe('CommunityProfile', () => {
  let router: Router;
  let service: CommunityService;
  let googleMapsService: GoogleMapsService;

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
    googleMapsService = TestBed.inject(GoogleMapsService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Set up active user
    service.loginAsDemoUser('active_member');
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityProfile);
    fixture.detectChanges();
    return fixture;
  }

  it('renders left side panel with colorful icons in the specified order and double-size photo', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const leftPanel = element.querySelector('.left-side-panel');
    expect(leftPanel).toBeTruthy();

    // Verify double-size photo container and image
    expect(leftPanel!.querySelector('.user-photo-wrap-large')).toBeTruthy();
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

  it('supports mobile portrait mode with three horizontal lines hamburger toggle and Journey open by default', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Mobile header exists
    const mobileHeader = element.querySelector('.mobile-top-header');
    expect(mobileHeader).toBeTruthy();

    // Three horizontal lines hamburger button exists
    const hamburgerBtn = element.querySelector('.mobile-hamburger-btn');
    expect(hamburgerBtn).toBeTruthy();
    const lines = hamburgerBtn!.querySelectorAll('.hamburger-line');
    expect(lines.length).toBe(3);

    // Default section is Journey
    expect(component['activeSection']()).toBe('journey');
    expect(component['isMobileSidePanelOpen']()).toBe(false);

    // Toggle open
    component.toggleMobileSidePanel();
    fixture.detectChanges();
    expect(component['isMobileSidePanelOpen']()).toBe(true);

    // Close
    component.closeMobileSidePanel();
    fixture.detectChanges();
    expect(component['isMobileSidePanelOpen']()).toBe(false);
  });

  it('auto-searches Google Maps API for destination tag and restricts selection to available locations only', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    // Auto-search via Google Maps service
    component['destinationSearchInput'] = 'Kyoto';
    await component['onDestinationSearchInput']();
    fixture.detectChanges();

    const suggestions = component['destinationSuggestions']();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.name.includes('Kyoto'))).toBe(true);

    // Requirement D: If user attempts to post with unselected freeform destination text, reject it
    component['newJourneyText'] = 'Testing destination tags';
    component['destinationSearchInput'] = 'Unverified Place 999';
    component['selectedGoogleLocation'].set(null);

    component.submitJourneyPost();
    expect(component['destinationError']()).toContain('Only available locations from Google Maps');

    // Selecting an available location succeeds
    const kyotoLoc = suggestions.find((s) => s.name.includes('Kyoto'))!;
    component.selectGoogleLocation(kyotoLoc);
    expect(component['selectedGoogleLocation']()?.name).toContain('Kyoto');
    expect(component['destinationError']()).toBeNull();

    // Post to Journey with verified Google Maps location
    component['newJourneyText'] = 'Visiting Arashiyama Bamboo Grove at sunrise!';
    component.submitJourneyPost();
    fixture.detectChanges();

    const latestPost = service.journeyPosts()[0];
    expect(latestPost.text).toContain('Arashiyama');
    expect(latestPost.location).toContain('Kyoto');
  });

  it('enforces maximum 500 companion limit', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component['connectedCompanionsCount']()).toBeLessThanOrEqual(500);

    // Mock companions array reaching 500 connected companions
    const mockCompanions = Array.from({ length: 500 }, (_, i) => ({
      id: 1000 + i,
      fullName: `Companion ${i}`,
      profilePhotoUrl: '',
      country: 'France',
      city: 'Paris',
      profession: 'Traveler',
      isOnline: true,
      mutualCompanionsCount: 1,
      status: 'connected' as const,
    }));
    service.companions.set(mockCompanions);

    expect(service.companions().filter((c) => c.status === 'connected').length).toBe(500);

    // Attempting to approve 501st companion should fail
    const approved = service.approveCompanionshipRequest(999, 71);
    expect(approved).toBe(false);
  });

  it('opens any other user profile as a visitor on clicking their photo or username anywhere', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Elena Rostova (id: 33)
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    expect(component['viewingVisitor']()).toBeTruthy();
    expect(component['viewingVisitor']()?.fullName).toBe('Elena Rostova');

    const visitorHero = element.querySelector('.visitor-hero-card');
    expect(visitorHero).toBeTruthy();
    expect(element.querySelector('.visitor-name')?.textContent).toContain('Elena Rostova');
    expect(element.querySelector('.btn-back-to-my-profile')).toBeTruthy();

    // Clicking Back to My Journey returns to normal view
    component.closeVisitorProfile();
    fixture.detectChanges();
    expect(component['viewingVisitor']()).toBeNull();
  });

  it('provides Remove Companionship option when visiting a connected companion profile and breaks connection', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Visit connected companion Marco Rossi (id: 12)
    const marco = service.companions().find((c) => c.id === 12)!;
    expect(marco.status).toBe('connected');

    component.openVisitorProfile(marco);
    fixture.detectChanges();

    // Requirement G: Remove Companionship button must be present
    const removeBtn = element.querySelector<HTMLButtonElement>('.btn-remove-companion-action');
    expect(removeBtn).toBeTruthy();
    expect(removeBtn?.textContent).toContain('Remove Companionship');

    // Click Remove Companionship
    component.removeCompanionshipFromVisitor(marco.id);
    fixture.detectChanges();

    // Companionship connection is broken
    expect(service.companions().find((c) => c.id === marco.id)?.status).toBe('none');
    expect(component['viewingVisitor']()?.status).toBe('none');
  });

  it('supports endless recursive nested commenting on comments in Journey', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    const post = service.journeyPosts()[0];

    // Top-level comment (depth 0)
    service.addJourneyComment(post.id, 'Depth 0: Incredible view!');
    const comment0 = service.journeyPosts()[0].comments.find((c) => c.text.includes('Depth 0'))!;
    expect(comment0).toBeTruthy();
    expect(comment0.text).toContain('Depth 0');

    // First nested reply (depth 1)
    component.handleCommentThreadReply({
      postId: post.id,
      parentCommentId: comment0.id,
      text: 'Depth 1: Which camera was this taken with?',
    });
    const updatedPost = service.journeyPosts()[0];
    const parent0 = updatedPost.comments.find((c) => c.id === comment0.id)!;
    expect(parent0.replies?.length).toBe(1);
    const comment1 = parent0.replies![0];

    // Second nested reply (depth 2)
    component.handleCommentThreadReply({
      postId: post.id,
      parentCommentId: comment1.id,
      text: 'Depth 2: A Sony A7IV with 24-70mm GM II lens!',
    });
    const deepPost = service.journeyPosts()[0];
    const deepComment0 = deepPost.comments.find((c) => c.id === comment0.id)!;
    const deepComment1 = deepComment0.replies![0];
    expect(deepComment1.replies?.length).toBe(1);
    const comment2 = deepComment1.replies![0];

    // Third nested reply (depth 3 endless nesting)
    component.handleCommentThreadReply({
      postId: post.id,
      parentCommentId: comment2.id,
      text: 'Depth 3: Perfect choice for travel clarity!',
    });
    const endlessPost = service.journeyPosts()[0];
    const endlessComment0 = endlessPost.comments.find((c) => c.id === comment0.id)!;
    const endlessComment1 = endlessComment0.replies![0];
    const endlessComment2 = endlessComment1.replies![0];
    expect(endlessComment2.replies?.length).toBe(1);
    expect(endlessComment2.replies![0].text).toContain('Depth 3');
  });

  it('allows sharing a Journey post to own profile with custom caption and embedded original post', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const initialPostsCount = service.journeyPosts().length;

    // Pick a post from Elena
    const elenaPost = service.journeyPosts().find((p) => p.author.fullName?.includes('Elena'))!;
    expect(elenaPost).toBeTruthy();
    const initialShares = elenaPost.shareCount || 0;

    // Open share modal
    component.openShareModal(elenaPost);
    expect(component['showShareModal']()).toBe(true);
    expect(component['postToShare']()?.id).toBe(elenaPost.id);

    // Share with thoughts
    component['shareThoughtText'] = 'Adding Lake Como to my spring travel itinerary!';
    component.submitSharePost();
    fixture.detectChanges();

    expect(component['showShareModal']()).toBe(false);
    expect(service.journeyPosts().length).toBe(initialPostsCount + 1);

    const sharedPost = service.journeyPosts()[0];
    expect(sharedPost.isShared).toBe(true);
    expect(sharedPost.text).toContain('Adding Lake Como');
    expect(sharedPost.originalPost?.author.fullName).toContain('Elena');

    // Original post shareCount incremented
    const updatedElenaPost = service.journeyPosts().find((p) => p.id === elenaPost.id)!;
    expect(updatedElenaPost.shareCount).toBe(initialShares + 1);
  });

  it('enlarges profile photo in a lightbox modal on clicking the photo', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.photo-lightbox-card')).toBeNull();

    // Open lightbox
    component.openEnlargedPhoto();
    fixture.detectChanges();

    expect(element.querySelector('.photo-lightbox-card')).toBeTruthy();
    expect(element.querySelector('.enlarged-hero-img')).toBeTruthy();

    // Close lightbox
    component.closeEnlargedPhoto();
    fixture.detectChanges();
    expect(element.querySelector('.photo-lightbox-card')).toBeNull();
  });

  it('manages user active status with dropdown and enforces custom status restrictions (max 15 letters/space)', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    // Default status is Active
    expect(service.currentUser()?.activeStatus).toBe('Active');

    // Switch to Busy
    service.updateActiveStatus('Busy');
    fixture.detectChanges();
    expect(service.currentUser()?.activeStatus).toBe('Busy');

    // Switch to Away
    service.updateActiveStatus('Away');
    fixture.detectChanges();
    expect(service.currentUser()?.activeStatus).toBe('Away');

    // Switch to Don't Disturb
    service.updateActiveStatus("Don't Disturb");
    fixture.detectChanges();
    expect(service.currentUser()?.activeStatus).toBe("Don't Disturb");

    // Custom status validation: invalid with digits/special characters
    (component as any).customStatusInput = 'Alpine123!';
    component.applyCustomStatus();
    expect(component['statusError']()).toBeTruthy();

    // Custom status validation: invalid when over 15 characters
    (component as any).customStatusInput = 'This is way too long for a status';
    component.applyCustomStatus();
    expect(component['statusError']()).toBeTruthy();

    // Custom status valid (alphabet and spaces only, <= 15 chars)
    (component as any).customStatusInput = 'In Alps';
    component.applyCustomStatus();
    expect(component['statusError']()).toBeNull();
    expect(service.currentUser()?.activeStatus).toBe('Custom');
    expect(service.currentUser()?.customStatusText).toBe('In Alps');
  });

  it('allows locking and unlocking profile and enforces locked shield on non-connected travelers', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    // By default profile is unlocked
    expect(service.profile()?.isProfileLocked).toBe(false);

    // Lock profile
    component.toggleProfileLock();
    expect(service.profile()?.isProfileLocked).toBe(true);

    // Unlock profile
    component.toggleProfileLock();
    expect(service.profile()?.isProfileLocked).toBe(false);

    // Test viewing a locked traveler profile who is not connected (Maya Patel id: 71)
    const maya = service.companions().find((c) => c.id === 71)!;
    expect(maya.isProfileLocked).toBe(true);
    expect(maya.status).not.toBe('connected');

    component.openTravelerModal(maya);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const shieldBox = element.querySelector('.locked-profile-shield-box');
    expect(shieldBox).toBeTruthy();
    expect(shieldBox?.textContent).toContain('This Profile is Locked');
    expect(shieldBox?.textContent).toContain('Journey feeds, Companions, Circles, and About me are protected');

    // Connected companion profile is accessible without shield
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openTravelerModal(elena);
    fixture.detectChanges();
    expect(element.querySelector('.locked-profile-shield-box')).toBeNull();
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
    while (service.circles().length < 5) {
      service.createCircle(`Circle ${service.circles().length + 1}`, 'Description', [2, 3]);
    }
    expect(service.circles().length).toBe(5);

    // Attempt 6th circle should fail / be rejected
    const sixthCircle = service.createCircle('6th Circle', 'Overflow', []);
    expect(sixthCircle).toBeNull();
    expect(service.circles().length).toBe(5);
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

  it('terminates user session, sets status to Inactive, and navigates to Sign in page on clicking Log Out', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(getCookie(TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/community']);
  });
});
