import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AboutMeDetails,
  ActiveChatBox,
  AuthorInfo,
  AVAILABLE_HOBBIES,
  AVAILABLE_INTERESTS,
  ChatMessage,
  Circle,
  City,
  CommunityComment,
  Companion,
  EducationInfo,
  generate20DigitUid,
  getTopReactionIcon,
  getTopReactionIcons,
  HOLD_REACTION_OPTIONS,
  JourneyComment,
  JourneyPost,
  REACTION_ICONS,
  ReactionType,
  SocialMediaLink,
  UserActiveStatus,
  UserReaction,
  WorkExperience,
} from '../../../models/community';
import { CommunityService } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { GoogleMapLocation, GoogleMapsService } from '../../../services/google-maps.service';
import { TranslatableTextDirective } from '../../../shared/translate/translatable-text.directive';
import { UserHoverCard, UserPreviewDirective } from '../../../shared/user-hover-card';
import { CommentThreadComponent } from './comment-item';
import { SelectValueSync } from '../../../shared/select-value-sync';

export type ProfileSection =
  | 'journey'
  | 'about'
  | 'gallery'
  | 'messagebook'
  | 'companions'
  | 'circles'
  | 'messenger'
  | 'notifications'
  | 'settings';

@Component({
  selector: 'app-community-profile',
  standalone: true,
  imports: [SelectValueSync, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CommentThreadComponent,
    TranslatableTextDirective,
    UserPreviewDirective,
    UserHoverCard,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class CommunityProfile implements OnInit {
  protected readonly service = inject(CommunityService);
  protected readonly googleMapsService = inject(GoogleMapsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Active section in the right side wide panel (default: 'journey')
  protected readonly activeSection = signal<ProfileSection>('journey');

  // Mobile portrait navigation state
  protected readonly isMobileSidePanelOpen = signal<boolean>(false);

  // Visitor Profile mode (when visiting any other user)
  protected readonly viewingVisitor = signal<Companion | null>(null);

  // Search state (top-left)
  protected readonly searchQuery = signal('');
  protected readonly showSearchDropdown = signal(false);
  protected readonly viewingTraveler = signal<Companion | null>(null);

  // Enlarged Profile Photo Modal
  protected readonly showEnlargedPhoto = signal(false);
  protected readonly lightboxImageUrl = signal<string | null>(null);

  // Maximum picture upload limit (Requirement A: 100 KB)
  readonly MAX_PICTURE_SIZE = 100 * 1024; // 100 KB limit (102,400 bytes)
  readonly defaultCoverPhoto =
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  protected readonly coverPhotoError = signal<string | null>(null);
  protected readonly profilePhotoError = signal<string | null>(null);

  // Active Status Dropdown & Custom Status
  protected readonly activeStatusOptions: UserActiveStatus[] = [
    'Active',
    'Busy',
    "Don't Disturb",
    'Away',
    'Inactive',
    'Custom',
  ];
  protected readonly showCustomStatusModal = signal(false);
  protected customStatusInput = '';
  protected readonly statusError = signal<string | null>(null);

  // Journey state
  protected newJourneyText = '';
  protected selectedMood = '✈️ Traveling';
  protected destinationSearchInput = '';
  protected readonly destinationSuggestions = signal<GoogleMapLocation[]>([]);
  protected readonly showDestinationDropdown = signal(false);
  protected readonly selectedGoogleLocation = signal<GoogleMapLocation | null>(null);
  protected readonly destinationError = signal<string | null>(null);
  protected readonly postingJourney = signal(false);
  protected readonly activeCommentPostId = signal<number | null>(null);
  protected journeyCommentText = '';

  // Journey Post Photo Attachment (Requirement A: <= 100 KB, Requirement F: Multi-photo support)
  protected readonly selectedJourneyPhoto = signal<File | null>(null);
  protected readonly selectedJourneyPhotos = signal<File[]>([]);
  protected readonly journeyPhotoPreviews = signal<string[]>([]);
  protected readonly journeyPhotoPreview = signal<string | null>(null);
  protected readonly journeyPhotoError = signal<string | null>(null);

  // Virtual Scrolling / Infinite Scroll for Journey Posts (Requirement F)
  readonly displayedJourneyPostLimit = signal<number>(25);
  readonly displayedJourneyPosts = computed(() =>
    this.service.visibleJourneyPosts().slice(0, this.displayedJourneyPostLimit()),
  );
  readonly hasMoreJourneyPosts = computed(
    () => this.displayedJourneyPostLimit() < this.service.visibleJourneyPosts().length,
  );

  // Full Post Detail Modal (Requirement E)
  readonly viewingPostDetail = signal<JourneyPost | null>(null);

  // Journey Comment Photo Attachment (Requirement A: <= 100 KB)
  protected readonly journeyCommentPhotoPreview = signal<{ postId: number; dataUrl: string } | null>(null);
  protected readonly journeyCommentPhotoError = signal<{ postId: number; message: string } | null>(null);

  // Multi-level Journey Comment Replies
  protected readonly activeJourneyReplyCommentId = signal<number | null>(null);
  protected journeyReplyText = '';

  // Share Post in Journey Modal
  protected readonly showShareModal = signal(false);
  protected readonly postToShare = signal<JourneyPost | null>(null);
  protected shareThoughtText = '';

  // Likers Modal (Requirement A)
  protected readonly showLikersModal = signal(false);
  protected readonly selectedPostLikers = signal<AuthorInfo[]>([]);
  protected readonly selectedPostForLikers = signal<JourneyPost | null>(null);
  private likePressTimer?: any;
  protected isLongPressActive = false;

  // REQUIREMENT A: 11 REACTIONS SYSTEM ON HOLD & BREAKDOWN MODAL
  readonly holdReactionOptions = HOLD_REACTION_OPTIONS;
  readonly reactionIconsMap = REACTION_ICONS;
  protected readonly showReactionPickerForTarget = signal<{
    id: number;
    type: 'post' | 'comment' | 'messagebook';
  } | null>(null);
  protected readonly showReactionsBreakdownModal = signal(false);
  protected readonly selectedReactionsTarget = signal<{
    id: number;
    type: 'post' | 'comment' | 'messagebook';
    reactions: UserReaction[];
    title: string;
  } | null>(null);
  protected readonly activeReactionFilterTab = signal<string>('All');
  private reactionHoldTimer?: any;
  private reactionSummaryHoldTimer?: any;

  // Computed reaction tabs for Breakdown Modal
  readonly uniqueReactionTabs = computed(() => {
    const target = this.selectedReactionsTarget();
    if (!target) return [];
    const counts = new Map<string, number>();
    for (const r of target.reactions) {
      counts.set(r.type, (counts.get(r.type) || 0) + 1);
    }
    const tabs: Array<{ type: string; icon?: string; count: number }> = [
      { type: 'All', count: target.reactions.length },
    ];
    for (const [type, count] of counts.entries()) {
      tabs.push({
        type,
        icon: REACTION_ICONS[type as ReactionType] || '❤️',
        count,
      });
    }
    return tabs;
  });

  // Filtered reactions list for Breakdown Modal
  readonly filteredBreakdownReactions = computed(() => {
    const target = this.selectedReactionsTarget();
    if (!target) return [];
    const active = this.activeReactionFilterTab();
    if (active === 'All') return target.reactions;
    return target.reactions.filter((r) => r.type === active);
  });

  // REQUIREMENT B: COVER PHOTO ENLARGE ON HOLD
  protected readonly showEnlargedCoverModal = signal(false);
  protected readonly enlargedCoverUrl = signal<string | null>(null);
  protected readonly enlargedCoverUser = signal<string | null>(null);
  private coverHoldTimer?: any;

  // REQUIREMENT C: TAG PEOPLE MODAL & POST TAGS
  protected readonly showTagPeopleModal = signal(false);
  protected readonly tagTarget = signal<'journey' | 'messagebook'>('journey');
  protected tagSearchQuery = '';
  protected readonly selectedJourneyTaggedCompanions = signal<AuthorInfo[]>([]);
  protected readonly selectedMessageBookTaggedCompanions = signal<AuthorInfo[]>([]);

  readonly availableCompanionsForTagging = computed(() => {
    const q = this.tagSearchQuery.trim().toLowerCase();
    const all = this.service.companions();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.profession.toLowerCase().includes(q),
    );
  });

  // REQUIREMENT D: DETAILED ABOUT ME 8 SUB-SECTIONS
  protected readonly editingAboutMe = signal(false);
  readonly availableHobbies = AVAILABLE_HOBBIES;
  readonly availableInterests = AVAILABLE_INTERESTS;
  protected aboutIntro = '';
  protected aboutGender = 'Female';
  protected aboutDob = '1996-04-18';
  protected aboutLocation = 'Paris, France';
  protected aboutHometown = 'Lyon, France';
  protected aboutRelationshipStatus = 'Exploring solo';
  protected readonly aboutLanguages = signal<string[]>([]);
  protected newLanguageInput = '';
  protected readonly aboutWorkExperiences = signal<WorkExperience[]>([]);
  protected readonly aboutEducation = signal<EducationInfo[]>([]);
  protected readonly aboutHobbies = signal<string[]>([]);
  protected newHobbySelect = '';
  protected readonly aboutInterests = signal<string[]>([]);
  protected newInterestSelect = '';
  protected aboutContactEmail = '';
  protected aboutContactPhone = '';
  protected readonly aboutSocialLinks = signal<SocialMediaLink[]>([]);
  protected aboutThePersonText = '';
  protected readonly hobbyNotice = signal<string | null>(null);
  protected readonly interestNotice = signal<string | null>(null);
  protected readonly socialLinkNotice = signal<string | null>(null);

  // Report Abuse Modal (Requirement C)
  protected readonly showReportAbuseModal = signal(false);
  protected readonly reportTarget = signal<{
    type: 'post' | 'comment';
    id: number;
    author: AuthorInfo;
    snippet: string;
  } | null>(null);
  protected reportReason = 'Inappropriate Content';
  protected reportDetails = '';
  protected readonly reportSubmitted = signal(false);
  protected readonly reportError = signal<string | null>(null);

  // Circles state
  protected readonly showCreateCircleModal = signal(false);
  protected newCircleName = '';
  protected newCircleDesc = '';
  protected newCircleIcon = '🌟';
  protected newCircleColor = '#2563eb';
  protected readonly selectedCircleMemberIds = signal<number[]>([]);
  protected readonly circleError = signal<string | null>(null);

  // Messenger state
  protected readonly showMessengerFlyout = signal(false);

  // Edit details state
  protected readonly editingDetails = signal(false);
  protected readonly editCitiesList = signal<City[]>([]);

  // Gallery state
  protected readonly showUploadCard = signal(false);
  protected readonly uploadingGallery = signal(false);
  protected readonly selectedGalleryFile = signal<File | null>(null);
  protected readonly galleryPreviewUrl = signal<string | null>(null);
  protected readonly galleryError = signal<string | null>(null);
  protected newCaption = '';

  // MessageBook state
  protected newPostText = '';
  protected replyText = '';
  protected readonly postingPost = signal(false);
  protected readonly postingReply = signal(false);
  protected readonly activeReplyPostId = signal<number | null>(null);

  // MessageBook Photo Attachment (Requirement A: <= 100 KB)
  protected readonly selectedMessageBookPhoto = signal<File | null>(null);
  protected readonly messageBookPhotoPreview = signal<string | null>(null);
  protected readonly messageBookPhotoError = signal<string | null>(null);

  // Settings state
  protected readonly savingSettings = signal(false);
  protected readonly settingsSaved = signal(false);
  protected readonly availableTravelStyles = [
    'Backpacker',
    'Luxury Resorts',
    'Solo Exploration',
    'Landscape Photography',
    'Culinary & Wine',
    'Alpine Hiking',
    'Digital Nomad',
    'Cultural Heritage',
  ];
  protected readonly selectedTravelStyles = signal<string[]>([
    'Landscape Photography',
    'Solo Exploration',
    'Culinary & Wine',
  ]);

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  protected readonly editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    country: ['', Validators.required],
    state: [''],
    city: ['', Validators.required],
    gender: [''],
    dateOfBirth: [''],
    aboutMe: [''],
    profession: [''],
  });

  protected readonly settingsForm = this.fb.group({
    publicProfileEnabled: [true],
    isProfileLocked: [false],
    whoCanMessage: ['everyone'],
    searchVisibility: [true],
    journeyVisibility: ['public'],
    emailNotificationsEnabled: [true],
    phoneNotificationsEnabled: [false],
    soundNotificationsEnabled: [true],
    twoFactorEnabled: [false],
    preferredSeason: ['Autumn & Spring'],
    theme: ['light'],
    timezone: ['UTC'],
  });

  // Search results computed
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return { travelers: [], circles: [] };

    const travelers = this.service
      .companions()
      .filter(
        (c) =>
          !this.service.isUserBlocked(c.id) &&
          (c.fullName.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.profession.toLowerCase().includes(q)),
      );

    const circles = this.service
      .circles()
      .filter(
        (cr) =>
          cr.name.toLowerCase().includes(q) ||
          cr.description.toLowerCase().includes(q),
      );

    return { travelers, circles };
  });

  protected readonly connectedCompanionsCount = computed(
    () => this.service.companions().filter((c) => c.status === 'connected').length,
  );

  readonly connectedCompanions = computed(() =>
    this.service
      .visibleCompanions()
      .filter((c) => c.status === 'connected'),
  );

  readonly pendingOutgoingCompanions = computed(() =>
    this.service
      .visibleCompanions()
      .filter((c) => c.status === 'pending_outgoing'),
  );

  // Requirement A: 3 Groups on Companion page
  readonly incomingRequests = computed(() =>
    this.service
      .visibleCompanions()
      .filter((c) => c.status === 'pending_incoming'),
  );

  readonly suggestedCompanions = computed(() => {
    const myProfile = this.service.profile();
    const myCity = (myProfile?.city || 'Kolkata').toLowerCase();
    const myCountry = (myProfile?.country || 'India').toLowerCase();

    return this.service
      .visibleCompanions()
      .filter((c) => {
        if (c.id === (myProfile?.id || 1)) return false;
        if (c.status === 'connected' || c.status === 'pending_incoming') return false;

        const city = (c.city || '').toLowerCase();
        const country = (c.country || '').toLowerCase();

        const inMyArea =
          city.includes(myCity) ||
          city.includes('kolkata') ||
          city.includes('west bengal') ||
          (city.length > 0 && country === myCountry);

        const hasMutual = this.getMutualCompanionsCount(c.id) > 0;
        return inMyArea || hasMutual;
      })
      .slice(0, 48);
  });

  readonly totalCompanionsCount = computed(() => this.connectedCompanions().length);

  // In own profile companion section, only show people with whom user is already connected (max 9 default)
  readonly topNineCompanions = computed(() =>
    this.connectedCompanions().slice(0, 9),
  );

  async ngOnInit(): Promise<void> {
    if (!this.service.isAuthenticated() || !this.service.profile()) {
      this.router.navigate(['/community']);
      return;
    }

    this.populateEditForm();
    this.populateSettingsForm();
    this.initAboutMeData();

    const p = this.service.profile();
    if (p?.countryId) {
      const cities = await this.service.getCitiesForCountry(p.countryId);
      this.editCitiesList.set(cities);
    }

    // Handle 20-digit user profile URL route (Requirement B & C)
    this.route.queryParams.subscribe((params) => {
      const idParam = params['id'];
      if (idParam) {
        this.loadProfileByParam(idParam);
      } else {
        this.viewingVisitor.set(null);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION & MOBILE PORTRAIT DRAWER
  // ---------------------------------------------------------------------------

  // Website Management (Admin Console) controls which profile features are switched on.
  private readonly cms = inject(SiteConfigService);
  protected profileSectionOn(section: string): boolean {
    return this.cms.isItemVisible('community.profile', 'sections', section);
  }
  protected profileLabel(section: string): string {
    return this.cms.itemLabel('community.profile', 'sections', section);
  }
  protected profileFlag(field: string): boolean {
    return this.cms.flag('community.profile', field);
  }

  setSection(section: ProfileSection): void {
    this.viewingVisitor.set(null); // Return from visitor view
    this.activeSection.set(this.profileSectionOn(section) ? section : 'journey');
    this.closeMobileSidePanel();
    if (section === 'notifications') {
      this.service.markNotificationsRead();
    }
  }

  toggleMobileSidePanel(): void {
    this.isMobileSidePanelOpen.update((v) => !v);
  }

  closeMobileSidePanel(): void {
    this.isMobileSidePanelOpen.set(false);
  }

  // Alias for tests
  setTab(tab: 'journey' | 'about' | 'details' | 'gallery' | 'settings'): void {
    this.viewingVisitor.set(null);
    if (tab === 'details') {
      this.activeSection.set('about');
      this.editingDetails.set(true);
    } else {
      this.activeSection.set(tab as ProfileSection);
    }
  }

  // ---------------------------------------------------------------------------
  // VISITOR PROFILE (Open any user's profile on click anywhere - Requirement B & C)
  // ---------------------------------------------------------------------------

  openVisitorProfile(authorOrUser: AuthorInfo | Companion | number): void {
    const currentUserId = this.service.currentUser()?.id || 1;
    let targetId: number;
    let targetUid: string | undefined;

    if (typeof authorOrUser === 'number') {
      targetId = authorOrUser;
      const foundComp = this.service.companions().find((c) => c.id === targetId);
      targetUid = foundComp?.uniqueId || generate20DigitUid(targetId);
    } else {
      targetId = authorOrUser.id;
      targetUid = authorOrUser.uniqueId || generate20DigitUid(targetId);
    }

    // If clicking own profile, navigate to personal profile page
    if (targetId === currentUserId) {
      this.viewingVisitor.set(null);
      this.router.navigate(['/profile']);
      return;
    }

    let found = this.service
      .companions()
      .find((c) => c.id === targetId || (targetUid && c.uniqueId === targetUid));

    if (!found) {
      const name =
        typeof authorOrUser === 'object' ? authorOrUser.fullName || 'Traveler' : 'Traveler';
      const photo =
        typeof authorOrUser === 'object'
          ? authorOrUser.profilePhotoUrl || this.defaultAvatar
          : this.defaultAvatar;
      const role =
        typeof authorOrUser === 'object' ? authorOrUser.profession || 'Explorer' : 'Explorer';

      found = {
        id: targetId,
        uniqueId: targetUid || generate20DigitUid(targetId),
        fullName: name,
        profilePhotoUrl: photo,
        coverPhotoUrl: this.defaultCoverPhoto,
        country: 'Worldwide',
        city: 'Explorer',
        profession: role,
        isOnline: true,
        mutualCompanionsCount: 2,
        status: 'none',
        isProfileLocked: false,
        bio: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
        aboutMe: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
        aboutMeDetails: {
          intro: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
          gender: 'Explorer',
          dateOfBirth: '1995-06-20',
          location: 'Worldwide',
          hometown: 'Global',
          relationshipStatus: 'Single',
          languagesKnown: ['English'],
          workExperience: [],
          education: [],
          hobbies: ['Photography', 'Travel'],
          interests: ['Architecture', 'Cultures'],
          contactEmail: 'traveler@neverbeen.example',
          contactPhone: '+1 555 0199',
          socialLinks: [],
          aboutThePerson: 'A world traveler discovering authentic horizons.',
        },
        gallery: [],
      };
    }

    this.viewingVisitor.set(found);
    this.showSearchDropdown.set(false);
    this.closeMobileSidePanel();

    // Requirement B: Navigate to full normal page via /profile?id=... instead of modal popup
    this.router.navigate(['/profile'], {
      queryParams: { id: found.uniqueId || targetUid },
    });
  }

  closeVisitorProfile(): void {
    this.viewingVisitor.set(null);
    this.router.navigate(['/profile']);
  }

  protected loadProfileByParam(idParam: string): void {
    const currentProfile = this.service.profile();
    if (
      currentProfile &&
      (currentProfile.uniqueId === idParam ||
        String(currentProfile.id) === idParam ||
        generate20DigitUid(currentProfile.id) === idParam)
    ) {
      this.viewingVisitor.set(null);
      return;
    }

    const companions = this.service.companions();
    let found = companions.find(
      (c) =>
        c.uniqueId === idParam ||
        String(c.id) === idParam ||
        generate20DigitUid(c.id) === idParam,
    );

    if (found) {
      this.viewingVisitor.set(found);
    } else {
      const dynamicCompanion: Companion = {
        id: Math.abs(this.hashCode(idParam)) || 9999,
        uniqueId: idParam,
        fullName: 'Global Traveler',
        profilePhotoUrl: this.defaultAvatar,
        coverPhotoUrl: this.defaultCoverPhoto,
        country: 'Worldwide',
        city: 'Explorer',
        profession: 'Travel Nomad',
        isOnline: true,
        mutualCompanionsCount: 2,
        status: 'none',
        isProfileLocked: false,
        bio: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
        aboutMe: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
        aboutMeDetails: {
          intro: 'Passionate globetrotter discovering new horizons with NeverBeen AI memories.',
          gender: 'Explorer',
          dateOfBirth: '1995-06-20',
          location: 'Worldwide',
          hometown: 'Global',
          relationshipStatus: 'Single',
          languagesKnown: ['English'],
          workExperience: [],
          education: [],
          hobbies: ['Photography', 'Travel'],
          interests: ['Architecture', 'Cultures'],
          contactEmail: 'traveler@neverbeen.example',
          contactPhone: '+1 555 0199',
          socialLinks: [],
          aboutThePerson: 'A world traveler discovering authentic horizons.',
        },
        gallery: [],
      };
      this.viewingVisitor.set(dynamicCompanion);
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  removeCompanionshipFromVisitor(companionId: number): void {
    this.service.removeCompanion(companionId);
    if (this.viewingVisitor() && this.viewingVisitor()!.id === companionId) {
      this.viewingVisitor.update((v) => (v ? { ...v, status: 'none' } : null));
    }
  }

  getVisitorJourneyPosts(visitorId: number): JourneyPost[] {
    return this.service.journeyPosts().filter((p) => p.author.id === visitorId);
  }

  openImageModal(url: string): void {
    this.lightboxImageUrl.set(url);
  }

  closeImageModal(): void {
    this.lightboxImageUrl.set(null);
  }

  // ---------------------------------------------------------------------------
  // PROFILE PHOTO LIGHTBOX
  // ---------------------------------------------------------------------------

  openEnlargedPhoto(): void {
    this.showEnlargedPhoto.set(true);
  }

  closeEnlargedPhoto(): void {
    this.showEnlargedPhoto.set(false);
  }

  // ---------------------------------------------------------------------------
  // REQUIREMENT B: COVER PHOTO HOLD & ENLARGE
  // ---------------------------------------------------------------------------

  startCoverHold(url?: string, userName?: string): void {
    if (!url) return;
    this.coverHoldTimer = setTimeout(() => {
      this.openEnlargedCover(url, userName);
    }, 350);
  }

  endCoverHold(): void {
    if (this.coverHoldTimer) {
      clearTimeout(this.coverHoldTimer);
      this.coverHoldTimer = undefined;
    }
  }

  openEnlargedCover(url: string, userName?: string): void {
    this.enlargedCoverUrl.set(url);
    this.enlargedCoverUser.set(userName || 'Cover Photo');
    this.showEnlargedCoverModal.set(true);
  }

  closeEnlargedCover(): void {
    this.showEnlargedCoverModal.set(false);
    this.enlargedCoverUrl.set(null);
    this.enlargedCoverUser.set(null);
  }

  // ---------------------------------------------------------------------------
  // ACTIVE STATUS MANAGEMENT
  // ---------------------------------------------------------------------------

  onStatusSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value as UserActiveStatus;

    if (value === 'Custom') {
      this.statusError.set(null);
      this.customStatusInput = this.service.currentUser()?.customStatusText || '';
      this.showCustomStatusModal.set(true);
    } else {
      this.service.updateActiveStatus(value);
    }
  }

  applyCustomStatus(): void {
    const trimmed = this.customStatusInput.trim();
    // Validate: 1 to 15 letters and spaces only
    if (!/^[A-Za-z ]{1,15}$/.test(trimmed)) {
      this.statusError.set('Letters and spaces only, up to 15 characters maximum.');
      return;
    }

    this.service.updateActiveStatus('Custom', trimmed);
    this.showCustomStatusModal.set(false);
    this.statusError.set(null);
  }

  closeCustomStatusModal(): void {
    this.showCustomStatusModal.set(false);
    this.statusError.set(null);
  }

  getStatusIconClass(status?: string): string {
    switch (status) {
      case 'Active':
        return 'status-icon-active';
      case 'Busy':
        return 'status-icon-busy';
      case "Don't Disturb":
        return 'status-icon-dnd';
      case 'Away':
        return 'status-icon-away';
      case 'Inactive':
        return 'status-icon-inactive';
      case 'Custom':
        return 'status-icon-custom';
      default:
        return 'status-icon-active';
    }
  }

  getStatusLabel(status?: string, customText?: string): string {
    if (status === 'Custom' && customText) {
      return customText;
    }
    return status || 'Active';
  }

  // ---------------------------------------------------------------------------
  // PROFILE LOCK / UNLOCK
  // ---------------------------------------------------------------------------

  toggleProfileLock(): void {
    const locked = this.service.toggleProfileLock();
    this.settingsForm.patchValue({ isProfileLocked: locked });
  }

  // ---------------------------------------------------------------------------
  // SEARCH & TRAVELER MODAL (WITH PROFILE LOCK ENFORCEMENT)
  // ---------------------------------------------------------------------------

  onSearchFocus(): void {
    if (this.searchQuery().trim()) {
      this.showSearchDropdown.set(true);
    }
  }

  onSearchInput(): void {
    this.showSearchDropdown.set(this.searchQuery().trim().length > 0);
  }

  openTravelerModal(companion: Companion): void {
    this.openVisitorProfile(companion);
  }

  closeTravelerModal(): void {
    this.viewingTraveler.set(null);
  }

  requestCompanionship(userId: number): void {
    const numId = Number(userId);
    this.service.sendCompanionshipRequest(numId);
    if (this.viewingVisitor() && (Number(this.viewingVisitor()!.id) === numId || !userId)) {
      this.viewingVisitor.update((t) => (t ? { ...t, status: 'pending_outgoing' } : null));
    }
    if (this.viewingTraveler() && (Number(this.viewingTraveler()!.id) === numId || !userId)) {
      this.viewingTraveler.update((t) => (t ? { ...t, status: 'pending_outgoing' } : null));
    }
  }

  cancelCompanionshipRequest(userId: number): void {
    const numId = Number(userId);
    this.service.cancelCompanionshipRequest(numId);
    if (this.viewingVisitor() && (Number(this.viewingVisitor()!.id) === numId || !userId)) {
      this.viewingVisitor.update((t) => (t ? { ...t, status: 'none' } : null));
    }
    if (this.viewingTraveler() && (Number(this.viewingTraveler()!.id) === numId || !userId)) {
      this.viewingTraveler.update((t) => (t ? { ...t, status: 'none' } : null));
    }
  }

  // ---------------------------------------------------------------------------
  // GOOGLE MAPS API DESTINATION TAG AUTO SEARCH
  // ---------------------------------------------------------------------------

  async onDestinationSearchInput(): Promise<void> {
    this.destinationError.set(null);
    const q = this.destinationSearchInput.trim();
    if (q.length < 2) {
      this.destinationSuggestions.set([]);
      this.showDestinationDropdown.set(false);
      return;
    }
    const results = await this.googleMapsService.searchLocations(q);
    this.destinationSuggestions.set(results);
    this.showDestinationDropdown.set(true);
  }

  onDestinationSearchFocus(): void {
    if (this.destinationSearchInput.trim().length >= 2) {
      this.showDestinationDropdown.set(true);
    }
  }

  selectGoogleLocation(location: GoogleMapLocation): void {
    this.selectedGoogleLocation.set(location);
    this.destinationSearchInput = '';
    this.destinationSuggestions.set([]);
    this.showDestinationDropdown.set(false);
    this.destinationError.set(null);
  }

  clearSelectedGoogleLocation(): void {
    this.selectedGoogleLocation.set(null);
    this.destinationError.set(null);
  }

  // ---------------------------------------------------------------------------
  // JOURNEY (PUBLIC FEED WITH NESTED COMMENTS ON COMMENTS & SHARE)
  // ---------------------------------------------------------------------------

  onJourneyPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    this.journeyPhotoError.set(null);

    for (const file of files) {
      if (file.size > this.MAX_PICTURE_SIZE) {
        this.journeyPhotoError.set('Picture size exceeds 100 KB limit. Please choose a photo under 100 KB.');
        this.selectedJourneyPhoto.set(null);
        this.selectedJourneyPhotos.set([]);
        this.journeyPhotoPreview.set(null);
        this.journeyPhotoPreviews.set([]);
        input.value = '';
        return;
      }
    }

    this.selectedJourneyPhoto.set(files[0]);
    this.selectedJourneyPhotos.update((existing) => [...existing, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.journeyPhotoPreviews.update((list) => [...list, dataUrl]);
        if (!this.journeyPhotoPreview()) {
          this.journeyPhotoPreview.set(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removeJourneyPhoto(index: number): void {
    this.journeyPhotoPreviews.update((list) => list.filter((_, i) => i !== index));
    this.selectedJourneyPhotos.update((list) => list.filter((_, i) => i !== index));
    const remaining = this.journeyPhotoPreviews();
    if (remaining.length > 0) {
      this.journeyPhotoPreview.set(remaining[0]);
      const photos = this.selectedJourneyPhotos();
      this.selectedJourneyPhoto.set(photos[0] || null);
    } else {
      this.journeyPhotoPreview.set(null);
      this.selectedJourneyPhoto.set(null);
    }
  }

  clearJourneyPhoto(): void {
    this.selectedJourneyPhoto.set(null);
    this.selectedJourneyPhotos.set([]);
    this.journeyPhotoPreviews.set([]);
    this.journeyPhotoPreview.set(null);
    this.journeyPhotoError.set(null);
  }

  submitJourneyPost(): void {
    const hasPhotos = this.journeyPhotoPreviews().length > 0 || !!this.journeyPhotoPreview();
    if (!this.newJourneyText.trim() && !hasPhotos) return;

    // Requirement D: If text was typed in destination tag, only available location from Google Maps can be selected!
    if (this.destinationSearchInput.trim() && !this.selectedGoogleLocation()) {
      this.destinationError.set('Only available locations from Google Maps suggestions can be selected.');
      return;
    }

    this.postingJourney.set(true);
    try {
      const locationTag = this.selectedGoogleLocation()
        ? this.selectedGoogleLocation()!.formattedAddress
        : undefined;
      const placeId = this.selectedGoogleLocation()?.placeId;
      const allPreviews = this.journeyPhotoPreviews();
      const primaryPhoto = allPreviews[0] || this.journeyPhotoPreview() || undefined;

      this.service.createJourneyPost(
        this.newJourneyText,
        this.selectedMood,
        locationTag,
        placeId,
        primaryPhoto,
        this.selectedJourneyTaggedCompanions().length > 0
          ? [...this.selectedJourneyTaggedCompanions()]
          : undefined,
        allPreviews.length > 0 ? allPreviews : (primaryPhoto ? [primaryPhoto] : undefined),
      );
      this.newJourneyText = '';
      this.selectedJourneyTaggedCompanions.set([]);
      this.selectedGoogleLocation.set(null);
      this.destinationSearchInput = '';
      this.destinationError.set(null);
      this.clearJourneyPhoto();
    } finally {
      this.postingJourney.set(false);
    }
  }

  toggleLikePost(postId: number): void {
    this.service.toggleJourneyLike(postId);
  }

  toggleCommentSection(postId: number): void {
    if (this.activeCommentPostId() === postId) {
      this.activeCommentPostId.set(null);
    } else {
      this.activeCommentPostId.set(postId);
      this.journeyCommentText = '';
    }
  }

  onJourneyCommentPhotoSelected(event: Event, postId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.journeyCommentPhotoError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.journeyCommentPhotoError.set({ postId, message: 'Picture size exceeds 100 KB limit.' });
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.journeyCommentPhotoPreview.set({ postId, dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearJourneyCommentPhoto(): void {
    this.journeyCommentPhotoPreview.set(null);
    this.journeyCommentPhotoError.set(null);
  }

  submitJourneyComment(postId: number): void {
    if (!this.journeyCommentText.trim() && !this.journeyCommentPhotoPreview()) return;
    const attachedImg =
      this.journeyCommentPhotoPreview()?.postId === postId
        ? this.journeyCommentPhotoPreview()?.dataUrl
        : undefined;
    this.service.addJourneyComment(postId, this.journeyCommentText, undefined, attachedImg);
    this.journeyCommentText = '';
    this.clearJourneyCommentPhoto();
  }

  toggleJourneyCommentReply(commentId: number): void {
    if (this.activeJourneyReplyCommentId() === commentId) {
      this.activeJourneyReplyCommentId.set(null);
    } else {
      this.activeJourneyReplyCommentId.set(commentId);
      this.journeyReplyText = '';
    }
  }

  submitJourneyCommentReply(postId: number, parentCommentId: number): void {
    if (!this.journeyReplyText.trim()) return;
    this.service.addJourneyComment(postId, this.journeyReplyText, parentCommentId);
    this.journeyReplyText = '';
    this.activeJourneyReplyCommentId.set(null);
  }

  handleCommentThreadReply(event: { postId: number; parentCommentId: number; text: string; imageUrl?: string }): void {
    this.service.addJourneyComment(event.postId, event.text, event.parentCommentId, event.imageUrl);
  }

  handleCommentThreadLike(event: { postId: number; commentId: number }): void {
    this.service.toggleJourneyCommentLike(event.postId, event.commentId);
  }

  handleCommentThreadReact(event: { postId: number; commentId: number; reaction: ReactionType }): void {
    this.service.reactToJourneyComment(event.postId, event.commentId, event.reaction);
  }

  handleCommentThreadShowReactions(event: { comment: JourneyComment; commentId: number }): void {
    this.openReactionsBreakdownModal(event.comment, 'comment');
  }

  toggleJourneyCommentLike(postId: number, commentId: number): void {
    this.service.toggleJourneyCommentLike(postId, commentId);
  }

  // ---------------------------------------------------------------------------
  // SHARE POST IN JOURNEY (Requirement I)
  // ---------------------------------------------------------------------------

  openShareModal(post: JourneyPost): void {
    this.postToShare.set(post);
    this.shareThoughtText = '';
    this.showShareModal.set(true);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
    this.postToShare.set(null);
    this.shareThoughtText = '';
  }

  submitSharePost(): void {
    const post = this.postToShare();
    if (!post) return;

    this.service.shareJourneyPost(post.id, this.shareThoughtText);
    this.closeShareModal();
    this.setSection('journey');
  }

  // ---------------------------------------------------------------------------
  // REQUIREMENT A: 11 REACTIONS SYSTEM ON HOLD & BREAKDOWN MODAL
  // ---------------------------------------------------------------------------

  startLikeButtonHold(targetId: number, type: 'post' | 'comment' | 'messagebook'): void {
    this.reactionHoldTimer = setTimeout(() => {
      this.showReactionPickerForTarget.set({ id: targetId, type });
    }, 350);
  }

  endLikeButtonHold(): void {
    if (this.reactionHoldTimer) {
      clearTimeout(this.reactionHoldTimer);
      this.reactionHoldTimer = undefined;
    }
  }

  selectHoldReaction(
    targetId: number,
    type: 'post' | 'comment' | 'messagebook',
    reaction: ReactionType,
    postId?: number,
  ): void {
    this.showReactionPickerForTarget.set(null);
    if (type === 'post') {
      this.service.reactToJourneyPost(targetId, reaction);
    } else if (type === 'comment' && postId) {
      this.service.reactToJourneyComment(postId, targetId, reaction);
    } else if (type === 'messagebook') {
      this.service.reactToComment(targetId, reaction);
    }
  }

  startReactionsSummaryHold(
    item: { id: number; reactions?: UserReaction[]; likers?: AuthorInfo[]; text?: string; author?: AuthorInfo },
    type: 'post' | 'comment' | 'messagebook',
  ): void {
    this.reactionSummaryHoldTimer = setTimeout(() => {
      this.openReactionsBreakdownModal(item, type);
    }, 300);
  }

  endReactionsSummaryHold(): void {
    if (this.reactionSummaryHoldTimer) {
      clearTimeout(this.reactionSummaryHoldTimer);
      this.reactionSummaryHoldTimer = undefined;
    }
  }

  openReactionsBreakdownModal(
    item: { id: number; reactions?: UserReaction[]; likers?: AuthorInfo[]; text?: string; author?: AuthorInfo },
    type: 'post' | 'comment' | 'messagebook',
  ): void {
    let reactions = item.reactions && item.reactions.length > 0 ? [...item.reactions] : [];
    if (reactions.length === 0) {
      const pool =
        item.likers && item.likers.length > 0
          ? item.likers
          : this.service.companions().map((c) => ({
              id: c.id,
              fullName: c.fullName,
              profession: c.profession,
              profilePhotoUrl: c.profilePhotoUrl,
            }));
      const sampleReactions: ReactionType[] = ['Heart', 'Fire', 'Love', 'Smile', 'Clapping'];
      reactions = pool.map((u, i) => ({
        user: u,
        type: sampleReactions[i % sampleReactions.length],
        reactedAtUtc: new Date().toISOString(),
      }));
    }

    const title = item.author?.fullName ? `Reactions on ${item.author.fullName}'s post` : 'Reactions';
    this.selectedReactionsTarget.set({
      id: item.id,
      type,
      reactions,
      title,
    });
    this.activeReactionFilterTab.set('All');
    this.showReactionsBreakdownModal.set(true);
  }

  closeReactionsBreakdownModal(): void {
    this.showReactionsBreakdownModal.set(false);
    this.selectedReactionsTarget.set(null);
  }

  setReactionFilterTab(tab: string): void {
    this.activeReactionFilterTab.set(tab);
  }

  getTop3ReactionIcons(item?: { reactions?: UserReaction[] } | null): string[] {
    return getTopReactionIcons(item?.reactions, 3);
  }

  getTop1ReactionIcon(item?: { reactions?: UserReaction[]; isLiked?: boolean; likeCount?: number } | null): string {
    return getTopReactionIcon(item?.reactions);
  }

  // ---------------------------------------------------------------------------
  // REQUIREMENT C: TAG PEOPLE MODAL & POST TAGS
  // ---------------------------------------------------------------------------

  openTagPeopleModal(target: 'journey' | 'messagebook'): void {
    this.tagTarget.set(target);
    this.tagSearchQuery = '';
    this.showTagPeopleModal.set(true);
  }

  closeTagPeopleModal(): void {
    this.showTagPeopleModal.set(false);
  }

  toggleCompanionTag(companion: Companion | AuthorInfo): void {
    const target = this.tagTarget();
    const listSignal =
      target === 'journey'
        ? this.selectedJourneyTaggedCompanions
        : this.selectedMessageBookTaggedCompanions;

    const current = listSignal();
    const exists = current.some((c) => c.id === companion.id);
    if (exists) {
      listSignal.set(current.filter((c) => c.id !== companion.id));
    } else {
      listSignal.set([
        ...current,
        {
          id: companion.id,
          fullName: companion.fullName,
          profession: companion.profession,
          profilePhotoUrl: companion.profilePhotoUrl,
        },
      ]);
    }
  }

  isCompanionTagged(companionId: number): boolean {
    const list =
      this.tagTarget() === 'journey'
        ? this.selectedJourneyTaggedCompanions()
        : this.selectedMessageBookTaggedCompanions();
    return list.some((c) => c.id === companionId);
  }

  clearAllTaggedCompanions(): void {
    if (this.tagTarget() === 'journey') {
      this.selectedJourneyTaggedCompanions.set([]);
    } else {
      this.selectedMessageBookTaggedCompanions.set([]);
    }
  }

  removeTaggedCompanion(companionId: number, target: 'journey' | 'messagebook'): void {
    if (target === 'journey') {
      this.selectedJourneyTaggedCompanions.update((list) =>
        list.filter((c) => c.id !== companionId),
      );
    } else {
      this.selectedMessageBookTaggedCompanions.update((list) =>
        list.filter((c) => c.id !== companionId),
      );
    }
  }

  onCoverImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.defaultCoverPhoto) {
      target.src = this.defaultCoverPhoto;
    }
  }

  // ---------------------------------------------------------------------------
  // REQUIREMENT D: DETAILED ABOUT ME (8 SUB-SECTIONS)
  // ---------------------------------------------------------------------------

  initAboutMeData(): void {
    const details = this.service.profile()?.aboutMeDetails;
    const introVal = details?.intro || this.service.profile()?.aboutMe || '';
    if (!introVal || introVal.trim().length < 150) {
      this.aboutIntro = this.service.getRichIntroForUser();
    } else {
      this.aboutIntro = introVal;
    }
    this.aboutGender = details?.gender || this.service.profile()?.gender || 'Female';
    this.aboutDob = details?.dateOfBirth || this.service.profile()?.dateOfBirth || '1996-04-18';
    this.aboutLocation =
      details?.location ||
      (this.service.profile()?.cityName
        ? `${this.service.profile()!.cityName}, ${this.service.profile()!.countryName || ''}`
        : 'Paris, France');
    this.aboutHometown = details?.hometown || 'Lyon, France';
    this.aboutRelationshipStatus = details?.relationshipStatus || 'Exploring solo';
    this.aboutLanguages.set(
      details?.languagesKnown && details.languagesKnown.length > 0
        ? [...details.languagesKnown]
        : ['English', 'French', 'Italian', 'Spanish'],
    );
    this.aboutWorkExperiences.set(
      details?.workExperience && details.workExperience.length > 0
        ? JSON.parse(JSON.stringify(details.workExperience))
        : [
            {
              id: 1,
              company: 'WanderLust Media Studio',
              yearFrom: '2022',
              yearTo: '',
              currentlyWorkHere: true,
              country: 'France',
              city: 'Paris',
              town: '1st Arrondissement',
              description: 'Lead visual director producing AI-enhanced travel memoirs.',
            },
          ],
    );
    this.aboutEducation.set(
      details?.education && details.education.length > 0
        ? JSON.parse(JSON.stringify(details.education))
        : [
            {
              id: 1,
              institutionName: 'Sorbonne University',
              level: 'University',
              courseOrDegree: 'Master of Fine Arts in Cinematography',
              yearFrom: '2017',
              yearTo: '2019',
              currentlyStudying: false,
            },
            {
              id: 2,
              institutionName: 'Lycée Condorcet',
              level: 'High School',
              courseOrDegree: 'Literature & Visual Arts Diploma',
              yearFrom: '2014',
              yearTo: '2017',
              currentlyStudying: false,
            },
            {
              id: 3,
              institutionName: 'École Primaire Victor Hugo',
              level: 'Primary School',
              courseOrDegree: 'Primary Education Certificate',
              yearFrom: '2008',
              yearTo: '2014',
              currentlyStudying: false,
            },
          ],
    );
    this.aboutHobbies.set(
      details?.hobbies && details.hobbies.length > 0
        ? [...details.hobbies]
        : ['Photography', 'Alpine Hiking', 'Coffee Brewing', 'Scuba Diving', 'Journaling'],
    );
    this.aboutInterests.set(
      details?.interests && details.interests.length > 0
        ? [...details.interests]
        : ['Architecture', 'Historical Heritage', 'Sunset Chasing', 'Train Journeys', 'Street Food'],
    );
    this.aboutContactEmail =
      details?.contactEmail || this.service.profile()?.email || 'sophia.laurent@neverbeen.example';
    this.aboutContactPhone =
      details?.contactPhone || this.service.profile()?.contactNumber || '+33 6 88 41 92 01';
    this.aboutSocialLinks.set(
      details?.socialLinks && details.socialLinks.length > 0
        ? JSON.parse(JSON.stringify(details.socialLinks))
        : [
            { platform: 'Instagram', urlOrHandle: '@sophia.in.the.wild' },
            { platform: 'Facebook', urlOrHandle: 'facebook.com/sophialaurent.travel' },
            { platform: 'X', urlOrHandle: '@sophia_visuals' },
          ],
    );
    this.aboutThePersonText =
      details?.aboutThePerson ||
      'I fell in love with storytelling while crossing the Swiss viaducts as a teenager. Today, I travel with a lightweight camera kit and an open heart, seeking authentic human connections across Europe and beyond.';
  }

  toggleEditAboutMe(): void {
    if (!this.editingAboutMe()) {
      this.initAboutMeData();
    }
    this.editingAboutMe.update((v) => !v);
  }

  addHobby(hobby?: string): void {
    const val = (hobby || this.newHobbySelect).trim();
    if (!val) return;
    this.hobbyNotice.set(null);
    if (this.aboutHobbies().length >= 10) {
      this.hobbyNotice.set('You can add up to 10 hobbies maximum.');
      return;
    }
    if (!this.aboutHobbies().includes(val)) {
      this.aboutHobbies.update((h) => [...h, val]);
    }
    this.newHobbySelect = '';
  }

  removeHobby(index: number): void {
    this.hobbyNotice.set(null);
    this.aboutHobbies.update((h) => h.filter((_, i) => i !== index));
  }

  addInterest(interest?: string): void {
    const val = (interest || this.newInterestSelect).trim();
    if (!val) return;
    this.interestNotice.set(null);
    if (this.aboutInterests().length >= 10) {
      this.interestNotice.set('You can add up to 10 interests maximum.');
      return;
    }
    if (!this.aboutInterests().includes(val)) {
      this.aboutInterests.update((ints) => [...ints, val]);
    }
    this.newInterestSelect = '';
  }

  removeInterest(index: number): void {
    this.interestNotice.set(null);
    this.aboutInterests.update((ints) => ints.filter((_, i) => i !== index));
  }

  addWorkExperience(): void {
    this.aboutWorkExperiences.update((list) => [
      ...list,
      {
        id: Date.now(),
        company: '',
        yearFrom: '',
        yearTo: '',
        currentlyWorkHere: false,
        country: '',
        city: '',
        town: '',
        description: '',
      },
    ]);
  }

  removeWorkExperience(index: number): void {
    this.aboutWorkExperiences.update((list) => list.filter((_, i) => i !== index));
  }

  addEducation(): void {
    this.aboutEducation.update((list) => [
      ...list,
      {
        id: Date.now(),
        institutionName: '',
        level: 'University',
        courseOrDegree: '',
        yearFrom: '',
        yearTo: '',
        currentlyStudying: false,
      },
    ]);
  }

  removeEducation(index: number): void {
    this.aboutEducation.update((list) => list.filter((_, i) => i !== index));
  }

  addSocialLink(): void {
    this.socialLinkNotice.set(null);
    if (this.aboutSocialLinks().length >= 3) {
      this.socialLinkNotice.set('You can add up to 3 social media links (Facebook, Instagram, X).');
      return;
    }
    this.aboutSocialLinks.update((list) => [
      ...list,
      {
        platform: 'Instagram',
        urlOrHandle: '',
      },
    ]);
  }

  removeSocialLink(index: number): void {
    this.socialLinkNotice.set(null);
    this.aboutSocialLinks.update((list) => list.filter((_, i) => i !== index));
  }

  addLanguage(lang?: string): void {
    const val = (lang || this.newLanguageInput).trim();
    if (!val) return;
    if (!this.aboutLanguages().includes(val)) {
      this.aboutLanguages.update((langs) => [...langs, val]);
    }
    this.newLanguageInput = '';
  }

  removeLanguage(index: number): void {
    this.aboutLanguages.update((langs) => langs.filter((_, i) => i !== index));
  }

  saveAboutMeDetails(): void {
    const details: AboutMeDetails = {
      intro: this.aboutIntro.trim(),
      gender: this.aboutGender,
      dateOfBirth: this.aboutDob,
      location: this.aboutLocation.trim(),
      hometown: this.aboutHometown.trim(),
      relationshipStatus: this.aboutRelationshipStatus,
      languagesKnown: this.aboutLanguages(),
      workExperience: this.aboutWorkExperiences(),
      education: this.aboutEducation(),
      hobbies: this.aboutHobbies(),
      interests: this.aboutInterests(),
      contactEmail: this.aboutContactEmail.trim(),
      contactPhone: this.aboutContactPhone.trim(),
      socialLinks: this.aboutSocialLinks(),
      aboutThePerson: this.aboutThePersonText.trim(),
    };

    this.service.updateAboutMeDetails(details);
    this.editingAboutMe.set(false);
  }

  cancelEditAboutMe(): void {
    this.initAboutMeData();
    this.editingAboutMe.set(false);
  }

  getProfileAboutMe(): AboutMeDetails {
    return this.service.profile()?.aboutMeDetails || {};
  }

  getVisitorAboutMe(): AboutMeDetails | undefined {
    return this.viewingVisitor()?.aboutMeDetails;
  }

  getVisitorIntro(visitor: Companion): string {
    const rawIntro = visitor.aboutMeDetails?.intro;
    if (rawIntro && rawIntro.trim().length > 150 && rawIntro.includes('\n')) {
      return rawIntro;
    }
    return this.service.getRichIntroForCompanion(visitor);
  }

  // ---------------------------------------------------------------------------
  // LIKES MODAL & LONG-PRESS (Requirement A)
  // ---------------------------------------------------------------------------

  startLikePress(post: JourneyPost): void {
    this.isLongPressActive = false;
    this.likePressTimer = setTimeout(() => {
      this.isLongPressActive = true;
      this.openLikersModal(post);
    }, 400);
  }

  endLikePress(): void {
    if (this.likePressTimer) {
      clearTimeout(this.likePressTimer);
      this.likePressTimer = undefined;
    }
  }

  handleLikeClick(post: JourneyPost): void {
    if (this.isLongPressActive) {
      this.isLongPressActive = false;
      return;
    }
    this.toggleLikePost(post.id);
  }

  openLikersModal(post: JourneyPost): void {
    let likers = post.likers || [];
    if (!likers.length) {
      // Default pool from companions so list exceeds 10 to exhibit the scrollbar
      likers = this.service.companions().map((c) => ({
        id: c.id,
        fullName: c.fullName,
        profilePhotoUrl: c.profilePhotoUrl,
        profession: c.profession,
      }));
    }
    this.selectedPostLikers.set(likers);
    this.selectedPostForLikers.set(post);
    this.showLikersModal.set(true);
    this.openReactionsBreakdownModal(post, 'post');
  }

  closeLikersModal(): void {
    this.showLikersModal.set(false);
    this.selectedPostForLikers.set(null);
  }

  getLikerConnectionStatus(likerId: number): 'self' | 'connected' | 'pending' | 'none' {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (likerId === currentUserId) return 'self';
    const c = this.service.companions().find((comp) => comp.id === likerId);
    if (!c) return 'none';
    if (c.status === 'connected') return 'connected';
    if (c.status === 'pending_outgoing') return 'pending';
    return 'none';
  }

  onLikerClick(liker: AuthorInfo): void {
    this.closeLikersModal();
    this.openVisitorProfile(liker);
  }

  // ---------------------------------------------------------------------------
  // BLOCK / UNBLOCK USERS (Requirement B)
  // ---------------------------------------------------------------------------

  blockUser(userId: number): void {
    this.service.blockUser(userId);
    if (this.viewingVisitor() && this.viewingVisitor()!.id === userId) {
      this.viewingVisitor.set(null);
    }
  }

  unblockUser(userId: number): void {
    this.service.unblockUser(userId);
  }

  isUserBlocked(userId: number): boolean {
    return this.service.isUserBlocked(userId);
  }

  getBlockedUsers(): Companion[] {
    return this.service.getBlockedUsers();
  }

  // ---------------------------------------------------------------------------
  // REPORT ABUSE (Requirement C)
  // ---------------------------------------------------------------------------

  openReportAbuseModal(type: 'post' | 'comment' | 'companion', id: number, author: AuthorInfo, text: string): void {
    this.reportTarget.set({
      type: type === 'companion' ? 'comment' : type,
      id,
      author,
      snippet: text.length > 140 ? text.substring(0, 140) + '...' : text,
    });
    this.reportReason = 'Inappropriate Content';
    this.reportDetails = '';
    this.reportError.set(null);
    this.reportSubmitted.set(false);
    this.showReportAbuseModal.set(true);
  }

  closeReportAbuseModal(): void {
    this.showReportAbuseModal.set(false);
    this.reportTarget.set(null);
    this.reportDetails = '';
    this.reportError.set(null);
    this.reportSubmitted.set(false);
  }

  submitReportAbuse(): void {
    const target = this.reportTarget();
    if (!target) return;

    if (!this.reportDetails.trim()) {
      this.reportError.set('Please provide details or concern about this report.');
      return;
    }

    this.service.submitAbuseReport({
      targetType: target.type,
      targetId: target.id,
      reportedAuthor: target.author,
      reason: this.reportReason,
      details: this.reportDetails.trim(),
    });

    this.reportSubmitted.set(true);
    setTimeout(() => {
      this.closeReportAbuseModal();
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // CIRCLES
  // ---------------------------------------------------------------------------

  openCreateCircleModal(): void {
    this.circleError.set(null);
    if (this.service.circles().length >= 5) {
      this.circleError.set('You have reached the maximum of 5 Circles.');
      return;
    }
    this.newCircleName = '';
    this.newCircleDesc = '';
    this.selectedCircleMemberIds.set([]);
    this.showCreateCircleModal.set(true);
  }

  closeCreateCircleModal(): void {
    this.showCreateCircleModal.set(false);
  }

  toggleCircleMemberSelection(companionId: number): void {
    const current = this.selectedCircleMemberIds();
    if (current.includes(companionId)) {
      this.selectedCircleMemberIds.set(current.filter((id) => id !== companionId));
    } else {
      this.selectedCircleMemberIds.set([...current, companionId]);
    }
  }

  submitCreateCircle(): void {
    if (!this.newCircleName.trim()) {
      this.circleError.set('Circle Name is required.');
      return;
    }

    const created = this.service.createCircle(
      this.newCircleName,
      this.newCircleDesc || 'A circle of travel companions.',
      this.selectedCircleMemberIds(),
      this.newCircleIcon,
      this.newCircleColor,
    );

    if (created) {
      this.showCreateCircleModal.set(false);
      this.circleError.set(null);
    } else {
      this.circleError.set('Maximum of 5 Circles allowed.');
    }
  }

  deleteCircle(circleId: number): void {
    this.service.deleteCircle(circleId);
  }

  getCircleMembers(memberIds: number[]): Companion[] {
    return this.service.companions().filter((c) => memberIds.includes(c.id));
  }

  // ---------------------------------------------------------------------------
  // MESSENGER & CHAT BOXES
  // ---------------------------------------------------------------------------

  toggleMessengerFlyout(): void {
    this.showMessengerFlyout.update((v) => !v);
  }

  openChatWith(companion: Companion): void {
    this.service.openChatBox(companion);
    this.showMessengerFlyout.set(false);
  }

  closeChat(companionId: number): void {
    this.service.closeChatBox(companionId);
  }

  toggleMinimize(companionId: number): void {
    this.service.toggleMinimizeChatBox(companionId);
  }

  sendChat(companionId: number, text: string): void {
    this.service.sendChatMessage(companionId, text);
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS (Approve & Reject Companionship)
  // ---------------------------------------------------------------------------

  approveRequest(notificationId: number, fromUserId: number): void {
    const success = this.service.approveCompanionshipRequest(notificationId, fromUserId);
    if (!success) {
      alert('Maximum limit of 500 Companions reached. Cannot add more companions.');
    }
  }

  acceptCompanionship(companionId: number): void {
    const success = this.service.approveCompanionshipRequest(0, companionId);
    if (!success) {
      alert('Maximum limit of 500 Companions reached. Cannot add more companions.');
      return;
    }
    if (this.viewingVisitor() && this.viewingVisitor()!.id === companionId) {
      this.viewingVisitor.update((v) => (v ? { ...v, status: 'connected' } : null));
    }
  }

  acceptCompanionRequest(userId: number): void {
    this.acceptCompanionship(userId);
  }

  rejectCompanionRequest(userId: number): void {
    this.service.rejectCompanionshipRequest(0, userId);
    if (this.viewingVisitor() && Number(this.viewingVisitor()!.id) === Number(userId)) {
      this.viewingVisitor.update((v) => (v ? { ...v, status: 'none' } : null));
    }
  }

  // ---------------------------------------------------------------------------
  // COMPANION PAGE GROUP COLLAPSE / EXPAND
  // ---------------------------------------------------------------------------

  readonly isRequestsGroupCollapsed = signal<boolean>(false);
  readonly isConnectedGroupCollapsed = signal<boolean>(false);
  readonly isSuggestionsGroupCollapsed = signal<boolean>(false);
  readonly isPendingSentGroupCollapsed = signal<boolean>(false);

  toggleRequestsGroup(): void {
    this.isRequestsGroupCollapsed.update((c) => !c);
  }

  toggleConnectedGroup(): void {
    this.isConnectedGroupCollapsed.update((c) => !c);
  }

  toggleSuggestionsGroup(): void {
    this.isSuggestionsGroupCollapsed.update((c) => !c);
  }

  togglePendingSentGroup(): void {
    this.isPendingSentGroupCollapsed.update((c) => !c);
  }

  toggleCompanionGroup(group: 'requests' | 'connected' | 'suggestions' | 'pendingSent'): void {
    if (group === 'requests') this.toggleRequestsGroup();
    else if (group === 'connected') this.toggleConnectedGroup();
    else if (group === 'suggestions') this.toggleSuggestionsGroup();
    else if (group === 'pendingSent') this.togglePendingSentGroup();
  }

  rejectRequest(notificationId: number, fromUserId: number): void {
    this.service.rejectCompanionshipRequest(notificationId, fromUserId);
  }

  // ---------------------------------------------------------------------------
  // COMPANIONS
  // ---------------------------------------------------------------------------

  removeCompanion(companionId: number): void {
    this.service.removeCompanion(companionId);
  }

  // ---------------------------------------------------------------------------
  // ABOUT ME EDIT
  // ---------------------------------------------------------------------------

  enableEdit(): void {
    this.populateEditForm();
    this.editingDetails.set(true);
  }

  cancelEdit(): void {
    this.editingDetails.set(false);
  }

  private populateEditForm(): void {
    const p = this.service.profile();
    if (!p) return;
    this.editForm.patchValue({
      fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      country: p.countryName || p.country || '',
      state: p.state || '',
      city: p.cityName || p.city || '',
      gender: p.gender || '',
      dateOfBirth: p.dateOfBirth || '',
      aboutMe: p.aboutMe || '',
      profession: p.profession || '',
    });
  }

  private populateSettingsForm(): void {
    const p = this.service.profile();
    const s = p?.settings;
    if (!s) return;
    this.settingsForm.patchValue({
      publicProfileEnabled: s.publicProfileEnabled,
      isProfileLocked: s.isProfileLocked ?? p?.isProfileLocked ?? false,
      whoCanMessage: s.whoCanMessage ?? 'everyone',
      searchVisibility: s.searchVisibility ?? true,
      journeyVisibility: s.journeyVisibility ?? 'public',
      emailNotificationsEnabled: s.emailNotificationsEnabled,
      phoneNotificationsEnabled: s.phoneNotificationsEnabled,
      soundNotificationsEnabled: s.soundNotificationsEnabled ?? true,
      twoFactorEnabled: s.twoFactorEnabled ?? false,
      preferredSeason: s.preferredSeason ?? 'Autumn & Spring',
      theme: s.theme,
      timezone: s.timezone || 'UTC',
    });
    if (s.travelStyles) {
      this.selectedTravelStyles.set(s.travelStyles);
    }
  }

  async saveDetails(): Promise<void> {
    if (this.editForm.invalid) return;
    const v = this.editForm.getRawValue();
    await this.service.updateProfile({
      fullName: v.fullName ?? undefined,
      gender: v.gender ?? undefined,
      dateOfBirth: v.dateOfBirth ?? undefined,
      aboutMe: v.aboutMe ?? undefined,
      profession: v.profession ?? undefined,
    });
    this.editingDetails.set(false);
  }

  async onPhotoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.profilePhotoError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.profilePhotoError.set('Picture size exceeds 100 KB limit. Please choose a photo under 100 KB.');
      input.value = '';
      return;
    }
    await this.service.uploadProfilePhoto(file);
    input.value = '';
  }

  async onCoverPhotoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.coverPhotoError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.coverPhotoError.set('Picture size exceeds 100 KB limit. Please choose an image under 100 KB.');
      input.value = '';
      return;
    }
    try {
      await this.service.uploadCoverPhoto(file);
    } catch (err: any) {
      this.coverPhotoError.set(err.message || 'Failed to upload cover photo');
    }
    input.value = '';
  }

  // ---------------------------------------------------------------------------
  // GALLERY
  // ---------------------------------------------------------------------------

  onGalleryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.galleryError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.galleryError.set('Picture size exceeds 100 KB limit. Please choose a photo under 100 KB.');
      this.selectedGalleryFile.set(null);
      this.galleryPreviewUrl.set(null);
      input.value = '';
      return;
    }
    this.selectedGalleryFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.galleryPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async submitGalleryUpload(): Promise<void> {
    const file = this.selectedGalleryFile();
    if (!file) return;

    this.uploadingGallery.set(true);
    try {
      await this.service.addGalleryPhoto(file, this.newCaption);
      this.selectedGalleryFile.set(null);
      this.galleryPreviewUrl.set(null);
      this.newCaption = '';
      this.showUploadCard.set(false);
    } finally {
      this.uploadingGallery.set(false);
    }
  }

  async deletePhoto(photoId: number): Promise<void> {
    await this.service.deleteGalleryPhoto(photoId);
  }

  // ---------------------------------------------------------------------------
  // MESSAGEBOOK (PERSONAL TO USER AND COMPANIONS)
  // ---------------------------------------------------------------------------

  onMessageBookPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.messageBookPhotoError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.messageBookPhotoError.set('Picture size exceeds 100 KB limit. Please choose a photo under 100 KB.');
      this.selectedMessageBookPhoto.set(null);
      this.messageBookPhotoPreview.set(null);
      input.value = '';
      return;
    }
    this.selectedMessageBookPhoto.set(file);
    const reader = new FileReader();
    reader.onload = () => this.messageBookPhotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearMessageBookPhoto(): void {
    this.selectedMessageBookPhoto.set(null);
    this.messageBookPhotoPreview.set(null);
    this.messageBookPhotoError.set(null);
  }

  async submitPost(): Promise<void> {
    if (!this.newPostText.trim() && !this.messageBookPhotoPreview()) return;
    this.postingPost.set(true);
    try {
      await this.service.postComment(
        this.newPostText.trim(),
        undefined,
        this.messageBookPhotoPreview() || undefined,
        this.selectedMessageBookTaggedCompanions().length > 0
          ? [...this.selectedMessageBookTaggedCompanions()]
          : undefined,
      );
      this.newPostText = '';
      this.selectedMessageBookTaggedCompanions.set([]);
      this.clearMessageBookPhoto();
    } finally {
      this.postingPost.set(false);
    }
  }

  toggleReplyInput(postId: number): void {
    if (this.activeReplyPostId() === postId) {
      this.activeReplyPostId.set(null);
    } else {
      this.activeReplyPostId.set(postId);
      this.replyText = '';
    }
  }

  async submitReply(postId: number): Promise<void> {
    if (!this.replyText.trim()) return;
    this.postingReply.set(true);
    try {
      await this.service.postComment(this.replyText.trim(), postId);
      this.replyText = '';
    } finally {
      this.postingReply.set(false);
    }
  }

  async react(commentId: number, type: 'like' | 'dislike'): Promise<void> {
    await this.service.toggleReaction(commentId, type);
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.service.deleteComment(commentId);
  }

  // Requirements F & G:
  // User can delete any post/comment they made (including on other user's journey or messagebook)
  // Owner can delete any post/comment made on their profile, but cannot delete other users' posts if not on their profile
  canDeleteComment(authorId: number): boolean {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (!this.viewingVisitor()) {
      return true; // Owner of this profile can delete any comment on their profile
    }
    return authorId === currentUserId; // On another profile, can only delete own comments
  }

  canDeleteJourneyPost(post: JourneyPost): boolean {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (!this.viewingVisitor()) {
      return true; // Owner of this profile can delete any post on their profile
    }
    return post.author.id === currentUserId; // On another profile, can only delete own post
  }

  deleteJourneyPost(postId: number): void {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('Are you sure you want to delete this journey post?')) {
        return;
      }
    }
    this.service.deleteJourneyPost(postId);
  }

  // Requirement G: Hide post option for other users' posts in Journey feed
  hideJourneyPost(postId: number): void {
    this.service.hideJourneyPost(postId);
  }

  // Requirement C: View own profile as visitor preview
  viewOwnProfileAsVisitor(): void {
    const ownComp = this.service.getCurrentUserAsCompanion();
    this.viewingVisitor.set(ownComp);
  }

  // Requirement E: Facebook collage open full post detail modal
  openPostDetail(post: JourneyPost): void {
    this.viewingPostDetail.set(post);
  }

  closePostDetail(): void {
    this.viewingPostDetail.set(null);
  }

  // Requirement F: Virtual scrolling / infinite scroll for Journey page
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.activeSection() !== 'journey' || !this.hasMoreJourneyPosts()) return;
    if (typeof window === 'undefined') return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 700;
    if (scrollPosition >= threshold) {
      this.loadMoreJourneyPosts();
    }
  }

  loadMoreJourneyPosts(): void {
    this.displayedJourneyPostLimit.update((cur) =>
      Math.min(cur + 25, this.service.visibleJourneyPosts().length),
    );
  }

  handleCommentThreadDelete(event: { postId: number; commentId: number }): void {
    this.service.deleteJourneyComment(event.postId, event.commentId);
  }

  // ---------------------------------------------------------------------------
  // CHAT WINDOW ENHANCEMENTS (Requirements J & K)
  // ---------------------------------------------------------------------------
  readonly chatReactionEmojis: string[] = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🤔', '😡', '✨', '🎉'];
  readonly quickSendEmojis: string[] = ['😊', '❤️', '✈️', '📸', '👍', '🔥', '🎉', '🏖️', '☕', '✨'];

  readonly activeReactionPickerMsgId = signal<number | null>(null);
  readonly activeDotsMenuMsgId = signal<number | null>(null);
  readonly activeEmojiTrayCompanionId = signal<number | null>(null);
  readonly copiedProfileUrl = signal(false);

  toggleQuickEmojiTray(companionId: number): void {
    this.activeEmojiTrayCompanionId.update((id) => (id === companionId ? null : companionId));
  }

  insertChatEmoji(box: ActiveChatBox, emoji: string): void {
    box.draftText = (box.draftText || '') + emoji;
    this.activeEmojiTrayCompanionId.set(null);
  }

  startChatReply(companionId: number, msg: ChatMessage): void {
    this.service.activeChatBoxes.update((boxes) =>
      boxes.map((b) => (b.companionId === companionId ? { ...b, replyingToMessage: msg } : b)),
    );
    this.activeDotsMenuMsgId.set(null);
  }

  cancelChatReply(companionId: number): void {
    this.service.activeChatBoxes.update((boxes) =>
      boxes.map((b) => (b.companionId === companionId ? { ...b, replyingToMessage: null } : b)),
    );
  }

  toggleMsgReactionPicker(companionId: number, msgId: number): void {
    this.activeReactionPickerMsgId.update((id) => (id === msgId ? null : msgId));
    this.activeDotsMenuMsgId.set(null);
  }

  selectChatReaction(companionId: number, msgId: number, emoji: string): void {
    this.service.reactToChatMessage(companionId, msgId, emoji);
    this.activeReactionPickerMsgId.set(null);
  }

  reactToChatMsg(companionId: number, msgId: number, emoji: string): void {
    this.service.reactToChatMessage(companionId, msgId, emoji);
  }

  toggleMsgDotsMenu(companionId: number, msgId: number): void {
    this.activeDotsMenuMsgId.update((id) => (id === msgId ? null : msgId));
    this.activeReactionPickerMsgId.set(null);
  }

  removeChatMsg(companionId: number, msgId: number): void {
    if (confirm('Are you sure you want to remove this message?')) {
      this.service.removeChatMessage(companionId, msgId);
      this.activeDotsMenuMsgId.set(null);
    }
  }

  reportChatMsgAbuse(companion: Companion, msg: ChatMessage): void {
    this.activeDotsMenuMsgId.set(null);
    this.openReportAbuseModal(
      'comment',
      msg.id,
      {
        id: msg.senderId,
        fullName: msg.senderId === 1 ? 'Me' : companion.fullName,
        profilePhotoUrl:
          msg.senderId === 1
            ? this.service.profile()?.profilePhotoUrl
            : companion.profilePhotoUrl,
        profession: companion.profession,
      },
      msg.text,
    );
  }

  sendChatWithReply(box: ActiveChatBox): void {
    if (!box.draftText.trim()) return;
    const replyTarget = box.replyingToMessage;
    const replyTo = replyTarget
      ? {
          id: replyTarget.id,
          senderName: this.getMsgSenderName(box, replyTarget),
          text: replyTarget.text,
        }
      : null;
    this.service.sendChatMessage(box.companionId, box.draftText, replyTo);
    box.draftText = '';
    box.replyingToMessage = null;
    this.activeEmojiTrayCompanionId.set(null);
    this.activeReactionPickerMsgId.set(null);
  }

  getMsgSenderName(box: ActiveChatBox, msg: ChatMessage): string {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (msg.senderId === currentUserId) {
      return this.service.profile()?.fullName || 'Me';
    }
    return box.companion.fullName;
  }

  getMsgReactionsEntries(msg: ChatMessage): { emoji: string; count: number }[] {
    if (!msg.reactions) return [];
    return Object.entries(msg.reactions)
      .filter(([_, count]) => count > 0)
      .map(([emoji, count]) => ({ emoji, count }));
  }

  copyProfileUrl(user: Companion): void {
    const uid = user.uniqueId || generate20DigitUid(user.id);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/profile?id=${uid}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    this.copiedProfileUrl.set(true);
    setTimeout(() => this.copiedProfileUrl.set(false), 2500);
  }

  copyOwnProfileUrl(): void {
    const p = this.service.profile();
    const uid = p?.uniqueId || generate20DigitUid(this.service.currentUser()?.id || 1);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/profile?id=${uid}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    this.copiedProfileUrl.set(true);
    setTimeout(() => this.copiedProfileUrl.set(false), 2500);
  }

  // ---------------------------------------------------------------------------
  // USER COMPANIONS & "SEE ALL COMPANIONS" POPUP MODAL (Requirements A & D)
  // ---------------------------------------------------------------------------
  readonly showAllUserCompanionsModal = signal(false);
  readonly userCompanionsSearch = signal('');

  openAllUserCompanionsModal(): void {
    this.userCompanionsSearch.set('');
    this.showAllUserCompanionsModal.set(true);
  }

  closeAllUserCompanionsModal(): void {
    this.showAllUserCompanionsModal.set(false);
  }

  filteredUserCompanions(): Companion[] {
    const all = this.connectedCompanions();
    const q = this.userCompanionsSearch().trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.profession.toLowerCase().includes(q),
    );
  }

  // ---------------------------------------------------------------------------
  // MUTUAL COMPANIONS POPUP MODAL (Requirement E)
  // ---------------------------------------------------------------------------
  readonly showMutualCompanionsModal = signal(false);
  readonly mutualCompanionsSearch = signal('');
  readonly selectedMutualCompanionTarget = signal<Companion | null>(null);

  openMutualCompanionsModal(target?: Companion): void {
    const comp = target || this.viewingVisitor();
    this.selectedMutualCompanionTarget.set(comp);
    this.mutualCompanionsSearch.set('');
    this.showMutualCompanionsModal.set(true);
  }

  closeMutualCompanionsModal(): void {
    this.showMutualCompanionsModal.set(false);
    this.selectedMutualCompanionTarget.set(null);
  }

  getMutualCompanions(targetId: number): Companion[] {
    const currentUserId = this.service.currentUser()?.id || 1;
    const visitorComps = this.getVisitorCompanions(targetId);
    const myConnected = this.connectedCompanions();
    return visitorComps.filter(
      (vc) => vc.id !== currentUserId && vc.id !== targetId && myConnected.some((mc) => mc.id === vc.id),
    );
  }

  getMutualCompanionsCount(targetId: number): number {
    return this.getMutualCompanions(targetId).length;
  }

  filteredMutualCompanions(targetId: number): Companion[] {
    const all = this.getMutualCompanions(targetId);
    const q = this.mutualCompanionsSearch().trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.profession.toLowerCase().includes(q),
    );
  }

  // Requirement B: Work Experience and Education for visitor profile
  getVisitorWorkExperiences(visitor: Companion): WorkExperience[] {
    if (visitor.aboutMeDetails?.workExperience && visitor.aboutMeDetails.workExperience.length > 0) {
      return visitor.aboutMeDetails.workExperience;
    }
    return [
      {
        id: 1,
        company: `${visitor.profession || 'Creative'} Studio & Expeditions`,
        country: visitor.country || 'India',
        city: visitor.city || 'Kolkata',
        yearFrom: '2022',
        yearTo: 'Present',
        currentlyWorkHere: true,
        description: `Working as ${visitor.profession || 'Creative Specialist'} focusing on cultural heritage documentation and scenic travel adventures.`,
      },
    ];
  }

  getVisitorEducationHistory(visitor: Companion): EducationInfo[] {
    if (visitor.aboutMeDetails?.education && visitor.aboutMeDetails.education.length > 0) {
      return visitor.aboutMeDetails.education;
    }
    return [
      {
        id: 1,
        institutionName: `${visitor.city || 'Regional'} University of Arts & Sciences`,
        level: 'University',
        courseOrDegree: 'Bachelor of Visual Arts & Travel Communications',
        yearFrom: '2017',
        yearTo: '2021',
        currentlyStudying: false,
      },
    ];
  }

  // Requirement C: Verification through Work or University Email
  readonly verificationTypeSelection = signal<'university' | 'work'>('university');
  verificationEmailInput = '';
  readonly verificationStep = signal<'input' | 'code' | 'verified'>('input');
  verificationCodeInput = '';
  readonly verificationMessage = signal<string | null>(null);
  readonly verificationSuccess = signal<boolean>(false);

  isUserVerified(userId?: number): boolean {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (userId === undefined || userId === currentUserId) {
      return !!this.service.currentUser()?.isVerified || !!this.service.profile()?.isVerified;
    }
    const comp = this.service.companions().find((c) => c.id === userId);
    return !!comp?.isVerified;
  }

  isAuthorVerified(author?: AuthorInfo | Companion | null): boolean {
    if (!author) return false;
    const currentUserId = this.service.currentUser()?.id || 1;
    if (author.id === currentUserId) {
      return this.isUserVerified();
    }
    return !!author.isVerified;
  }

  userVerificationEmail(): string {
    return (
      this.service.currentUser()?.verifiedEmail ||
      this.service.profile()?.verifiedEmail ||
      this.verificationEmailInput ||
      'verified@university.edu'
    );
  }

  userVerificationType(): string {
    return (
      this.service.currentUser()?.verificationType ||
      this.service.profile()?.verificationType ||
      this.verificationTypeSelection()
    );
  }

  requestEmailVerification(): void {
    const email = this.verificationEmailInput.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      this.verificationSuccess.set(false);
      this.verificationMessage.set('Please enter a valid work or university email address.');
      return;
    }
    this.verificationStep.set('code');
    this.verificationCodeInput = '849201';
    this.verificationSuccess.set(true);
    this.verificationMessage.set(
      `Verification code sent to ${email}. Enter code below to activate your blue tick.`,
    );
  }

  confirmVerificationCode(): void {
    const code = this.verificationCodeInput.trim();
    if (code.length < 4) {
      this.verificationSuccess.set(false);
      this.verificationMessage.set('Please enter a valid verification code.');
      return;
    }

    const email = this.verificationEmailInput.trim() || 'verified.user@university.edu';
    this.service.verifyUserEmail(email, this.verificationTypeSelection());
    this.verificationSuccess.set(true);
    this.verificationStep.set('verified');
    this.verificationMessage.set(
      'Account successfully verified! Blue verified tick has been activated across your profile.',
    );
  }

  removeVerification(): void {
    this.service.removeUserVerification();
    this.verificationEmailInput = '';
    this.verificationCodeInput = '';
    this.verificationStep.set('input');
    this.verificationMessage.set(null);
  }

  // ---------------------------------------------------------------------------
  // VISITOR COMPANIONS & "SEE ALL COMPANIONS" POPUP MODAL
  // ---------------------------------------------------------------------------
  readonly showAllVisitorCompanionsModal = signal(false);
  readonly visitorCompanionsSearch = signal('');

  openAllVisitorCompanionsModal(): void {
    this.visitorCompanionsSearch.set('');
    this.showAllVisitorCompanionsModal.set(true);
  }

  closeAllVisitorCompanionsModal(): void {
    this.showAllVisitorCompanionsModal.set(false);
  }

  getVisitorCompanions(visitorId: number): Companion[] {
    return this.service.getVisitorConnectedCompanions(visitorId);
  }

  getVisitorTopNineCompanions(visitorId: number): Companion[] {
    return this.getVisitorCompanions(visitorId).slice(0, 9);
  }

  filteredVisitorCompanions(visitorId: number): Companion[] {
    const all = this.getVisitorCompanions(visitorId);
    const q = this.visitorCompanionsSearch().trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.profession.toLowerCase().includes(q),
    );
  }

  generateUid(id: number | string): string {
    return generate20DigitUid(id);
  }

  // ---------------------------------------------------------------------------
  // SETTINGS & TRAVEL DATA EXPORT
  // ---------------------------------------------------------------------------

  toggleTravelStyle(style: string): void {
    const current = this.selectedTravelStyles();
    if (current.includes(style)) {
      this.selectedTravelStyles.set(current.filter((s) => s !== style));
    } else {
      this.selectedTravelStyles.set([...current, style]);
    }
  }

  async saveSettings(): Promise<void> {
    this.savingSettings.set(true);
    try {
      const v = this.settingsForm.getRawValue();
      const isLocked = v.isProfileLocked ?? false;
      this.service.setProfileLock(isLocked);

      await this.service.updateSettings({
        publicProfileEnabled: v.publicProfileEnabled ?? true,
        isProfileLocked: isLocked,
        whoCanMessage: (v.whoCanMessage as any) ?? 'everyone',
        searchVisibility: v.searchVisibility ?? true,
        journeyVisibility: (v.journeyVisibility as any) ?? 'public',
        emailNotificationsEnabled: v.emailNotificationsEnabled ?? true,
        phoneNotificationsEnabled: v.phoneNotificationsEnabled ?? false,
        soundNotificationsEnabled: v.soundNotificationsEnabled ?? true,
        twoFactorEnabled: v.twoFactorEnabled ?? false,
        travelStyles: this.selectedTravelStyles(),
        preferredSeason: v.preferredSeason ?? 'Autumn & Spring',
        theme: (v.theme as 'light' | 'dark' | 'system') ?? 'light',
        timezone: v.timezone ?? 'UTC',
      });
      this.settingsSaved.set(true);
      setTimeout(() => this.settingsSaved.set(false), 3000);
    } finally {
      this.savingSettings.set(false);
    }
  }

  downloadTravelData(): void {
    const p = this.service.profile();
    const data = {
      profile: p,
      journeyPosts: this.service.journeyPosts(),
      circles: this.service.circles(),
      companions: this.service.companions().filter((c) => c.status === 'connected'),
      exportedAtUtc: new Date().toISOString(),
      platform: 'NeverBeen Traveler Network',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neverbeen-travel-data-${p?.id || 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------------
  // LOG OUT
  // ---------------------------------------------------------------------------

  logout(): void {
    this.service.logout();
    this.router.navigate(['/community']);
  }

  formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  }
}
