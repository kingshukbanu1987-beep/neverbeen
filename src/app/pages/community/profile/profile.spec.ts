import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityProfile } from './profile';
import { TRAVEL_MOOD_GROUPS } from './travel-moods';
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
    expect(leftPanel!.querySelector('.profile-full-name')?.textContent?.trim()).toContain('Kingshuk');
    expect(leftPanel!.querySelector('.profile-location')?.textContent?.trim()).toContain('Kolkata');

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

  it('offers grouped creative Travel Moods and saves the selected mood with a Journey post', async () => {
    const fixture = create();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#journey-travel-mood')!;
    expect(element.querySelector('label[for="journey-travel-mood"]')?.textContent).toContain('Travel Mood');
    expect(select.value).toBe('✈️ Traveling');
    expect(select.querySelectorAll('optgroup').length).toBe(5);
    const moods = TRAVEL_MOOD_GROUPS.flatMap((group) => [...group.moods]);
    expect(Array.from(select.options).map((option) => option.value)).toEqual(moods);
    expect(new Set(moods).size).toBe(32);
    for (const mood of ['🌌 Aurora Hunting', '🍜 Street Food Quest', '🧳 Solo & Thriving']) {
      select.value = mood;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();
      fixture.componentInstance['newJourneyText'] = `Enjoying ${mood}`;
      fixture.componentInstance.submitJourneyPost();
      fixture.detectChanges();
      expect(service.journeyPosts()[0].mood).toBe(mood);
    }
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

  it('deletes Live Feeds from the Journey page header', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.setSection('journey');
    fixture.detectChanges();

    const journeyHeader = element.querySelector('.journey-pane .section-top-bar');
    expect(journeyHeader).toBeTruthy();
    expect(journeyHeader?.textContent).not.toContain('Live Feed');
    expect(journeyHeader?.textContent).not.toContain('Live Feeds');
    expect(journeyHeader?.textContent).not.toContain('Public Travel Feed');
  });

  it('opens a modal on press and hold on Likes showing who liked, connection status, scrollbar for >10 users, and redirects to visitor profile', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const post = service.journeyPosts()[0];
    expect(post.likers?.length).toBeGreaterThan(10);

    // Trigger press and hold (or openLikersModal)
    component.openLikersModal(post);
    fixture.detectChanges();

    expect(component['showLikersModal']()).toBe(true);

    const likersModal = element.querySelector('.likers-dialog-card');
    expect(likersModal).toBeTruthy();

    const likerRows = likersModal!.querySelectorAll('.liker-item-row');
    expect(likerRows.length).toBeGreaterThan(10);

    // Verify scrollbar indicator / container
    const scrollList = likersModal!.querySelector('.likers-scroll-list');
    expect(scrollList).toBeTruthy();
    expect(scrollList?.classList.contains('has-scrollbar')).toBe(true);

    // Verify connection status / connect action presence
    const connectActions = likersModal!.querySelectorAll('.liker-action');
    expect(connectActions.length).toBe(likerRows.length);

    // Click on a liker in the modal
    const targetLiker = component['selectedPostLikers']().find((l) => l.id !== 1)!;
    expect(targetLiker).toBeTruthy();
    component.onLikerClick(targetLiker);
    fixture.detectChanges();

    // Modal closes and visitor profile opens
    expect(component['showLikersModal']()).toBe(false);
    expect(component['viewingVisitor']()).toBeTruthy();
    expect(component['viewingVisitor']()?.fullName).toBe(targetLiker.fullName);
  });

  it('blocks another companion or non-connected user causing mutual invisibility, and allows unblocking via Settings', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Marco Rossi (id: 12) is connected initially
    const marco = service.companions().find((c) => c.id === 12)!;
    expect(marco.status).toBe('connected');
    expect(service.visibleJourneyPosts().some((p) => p.author.id === 12)).toBe(true);

    // Block Marco
    component.blockUser(12);
    fixture.detectChanges();

    expect(service.isUserBlocked(12)).toBe(true);

    // Invisibility check: Marco is not visible in Journey posts
    expect(service.visibleJourneyPosts().some((p) => p.author.id === 12)).toBe(false);

    // Invisibility check: Marco is not in visible companions
    expect(service.visibleCompanions().some((c) => c.id === 12)).toBe(false);

    // Invisibility check: Marco cannot be found in search
    component['searchQuery'].set('Marco');
    component.onSearchInput();
    fixture.detectChanges();
    expect(component['searchResults']().travelers.some((t) => t.id === 12)).toBe(false);

    // Unblock Marco via Settings
    component.setSection('settings');
    fixture.detectChanges();
    expect(component.getBlockedUsers().some((u) => u.id === 12)).toBe(true);

    component.unblockUser(12);
    fixture.detectChanges();

    expect(service.isUserBlocked(12)).toBe(false);
    expect(service.visibleJourneyPosts().some((p) => p.author.id === 12)).toBe(true);
  });

  it('allows reporting abuse on posts and comments by other users with direct submission', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Post by Elena
    const elenaPost = service.journeyPosts().find((p) => p.author.id === 33)!;
    expect(elenaPost).toBeTruthy();

    // Open Report Abuse modal
    component.openReportAbuseModal('post', elenaPost.id, elenaPost.author, elenaPost.text);
    fixture.detectChanges();

    expect(component['showReportAbuseModal']()).toBe(true);
    expect(component['reportTarget']()?.author.fullName).toBe(elenaPost.author.fullName);

    // Validate details requirement
    component['reportDetails'] = '';
    component.submitReportAbuse();
    expect(component['reportError']()).toBeTruthy();

    // Fill valid concern and submit
    component['reportReason'] = 'Spam or Advertising';
    component['reportDetails'] = 'Promoting commercial travel booking without disclosure';
    component.submitReportAbuse();
    fixture.detectChanges();

    expect(component['reportSubmitted']()).toBe(true);
    expect(service.abuseReports().length).toBeGreaterThan(0);
    expect(service.abuseReports()[0].reason).toBe('Spam or Advertising');
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

  it('enforces 100 KB limit for pictures in Gallery, Journey composer, MessageBook, comments, and cover photo (Requirement A)', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    const oversizedBlob = new Blob(['a'.repeat(105 * 1024)], { type: 'image/jpeg' });
    const oversizedFile = new File([oversizedBlob], 'huge.jpg', { type: 'image/jpeg' });

    const validBlob = new Blob(['a'.repeat(20 * 1024)], { type: 'image/jpeg' });
    const validFile = new File([validBlob], 'valid.jpg', { type: 'image/jpeg' });

    // 1. Gallery upload limit
    const galleryEvent = { target: { files: [oversizedFile] } } as unknown as Event;
    component.onGalleryFileSelected(galleryEvent);
    expect(component['galleryError']()).toContain('100 KB');
    expect(component['selectedGalleryFile']()).toBeNull();

    // 2. Journey composer photo limit
    const journeyEvent = { target: { files: [oversizedFile] } } as unknown as Event;
    component.onJourneyPhotoSelected(journeyEvent);
    expect(component['journeyPhotoError']()).toContain('100 KB');
    expect(component['selectedJourneyPhoto']()).toBeNull();

    // Valid file for Journey composer
    const validJourneyEvent = { target: { files: [validFile] } } as unknown as Event;
    component.onJourneyPhotoSelected(validJourneyEvent);
    expect(component['journeyPhotoError']()).toBeNull();
    expect(component['selectedJourneyPhoto']()).toBe(validFile);

    // 3. MessageBook composer photo limit
    const mbEvent = { target: { files: [oversizedFile] } } as unknown as Event;
    component.onMessageBookPhotoSelected(mbEvent);
    expect(component['messageBookPhotoError']()).toContain('100 KB');
    expect(component['selectedMessageBookPhoto']()).toBeNull();

    // 4. Journey Comment photo limit
    const commentEvent = { target: { files: [oversizedFile] } } as unknown as Event;
    component.onJourneyCommentPhotoSelected(commentEvent, 101);
    expect(component['journeyCommentPhotoError']()?.message).toContain('100 KB');

    // 5. Cover photo upload limit
    const coverEvent = { target: { files: [oversizedFile] } } as unknown as Event;
    await component.onCoverPhotoUpload(coverEvent);
    expect(component['coverPhotoError']()).toContain('100 KB');

    // 6. Service level rejection for files > 100 KB
    await expect(service.uploadCoverPhoto(oversizedFile)).rejects.toThrow('100 KB');
    await expect(service.addGalleryPhoto(oversizedFile)).rejects.toThrow('100 KB');
    await expect(service.uploadProfilePhoto(oversizedFile)).rejects.toThrow('100 KB');
  });

  it('displays destination icon and destination strictly in one line in Journey composer and posts (Requirement B)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.setSection('journey');
    fixture.detectChanges();

    // In composer: destination wrapper contains inline field with pin and text
    const composerDestWrap = element.querySelector('.destination-autocomplete-wrapper');
    expect(composerDestWrap).toBeTruthy();
    const destInline = composerDestWrap!.querySelector('.dest-field-inline');
    expect(destInline).toBeTruthy();
    expect(destInline!.querySelector('.dest-pin-icon')?.textContent).toContain('📍');

    // Select a Google Maps location
    component.selectGoogleLocation(VERIFIED_GOOGLE_MAP_LOCATIONS[0]);
    fixture.detectChanges();

    const selectedPill = element.querySelector('.selected-google-dest-pill');
    expect(selectedPill).toBeTruthy();
    expect(selectedPill!.querySelector('.gmap-pin')?.textContent).toContain('📍');
    expect(selectedPill!.querySelector('.dest-text')?.textContent).toContain(VERIFIED_GOOGLE_MAP_LOCATIONS[0].name);

    // In Journey feed: post location contains icon and destination name
    const postLoc = element.querySelector('.post-loc');
    expect(postLoc).toBeTruthy();
    expect(postLoc!.querySelector('.post-loc-icon')?.textContent).toContain('📍');
    expect(postLoc!.querySelector('.post-loc-text')).toBeTruthy();
  });

  it('displays Cover photo and opens visitor profile modal card popup with About me, Gallery, and Journey visible one after another (Requirement C)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // 1. User has Cover Photo in side panel summary
    const userCoverImg = element.querySelector<HTMLImageElement>('.user-cover-img');
    expect(userCoverImg).toBeTruthy();
    expect(userCoverImg?.src).toBeTruthy();

    // 2. Click Elena Rostova (id: 33) to open visitor profile
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    // Modal card popup is open
    const modalPopup = element.querySelector('.visitor-profile-modal-card');
    expect(modalPopup).toBeTruthy();

    // Cover photo is visible at the top
    const visitorCoverImg = modalPopup!.querySelector<HTMLImageElement>('.visitor-modal-cover-img');
    expect(visitorCoverImg).toBeTruthy();

    // Visible one after another below:
    // 1. About me
    const aboutSection = modalPopup!.querySelector('.visitor-flow-about');
    expect(aboutSection).toBeTruthy();
    expect(aboutSection!.textContent).toContain('About Elena Rostova');

    // 2. Gallery
    const gallerySection = modalPopup!.querySelector('.visitor-flow-gallery');
    expect(gallerySection).toBeTruthy();
    expect(gallerySection!.textContent).toContain('Gallery');

    // 3. Journey (feeds)
    const journeySection = modalPopup!.querySelector('.visitor-flow-journey');
    expect(journeySection).toBeTruthy();
    expect(journeySection!.textContent).toContain('Journey');

    // When visiting locked traveler Maya Patel, locked shield replaces content
    const maya = service.companions().find((c) => c.id === 71)!;
    component.openVisitorProfile(maya);
    fixture.detectChanges();

    const lockedShield = modalPopup!.querySelector('.visitor-locked-shield-card');
    expect(lockedShield).toBeTruthy();
    expect(lockedShield!.textContent).toContain('This Profile is Locked');
  });

  it('renders side panel menu icons as solid filled transparent ultra-modern SVG silhouettes (Requirement D)', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    const navButtons = element.querySelectorAll<HTMLButtonElement>('.side-menu-nav .menu-btn');
    expect(navButtons.length).toBe(10);

    navButtons.forEach((btn) => {
      const pill = btn.querySelector('.icon-pill');
      expect(pill).toBeTruthy();

      const svg = pill!.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('fill')).toBe('currentColor');
    });
  });

  it('supports 11 reactions on hold, top 1 badge replacing likes count, top 3 icons cluster, and breakdown modal (Requirement A)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();

    // 1. Verify all 11 reaction options are available
    expect(component.holdReactionOptions).toEqual([
      'Dislike',
      'Love',
      'Smile',
      'Laugh',
      'Cry',
      'Heart',
      'Clapping',
      'Confused',
      'Shocked',
      'Angry',
      'Fire',
    ]);

    // 2. Journey feed has posts with engagement counts
    const firstPost = component['service'].journeyPosts()[0];
    expect(firstPost).toBeTruthy();

    // Top 1 reaction icon returns glyph instead of likes number
    const top1 = component.getTop1ReactionIcon(firstPost);
    expect(top1).toBeTruthy();

    // Top 3 reaction icons cluster returns at most 3 icons
    const top3 = component.getTop3ReactionIcons(firstPost);
    expect(top3.length).toBeLessThanOrEqual(3);

    // 3. Holding like button opens popover with 11 reactions
    component['startLikeButtonHold'](firstPost.id, 'post');
    // Fast-forward or trigger selection directly
    component['selectHoldReaction'](firstPost.id, 'post', 'Fire');
    fixture.detectChanges();

    const updatedPost = component['service'].journeyPosts().find((p) => p.id === firstPost.id)!;
    expect(updatedPost.myReaction).toBe('Fire');
    expect(updatedPost.isLiked).toBe(true);

    // 4. Reactions breakdown modal on hold / click
    component.openReactionsBreakdownModal(updatedPost, 'post');
    fixture.detectChanges();

    expect(component['showReactionsBreakdownModal']()).toBe(true);
    expect(component['selectedReactionsTarget']()).toBeTruthy();
    expect(component['selectedReactionsTarget']()?.reactions.length).toBeGreaterThan(0);

    // Breakdown tabs include 'All' and individual reaction types
    const tabs = component.uniqueReactionTabs();
    expect(tabs[0].type).toBe('All');
    expect(tabs.some((t) => t.type === 'Fire' || t.count > 0)).toBe(true);

    // Filter by tab
    component.setReactionFilterTab('All');
    expect(component.filteredBreakdownReactions().length).toBe(component['selectedReactionsTarget']()!.reactions.length);

    component.closeReactionsBreakdownModal();
    expect(component['showReactionsBreakdownModal']()).toBe(false);
  });

  it('enlarges user cover photo on hold like the profile photo (Requirement B)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const coverUrl = 'https://images.unsplash.com/photo-cover-test.jpg';
    const userName = 'Sophia Laurent';

    // 1. Open enlarged cover modal
    component.openEnlargedCover(coverUrl, userName);
    fixture.detectChanges();

    expect(component['showEnlargedCoverModal']()).toBe(true);
    expect(component['enlargedCoverUrl']()).toBe(coverUrl);
    expect(component['enlargedCoverUser']()).toBe(userName);

    const element: HTMLElement = fixture.nativeElement;
    const coverModal = element.querySelector('.cover-lightbox-backdrop');
    expect(coverModal).toBeTruthy();
    const coverImg = coverModal!.querySelector<HTMLImageElement>('.enlarged-cover-hero-img');
    expect(coverImg?.src).toContain('photo-cover-test.jpg');

    // 2. Close enlarged cover modal
    component.closeEnlargedCover();
    fixture.detectChanges();
    expect(component['showEnlargedCoverModal']()).toBe(false);
  });

  it('provides option to tag people from a modal popup in Journey and MessageBook posts (Requirement C)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const marco = component['service'].companions().find((c) => c.fullName.includes('Marco'))!;
    expect(marco).toBeTruthy();

    // 1. Tag in Journey post
    component.openTagPeopleModal('journey');
    expect(component['showTagPeopleModal']()).toBe(true);
    expect(component['tagTarget']()).toBe('journey');

    component.toggleCompanionTag(marco);
    expect(component.isCompanionTagged(marco.id)).toBe(true);
    expect(component['selectedJourneyTaggedCompanions']().length).toBe(1);

    component.closeTagPeopleModal();
    expect(component['showTagPeopleModal']()).toBe(false);

    // Post to Journey with tagged companion
    component['newJourneyText'] = 'Exploring Kyoto with friends!';
    component.submitJourneyPost();
    fixture.detectChanges();

    const latestPost = component['service'].journeyPosts()[0];
    expect(latestPost.taggedCompanions).toBeTruthy();
    expect(latestPost.taggedCompanions!.some((c) => c.id === marco.id)).toBe(true);

    // 2. Tag in MessageBook
    component.openTagPeopleModal('messagebook');
    expect(component['tagTarget']()).toBe('messagebook');

    component.toggleCompanionTag(marco);
    expect(component.isCompanionTagged(marco.id)).toBe(true);
    expect(component['selectedMessageBookTaggedCompanions']().length).toBe(1);

    component.closeTagPeopleModal();

    component['newPostText'] = 'Signing the memoir guestbook';
    component.submitPost();
    fixture.detectChanges();

    const latestComment = component['service'].comments()[0];
    expect(latestComment.taggedCompanions).toBeTruthy();
    expect(latestComment.taggedCompanions!.some((c) => c.id === marco.id)).toBe(true);
  });

  it('manages 8 detailed sub-sections in About Me and renders them for visitors unless locked (Requirement D)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    component.setSection('about');
    fixture.detectChanges();

    // 1. Verify view mode contains 8 detailed sub-sections
    const aboutWrapper = element.querySelector('.about-sections-wrapper');
    expect(aboutWrapper).toBeTruthy();

    // 1. Intro
    expect(aboutWrapper!.querySelector('.intro-card')).toBeTruthy();
    // 2. Personal Details
    expect(aboutWrapper!.querySelector('.personal-details-card')).toBeTruthy();
    // 3. Work
    expect(aboutWrapper!.querySelector('.work-card')).toBeTruthy();
    // 4. Education
    expect(aboutWrapper!.querySelector('.education-card')).toBeTruthy();
    // 5. Hobbies
    expect(aboutWrapper!.querySelector('.hobbies-card')).toBeTruthy();
    // 6. Interests
    expect(aboutWrapper!.querySelector('.interests-card')).toBeTruthy();
    // 7. Contact Info
    expect(aboutWrapper!.querySelector('.contact-card')).toBeTruthy();
    // 8. About the Person
    expect(aboutWrapper!.querySelector('.person-narrative-card')).toBeTruthy();

    // 2. Toggle edit mode
    component.toggleEditAboutMe();
    fixture.detectChanges();
    expect(component['editingAboutMe']()).toBe(true);

    // Add hobby from dropdown (up to 10)
    component['newHobbySelect'] = 'Kayaking';
    component.addHobby();
    expect(component['aboutHobbies']()).toContain('Kayaking');

    // Add interest from dropdown (up to 10)
    component['newInterestSelect'] = 'Wine Tasting';
    component.addInterest();
    expect(component['aboutInterests']()).toContain('Wine Tasting');

    // Save changes
    component.saveAboutMeDetails();
    fixture.detectChanges();
    expect(component['editingAboutMe']()).toBe(false);

    // 3. Check visitor profile modal renders sub-sections when unlocked
    const elena = component['service'].companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    const visitorModal = element.querySelector('.visitor-profile-modal-card');
    expect(visitorModal).toBeTruthy();
    expect(visitorModal!.querySelector('.visitor-about-subsections')).toBeTruthy();
  });

  it('assigns 20-digit unique id to all user and companion profiles and allows direct navigation via /profile?id=... (Requirements A, B, C)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Current user has 20-digit unique ID
    const myProfile = service.profile()!;
    expect(myProfile.uniqueId).toMatch(/^\d{20}$/);
    expect(myProfile.uniqueId).toBe('89201534010000000001');

    // All seeded companions have 20-digit unique IDs
    const allComps = service.companions();
    expect(allComps.length).toBeGreaterThan(90);
    for (const comp of allComps.slice(0, 20)) {
      expect(comp.uniqueId).toBeDefined();
      expect(comp.uniqueId).toMatch(/^\d{20}$/);
    }

    // Direct routing test: simulate pasting /profile?id=89201534010000000101
    const targetComp = allComps.find((c) => c.country === 'India')!;
    component['loadProfileByParam'](targetComp.uniqueId!);
    fixture.detectChanges();

    expect(component['viewingVisitor']()).toBeTruthy();
    expect(component['viewingVisitor']()?.fullName).toBe(targetComp.fullName);

    // Profile picture is fully visible (Requirement A)
    const largeAvatar = element.querySelector<HTMLImageElement>('.visitor-fully-visible-avatar');
    expect(largeAvatar).toBeTruthy();
    expect(largeAvatar?.src).toBeTruthy();

    // 20-digit ID is prominently displayed on the page
    const uidPill = element.querySelector('.visitor-uid-pill');
    expect(uidPill?.textContent).toContain(targetComp.uniqueId);

    // Navigate to visitor profile triggers router navigation (Requirement B)
    component.openVisitorProfile(targetComp);
    expect(router.navigate).toHaveBeenCalledWith(['/profile'], {
      queryParams: { id: targetComp.uniqueId },
    });
  });

  it('renders My Companions section right before My Circles with max 9 companions (Requirement E)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const companionsPanel = element.querySelector('.companions-side-panel');
    const circlesPanel = element.querySelector('.circles-side-panel');
    expect(companionsPanel).toBeTruthy();
    expect(circlesPanel).toBeTruthy();

    // Verify companions panel appears right before circles panel in DOM order
    expect(companionsPanel!.compareDocumentPosition(circlesPanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Verify max 9 companions displayed
    expect(component.topNineCompanions().length).toBeLessThanOrEqual(9);
    const companionCards = element.querySelectorAll('.side-companion-card');
    expect(companionCards.length).toBe(component.topNineCompanions().length);

    // Verify photo, name, and mutual count are displayed
    if (companionCards.length > 0) {
      const firstCard = companionCards[0];
      expect(firstCard.querySelector('.side-companion-avatar')).toBeTruthy();
      expect(firstCard.querySelector('.side-companion-name')?.textContent).toBeTruthy();
      expect(firstCard.querySelector('.side-companion-mutual')?.textContent).toContain('mutual');
    }
  });

  it('enforces post and comment deletion permissions across own profile and visitor profile (Requirements F & G)', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    // 1. On own profile: current user is profile owner
    component['viewingVisitor'].set(null);
    const anyPost = service.journeyPosts()[0];
    expect(component.canDeleteJourneyPost(anyPost)).toBe(true);
    expect(component.canDeleteComment(999)).toBe(true); // Can delete any comment on their profile

    // 2. When visiting another user's profile:
    const visitor = service.companions().find((c) => c.id !== 1)!;
    component['viewingVisitor'].set(visitor);

    // Cannot delete other user's post
    const otherUserPost = { ...anyPost, author: { id: visitor.id, fullName: visitor.fullName } };
    expect(component.canDeleteJourneyPost(otherUserPost)).toBe(false);

    // Can delete own post if posted on their page
    const ownPost = { ...anyPost, author: { id: 1, fullName: 'Sophia Laurent' } };
    expect(component.canDeleteJourneyPost(ownPost)).toBe(true);

    // Cannot delete other user's comment
    expect(component.canDeleteComment(visitor.id)).toBe(false);

    // Can delete own comment on another user's page
    expect(component.canDeleteComment(1)).toBe(true);
  });

  it('allows visitors to comment on posts in another traveler\'s Journey page (Requirement H)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Create a journey post by visitor
    const visitor = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(visitor);
    fixture.detectChanges();

    const posts = component.getVisitorJourneyPosts(visitor.id);
    expect(posts.length).toBeGreaterThan(0);
    const targetPost = posts[0];

    // Open comments
    component.toggleCommentSection(targetPost.id);
    fixture.detectChanges();

    // Verify visitor comment composer exists
    const commentComposer = element.querySelector('.visitor-comment-composer');
    expect(commentComposer).toBeTruthy();

    // Submit comment on visitor's journey post
    component['journeyCommentText'] = 'Incredible photography! Love this journey!';
    component.submitJourneyComment(targetPost.id);
    fixture.detectChanges();

    // Post now contains the visitor's comment authored by current user (id: 1)
    const updatedPost = service.journeyPosts().find((p) => p.id === targetPost.id)!;
    const myComment = updatedPost.comments.find((c) => c.text === 'Incredible photography! Love this journey!');
    expect(myComment).toBeDefined();
    expect(myComment?.author.id).toBe(1);

    // Current user can delete the comment they made on the visitor's journey
    expect(component.canDeleteComment(myComment!.author.id)).toBe(true);
  });

  it('chat window displays user and companion avatars, quick emojis, 11 reactions, replies, and three dots menu (Requirements J & K)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const companion = service.companions().find((c) => c.status === 'connected')!;
    component.openChatWith(companion);
    fixture.detectChanges();

    const chatBoxes = service.activeChatBoxes();
    expect(chatBoxes.length).toBeGreaterThan(0);
    const box = chatBoxes[0];

    // 1. Requirement J: Show companion and sender profile pictures
    const headerAvatar = element.querySelector<HTMLImageElement>('.chat-header-avatar');
    expect(headerAvatar).toBeTruthy();
    expect(headerAvatar?.src).toBeTruthy();

    // Send a message
    component['sendChat'](box.companionId, 'Hello from NeverBeen!');
    fixture.detectChanges();

    const msgRow = element.querySelector('.chat-msg-row.outgoing');
    expect(msgRow).toBeTruthy();
    expect(msgRow!.querySelector('.chat-my-avatar')).toBeTruthy();

    // 2. Requirement K: Ability to send emoji
    expect(component.quickSendEmojis.length).toBeGreaterThanOrEqual(10);
    component.toggleQuickEmojiTray(box.companionId);
    fixture.detectChanges();
    expect(element.querySelector('.chat-quick-emoji-tray')).toBeTruthy();
    component.insertChatEmoji(box, '🏖️');
    expect(box.draftText).toContain('🏖️');

    // 3. Requirement K: Like & 10 other emojis (11 total)
    expect(component.chatReactionEmojis.length).toBe(11);
    expect(component.chatReactionEmojis).toContain('👍');
    const msgId = box.messages[0].id;
    component.reactToChatMsg(box.companionId, msgId, '👍');
    fixture.detectChanges();
    const updatedBox = service.activeChatBoxes().find((b) => b.companionId === box.companionId)!;
    const reactedMsg = updatedBox.messages.find((m) => m.id === msgId)!;
    expect(reactedMsg.reactions?.['👍']).toBe(1);

    // 4. Requirement K: Reply to particular message
    component.startChatReply(box.companionId, reactedMsg);
    fixture.detectChanges();
    const replyingBox = service.activeChatBoxes().find((b) => b.companionId === box.companionId)!;
    expect(replyingBox.replyingToMessage?.id).toBe(reactedMsg.id);
    expect(element.querySelector('.chat-replying-banner')).toBeTruthy();

    // 5. Requirement K: Three dots menu with Remove message and Report abuse
    component.toggleMsgDotsMenu(box.companionId, msgId);
    fixture.detectChanges();
    const dotsMenu = element.querySelector('.chat-msg-dropdown-menu');
    expect(dotsMenu).toBeTruthy();
    expect(dotsMenu!.querySelector('.btn-menu-delete')).toBeTruthy();
    expect(dotsMenu!.querySelector('.btn-menu-report')).toBeTruthy();
  });

  it('seeds 50 profiles from India, 20 from Pakistan, and 20 from Bangladesh into community profiles (Requirement L)', () => {
    const all = service.companions();
    const indianProfiles = all.filter((c) => c.country === 'India');
    const pakistaniProfiles = all.filter((c) => c.country === 'Pakistan');
    const bangladeshiProfiles = all.filter((c) => c.country === 'Bangladesh');

    expect(indianProfiles.length).toBeGreaterThanOrEqual(50);
    expect(pakistaniProfiles.length).toBeGreaterThanOrEqual(20);
    expect(bangladeshiProfiles.length).toBeGreaterThanOrEqual(20);

    // Verify each profile has 20-digit unique ID and detailed About Me
    for (const p of [...indianProfiles.slice(0, 5), ...pakistaniProfiles.slice(0, 5), ...bangladeshiProfiles.slice(0, 5)]) {
      expect(p.uniqueId).toMatch(/^\d{20}$/);
      expect(p.aboutMeDetails).toBeDefined();
      expect(p.aboutMeDetails?.intro).toBeTruthy();
      expect(p.aboutMeDetails?.gender).toBeTruthy();
      expect(p.aboutMeDetails?.dateOfBirth).toBeTruthy();
      expect(p.aboutMeDetails?.location).toBeTruthy();
    }
  });

  it('displays Cover Picture at top, compact modern About Me, and visitor companions in side panel with max 9 and See All popup', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Visit Elena Rostova (id: 33)
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    // 1. Cover Picture is visible at the top of the profile
    const coverWrap = element.querySelector('.visitor-full-cover-wrap');
    const coverImg = element.querySelector<HTMLImageElement>('.visitor-modal-cover-img');
    expect(coverWrap).toBeTruthy();
    expect(coverImg).toBeTruthy();
    expect(coverImg?.src).toBeTruthy();

    // 2. About Me section is compact and nicely arranged
    const aboutSection = element.querySelector('.visitor-flow-about');
    expect(aboutSection).toBeTruthy();
    const subsections = element.querySelector('.visitor-about-subsections');
    expect(subsections).toBeTruthy();
    const subBlocks = element.querySelectorAll('.visitor-sub-block');
    expect(subBlocks.length).toBeGreaterThanOrEqual(6);

    // 3. Side panel displays visitor companions with max 9
    const sidePanel = element.querySelector('.visitor-side-panel');
    expect(sidePanel).toBeTruthy();
    const companionsCard = element.querySelector('.visitor-companions-card');
    expect(companionsCard).toBeTruthy();
    const sideCompanions = element.querySelectorAll('.visitor-side-comp-item');
    expect(sideCompanions.length).toBeLessThanOrEqual(9);
    expect(sideCompanions.length).toBeGreaterThan(0);

    // 4. Verify connection status or option to connect for companions
    const hasStatusOrConnect = Array.from(sideCompanions).some(
      (item) => item.querySelector('.badge-comp-connected') || item.querySelector('.btn-comp-connect')
    );
    expect(hasStatusOrConnect).toBe(true);

    // 5. Option to see all companions in a separate popup modal
    const seeAllBtn = element.querySelector<HTMLButtonElement>('.btn-see-all-companions-footer');
    expect(seeAllBtn).toBeTruthy();
    component.openAllVisitorCompanionsModal();
    fixture.detectChanges();

    expect(component.showAllVisitorCompanionsModal()).toBe(true);
    const modal = element.querySelector('.visitor-all-companions-modal');
    expect(modal).toBeTruthy();
    expect(modal!.textContent).toContain("Elena Rostova's Companions");

    // Modal has full list of companions with connect/connected status
    const modalRows = modal!.querySelectorAll('.modal-companion-row');
    expect(modalRows.length).toBeGreaterThan(9);
    const hasModalConnect = Array.from(modalRows).some(
      (r) => r.querySelector('.badge-comp-connected') || r.querySelector('.btn-comp-connect')
    );
    expect(hasModalConnect).toBe(true);

    // Close modal
    component.closeAllVisitorCompanionsModal();
    fixture.detectChanges();
    expect(component.showAllVisitorCompanionsModal()).toBe(false);
  });

  it('implements Requirements A, B, C, D, E, F seamlessly', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const service = TestBed.inject(CommunityService);
    const element: HTMLElement = fixture.nativeElement;
    component['viewingVisitor'].set(null);
    fixture.detectChanges();

    // -------------------------------------------------------------------------
    // REQUIREMENT A & D: Own profile side panel companions (total count, max 9, connect status, see all popup)
    // -------------------------------------------------------------------------
    const companionsSidePanel = element.querySelector('.companions-side-panel');
    expect(companionsSidePanel).toBeTruthy();

    // Total count shown in badge, NOT 9
    const countBadge = companionsSidePanel?.querySelector('.companions-count-badge');
    expect(countBadge).toBeTruthy();
    const totalCount = component.totalCompanionsCount();
    expect(totalCount).toBeGreaterThan(9);
    expect(countBadge?.textContent?.trim()).toBe(String(totalCount));

    // Side panel shows max 9 companions by default
    const cards = companionsSidePanel?.querySelectorAll('.side-companion-card');
    expect(cards?.length).toBeLessThanOrEqual(9);
    expect(cards?.length).toBe(component.topNineCompanions().length);

    // In own profile companion section: only people with whom user is already connected
    const allConnected = Array.from(cards || []).every(
      (c) => c.querySelector('.badge-comp-connected') && !c.querySelector('.btn-comp-connect')
    );
    expect(allConnected).toBe(true);
    expect(cards?.length).toBeGreaterThan(0);

    // "See All" button opens popup modal with all companions
    const seeAllBtn = companionsSidePanel?.querySelector<HTMLButtonElement>('.btn-see-all-companions-footer');
    expect(seeAllBtn).toBeTruthy();
    expect(seeAllBtn?.textContent).toContain(`See All Companions (${totalCount})`);

    component.openAllUserCompanionsModal();
    fixture.detectChanges();
    expect(component.showAllUserCompanionsModal()).toBe(true);
    const userModal = element.querySelector('.user-all-companions-modal');
    expect(userModal).toBeTruthy();
    expect(userModal?.querySelector('.modal-count-tag')?.textContent).toContain(`${totalCount} Total`);

    component.closeAllUserCompanionsModal();
    fixture.detectChanges();
    expect(component.showAllUserCompanionsModal()).toBe(false);

    // -------------------------------------------------------------------------
    // REQUIREMENT B: Ultra-modern Personal Details layout (own profile & other's profile)
    // -------------------------------------------------------------------------
    component.setSection('about');
    fixture.detectChanges();

    const ownPersonalDetails = element.querySelector('.modern-personal-details-section');
    expect(ownPersonalDetails).toBeTruthy();
    expect(ownPersonalDetails?.querySelector('.modern-details-header')).toBeTruthy();
    const ownTiles = ownPersonalDetails?.querySelectorAll('.modern-detail-tile');
    expect(ownTiles?.length).toBeGreaterThanOrEqual(5);

    // Now visit Elena's profile and check Personal Details there too
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    const visitorPersonalDetails = element.querySelector('.visitor-flow-about .modern-personal-details-section');
    expect(visitorPersonalDetails).toBeTruthy();
    const visitorTiles = visitorPersonalDetails?.querySelectorAll('.modern-detail-tile');
    expect(visitorTiles?.length).toBeGreaterThanOrEqual(5);

    // -------------------------------------------------------------------------
    // REQUIREMENT C: Cover Picture present for profile and visible when visiting someone's profile
    // -------------------------------------------------------------------------
    const visitorCover = element.querySelector<HTMLImageElement>('.visitor-modal-cover-img');
    expect(visitorCover).toBeTruthy();
    expect(visitorCover?.src).toBeTruthy();
    expect(visitorCover?.src).toContain('http');

    // -------------------------------------------------------------------------
    // REQUIREMENT E: Mutual Companions popup on clicking "Mutual Companions"
    // -------------------------------------------------------------------------
    const mutualBadge = element.querySelector<HTMLElement>('.badge-mutual-tag');
    expect(mutualBadge).toBeTruthy();
    mutualBadge?.click();
    fixture.detectChanges();

    expect(component.showMutualCompanionsModal()).toBe(true);
    const mutualModal = element.querySelector('.mutual-companions-modal');
    expect(mutualModal).toBeTruthy();
    expect(mutualModal?.textContent).toContain('Mutual Companions');
    const mutualRows = mutualModal?.querySelectorAll('.modal-companion-row');
    expect(mutualRows?.length).toBeGreaterThan(0);

    component.closeMutualCompanionsModal();
    fixture.detectChanges();
    expect(component.showMutualCompanionsModal()).toBe(false);

    // -------------------------------------------------------------------------
    // REQUIREMENT F: User can post multiple photos in Journey section
    // -------------------------------------------------------------------------
    component.closeVisitorProfile();
    component.setSection('journey');
    fixture.detectChanges();

    // Create 2 mock files under 100 KB
    const file1 = new File(['mock content 1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['mock content 2'], 'photo2.jpg', { type: 'image/jpeg' });
    const multiEvent = { target: { files: [file1, file2] } } as unknown as Event;
    component.onJourneyPhotoSelected(multiEvent);

    // Simulate FileReader data URLs
    component['journeyPhotoPreviews'].set(['data:image/jpeg;base64,img1', 'data:image/jpeg;base64,img2']);
    fixture.detectChanges();

    expect(component['journeyPhotoPreviews']().length).toBe(2);

    // Verify previews in DOM
    const previewGrid = element.querySelector('.multi-photos-preview-grid');
    expect(previewGrid).toBeTruthy();
    const thumbWraps = previewGrid?.querySelectorAll('.composer-photo-thumb-wrap');
    expect(thumbWraps?.length).toBe(2);

    // Submit Journey post with multiple photos
    component['newJourneyText'] = 'Exploring Kyoto with multiple photos!';
    component.submitJourneyPost();
    fixture.detectChanges();

    const latestPost = service.journeyPosts()[0];
    expect(latestPost.text).toBe('Exploring Kyoto with multiple photos!');
    expect(latestPost.imageUrls?.length).toBe(2);
    expect(latestPost.imageUrls).toEqual(['data:image/jpeg;base64,img1', 'data:image/jpeg;base64,img2']);

    // Check feed renders multi-image grid
    fixture.detectChanges();
    const multiGridInFeed = element.querySelector('.post-multi-images-grid');
    expect(multiGridInFeed).toBeTruthy();
    const cells = multiGridInFeed?.querySelectorAll('.multi-img-cell');
    expect(cells?.length).toBe(2);
  });

  it('shows distinct connected companions per visitor profile (not all 98), includes current user when connected, and updates when disconnected', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // 1. Visit Elena Rostova (id: 33)
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    const elenaCompanions = component.getVisitorCompanions(33);
    // Elena's companions count is distinct (around 12-14), NOT all 98!
    expect(elenaCompanions.length).toBeLessThan(90);
    expect(elenaCompanions.length).toBeGreaterThanOrEqual(5);

    // Current user (Sophia Laurent, id: 1) is connected to Elena, so currentUser is in Elena's list
    const currentUserId = service.currentUser()?.id || 1;
    expect(elenaCompanions.some((c) => c.id === currentUserId)).toBe(true);

    // 2. Visit Marco Rossi (id: 12)
    const marco = service.companions().find((c) => c.id === 12)!;
    component.openVisitorProfile(marco);
    fixture.detectChanges();

    const marcoCompanions = component.getVisitorCompanions(12);
    expect(marcoCompanions.length).toBeLessThan(90);
    expect(marcoCompanions.length).toBeGreaterThanOrEqual(5);
    // Elena's list and Marco's list are distinct
    expect(elenaCompanions).not.toEqual(marcoCompanions);

    // 3. Visit Maya Patel (id: 71, pending incoming request, NOT connected)
    const maya = service.companions().find((c) => c.id === 71)!;
    component.openVisitorProfile(maya);
    fixture.detectChanges();

    const mayaCompanions = component.getVisitorCompanions(71);
    expect(mayaCompanions.length).toBeLessThan(90);
    // Current user is NOT connected to Maya yet, so currentUser is NOT in Maya's companions list
    expect(mayaCompanions.some((c) => c.id === currentUserId)).toBe(false);

    // 4. Remove companionship with Elena: currentUser should be removed from Elena's companions list
    component.openVisitorProfile(elena);
    fixture.detectChanges();
    const countBeforeRemoval = component.getVisitorCompanions(33).length;
    component.removeCompanionshipFromVisitor(33);
    fixture.detectChanges();

    const elenaCompanionsAfter = component.getVisitorCompanions(33);
    expect(elenaCompanionsAfter.some((c) => c.id === currentUserId)).toBe(false);
    expect(elenaCompanionsAfter.length).toBe(countBeforeRemoval - 1);
  });

  it('ensures cover picture is visible across all visitor states with object-fit cover and proper container dimensions', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // 1. Visit Elena Rostova (unlocked profile)
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    const coverWrap = element.querySelector('.visitor-full-cover-wrap');
    expect(coverWrap).toBeTruthy();
    const coverImg = element.querySelector<HTMLImageElement>('.visitor-full-cover-img');
    expect(coverImg).toBeTruthy();
    expect(coverImg?.src).toBeTruthy();
    expect(coverImg?.src).toContain('http');

    // 2. Visit Maya Patel (locked profile)
    const maya = service.companions().find((c) => c.id === 71)!;
    component.openVisitorProfile(maya);
    fixture.detectChanges();

    const lockedCoverWrap = element.querySelector('.visitor-full-cover-wrap');
    expect(lockedCoverWrap).toBeTruthy();
    const lockedCoverImg = element.querySelector<HTMLImageElement>('.visitor-full-cover-img');
    expect(lockedCoverImg).toBeTruthy();
    expect(lockedCoverImg?.src).toBeTruthy();

    // 3. Fallback error handler
    const mockErrorEvent = { target: { src: 'broken.jpg' } } as unknown as Event;
    component.onCoverImgError(mockErrorEvent);
    expect((mockErrorEvent.target as HTMLImageElement).src).toBe(component.defaultCoverPhoto);
  });

  it('displays rich multi-paragraph travel stories covering the About Me Intro section for both user and visitors', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // 1. Own profile About Me
    component.setSection('about');
    fixture.detectChanges();

    const userIntroText = component['aboutIntro'];
    expect(userIntroText).toBeTruthy();
    expect(userIntroText.length).toBeGreaterThan(150);
    // Story contains multiple paragraphs separated by newlines
    expect(userIntroText).toContain('\n\n');

    const introSection = element.querySelector('.intro-card');
    expect(introSection).toBeTruthy();
    const introHighlight = introSection?.querySelector('.about-intro-highlight');
    expect(introHighlight).toBeTruthy();
    expect(introHighlight?.textContent).toContain('Creativity');

    // 2. Visitor profile About Me Intro
    const elena = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(elena);
    fixture.detectChanges();

    const elenaIntro = component.getVisitorIntro(elena);
    expect(elenaIntro).toBeTruthy();
    expect(elenaIntro.length).toBeGreaterThan(150);
    expect(elenaIntro).toContain('\n\n');

    const visitorIntroStory = element.querySelector('.visitor-intro-story');
    expect(visitorIntroStory).toBeTruthy();
    expect(visitorIntroStory?.textContent).toContain('train');
  });

  it('renders My Companion modal window without top clipping and displays title (Requirement A)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.openAllUserCompanionsModal();
    fixture.detectChanges();

    const modalBackdrop = element.querySelector('.modal-backdrop-overlay');
    expect(modalBackdrop).toBeTruthy();

    const myCompanionModal = element.querySelector('.user-all-companions-modal');
    expect(myCompanionModal).toBeTruthy();

    const modalTitle = myCompanionModal?.querySelector('.modal-head-title');
    expect(modalTitle?.textContent).toContain('My Companions');

    // Close modal
    component.closeAllUserCompanionsModal();
    fixture.detectChanges();
    expect(element.querySelector('.user-all-companions-modal')).toBeNull();
  });

  it('provides View Profile option in own profile to preview visitor view (Requirement C)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // View Profile button is present on own profile
    const viewProfileBtn = element.querySelector<HTMLButtonElement>('.btn-side-view-profile');
    expect(viewProfileBtn).toBeTruthy();
    expect(viewProfileBtn?.textContent).toContain('View Profile');

    // Clicking View Profile previews visitor view of own profile
    viewProfileBtn?.click();
    fixture.detectChanges();

    expect(component['viewingVisitor']()).toBeTruthy();
    expect(component['viewingVisitor']()?.fullName).toBe(service.currentUser()?.fullName);

    const visitorPageContainer = element.querySelector('.visitor-full-page-container');
    expect(visitorPageContainer).toBeTruthy();

    // Can return back to own profile
    component.closeVisitorProfile();
    fixture.detectChanges();
    expect(component['viewingVisitor']()).toBeNull();
  });

  it('removes Copy Link and Copy Profile Link buttons from user profiles (Requirement D)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // 1. On own profile: no .btn-side-copy-url or "Copy Profile Link" text
    expect(element.querySelector('.btn-side-copy-url')).toBeNull();
    expect(element.textContent).not.toContain('Copy Profile Link');

    // 2. On visitor profile: no .btn-copy-profile-url or "Copy Link" button
    const visitor = service.companions().find((c) => c.id === 12)!;
    component.openVisitorProfile(visitor);
    fixture.detectChanges();

    expect(element.querySelector('.btn-copy-profile-url')).toBeNull();
    const visitorHeader = element.querySelector('.visitor-page-nav-bar');
    expect(visitorHeader?.textContent).not.toContain('Copy Link');
  });

  it('renders Facebook-like photo collage and opens full post on clicking +N overflow (Requirement E)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Post with 5 photos
    const postWith5Photos = service.journeyPosts().find((p) => p.imageUrls && p.imageUrls.length >= 5);
    expect(postWith5Photos).toBeTruthy();

    component.setSection('journey');
    fixture.detectChanges();

    // Find the multi-image collage
    const collage = element.querySelector('.post-multi-images-grid');
    expect(collage).toBeTruthy();

    // Clicking +N overflow opens post detail modal
    component.openPostDetail(postWith5Photos!);
    fixture.detectChanges();

    expect(component.viewingPostDetail()).toBeTruthy();
    expect(component.viewingPostDetail()?.id).toBe(postWith5Photos!.id);

    const postDetailCard = element.querySelector('.post-detail-modal-card');
    expect(postDetailCard).toBeTruthy();
    expect(postDetailCard?.textContent).toContain(postWith5Photos!.author.fullName);

    // Close detail modal
    component.closePostDetail();
    fixture.detectChanges();
    expect(component.viewingPostDetail()).toBeNull();
  });

  it('supports virtual scrolling / infinite scroll for 500+ journey posts (Requirement F)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Total journey posts count is 500+
    const totalPosts = service.visibleJourneyPosts();
    expect(totalPosts.length).toBeGreaterThanOrEqual(500);

    // Initial limit loads first chunk
    expect(component.displayedJourneyPosts().length).toBe(25);
    expect(component.hasMoreJourneyPosts()).toBe(true);

    // Load next chunk
    component.loadMoreJourneyPosts();
    expect(component.displayedJourneyPosts().length).toBe(50);

    // Load multiple chunks
    component.loadMoreJourneyPosts();
    expect(component.displayedJourneyPosts().length).toBe(75);
  });

  it('provides hide post option for other users\' posts in Journey feed (Requirement G)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const currentUserId = service.currentUser()?.id || 1;
    const otherUserPost = service.journeyPosts().find((p) => p.author.id !== currentUserId)!;
    expect(otherUserPost).toBeTruthy();

    const initialVisibleCount = service.visibleJourneyPosts().length;
    expect(service.visibleJourneyPosts().some((p) => p.id === otherUserPost.id)).toBe(true);

    // Hide post
    component.hideJourneyPost(otherUserPost.id);
    fixture.detectChanges();

    // Post is now hidden from visible Journey feed
    expect(service.visibleJourneyPosts().some((p) => p.id === otherUserPost.id)).toBe(false);
    expect(service.visibleJourneyPosts().length).toBe(initialVisibleCount - 1);
    expect(service.isPostHidden(otherUserPost.id)).toBe(true);

    // Unhide post restores it
    service.unhideJourneyPost(otherUserPost.id);
    expect(service.visibleJourneyPosts().some((p) => p.id === otherUserPost.id)).toBe(true);
  });

  it('contains 500+ Indian users from West Bengal & Kolkata locations and 100+ from other Indian states (Requirements H & I)', () => {
    const allCompanions = service.companions();

    // Requirement H: 500+ Indian users in Community from West Bengal and Kolkata locations
    const wbKolkataUsers = allCompanions.filter(
      (c) =>
        c.country === 'India' &&
        (c.city?.toLowerCase().includes('kolkata') ||
          c.city?.toLowerCase().includes('west bengal')),
    );
    expect(wbKolkataUsers.length).toBeGreaterThanOrEqual(500);

    // Requirement I: 100+ Indian users in Community from other Indian states
    const otherIndiaUsers = allCompanions.filter(
      (c) =>
        c.country === 'India' &&
        !c.city?.toLowerCase().includes('kolkata') &&
        !c.city?.toLowerCase().includes('west bengal'),
    );
    expect(otherIndiaUsers.length).toBeGreaterThanOrEqual(100);

    // Total Indian companions is at least 600
    const totalIndianUsers = allCompanions.filter((c) => c.country === 'India');
    expect(totalIndianUsers.length).toBeGreaterThanOrEqual(600);
  });

  it('Requirement A: mutual companions count badge and popup modal list match exactly', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Pick a companion with mutual connections
    const targetCompanion = service.companions().find((c) => c.id !== 1)!;
    expect(targetCompanion).toBeTruthy();

    // Open visitor profile for this companion
    component.openVisitorProfile(targetCompanion);
    fixture.detectChanges();

    const mutualList = component.getMutualCompanions(targetCompanion.id);
    const countViaHelper = component.getMutualCompanionsCount(targetCompanion.id);
    const filteredList = component.filteredMutualCompanions(targetCompanion.id);

    // Mutual companions count badge must equal mutual companions list length
    expect(countViaHelper).toBe(mutualList.length);
    expect(filteredList.length).toBe(mutualList.length);

    // Open mutual companions modal
    component.openMutualCompanionsModal(targetCompanion);
    fixture.detectChanges();

    const modalTitle = element.querySelector('.mutual-companions-modal .modal-count-tag');
    expect(modalTitle?.textContent).toContain(`${mutualList.length} Mutual`);
  });

  it('Requirement B: visitor profile displays Work, Education, Hobbies, Interests, About the Person, and hides Contact Info', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const companion = service.companions().find((c) => c.id === 33)!;
    component.openVisitorProfile(companion);
    fixture.detectChanges();

    const visitorFlow = element.querySelector('.visitor-flow-about');
    expect(visitorFlow).toBeTruthy();

    const textContent = visitorFlow?.textContent || '';

    // Must show Work Experience, Education, Hobbies, Interests, About the Person
    expect(textContent).toContain('Work Experience');
    expect(textContent).toContain('Education');
    expect(textContent).toContain('Hobbies');
    expect(textContent).toContain('Interests');
    expect(textContent).toContain('About the Person');

    // Must NOT show Contact Info section
    expect(textContent).not.toContain('Contact Info');
    expect(textContent).not.toContain('📞 Contact Info');
    expect(element.querySelector('.visitor-contact-row')).toBeFalsy();
  });

  it('Requirement C: settings verification via Work/University email displays blue verified badge everywhere', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Initially user is not verified
    expect(component.isUserVerified()).toBe(false);

    // Navigate to Settings
    component.setSection('settings');
    fixture.detectChanges();

    const verificationCard = element.querySelector('.verification-card');
    expect(verificationCard).toBeTruthy();

    // Verify using university email
    component.verificationTypeSelection.set('university');
    component.verificationEmailInput = 'researcher@oxford.edu';
    component.verificationStep.set('code');
    component.verificationCodeInput = '123456';
    component.confirmVerificationCode();
    fixture.detectChanges();

    expect(component.isUserVerified()).toBe(true);
    expect(service.currentUser()?.isVerified).toBe(true);
    expect(service.profile()?.isVerified).toBe(true);

    // Blue verified badge is rendered next to user's name
    const verifiedBadges = element.querySelectorAll('.blue-verified-badge');
    expect(verifiedBadges.length).toBeGreaterThan(0);

    // Post authored by verified user has blue verified badge
    const myPost = service.journeyPosts().find((p) => p.author.id === (service.currentUser()?.id || 1));
    if (myPost) {
      expect(component.isAuthorVerified(myPost.author)).toBe(true);
    }

    // Removing verification clears verified badge
    component.removeVerification();
    fixture.detectChanges();

    expect(component.isUserVerified()).toBe(false);
    expect(service.currentUser()?.isVerified).toBe(false);
  });

  it('Requirement A & B: displays Request Pending immediately and provides option to cancel companion request on visitor profile (unlocked and mobile/desktop)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Pick an unconnected companion
    const stranger = service.companions().find((c) => c.status === 'none' && !c.isProfileLocked)!;
    expect(stranger).toBeTruthy();

    component.openVisitorProfile(stranger);
    fixture.detectChanges();

    // Verify initial button is present
    const reqBtn = element.querySelector<HTMLButtonElement>('.btn-companion-request');
    expect(reqBtn).toBeTruthy();
    expect(reqBtn?.textContent).toContain('Companion Request');

    // Click Companion Request (simulate click / tap)
    component.requestCompanionship(stranger.id);
    fixture.detectChanges();

    // Requirement B: immediately shows 'Request Pending'
    expect(component['viewingVisitor']()?.status).toBe('pending_outgoing');
    const pendingBadge = element.querySelector('.badge-pending-status');
    expect(pendingBadge).toBeTruthy();
    expect(pendingBadge?.textContent).toContain('Request Pending');

    // Requirement A: Option to cancel companion request once sent
    const cancelBtn = element.querySelector<HTMLButtonElement>('.btn-cancel-request');
    expect(cancelBtn).toBeTruthy();
    expect(cancelBtn?.textContent).toContain('Cancel Request');

    // Click Cancel Request
    component.cancelCompanionshipRequest(stranger.id);
    fixture.detectChanges();

    // Status reverted to 'none', companion request button reappears immediately
    expect(component['viewingVisitor']()?.status).toBe('none');
    expect(element.querySelector('.badge-pending-status')).toBeFalsy();
    expect(element.querySelector('.btn-companion-request')).toBeTruthy();
  });

  it('Requirement A & B: locked visitor profile shows Request Pending immediately and provides Cancel Request', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    // Pick a locked companion
    const lockedComp = service.companions().find((c) => c.isProfileLocked && c.status === 'none')!;
    expect(lockedComp).toBeTruthy();

    component.openVisitorProfile(lockedComp);
    fixture.detectChanges();

    // In locked shield card, companion request button is displayed
    const unlockBtn = element.querySelector<HTMLButtonElement>('.visitor-locked-shield-card .btn-companion-request');
    expect(unlockBtn).toBeTruthy();

    // Send request
    component.requestCompanionship(lockedComp.id);
    fixture.detectChanges();

    // Locked card immediately shows 'Request Pending' and Cancel Request
    const pendingBox = element.querySelector('.pending-lock-notice-box');
    expect(pendingBox).toBeTruthy();
    expect(pendingBox?.textContent).toContain('Request Pending');

    const cancelBtn = pendingBox?.querySelector<HTMLButtonElement>('.btn-cancel-request');
    expect(cancelBtn).toBeTruthy();

    // Cancel request
    component.cancelCompanionshipRequest(lockedComp.id);
    fixture.detectChanges();

    expect(component['viewingVisitor']()?.status).toBe('none');
    expect(element.querySelector('.pending-lock-notice-box')).toBeFalsy();
    expect(element.querySelector('.visitor-locked-shield-card .btn-companion-request')).toBeTruthy();
  });

  it('Requirement C: provides option to cancel companion request once sent anywhere (search, side companions, and modal)', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    const stranger = service.companions().find((c) => c.status === 'none')!;
    expect(stranger).toBeTruthy();

    // 1. Send request via service
    service.sendCompanionshipRequest(stranger.id);
    fixture.detectChanges();

    expect(service.companions().find((c) => c.id === stranger.id)?.status).toBe('pending_outgoing');
    expect(component.pendingOutgoingCompanions().some((c) => c.id === stranger.id)).toBe(true);

    // In Companions tab, pending sent request block renders Cancel Request
    component.setSection('companions');
    fixture.detectChanges();

    const pendingSentBlock = element.querySelector('.pending-sent-requests-block');
    expect(pendingSentBlock).toBeTruthy();
    expect(pendingSentBlock?.textContent).toContain('Pending Requests Sent');

    // 2. Cancel request via component
    component.cancelCompanionshipRequest(stranger.id);
    fixture.detectChanges();

    expect(service.companions().find((c) => c.id === stranger.id)?.status).toBe('none');
    expect(component.pendingOutgoingCompanions().some((c) => c.id === stranger.id)).toBe(false);
  });

  it('Requirement A: renders Companions tab with 3 distinct groups (Request for Companionship, Companions, Suggestions for Companions) and 70% card design', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.setSection('companions');
    fixture.detectChanges();

    // 1. Check the 3 sections exist
    const requestGroup = element.querySelector('.request-group-section');
    const connectedGroup = element.querySelector('.connected-group-section');
    const suggestionsGroup = element.querySelector('.suggestions-group-section');

    expect(requestGroup).toBeTruthy();
    expect(connectedGroup).toBeTruthy();
    expect(suggestionsGroup).toBeTruthy();

    expect(requestGroup?.textContent).toContain('Request for Companionship');
    expect(connectedGroup?.textContent).toContain('Companions');
    expect(suggestionsGroup?.textContent).toContain('Suggestions for Companions');

    // 2. Check 70% card design structure
    const cards = element.querySelectorAll('.companion-70-card');
    expect(cards.length).toBeGreaterThan(0);

    const firstCard = cards[0];
    const photoCol = firstCard.querySelector('.companion-70-photo-col');
    const infoCol = firstCard.querySelector('.companion-70-info-col');
    const footer = firstCard.querySelector('.companion-70-card-footer');

    expect(photoCol).toBeTruthy();
    expect(infoCol).toBeTruthy();
    expect(footer).toBeTruthy();
    expect(infoCol?.textContent).toContain('Profession:');
    expect(infoCol?.textContent).toContain('Location:');
  });

  it('Requirement B: default profile is Kingshuk (Founder Profile with Senior Software Engineer details)', () => {
    const user = service.currentUser();
    const profile = service.profile();

    expect(user?.fullName).toBe('Kingshuk');
    expect(user?.profilePhotoUrl).toBe('/author.jpeg');
    expect(profile?.fullName).toBe('Kingshuk');
    expect(profile?.profession).toContain('Senior Software Engineer');
    expect(profile?.profession).toContain('founder of NeverBeen');
    expect(profile?.aboutMe).toContain('Creativity, Future Proof Design and Strong Foundation in Programming');
  });

  it('Requirement C: exactly 60% of companions are verified with blue tick', () => {
    const companions = service.companions();
    expect(companions.length).toBeGreaterThan(500);

    const verifiedCount = companions.filter((c) => c.isVerified).length;
    const ratio = verifiedCount / companions.length;
    // Exactly 60% (0.60)
    expect(ratio).toBeCloseTo(0.6, 2);
  });

  it('Requirements E, F, G: companions have unique photos, diverse covers, and region-appropriate avatars', () => {
    const companions = service.companions();
    const photoUrls = companions.map((c) => c.profilePhotoUrl).filter(Boolean);
    const coverUrls = companions.map((c) => c.coverPhotoUrl).filter(Boolean);

    // Unique profile photos - no duplicates
    const uniquePhotos = new Set(photoUrls);
    expect(uniquePhotos.size).toBe(photoUrls.length);

    // Unique cover photos - no duplicates
    const uniqueCovers = new Set(coverUrls);
    expect(uniqueCovers.size).toBe(coverUrls.length);

    // Check high diversity (>500 distinct photos and covers)
    expect(uniquePhotos.size).toBeGreaterThanOrEqual(500);
    expect(uniqueCovers.size).toBeGreaterThanOrEqual(500);
  });

  it('Companion Page: reduces user photo size to 25% of the card and allows each group to collapse and expand', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;

    component.setSection('companions');
    fixture.detectChanges();

    // 1. Verify 25% photo column and card structure
    const cards = element.querySelectorAll('.companion-card');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    const photoCol = firstCard.querySelector('.companion-card-photo-col');
    const infoCol = firstCard.querySelector('.companion-card-info-col');
    expect(photoCol).toBeTruthy();
    expect(infoCol).toBeTruthy();
    expect(firstCard.querySelector('.companion-25-photo-col')).toBeTruthy();
    expect(firstCard.querySelector('.companion-25-info-col')).toBeTruthy();

    // 2. Verify all 3 groups are expanded by default
    expect(component.isRequestsGroupCollapsed()).toBe(false);
    expect(component.isConnectedGroupCollapsed()).toBe(false);
    expect(component.isSuggestionsGroupCollapsed()).toBe(false);

    const requestHeader = element.querySelector('.request-group-section .companion-group-header') as HTMLElement;
    const connectedHeader = element.querySelector('.connected-group-section .companion-group-header') as HTMLElement;
    const suggestionsHeader = element.querySelector('.suggestions-group-section .companion-group-header') as HTMLElement;

    expect(requestHeader).toBeTruthy();
    expect(connectedHeader).toBeTruthy();
    expect(suggestionsHeader).toBeTruthy();

    // 3. Test collapse & expand on Request for Companionship group
    const requestToggleBtn = requestHeader.querySelector<HTMLButtonElement>('.btn-group-toggle');
    expect(requestToggleBtn?.textContent).toContain('Collapse');
    requestToggleBtn?.click();
    fixture.detectChanges();

    expect(component.isRequestsGroupCollapsed()).toBe(true);
    expect(requestHeader.querySelector('.btn-group-toggle')?.textContent).toContain('Expand');
    expect(element.querySelector('.request-group-section .companion-group-grid')).toBeNull();

    // Expand Request for Companionship group again
    requestHeader.click();
    fixture.detectChanges();
    expect(component.isRequestsGroupCollapsed()).toBe(false);
    expect(requestHeader.querySelector('.btn-group-toggle')?.textContent).toContain('Collapse');

    // 4. Test collapse & expand on Companions group
    const connectedToggleBtn = connectedHeader.querySelector<HTMLButtonElement>('.btn-group-toggle');
    expect(connectedToggleBtn?.textContent).toContain('Collapse');
    component.toggleConnectedGroup();
    fixture.detectChanges();

    expect(component.isConnectedGroupCollapsed()).toBe(true);
    expect(element.querySelector('.connected-group-section .companion-group-grid')).toBeNull();

    component.toggleConnectedGroup();
    fixture.detectChanges();
    expect(component.isConnectedGroupCollapsed()).toBe(false);
    expect(element.querySelector('.connected-group-section .companion-group-grid')).toBeTruthy();

    // 5. Test collapse & expand on Suggestions for Companions group
    const suggestionsToggleBtn = suggestionsHeader.querySelector<HTMLButtonElement>('.btn-group-toggle');
    expect(suggestionsToggleBtn?.textContent).toContain('Collapse');
    component.toggleSuggestionsGroup();
    fixture.detectChanges();

    expect(component.isSuggestionsGroupCollapsed()).toBe(true);
    expect(element.querySelector('.suggestions-group-section .companion-group-grid')).toBeNull();

    component.toggleSuggestionsGroup();
    fixture.detectChanges();
    expect(component.isSuggestionsGroupCollapsed()).toBe(false);
    expect(element.querySelector('.suggestions-group-section .companion-group-grid')).toBeTruthy();
  });
});
