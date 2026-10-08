import { Component, HostListener, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Chess, type Square } from 'chess.js';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AboutFieldKey,
  AboutMeDetails,
  AboutVisibilityMap,
  ActiveChatBox,
  AuthorInfo,
  FieldAudience,
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
  GalleryAlbum,
  GalleryPhoto,
  PostAudience,
  REACTION_ICONS,
  ReactionType,
  SocialMediaLink,
  UserActiveStatus,
  UserReaction,
  WorkExperience,
} from '../../../models/community';
import { CommunityService, PendingChat, splitFullName } from '../../../services/community.service';
import { SiteConfigService } from '../../../services/site-config.service';
import { GoogleMapLocation, GoogleMapsService } from '../../../services/google-maps.service';
import { CommunityConfirmService } from '../../../shared/community-confirm/community-confirm';
import { TranslatableTextDirective } from '../../../shared/translate/translatable-text.directive';
import { UserHoverCard, UserPreviewDirective } from '../../../shared/user-hover-card';
import { CommentThreadComponent } from './comment-item';
import { TaggedWith } from './tagged-with';
import { FieldAudienceControl } from './field-audience';
import { PresenceDot } from '../../../shared/presence-dot/presence-dot';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { AnnouncementInboxService, AnnouncementNotice, noticeTime, viewerProfile } from '../../../services/announcement-inbox.service';

import { TRAVEL_MOOD_GROUPS } from './travel-moods';
import { MoodPicker } from './mood-picker';
import { PostAudienceControl } from './post-audience';
import { birthdayCards, BirthdayCard } from './birthdays';
import { extractHashtags, hashtagAtCursor, insertHashtag, suggestHashtags } from './hashtags';
import { formatStorage, storagePie } from './storage-meter';

export type ProfileSection =
  | 'journey'
  | 'about'
  | 'gallery'
  | 'games'
  | 'messagebook'
  | 'companions'
  | 'followers'
  | 'following'
  | 'circles'
  | 'messenger'
  | 'birthdays'
  | 'notifications'
  | 'storage'
  | 'settings';

const PROFILE_SECTION_VALUES: readonly ProfileSection[] = [
  'journey',
  'about',
  'gallery',
  'games',
  'messagebook',
  'companions',
  'followers',
  'following',
  'circles',
  'messenger',
  'birthdays',
  'notifications',
  'storage',
  'settings',
];

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
    TaggedWith,
    FieldAudienceControl,
    PresenceDot,
    MoodPicker,
    PostAudienceControl,
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
  /** Title-less confirmations inside the Community (the native dialog titles itself with the site address). */
  private readonly confirmSvc = inject(CommunityConfirmService);

  // Active section in the right side wide panel (default: 'journey')
  protected readonly activeSection = signal<ProfileSection>('journey');

  // While the member is on the Messenger section, every open chat counts as read —
  // the unread badge on the community header disappears and stays gone while they're here.
  private readonly openPendingCircleEffect = effect(() => {
    const id = this.service.pendingCircleChatId();
    if (!id) return;
    const circle = this.service.circles().find((c) => c.id === id);
    this.service.pendingCircleChatId.set(null);
    if (circle) this.service.openCircleChat(circle);
  });

  private readonly contentGuardEffect = effect(() => {
    const message = this.service.contentGuardMessage() || this.service.storageBlockMessage();
    if (!message) return;
    this.service.contentGuardMessage.set(null);
    this.service.storageBlockMessage.set(null);
    void this.confirmSvc.notify(message);
  });

  private readonly markMessengerReadEffect = effect(() => {
    if (this.activeSection() !== 'messenger') return;
    for (const box of this.service.activeChatBoxes()) {
      if ((box.unreadCount ?? 0) > 0) this.service.markChatRead(box.companionId);
    }
  });

  // Mobile portrait navigation state
  protected readonly isMobileSidePanelOpen = signal<boolean>(false);

  // Visitor Profile mode (when visiting any other user)
  protected readonly viewingVisitor = signal<Companion | null>(null);

  /**
   * Requirement H — "View Profile" shows the member's own profile in visitor
   * mode. It is still *my* profile, so companion-management controls (Mutual
   * Companions, Remove Companionship, …) must not be offered for myself.
   */
  protected readonly isViewingSelf = computed(() => {
    const visitor = this.viewingVisitor();
    const me = this.service.currentUser()?.id;
    return !!visitor && me !== undefined && me !== null && visitor.id === me;
  });

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
  protected readonly travelMoodGroups = TRAVEL_MOOD_GROUPS;
  protected selectedMood = '✈️ Traveling';
  protected postAudience: PostAudience = { mode: 'public', allowIds: [], denyIds: [] };
  protected shareAudience: PostAudience = { mode: 'public', allowIds: [], denyIds: [] };
  protected readonly activeHashtag = signal<string | null>(null);
  protected readonly hashtagSuggestions = signal<{ tag: string; isNew: boolean }[]>([]);
  protected readonly birthdayView = signal<'day' | 'week' | 'month'>('day');
  protected readonly birthdayDrafts = signal<Record<number, string>>({});
  protected readonly editingPostId = signal<number | null>(null);
  protected editPostText = '';
  protected editPostMood = '';
  protected editAudience: PostAudience = { mode: 'public', allowIds: [], denyIds: [] };
  protected readonly formatStorage = formatStorage;
  protected readonly storagePie = storagePie;
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
  // The About me fields start empty: they are filled from the member's own stored
  // profile (the Web API's AboutMe + AboutMeDetailsJson) — never from sample data.
  protected aboutGender = '';
  protected aboutDob = '';
  protected aboutLocation = '';
  protected aboutHometown = '';
  protected aboutRelationshipStatus = '';
  protected aboutVisibility: AboutVisibilityMap = {};
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
  protected readonly circlePhotoPreview = signal<string | null>(null);
  protected editCirclePhoto = '';
  protected readonly circleQuery = signal('');
  protected readonly circleRoleFilter = signal<'all' | 'admin' | 'member'>('all');
  protected readonly circleStatusTab = signal<'active' | 'archived'>('active');
  protected readonly showEditCircleModal = signal(false);
  protected readonly editingCircleId = signal<number | null>(null);
  protected readonly showAddPeopleModal = signal(false);
  protected readonly addPeopleChatKey = signal<number | null>(null);
  protected readonly selectedAddPeopleIds = signal<number[]>([]);
  protected readonly showSaveCircleModal = signal(false);
  protected readonly saveCircleChatKey = signal<number | null>(null);
  protected readonly showManageCircleModal = signal(false);
  protected readonly managingCircleId = signal<number | null>(null);

  // Messenger state
  protected readonly showMessengerFlyout = signal(false);

  // Edit details state
  protected readonly editingDetails = signal(false);
  protected readonly editCitiesList = signal<City[]>([]);

  // Gallery state
  protected readonly showUploadCard = signal(false);
  protected readonly selectedGalleryAlbumId = signal<number | undefined>(undefined);
  protected readonly openGalleryAlbumId = signal<number | null>(null);
  protected newAlbumName = '';
  protected readonly uploadingGallery = signal(false);
  protected readonly selectedGalleryFile = signal<File | null>(null);
  protected readonly galleryPreviewUrl = signal<string | null>(null);
  protected readonly galleryError = signal<string | null>(null);
  protected newCaption = '';

  // Games hub
  protected readonly selectedGame = signal<string | null>(null);
  protected readonly ticBoard = signal<(string | null)[]>(Array(9).fill(null));
  protected readonly mines = signal<number[]>([1, 7, 13, 19, 23]);
  protected readonly mineRevealed = signal<number[]>([]);
  protected readonly mineStatus = signal('Clear the board without hitting a mine');
  protected readonly ticStatus = signal('Your turn');
  protected readonly gameScore = signal({ wins: 0, ai: 0 });
  protected readonly gamePrompt = signal('Ready for a travel challenge?');
  protected readonly gameOptions = signal<string[]>([]);
  protected readonly gameFeedback = signal<string | null>(null);
  protected readonly gameLoading = signal(false);
  protected readonly gameSource = signal('Live NeverBeen AI game data');
  protected readonly ludoRoll = signal<number | null>(null);
  protected readonly ludoTokens = signal<number[][]>([]);
  protected readonly ludoPlayerCount = signal(4);
  protected readonly ludoDifficulty = signal<'Easy'|'Medium'|'Hard'>('Medium');
  protected readonly ludoCurrentPlayer = signal(0);
  protected readonly ludoLegalTokens = signal<number[]>([]);
  protected readonly ludoTurnHistory = signal<string[]>([]);
  protected readonly ludoWinner = signal<number|null>(null);
  protected readonly ludoRunning = signal(false);
  protected readonly ludoThinking = signal(false);
  protected readonly ludoRolling = signal(false);
  protected readonly ludoStatus = signal('Set players and difficulty to start.');
  protected readonly ludoCaptureFlash = signal(false);
  protected readonly ludoSound = signal(false);
  protected readonly ludoTrack = (()=>{const cells:{row:number;col:number}[]=[];for(let c=1;c<=5;c++)cells.push({row:6,col:c});for(let r=5;r>=0;r--)cells.push({row:r,col:6});for(let c=7;c<=8;c++)cells.push({row:0,col:c});for(let r=1;r<=5;r++)cells.push({row:r,col:8});for(let c=9;c<=14;c++)cells.push({row:6,col:c});for(let r=7;r<=8;r++)cells.push({row:r,col:14});for(let c=13;c>=9;c--)cells.push({row:8,col:c});for(let r=9;r<=14;r++)cells.push({row:r,col:8});for(let c=7;c>=6;c--)cells.push({row:14,col:c});for(let r=13;r>=9;r--)cells.push({row:r,col:6});for(let c=5;c>=0;c--)cells.push({row:8,col:c});cells.push({row:7,col:0},{row:6,col:0});return cells;})();
  protected readonly ludoHomeLanes=[Array.from({length:5},(_,i)=>({row:7,col:i+1})),Array.from({length:5},(_,i)=>({row:i+1,col:7})),Array.from({length:5},(_,i)=>({row:7,col:13-i})),Array.from({length:5},(_,i)=>({row:13-i,col:7}))];
  protected readonly ludoPalette=['#ef4444','#22c55e','#3b82f6','#facc15'];
  private ludoWorker?:Worker;
  private ludoRollTimeout?:ReturnType<typeof setTimeout>;
  private ludoMoveTimer?:ReturnType<typeof setTimeout>;
  protected readonly ludoPlayerNames=['Ruby','Jade','Sapphire','Amber'];
  protected readonly ludoPlayerEmojis=['🔴','🟢','🔵','🟡'];
  protected readonly snakeBody = signal<number[]>([78, 77, 76]);
  protected readonly snakeFood = signal(55);
  protected readonly snakeDirection = signal<'up' | 'down' | 'left' | 'right'>('right');
  protected readonly snakeRunning = signal(false);
  protected readonly snakeScore = signal(0);
  protected readonly flappyBirdY = signal(50);
  protected readonly flappyVelocity = signal(0);
  protected readonly flappyPipeX = signal(100);
  protected readonly flappyGap = signal(48);
  protected readonly flappyScore = signal(0);
  protected readonly flappyRunning = signal(false);
  protected readonly arcadeScore = signal(0);
  protected readonly arcadeStatus = signal('Ready to play');
  protected readonly arcadeProgress = signal(12);
  private snakeTimer?: ReturnType<typeof setInterval>;
  private flappyTimer?: ReturnType<typeof setInterval>;
  protected readonly dinoScore = signal(0);
  protected readonly dinoBest = signal(0);
  protected readonly dinoPlayerY = signal(0);
  protected readonly dinoDucking = signal(false);
  protected readonly dinoRunning = signal(false);
  protected readonly dinoOver = signal(false);
  protected readonly dinoObstacles = signal<{x:number; type:string}[]>([]);
  protected readonly dinoItems = signal<number[]>([]);
  protected readonly dinoDestination = signal('🏜️ Desert');
  protected readonly dinoSpeedMode = signal<'Relaxed' | 'Classic' | 'Fast'>('Relaxed');
  private readonly dinoSpeedMultipliers = { Relaxed: 0.65, Classic: 1, Fast: 1.35 };
  private dinoTimer?: ReturnType<typeof setInterval>;
  protected readonly fruitScore = signal(0);
  protected readonly fruitBest = signal(0);
  protected readonly fruitLives = signal(3);
  protected readonly fruitTime = signal(60);
  protected readonly fruitRunning = signal(false);
  protected readonly fruitOver = signal(false);
  protected readonly fruitFlights = signal<{id:number;x:number;y:number;vx:number;vy:number;emoji:string;cut:boolean}[]>([]);
  protected readonly fruitCombo = signal(0);
  protected readonly fruitMessage = signal('');
  protected readonly fruitDestination = signal('🏝️ Bali');
  protected readonly fruitMode = signal<'Classic'|'Time Challenge'>('Classic');
  private fruitTimer?: ReturnType<typeof setInterval>;
  private fruitNextId = 0;
  private fruitPointer: {x:number;y:number}|null = null;
  private fruitLastCutAt = 0;
  protected readonly bikeRunning = signal(false);
  protected readonly bikeOver = signal(false);
  protected readonly bikeLane = signal(1);
  protected readonly bikeTraffic = signal<{id:number;lane:number;y:number;emoji:string}[]>([]);
  protected readonly bikeScore = signal(0);
  protected readonly bikeDistance = signal(0);
  protected readonly bikeSpeed = signal(1);
  protected readonly bikeLives = signal(3);
  protected readonly bikeAccelerating = signal(false);
  protected readonly bikeBraking = signal(false);
  protected readonly bikeCrash = signal(false);
  protected readonly bikeLevel = signal(0);
  private bikeTimer?: ReturnType<typeof setInterval>;
  private bikeNextId = 0;
  protected readonly archeryLevel = signal(0);
  protected readonly archeryRound = signal(1);
  protected readonly archeryScore = signal(0);
  protected readonly archeryShots = signal(0);
  protected readonly archeryAim = signal<{x:number;y:number}|null>(null);
  protected readonly archeryArrow = signal<{x:number;y:number}|null>(null);
  protected readonly archeryFeedback = signal('Drag from the bow toward the target, then release.');
  protected readonly archeryTargetX = signal(72);
  protected readonly archeryTargetY = signal(48);
  protected readonly archeryPlaying = signal(false);
  protected readonly archeryGameOver = signal(false);
  protected readonly archeryWind = signal(0);
  protected readonly archeryMoveDir = signal(1);
  private archeryTimer?: ReturnType<typeof setInterval>;
  private archeryPointerStart: {x:number;y:number}|null = null;
  private archeryPointerCurrent: {x:number;y:number}|null = null;
  private dinoVelocity = 0;
  private dinoDistance = 0;
  protected readonly chessPieces = signal<string[]>(['♜','♞','♝','♛','♚','♝','♞','♜','♟','♟','♟','♟','♟','♟','♟','♟','','','','','','','','','♙','♙','♙','♙','♙','♙','♙','♙','♙','♖','♘','♗','♕','♔','♗','♘','♖']);
  protected readonly chessSelected = signal<string | null>(null);
  protected readonly chessStarted = signal(false);
  protected readonly chessThinking = signal(false);
  protected readonly chessSide = signal<'w'|'b'>('w');
  protected readonly chessDifficulty = signal('Medium');
  protected readonly chessLegal = signal<string[]>([]);
  protected readonly chessCaptured = signal<{w:string[];b:string[]}>({w:[],b:[]});
  protected readonly chessHint = signal('');
  protected readonly chessMoveHistory = signal<string[]>([]);
  protected readonly chessMessage = signal('Choose your side and AI strength to begin.');
  protected readonly chessWhiteTime = signal(0);
  protected readonly chessBlackTime = signal(0);
  protected readonly chessFinished = signal(false);
  private readonly chessRevision = signal(0);
  protected readonly chessBoardView = computed(()=>{this.chessRevision();const side=this.chessSide();const ranks=side==='w'?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];const files=side==='w'?['a','b','c','d','e','f','g','h']:['h','g','f','e','d','c','b','a'];return ranks.flatMap(rank=>files.map(file=>{const square=`${file}${rank}` as Square;const piece=this.chessGame.get(square);return{square,piece:piece?this.chessGlyph(piece.color,piece.type):'',color:piece?.color||''};}));});
  protected readonly Math = Math;
  protected chessGame = new Chess();
  private chessWorker?: Worker;
  private chessTimer?: ReturnType<typeof setInterval>;
  private chessHintPending = false;
  protected readonly puzzleCategory = signal<string | null>(null);
  protected readonly puzzlePieces = signal<number[]>([0,1,2,3,4,5,6,7,8]);
  protected readonly puzzleImage = signal<string | null>(null);
  protected startFruitCutter(): void { clearInterval(this.fruitTimer); try { this.fruitBest.set(Number(localStorage.getItem('neverbeen-fruit-best'))||this.fruitBest()); } catch {} this.fruitScore.set(0); this.fruitLives.set(3); this.fruitTime.set(60); this.fruitCombo.set(0); this.fruitMessage.set(''); this.fruitOver.set(false); this.fruitFlights.set([]); this.fruitRunning.set(true); this.fruitNextId=0; let ticks=0; this.fruitTimer=setInterval(()=>{ if(!this.fruitRunning())return; ticks++; if(this.fruitMode()==='Time Challenge' && ticks%50===0){this.fruitTime.update(t=>Math.max(0,t-1));if(this.fruitTime()===0)this.endFruitCutter('Time is up!');} const speed=1+this.fruitScore()/350; let flights=this.fruitFlights().map(f=>({...f,x:f.x+f.vx*speed,y:f.y+f.vy*speed,vy:f.vy+.055*speed})).filter(f=>f.y<115&&!f.cut); if(Math.random()<.025+Math.min(.04,this.fruitScore()/8000)){const fruits=['🍎','🍊','🍉','🍌','🍇','🍓','🥝']; flights.push({id:this.fruitNextId++,x:15+Math.random()*70,y:105,vx:(Math.random()-.5)*.5,vy:-2.3-Math.random()*1.5,emoji:Math.random()<.13?'💣':fruits[Math.floor(Math.random()*fruits.length)],cut:false});} this.fruitFlights.set(flights); },20); }
  protected fruitPointerEvent(event: PointerEvent, phase: 'start'|'move'|'end'): void { const target=event.currentTarget as HTMLElement; const rect=target.getBoundingClientRect(); const point={x:(event.clientX-rect.left)/rect.width*100,y:(event.clientY-rect.top)/rect.height*100}; if(phase==='start'){this.fruitPointer=point;target.setPointerCapture(event.pointerId);return;} if(phase==='move'&&this.fruitPointer&&this.fruitRunning()){const previous=this.fruitPointer;let lives=this.fruitLives(),score=this.fruitScore(),combo=this.fruitCombo(),message='';const now=Date.now();let flights=this.fruitFlights().map(f=>{const dist=Math.hypot((f.x-point.x)*.75,f.y-point.y);if(!f.cut&&dist<7){if(f.emoji==='💣'){lives--;combo=0;message='💥 Bomb!';}else{combo=now-this.fruitLastCutAt<850?combo+1:1;this.fruitLastCutAt=now;score+=10+(combo>1?Math.min(50,(combo-1)*5):0);message=combo>1?`✈️ ${combo} fruit combo!`:'✈️ +10 travel points';}return {...f,cut:true};}return f;}); this.fruitFlights.set(flights);this.fruitLives.set(lives);this.fruitScore.set(score);this.fruitCombo.set(combo);const destinations=['🏝️ Bali','🏖️ Penang','🍊 Valencia','🍓 Kyoto','🥝 New Zealand'];this.fruitDestination.set(destinations[Math.min(destinations.length-1,Math.floor(score/100))]);if(message)this.fruitMessage.set(message);if(lives<=0)this.endFruitCutter('Bomb hit!');else if(score>0){this.fruitBest.set(Math.max(this.fruitBest(),score));try{localStorage.setItem('neverbeen-fruit-best',String(this.fruitBest()));}catch{}}this.fruitPointer=point;return;} if(phase==='end')this.fruitPointer=null; }
  private endFruitCutter(message:string): void { clearInterval(this.fruitTimer);this.fruitRunning.set(false);this.fruitOver.set(true);this.fruitMessage.set(message); }
  protected readonly archeryDestinations=['🌴 Bali','🏔️ Switzerland','🗼 Tokyo','🏜️ Dubai','🏰 Paris','🏝️ Maldives','🏔️ Himalayas','🌲 Canada','🏛️ Greece'];
  protected startArchery():void{clearInterval(this.archeryTimer);this.archeryLevel.set(0);this.archeryRound.set(1);this.archeryScore.set(0);this.archeryShots.set(0);this.archeryGameOver.set(false);this.archeryPlaying.set(true);this.archeryTargetX.set(72);this.archeryTargetY.set(48);this.archeryArrow.set(null);this.archeryWind.set(0);this.archeryTimer=setInterval(()=>{if(!this.archeryPlaying())return;const level=this.archeryLevel();if([2,5,7].includes(level))this.archeryTargetX.update(x=>x+this.archeryMoveDir()*.28);if(this.archeryTargetX()>82)this.archeryMoveDir.set(-1);if(this.archeryTargetX()<62)this.archeryMoveDir.set(1);if(level===3||level===5)this.archeryWind.set(Math.sin(Date.now()/800)*(level===3?2:3.5));},50);}
  protected archeryPointer(event:PointerEvent,phase:'start'|'move'|'end'):void{const el=event.currentTarget as HTMLElement,rect=el.getBoundingClientRect(),p={x:(event.clientX-rect.left)/rect.width*100,y:(event.clientY-rect.top)/rect.height*100};if(phase==='start'&&this.archeryPlaying()){this.archeryPointerStart=p;this.archeryPointerCurrent=p;el.setPointerCapture(event.pointerId);return;}if(phase==='move'&&this.archeryPointerStart){this.archeryPointerCurrent=p;this.archeryAim.set(p);return;}if(phase==='end'&&this.archeryPointerStart){const aim=this.archeryPointerCurrent||p;const level=this.archeryLevel();const wind=[3,5].includes(level)?this.archeryWind():0;const distanceTo=(tx:number,ty:number)=>Math.hypot((aim.x+wind-tx)*(rect.width/rect.height),aim.y-ty);const d=level===8?Math.min(distanceTo(this.archeryTargetX(),this.archeryTargetY()),distanceTo(this.archeryTargetX()-13,this.archeryTargetY()+17)):distanceTo(this.archeryTargetX(),this.archeryTargetY());const scale=Math.max(.62,1-level*.045);const score=d<1.7*scale?100:d<3.5*scale?75:d<6.5*scale?50:d<10*scale?25:0;this.archeryArrow.set(aim);this.archeryAim.set(null);this.archeryShots.update(n=>n+1);this.archeryScore.update(n=>n+score);this.archeryFeedback.set(score===100?'🎯 Bullseye! +100':score?`Great shot! +${score} points`:'Miss! Try another angle.');this.archeryPointerStart=null;this.archeryPointerCurrent=null;setTimeout(()=>this.archeryArrow.set(null),700);if(this.archeryShots()%5===0){if(this.archeryLevel()===8){this.archeryPlaying.set(false);this.archeryGameOver.set(true);clearInterval(this.archeryTimer);this.archeryFeedback.set(`Global tour complete! Final score: ${this.archeryScore()}`);}else{this.archeryLevel.update(n=>n+1);this.archeryRound.set(1);this.archeryTargetX.set(70);this.archeryFeedback.set(`${this.archeryDestinations[this.archeryLevel()]} unlocked! Next round — aim carefully.`);}}else this.archeryRound.update(n=>n+1);}}
  protected startBikeRace(): void { clearInterval(this.bikeTimer); this.bikeLane.set(1); this.bikeTraffic.set([]); this.bikeScore.set(0); this.bikeDistance.set(0); this.bikeSpeed.set(1); this.bikeLives.set(3); this.bikeCrash.set(false); this.bikeOver.set(false); this.bikeLevel.set(0); this.bikeRunning.set(true); this.bikeNextId=0; this.bikeTimer=setInterval(()=>{if(!this.bikeRunning())return; const boost=this.bikeAccelerating()?1.8:this.bikeBraking()?.55:1;const speed=(1+Math.min(2.2,this.bikeDistance()/1800))*boost;this.bikeSpeed.set(speed);this.bikeDistance.update(d=>d+speed*2);this.bikeScore.update(s=>s+Math.round(speed));this.bikeLevel.set(Math.min(9,Math.floor(this.bikeDistance()/500)));let traffic=this.bikeTraffic().map(v=>({...v,y:v.y+speed*1.4})).filter(v=>v.y<115);if(Math.random()<.045+this.bikeDistance()/40000)traffic.push({id:this.bikeNextId++,lane:Math.floor(Math.random()*3),y:-12,emoji:Math.random()<.28?'🚚':Math.random()<.5?'🚧':'🚗'});const hit=traffic.find(v=>v.lane===this.bikeLane()&&v.y>79&&v.y<99);if(hit){this.bikeLives.update(l=>l-1);this.bikeCrash.set(true);setTimeout(()=>this.bikeCrash.set(false),420);traffic=traffic.filter(v=>v.id!==hit.id);if(this.bikeLives()<=0){this.bikeTraffic.set(traffic);this.endBikeRace();return;}}this.bikeTraffic.set(traffic);},70); }
  protected steerBike(direction:number):void{this.bikeLane.update(l=>Math.max(0,Math.min(2,l+direction)));}
  protected bikeProjectedX(lane:number,y:number):number{const depth=.36+Math.max(0,Math.min(100,y))/100*.64;return 50+(lane-1)*25*depth;}
  protected bikePerspectiveScale(y:number):number{return .42+Math.max(0,Math.min(100,y))/100*.82;}
  private endBikeRace():void{clearInterval(this.bikeTimer);this.bikeRunning.set(false);this.bikeOver.set(true);}
  protected startDino(): void { clearInterval(this.dinoTimer); this.dinoScore.set(0); this.dinoPlayerY.set(0); this.dinoVelocity=0; this.dinoDistance=0; this.dinoObstacles.set([]); this.dinoItems.set([]); this.dinoOver.set(false); this.dinoRunning.set(true); this.dinoTimer=setInterval(()=>this.tickDino(),40); }
  protected dinoJump(): void { if (this.dinoRunning() && this.dinoPlayerY()===0) this.dinoVelocity=13; }
  protected setDinoDuck(value:boolean): void { this.dinoDucking.set(value); }
  @HostListener('window:keydown',['$event']) protected dinoKeyDown(event: KeyboardEvent): void { if(this.selectedGame()==='NeverBeen Bike Racing'){if(event.key==='ArrowLeft'||event.key.toLowerCase()==='a'){event.preventDefault();this.steerBike(-1);}if(event.key==='ArrowRight'||event.key.toLowerCase()==='d'){event.preventDefault();this.steerBike(1);}if(event.key==='ArrowUp'||event.key.toLowerCase()==='w')this.bikeAccelerating.set(true);if(event.key==='ArrowDown'||event.key.toLowerCase()==='s')this.bikeBraking.set(true);return;} if (this.selectedGame()!=='NeverBeen Dino Run') return; if (event.code==='Space'||event.key==='ArrowUp') { event.preventDefault(); this.dinoJump(); } if(event.key==='ArrowDown') this.setDinoDuck(true); }
  @HostListener('window:keyup',['$event']) protected dinoKeyUp(event: KeyboardEvent): void { if(event.key==='ArrowDown') this.setDinoDuck(false);if(this.selectedGame()==='NeverBeen Bike Racing'){if(event.key==='ArrowUp'||event.key.toLowerCase()==='w')this.bikeAccelerating.set(false);if(event.key==='ArrowDown'||event.key.toLowerCase()==='s')this.bikeBraking.set(false);} }
  private tickDino(): void { if(!this.dinoRunning()) return; this.dinoDistance++; const speed=(3+Math.min(4,this.dinoScore()/300))*this.dinoSpeedMultipliers[this.dinoSpeedMode()]; this.dinoVelocity-=.65; this.dinoPlayerY.set(Math.max(0,this.dinoPlayerY()+this.dinoVelocity)); if(this.dinoPlayerY()===0)this.dinoVelocity=0; let obs=this.dinoObstacles().map(o=>({...o,x:o.x-speed})).filter(o=>o.x>-12); if(Math.random()<.025+this.dinoScore()/9000)obs.push({x:110,type:Math.random()<.5?'🌵':'🪨'}); let items=this.dinoItems().map(x=>x-speed).filter(x=>x>-8); if(Math.random()<.018)items.push(110); this.dinoObstacles.set(obs); this.dinoItems.set(items); let score=this.dinoScore()+1; if(items.some(x=>x<23&&x>12)){score+=25;items=items.filter(x=>x>=12);this.dinoItems.set(items);} this.dinoScore.set(score); this.dinoBest.set(Math.max(this.dinoBest(),score)); const destinations=['🏜️ Desert','🏖️ Beach','🌴 Tropical Island','🏙️ Tokyo','🗼 Paris','🏔️ Mountains']; this.dinoDestination.set(destinations[Math.min(destinations.length-1,Math.floor(score/250))]); if(obs.some(o=>o.x<22&&o.x>10&&this.dinoPlayerY()<24&&!this.dinoDucking())){this.dinoRunning.set(false);this.dinoOver.set(true);clearInterval(this.dinoTimer);} }
  private chessGlyph(color:'w'|'b',type:string):string{return ({w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}} as Record<string,Record<string,string>>)[color][type]||'';}
  protected chessBegin():void{if(!this.chessWorker){this.chessWorker=new Worker('/assets/stockfish/stockfish-17.1-lite-single-03e3232.js');this.chessWorker.postMessage('uci');}else this.chessWorker.postMessage('stop');this.chessWorker.onmessage=(event:MessageEvent)=>{const line=String(event.data||'');if(!line.startsWith('bestmove'))return;const uci=line.split(/\s+/)[1];if(this.chessHintPending){this.chessHintPending=false;this.chessHint.set(uci&&uci!=='(none)'?`Engine hint: ${uci.slice(0,2)} → ${uci.slice(2,4)}`:'No hint available');return;}if(uci&&uci!=='(none)'&&this.chessThinking()){try{this.chessGame.move({from:uci.slice(0,2) as Square,to:uci.slice(2,4) as Square,promotion:uci[4]||'q'});this.syncChessState();this.chessMessage.set('Stockfish played '+this.chessGame.history().at(-1));}catch{this.chessMessage.set('Engine returned an invalid move. Please restart.');}}this.chessThinking.set(false);this.checkChessEnd();};this.chessWorker.onerror=()=>{this.chessThinking.set(false);this.chessMessage.set('Stockfish could not load. Check browser worker/WASM support.');};this.chessGame=new Chess();this.chessRevision.update(v=>v+1);this.chessStarted.set(true);this.chessFinished.set(false);this.chessThinking.set(false);this.chessMessage.set(this.chessSide()==='w'?'You play White. Make your move.':'Stockfish is thinking…');this.chessWhiteTime.set(0);this.chessBlackTime.set(0);this.chessCaptured.set({w:[],b:[]});this.chessMoveHistory.set([]);this.chessSelected.set(null);this.chessLegal.set([]);this.chessHint.set('');clearInterval(this.chessTimer);this.chessTimer=setInterval(()=>{if(!this.chessFinished())this.chessGame.turn()==='w'?this.chessWhiteTime.update(t=>t+1):this.chessBlackTime.update(t=>t+1);},1000);if(this.chessSide()==='b')this.requestChessEngine();}
  private syncChessState():void{this.chessRevision.update(v=>v+1);const history=this.chessGame.history({verbose:true});this.chessMoveHistory.set(this.chessGame.history());const captured={w:[] as string[],b:[] as string[]};for(const move of history){if(move.captured)captured[move.color].push(this.chessGlyph(move.color==='w'?'b':'w',move.captured));}this.chessCaptured.set(captured);this.chessSelected.set(null);this.chessLegal.set([]);}
  protected selectChessSquare(square:string):void{if(!this.chessStarted()||this.chessFinished()||this.chessThinking()||this.chessGame.turn()!==this.chessSide())return;const selected=this.chessSelected();if(selected){try{const move=this.chessGame.move({from:selected as Square,to:square as Square,promotion:'q'});this.chessMessage.set(move.san);this.syncChessState();this.chessHint.set('');this.checkChessEnd();if(!this.chessFinished())this.requestChessEngine();return;}catch{}}
    const piece=this.chessGame.get(square as Square);if(piece&&piece.color===this.chessSide()){this.chessSelected.set(square);this.chessLegal.set(this.chessGame.moves({square:square as Square,verbose:true}).map(move=>move.to));}else{this.chessSelected.set(null);this.chessLegal.set([]);}}
  private requestChessEngine(hint=false):void{if(!this.chessWorker)return;this.chessThinking.set(!hint);this.chessHintPending=hint;const levels:Record<string,{skill:number;timeMs:number;elo:number}>={Beginner:{skill:0,timeMs:90,elo:800},Easy:{skill:3,timeMs:150,elo:1200},Medium:{skill:8,timeMs:250,elo:1700},Hard:{skill:14,timeMs:450,elo:2100},Expert:{skill:18,timeMs:700,elo:2500},Master:{skill:20,timeMs:1000,elo:3000}};const config=levels[this.chessDifficulty()];this.chessWorker.postMessage(`setoption name Skill Level value ${config.skill}`);if(config.elo<3000){this.chessWorker.postMessage('setoption name UCI_LimitStrength value true');this.chessWorker.postMessage(`setoption name UCI_Elo value ${config.elo}`);}else this.chessWorker.postMessage('setoption name UCI_LimitStrength value false');this.chessWorker.postMessage(`position fen ${this.chessGame.fen()}`);this.chessWorker.postMessage(`go movetime ${config.timeMs}`);if(!hint)this.chessMessage.set('Stockfish is calculating…');}
  protected chessHintMove():void{if(this.chessStarted()&&!this.chessFinished()&&!this.chessThinking())this.requestChessEngine(true);}
  protected chessUndo():void{if(!this.chessStarted()||this.chessThinking()||this.chessFinished())return;this.chessGame.undo();if(this.chessGame.history().length&&this.chessGame.turn()!==this.chessSide())this.chessGame.undo();this.syncChessState();this.chessMessage.set('Last move undone. Your turn.');}
  protected chessResign():void{if(!this.chessStarted()||this.chessFinished())return;this.chessFinished.set(true);this.chessMessage.set('You resigned. Start a new game when ready.');clearInterval(this.chessTimer);}
  protected chessShowSetup():void{clearInterval(this.chessTimer);this.chessWorker?.postMessage('stop');this.chessStarted.set(false);this.chessFinished.set(false);this.chessThinking.set(false);this.chessHintPending=false;}
  private checkChessEnd():void{if(this.chessGame.isCheckmate()){this.chessFinished.set(true);this.chessMessage.set(this.chessGame.turn()===this.chessSide()?'Checkmate — Stockfish wins.':'Checkmate — you win!');clearInterval(this.chessTimer);}else if(this.chessGame.isDraw()){this.chessFinished.set(true);this.chessMessage.set('Draw — well played!');clearInterval(this.chessTimer);}else if(this.chessGame.isCheck())this.chessMessage.set('Check!');}
  protected chessTime(seconds:number):string{return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}
  async startPuzzle(category: string): Promise<void> { this.puzzleCategory.set(category); this.puzzlePieces.set([0,1,2,3,4,5,6,7,8].sort(() => Math.random() - .5)); this.gameLoading.set(true); this.gameSource.set('Live photo · Wikimedia Commons'); try { const query = encodeURIComponent(category.replace(/^[^ ]+ /, '')); const data = await this.liveJson<any>(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*`); const page = Object.values(data.query?.pages || {})[0] as any; this.puzzleImage.set(page?.imageinfo?.[0]?.thumburl || null); this.gameFeedback.set(`${category} puzzle loaded from live travel imagery. Click adjacent pieces to arrange it.`); } catch { this.gameFeedback.set(`${category} puzzle loaded. Click adjacent pieces to arrange it.`); } finally { this.gameLoading.set(false); } }
  movePuzzlePiece(index: number): void { const pieces = [...this.puzzlePieces()]; const empty = pieces.indexOf(8); if (Math.abs(empty - index) === 1 || Math.abs(empty - index) === 3) { [pieces[empty], pieces[index]] = [pieces[index], pieces[empty]]; this.puzzlePieces.set(pieces); if (pieces.every((piece, i) => piece === i)) this.gameFeedback.set('Puzzle complete! NeverBeen AI awards you a travel star.'); } }
  protected readonly crosswordThemes = ['🌎 Countries', '🏙️ Cities', '🏛️ Famous landmarks', '✈️ Airports', '🍜 International food', '🏖️ Beaches', '🏔️ Mountains', '🎭 Culture', '🗺️ Geography', '📸 Famous destinations'];
  protected readonly crosswordAnswers = signal<string[]>(Array(5).fill(''));
  protected readonly crosswordClues = ['Capital of Japan', 'City of lights', 'Famous Italian landmark', 'Airport code for London Heathrow', 'Spicy Japanese noodle soup'];
  protected readonly gameCategories = ['🌍 Famous landmark', '🏖️ Beach', '🏔️ Mountain', '🏙️ City', '🕌 Historical place', '🐼 Animals', '🍜 Food', '✈️ Travel destination'];

  async selectGame(game: string): Promise<void> {
    this.selectedGame.set(game); this.gameFeedback.set(null); this.gameLoading.set(false); this.ludoRoll.set(null);
    if (game === 'Flag Challenge') await this.loadLiveFlags();
    if (game === 'Travel Quiz') await this.loadLiveQuiz();
    if (game === 'Guess the Country') await this.loadLiveCountry();
    if (game === 'Jigsaw Puzzle') this.gamePrompt.set('Choose a category to load a live travel photo.');
    if (game === 'Crossword') await this.loadLiveCrossword();
    if (game === 'Chess') this.gamePrompt.set('You play White. Select a piece to begin — NeverBeen AI will query its live move service.');
    if (game === 'Ludo') this.gamePrompt.set('Roll the dice to race your token against NeverBeen AI.');
    if (game === 'NeverBeen Snake') this.startSnake();
    if (game === 'Flappy Bird') this.startFlappy();
  }
  private async liveJson<T>(url: string): Promise<T> { const response = await fetch(url); if (!response.ok) throw new Error(`Live game service returned ${response.status}`); return response.json() as Promise<T>; }
  private async loadLiveFlags(): Promise<void> {
    this.gameLoading.set(true); this.gameSource.set('Live data · REST Countries API');
    try { const data = await this.liveJson<any[]>('https://restcountries.com/v3.1/all?fields=name,flags'); const countries = data.filter(c => c?.name?.common && c?.flags?.emoji).sort(() => Math.random() - .5).slice(0, 4); const answer = countries[0].name.common; this.gamePrompt.set(`Which country does this flag belong to? ${countries[0].flags.emoji}`); this.gameOptions.set([answer, ...countries.slice(1).map(c => c.name.common)].sort(() => Math.random() - .5)); this.liveFlagAnswer = answer; } catch { this.gamePrompt.set('Live flag service is unavailable. Please retry.'); this.gameOptions.set([]); } finally { this.gameLoading.set(false); }
  }
  private async loadLiveQuiz(): Promise<void> {
    this.gameLoading.set(true); this.gameSource.set('Live data · Open Trivia Database');
    try { const data = await this.liveJson<any>('https://opentdb.com/api.php?amount=1&category=22&type=multiple'); const item = data.results?.[0]; if (!item) throw new Error('No question'); const decode = (value: string) => { const el = document.createElement('textarea'); el.innerHTML = value; return el.value; }; const answer = decode(item.correct_answer); this.gamePrompt.set(decode(item.question)); this.gameOptions.set([answer, ...item.incorrect_answers.map(decode)].sort(() => Math.random() - .5)); this.liveQuizAnswer = answer; } catch { this.gamePrompt.set('Live quiz service is unavailable. Please retry.'); this.gameOptions.set([]); } finally { this.gameLoading.set(false); }
  }
  private async loadLiveCrossword(): Promise<void> { this.gameLoading.set(true); this.gameSource.set('Live data · Open Trivia Database'); try { const data = await this.liveJson<any>('https://opentdb.com/api.php?amount=1&category=22&type=multiple'); const question = data.results?.[0]?.question; if (question) this.gamePrompt.set(`Live AI clue loaded: ${question}`); } catch { this.gamePrompt.set('Live crossword clue service is unavailable. Choose a theme to continue.'); } finally { this.gameLoading.set(false); } }
  private async loadLiveCountry(): Promise<void> {
    this.gameLoading.set(true); this.gameSource.set('Live data · REST Countries API');
    try { const data = await this.liveJson<any[]>('https://restcountries.com/v3.1/all?fields=name,capital,flags'); const country = data.filter(c => c?.name?.common && c?.flags?.png).sort(() => Math.random() - .5)[0]; this.gamePrompt.set(`Guess the country from this live flag clue: ${country.flags.emoji || '🌍'} · Capital: ${country.capital?.[0] || 'Unknown'}`); this.gameOptions.set([country.name.common, ...data.filter(c => c.name.common !== country.name.common).sort(() => Math.random() - .5).slice(0, 3).map(c => c.name.common)].sort(() => Math.random() - .5)); this.liveQuizAnswer = country.name.common; } catch { this.gamePrompt.set('Live country service is unavailable. Please retry.'); this.gameOptions.set([]); } finally { this.gameLoading.set(false); }
  }
  private liveFlagAnswer = '';
  private liveQuizAnswer = '';
  updateCrossword(index: number, value: string): void { this.crosswordAnswers.update(answers => answers.map((answer, i) => i === index ? value : answer)); }
  crosswordCheck(): void { const answers = ['Tokyo', 'Paris', 'Colosseum', 'LHR', 'Ramen']; const score = this.crosswordAnswers().filter((answer, i) => answer.trim().toLowerCase() === answers[i].toLowerCase()).length; this.gameFeedback.set(`${score}/5 correct. NeverBeen AI has checked your travel crossword.`); }
  resetCrossword(): void { this.crosswordAnswers.set(Array(5).fill('')); this.gameFeedback.set(null); }
  protected startLudo():void{clearTimeout(this.ludoRollTimeout);clearTimeout(this.ludoMoveTimer);this.ludoWorker??=new Worker(new URL('/ludo-ai.worker.js',document.baseURI));this.ludoWorker.onmessage=(event:MessageEvent)=>{if(event.data?.type==='move'&&this.ludoRunning()&&this.ludoCurrentPlayer()!==0){const token=this.ludoLegalTokens().includes(event.data.token)?event.data.token:this.ludoLegalTokens()[0];if(token!==undefined)this.playLudoToken(token);}};this.ludoWorker.onerror=()=>{if(this.ludoRunning()&&this.ludoCurrentPlayer()!==0&&this.ludoLegalTokens().length){this.ludoStatus.set('AI worker unavailable — using a local fallback move.');this.playLudoToken(this.ludoLegalTokens()[0]);}};this.ludoTokens.set(Array.from({length:this.ludoPlayerCount()},()=>[-1,-1,-1,-1]));this.ludoCurrentPlayer.set(0);this.ludoRoll.set(null);this.ludoLegalTokens.set([]);this.ludoTurnHistory.set([]);this.ludoWinner.set(null);this.ludoRunning.set(true);this.ludoStatus.set('Your turn — roll the dice!');this.ludoThinking.set(false);this.ludoRolling.set(false);}
  protected ludoPlayerName(player:number):string{return player===0?'You':this.ludoPlayerNames[player]+' AI';}
  protected ludoTokenPosition(player:number,token:number):{row:number;col:number}{const progress=this.ludoTokens()[player]?.[token]??-1;const baseOffsets=[{row:0,col:0},{row:0,col:9},{row:9,col:9},{row:9,col:0}];if(progress<0){const slots=[{row:1,col:1},{row:1,col:4},{row:4,col:1},{row:4,col:4}],base=baseOffsets[player];return{row:base.row+slots[token].row+1,col:base.col+slots[token].col+1};}if(progress>=57){const homes=[{row:6,col:6},{row:6,col:8},{row:8,col:8},{row:8,col:6}];return{row:homes[player].row+1,col:homes[player].col+1};}if(progress>=52){const point=this.ludoHomeLanes[player][progress-52];return{row:point.row+1,col:point.col+1};}const point=this.ludoTrack[(player*13+progress)%52];return{row:point.row+1,col:point.col+1};}
  protected rollLudoDice():void{if(!this.ludoRunning()||this.ludoRoll()!==null||this.ludoThinking())return;this.ludoRolling.set(true);this.playLudoSound(520);setTimeout(()=>{if(!this.ludoRunning())return;this.ludoRolling.set(false);const roll=Math.floor(Math.random()*6)+1;this.ludoRoll.set(roll);this.ludoLegalTokens.set(this.ludoTokens()[this.ludoCurrentPlayer()].map((position,index)=>position<0?(roll===6?index:-1):(position+roll<=57?index:-1)).filter(index=>index>=0));this.ludoStatus.set(`${this.ludoPlayerName(this.ludoCurrentPlayer())} rolled ${roll}${roll===6?' · ⭐ Bonus roll!':''}`);this.ludoTurnHistory.update(h=>[...h,`${this.ludoPlayerName(this.ludoCurrentPlayer())}: 🎲 ${roll}`]);if(!this.ludoLegalTokens().length){this.ludoStatus.set(roll===6?'No token can move — roll again for your bonus.':'No legal move. Turn passes.');this.finishLudoTurn(roll===6);return;}if(this.ludoCurrentPlayer()!==0){this.ludoThinking.set(true);this.ludoWorker?.postMessage({type:'choose',tokens:this.ludoTokens()[this.ludoCurrentPlayer()],roll,player:this.ludoCurrentPlayer(),allTokens:this.ludoTokens(),players:this.ludoPlayerCount(),difficulty:this.ludoDifficulty(),legalTokens:this.ludoLegalTokens()});} },360);}
  protected playLudoToken(token:number):void{if(!this.ludoRunning()||this.ludoRoll()===null||!this.ludoLegalTokens().includes(token))return;this.ludoThinking.set(false);const player=this.ludoCurrentPlayer(),roll=this.ludoRoll()!,old=this.ludoTokens()[player][token],target=old<0?0:old+roll;const animate=()=>{if(!this.ludoRunning())return;const current=this.ludoTokens()[player][token];if(current<target){const next=[...this.ludoTokens().map(row=>[...row])];next[player][token]=current<0?0:current+1;this.ludoTokens.set(next);this.ludoMoveTimer=setTimeout(animate,85);return;}this.resolveLudoMove(player,token,target,roll);};animate();}
  private resolveLudoMove(player:number,token:number,target:number,roll:number):void{let tokens=this.ludoTokens().map(row=>[...row]);tokens[player][token]=target;let captured=0;if(target<52&&!([0,8,13,21,26,34,39,47].includes((player*13+target)%52))){for(let other=0;other<this.ludoPlayerCount();other++){if(other===player)continue;for(let i=0;i<4;i++){const pos=tokens[other][i];if(pos>=0&&pos<52&&(other*13+pos)%52===(player*13+target)%52){tokens[other][i]=-1;captured++;}}}}this.ludoTokens.set(tokens);if(captured){this.ludoCaptureFlash.set(true);setTimeout(()=>this.ludoCaptureFlash.set(false),650);this.ludoStatus.set(`💥 ${this.ludoPlayerName(player)} captured ${captured} token${captured>1?'s':''}!`);this.playLudoSound(220);}else if(target===57){this.ludoStatus.set('🏠 Token reached home!');this.playLudoSound(780);}else this.ludoStatus.set(`${this.ludoPlayerName(player)} moved a token.`);this.ludoTurnHistory.update(h=>[...h,`${this.ludoPlayerName(player)} moved token ${token+1}${captured?' · capture!':''}`]);if(tokens[player].every(pos=>pos===57)){this.ludoWinner.set(player);this.ludoRunning.set(false);this.ludoStatus.set(`🎉 ${this.ludoPlayerName(player)} wins the board!`);this.playLudoSound(880);return;}this.finishLudoTurn(roll===6||captured>0);}
  private finishLudoTurn(bonus:boolean):void{this.ludoRoll.set(null);this.ludoLegalTokens.set([]);if(!bonus)this.ludoCurrentPlayer.update(p=>(p+1)%this.ludoPlayerCount());if(this.ludoRunning()){this.ludoStatus.set(this.ludoCurrentPlayer()===0?'Your turn — roll the dice!':`${this.ludoPlayerName(this.ludoCurrentPlayer())} is up…`);if(this.ludoCurrentPlayer()!==0)this.ludoRollTimeout=setTimeout(()=>this.rollLudoDice(),700);}}
  private playLudoSound(frequency:number):void{if(!this.ludoSound())return;try{const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=frequency;gain.gain.value=.045;osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+.09);osc.onended=()=>context.close();}catch{}}
  protected ludoNewGame():void{this.ludoRunning.set(false);this.ludoWinner.set(null);this.ludoRoll.set(null);this.ludoLegalTokens.set([]);clearTimeout(this.ludoRollTimeout);clearTimeout(this.ludoMoveTimer);this.ludoStatus.set('New board ready. Start when you are set.');}
  protected ludoCelebration():number[]{return Array.from({length:28},(_,i)=>i);}
  answerGame(answer: string): void { const correct = this.selectedGame() === 'Flag Challenge' ? this.liveFlagAnswer : this.liveQuizAnswer; this.gameFeedback.set(answer === correct ? 'Correct! NeverBeen AI says well played.' : `Not quite — the answer is ${correct || 'not available'}. Try another live round!`); }
  startArcade(game: string): void { this.selectedGame.set(game); this.arcadeScore.set(0); this.arcadeProgress.set(12); this.arcadeStatus.set('NeverBeen AI is ready — make your move!'); }
  playArcade(): void { const game = this.selectedGame(); this.arcadeScore.update(score => score + (game === 'Darts' ? Math.floor(Math.random() * 20) + 1 : 10)); this.arcadeProgress.update(value => Math.min(94, value + 9)); this.arcadeStatus.set(game === 'Tetris' ? 'Piece dropped — clear a line!' : game === 'Darts' ? 'Bullseye practice! Aim again.' : game === 'Simple Racing' ? 'Boost engaged — overtake the AI!' : game === 'Space Shooter' ? 'Laser fired — alien wave hit!' : 'Paddle hit! Keep the rally alive.'); }
  startFlappy(): void { this.stopFlappy(); this.flappyBirdY.set(50); this.flappyVelocity.set(0); this.flappyPipeX.set(100); this.flappyScore.set(0); this.flappyRunning.set(true); this.gameFeedback.set(null); this.flappyTimer = setInterval(() => this.tickFlappy(), 45); }
  stopFlappy(): void { if (this.flappyTimer) { clearInterval(this.flappyTimer); this.flappyTimer = undefined; } this.flappyRunning.set(false); }
  flap(): void { if (!this.flappyRunning()) this.startFlappy(); this.flappyVelocity.set(-1.8); }
  tickFlappy(): void { const y = this.flappyBirdY() + this.flappyVelocity(); const velocity = this.flappyVelocity() + .075; let pipe = this.flappyPipeX() - .8; if (pipe < -12) { pipe = 100; this.flappyScore.update(score => score + 1); } const gap = this.flappyGap(); const collision = y < 0 || y > 94 || (pipe < 22 && pipe > 8 && (y < gap - 18 || y > gap + 18)); if (collision) { this.stopFlappy(); this.gameFeedback.set(`Game over! Score ${this.flappyScore()}. Tap Flap to try again.`); return; } this.flappyBirdY.set(y); this.flappyVelocity.set(velocity); this.flappyPipeX.set(pipe); }
  startSnake(): void { this.stopSnake(); this.snakeBody.set([78,77,76]); this.snakeFood.set(55); this.snakeDirection.set('right'); this.snakeScore.set(0); this.snakeRunning.set(true); this.snakeTimer = setInterval(() => this.moveSnake(), Math.max(75, 170 - this.snakeScore() * 6)); }
  stopSnake(): void { if (this.snakeTimer) { clearInterval(this.snakeTimer); this.snakeTimer = undefined; } this.snakeRunning.set(false); }
  setSnakeDirection(next: 'up'|'down'|'left'|'right'): void { const opposite = { up:'down', down:'up', left:'right', right:'left' } as const; if (this.snakeRunning() && opposite[this.snakeDirection()] !== next) this.snakeDirection.set(next); }
  moveSnake(): void { const body = this.snakeBody(), head = body[0], row = Math.floor(head / 12), col = head % 12; const d = this.snakeDirection(); const next = d === 'up' ? head - 12 : d === 'down' ? head + 12 : d === 'left' ? (col === 0 ? -1 : head - 1) : (col === 11 ? -1 : head + 1); if (next < 0 || next >= 144 || body.includes(next) || (d === 'up' && row === 0) || (d === 'down' && row === 11)) { this.stopSnake(); this.gameFeedback.set(`Game over! Score ${this.snakeScore()}. NeverBeen AI applauds your run.`); return; } const grown = [next, ...body]; if (next === this.snakeFood()) { this.snakeScore.update(s => s + 1); let food = Math.floor(Math.random() * 144); while (grown.includes(food)) food = Math.floor(Math.random() * 144); this.snakeFood.set(food); } else grown.pop(); this.snakeBody.set(grown); }
  @HostListener('window:keydown', ['$event'])
  onGameKey(event: KeyboardEvent): void { if (this.selectedGame() === 'Flappy Bird' && (event.code === 'Space' || event.key === 'ArrowUp')) { event.preventDefault(); this.flap(); return; } if (this.selectedGame() !== 'NeverBeen Snake') return; const key = event.key.toLowerCase(); const map: Record<string, 'up'|'down'|'left'|'right'> = { arrowup:'up', w:'up', arrowdown:'down', s:'down', arrowleft:'left', a:'left', arrowright:'right', d:'right' }; if (map[key]) { event.preventDefault(); const next = map[key]; const opposite = { up:'down', down:'up', left:'right', right:'left' } as const; if (opposite[this.snakeDirection()] !== next) this.snakeDirection.set(next); } }
  resetMinesweeper(): void {
    const positions = new Set<number>();
    while (positions.size < 5) positions.add(Math.floor(Math.random() * 25));
    this.mines.set([...positions]);
    this.mineRevealed.set([]);
    this.mineStatus.set('Clear the board without hitting a mine');
  }
  revealMineCell(index: number): void { if (this.mineRevealed().includes(index) || this.mineStatus() !== 'Clear the board without hitting a mine') return; if (this.mines().includes(index)) { this.mineRevealed.set(Array.from({ length: 25 }, (_, i) => i)); this.mineStatus.set('Boom! NeverBeen AI says try again.'); return; } const revealed = [...this.mineRevealed(), index]; this.mineRevealed.set(revealed); if (revealed.length >= 20) this.mineStatus.set('You cleared the board! NeverBeen AI awards you a star.'); }
  mineCountAround(index: number): number { const row = Math.floor(index / 5), col = index % 5; return this.mines().filter(m => { const mr = Math.floor(m / 5), mc = m % 5; return Math.abs(mr - row) <= 1 && Math.abs(mc - col) <= 1; }).length; }
  resetTicTacToe(): void { this.ticBoard.set(Array(9).fill(null)); this.ticStatus.set('Your turn'); }
  playTicCell(index: number): void {
    if (this.selectedGame() !== 'Tic-Tac-Toe' || this.ticBoard()[index] || this.ticStatus() !== 'Your turn') return;
    const board = [...this.ticBoard()]; board[index] = 'X'; this.ticBoard.set(board);
    if (this.gameWinner(board)) { this.ticStatus.set('You win!'); this.gameScore.update(s => ({ ...s, wins: s.wins + 1 })); return; }
    const open = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    if (!open.length) { this.ticStatus.set('Draw game'); return; }
    const ai = open[Math.floor(Math.random() * open.length)]; board[ai] = 'O'; this.ticBoard.set(board);
    this.ticStatus.set(this.gameWinner(board) ? 'NeverBeen AI wins' : 'Your turn');
    if (this.gameWinner(board)) this.gameScore.update(s => ({ ...s, ai: s.ai + 1 }));
  }
  private gameWinner(board: (string | null)[]): boolean { return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(line => !!board[line[0]] && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]); }

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
    // No invented preferences: preferred season and timezone start empty and are only
    // filled from the member's own saved settings (the Web API's SettingsDto).
    preferredSeason: [''],
    theme: ['light'],
    timezone: [''],
    whoCanConnect: ['everyone'],
    whoCanVisitProfile: ['everyone'],
    showActiveStatusTo: ['everyone'],
    whoCanSeeCompanionsList: ['everyone'],
    allowCompanionTagging: [true],
    approveTagsBeforePost: [false],
  });

  private readonly remoteSearchTravelers = signal<Companion[]>([]);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private searchRequestSeq = 0;

  // Search results computed
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return { travelers: [] as Companion[], circles: [] as Circle[] };

    const local = this.service.searchCompanionsLocally(q);
    const travelers: Companion[] = [...local];
    for (const hit of this.remoteSearchTravelers()) {
      if (
        !travelers.some((c) => Number(c.id) === Number(hit.id)) &&
        !this.service.isUserBlocked(hit.id)
      ) {
        travelers.push(hit);
      }
    }

    const myCircles = this.service.myCircles();
    const allCircles = this.service.circles().filter((c) => !c.archivedAtUtc);
    const circlePool: Circle[] = [...myCircles];
    for (const c of allCircles) {
      if (!circlePool.some((existing) => existing.id === c.id)) circlePool.push(c);
    }
    const circles = circlePool.filter(
      (cr) =>
        cr.name.toLowerCase().includes(q) ||
        (cr.description ?? '').toLowerCase().includes(q),
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
    // The member's own city / country decide the suggestions — nothing is assumed about
    // them, and a member whose profile is still loading matches on mutual companions only.
    const myCity = (myProfile?.city || '').toLowerCase();
    const myCountry = (myProfile?.country || '').toLowerCase();

    return this.service
      .visibleCompanions()
      .filter((c) => {
        if (myProfile && c.id === myProfile.id) return false;
        if (c.status === 'connected' || c.status === 'pending_incoming') return false;

        const city = (c.city || '').toLowerCase();
        const country = (c.country || '').toLowerCase();

        const inMyArea =
          (!!myCity && city.includes(myCity)) || (!!myCountry && country === myCountry);

        const hasMutual = this.getMutualCompanionsCount(c.id) > 0;
        return inMyArea || hasMutual;
      })
      .slice(0, 48);
  });

  /**
   * No companions in any group — requests, companions, suggestions or pending requests.
   * The Companion section then shows a “Nothing here yet” card instead of empty groups.
   */
  readonly companionsDirectoryEmpty = computed(
    () =>
      this.incomingRequests().length === 0 &&
      this.connectedCompanions().length === 0 &&
      this.suggestedCompanions().length === 0 &&
      this.pendingOutgoingCompanions().length === 0,
  );

  readonly totalCompanionsCount = computed(() => this.connectedCompanions().length);

  // In own profile companion section, only show people with whom user is already connected (max 9 default)
  readonly topNineCompanions = computed(() =>
    this.connectedCompanions().slice(0, 9),
  );

  async ngOnInit(): Promise<void> {
    // Signed-in members and "Explore as Guest" visitors may view the whole profile;
    // anyone else is sent back to the Community sign-in page.
    if (
      (!this.service.isAuthenticated() && !this.service.guestBrowsing()) ||
      !this.service.profile()
    ) {
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

    // Deep links into a profile section (the community header's Home / Notification /
    // Messenger icons point at /profile#journey, /profile#notifications, /profile#messenger).
    // Back-button navigations also arrive here — apply without pushing another entry.
    this.route.fragment.subscribe((fragment) => {
      if (fragment && (PROFILE_SECTION_VALUES as readonly string[]).includes(fragment)) {
        this.applySection(fragment as ProfileSection);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION & MOBILE PORTRAIT DRAWER
  // ---------------------------------------------------------------------------

  // Website Management (Admin Console) controls which profile features are switched on.
  private readonly cms = inject(SiteConfigService);

  /* ---------- Admin announcements in Notifications ---------- */
  private readonly announcementInbox = inject(AnnouncementInboxService);
  /** Audience profile of the signed-in member (decides which announcements reach them). */
  private readonly noticeViewer = computed(() => viewerProfile(this.service.currentUser(), this.service.profile() as Parameters<typeof viewerProfile>[1]));
  /** Live announcements for this member (until they clear them). Updates automatically when admins publish. */
  protected readonly adminNotices = computed(() => this.announcementInbox.noticesFor(this.noticeViewer()));
  protected readonly unreadNoticeCount = computed(() => this.adminNotices().filter((n) => n.unread).length);
  /** Side-panel badge: unread member notifications + unread announcements. */
  protected readonly notifBadgeCount = computed(
    () => this.service.unreadNotificationCount() + this.unreadNoticeCount() + (this.service.storageReport().warning ? 1 : 0),
  );
  /** Announcements that were unread when the Notifications section was opened (kept highlighted). */
  private readonly freshNoticeIds = signal<Set<string>>(new Set());
  protected readonly noticeTime = noticeTime;

  protected isFreshNotice(n: AnnouncementNotice): boolean {
    return n.unread || this.freshNoticeIds().has(n.a.id);
  }

  private markNoticesRead(): void {
    const v = this.noticeViewer();
    if (!v) return;
    const unread = this.adminNotices().filter((n) => n.unread).map((n) => n.a.id);
    if (!unread.length) return;
    this.freshNoticeIds.update((s) => new Set([...s, ...unread]));
    this.announcementInbox.markRead(v.id, unread);
  }

  clearNotice(id: string): void {
    const v = this.noticeViewer();
    if (v) this.announcementInbox.clear(v.id, id);
  }

  clearAllNotices(): void {
    const v = this.noticeViewer();
    if (v) this.announcementInbox.clearAll(v.id, this.adminNotices().map((n) => n.a.id));
  }

  openNoticeCta(n: AnnouncementNotice): void {
    const v = this.noticeViewer();
    if (v) this.announcementInbox.markRead(v.id, [n.a.id]);
    if (!n.a.ctaUrl) return;
    if (n.external) window.open(n.a.ctaUrl, '_blank', 'noopener');
    else this.router.navigateByUrl(n.a.ctaUrl);
  }
  protected profileSectionOn(section: string): boolean {
    return this.cms.isItemVisible('community.profile', 'sections', section);
  }
  protected profileLabel(section: string): string {
    return this.cms.itemLabel('community.profile', 'sections', section);
  }
  protected profileFlag(field: string): boolean {
    return this.cms.flag('community.profile', field);
  }

  /**
   * Switch the wide panel to `section` and record it in the browser history
   * (`/profile#section`), so pressing back anywhere in the Community walks
   * through the previous community page/section instead of skipping it.
   */
  setSection(section: ProfileSection): void {
    // Switching sections from a visited profile (or my own preview) returns to
    // my own profile.
    const leavingVisitor = !!this.viewingVisitor();
    if (leavingVisitor) this.viewingVisitor.set(null);
    this.applySection(section);

    const target: ProfileSection = this.activeSection();
    const currentFragment = this.route.snapshot?.fragment ?? '';
    if (currentFragment === target) return;
    if (leavingVisitor) {
      this.router.navigate(['/profile'], { fragment: target });
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: target,
        queryParamsHandling: 'preserve',
      });
    }
  }

  /**
   * Apply a section immediately without touching the router (used by section
   * deep links such as /profile#messenger — including back-button navigations
   * and URL refreshes, where the ?id= visitor state must be left alone).
   */
  private applySection(section: ProfileSection): void {
    this.activeSection.set(this.profileSectionOn(section) ? section : 'journey');
    this.closeMobileSidePanel();
    if (this.activeSection() === 'notifications') {
      this.announcementInbox.refresh();
      this.service.markNotificationsRead();
      this.markNoticesRead();
    } else {
      this.freshNoticeIds.set(new Set());
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

  isSelfTraveler(authorOrUser: AuthorInfo | Companion | number): boolean {
    const me = this.service.currentUser()?.id ?? this.service.profile()?.id ?? 1;
    const myUid =
      this.service.profile()?.uniqueId ||
      this.service.currentUser()?.uniqueId ||
      generate20DigitUid(me);
    if (typeof authorOrUser === 'number') {
      return Number(authorOrUser) === Number(me);
    }
    if (Number(authorOrUser.id) === Number(me)) return true;
    if (authorOrUser.uniqueId && authorOrUser.uniqueId === myUid) return true;
    return false;
  }

  openVisitorProfile(authorOrUser: AuthorInfo | Companion | number): void {
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
    if (this.isSelfTraveler(authorOrUser)) {
      this.viewingVisitor.set(null);
      this.activeVisitorParam = null;
      this.showSearchDropdown.set(false);
      this.closeMobileSidePanel();
      this.router.navigate(['/profile'], { queryParams: {} });
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

      // Signed-in member: this placeholder is shown instantly; the navigation to
      // /profile?id=<uid> below resolves the real member on the Web API's
      // directory (loadProfileByParam → GET /api/users/uid/{uid}) and replaces
      // it — a traveler who is not yet a companion opens as their real profile.
    }

    this.viewingVisitor.set(found);
    this.showSearchDropdown.set(false);
    this.closeMobileSidePanel();
    this.destinationSearchInput = '';
    this.destinationSuggestions.set([]);
    this.showDestinationDropdown.set(false);
    this.selectedGoogleLocation.set(null);
    this.destinationError.set(null);

    // Requirement B: Navigate to full normal page via /profile?id=... instead of modal popup
    this.router.navigate(['/profile'], {
      queryParams: { id: found.uniqueId || targetUid },
    });
  }

  closeVisitorProfile(): void {
    this.viewingVisitor.set(null);
    // Keep the section the member was on, so back/forward stay consistent.
    this.router.navigate(['/profile'], { fragment: this.activeSection() });
  }

  /** True while a profile URL (?id=) is being resolved on the member directory. */
  protected readonly visitorResolving = signal(false);
  /** The ?id= parameter currently being shown — stale API answers are dropped. */
  private activeVisitorParam: string | null = null;

  protected loadProfileByParam(idParam: string): void {
    this.activeVisitorParam = idParam;
    const currentProfile = this.service.profile();
    const currentUser = this.service.currentUser();
    const myId = currentUser?.id ?? currentProfile?.id;
    const myUid =
      currentProfile?.uniqueId ||
      currentUser?.uniqueId ||
      (myId != null ? generate20DigitUid(myId) : undefined);

    if (
      myId != null &&
      (idParam === myUid ||
        idParam === String(myId) ||
        idParam === generate20DigitUid(myId))
    ) {
      this.viewingVisitor.set(null);
      this.activeVisitorParam = null;
      this.router.navigate(['/profile'], { queryParams: {} });
      return;
    }

    const companions = this.service.companions();
    const found = companions.find(
      (c) =>
        c.uniqueId === idParam ||
        String(c.id) === idParam ||
        generate20DigitUid(c.id) === idParam,
    );

    if (found) {
      this.viewingVisitor.set(found);
      // A signed-in member's visitor view keeps itself fresh from the database:
      // relationship status, wall posts, gallery and follow counters.
      void this.refreshVisitorFromApi(found.id);
      return;
    }

    if (this.service.apiLive) {
      // Signed-in member: unknown ids are resolved on the Web API's member
      // directory (GET /api/users/uid/{uid}) — the guest tour never needs this
      // because its seeded directory already holds every traveler.
      this.visitorResolving.set(true);
      void this.service.loadUserByUid(idParam).then((companion) => {
        this.visitorResolving.set(false);
        // The member may have closed / changed the profile while the API answered.
        if (this.activeVisitorParam !== idParam) return;
        const latestMyId = this.service.currentUser()?.id ?? this.service.profile()?.id;
        if (
          latestMyId != null &&
          (idParam === String(latestMyId) ||
            idParam === generate20DigitUid(latestMyId) ||
            (companion && Number(companion.id) === Number(latestMyId)))
        ) {
          this.viewingVisitor.set(null);
          this.activeVisitorParam = null;
          this.router.navigate(['/profile'], { queryParams: {} });
          return;
        }
        if (companion) {
          this.viewingVisitor.set(companion);
          void this.refreshVisitorFromApi(companion.id);
        } else {
          // A parallel lookup (e.g. a post-author click) may have upserted the
          // member in the meantime — re-check before falling back to the card.
          const late = this.service
            .companions()
            .find((c) => c.uniqueId === idParam || String(c.id) === idParam);
          this.viewingVisitor.set(late ?? this.unknownTravelerCard(idParam));
          if (late) void this.refreshVisitorFromApi(late.id);
        }
      });
      return;
    }

    this.viewingVisitor.set(this.unknownTravelerCard(idParam));
  }

  /** Placeholder card for a profile URL this browser cannot resolve to a member. */
  private unknownTravelerCard(idParam: string): Companion {
    return {
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
  }

  /**
   * Refreshes the open visitor profile from the Web API (signed-in members):
   * their wall posts, gallery and follow counters arrive after the card opens
   * and the card itself is re-read from the directory entry, so the
   * relationship status and the gallery always match the database.
   */
  private async refreshVisitorFromApi(visitorId: number): Promise<void> {
    if (!this.service.apiLive) return;
    // The full directory entry first (cover photo, About-me, relationship status),
    // then the visitor's wall posts, gallery and follow counters.
    await Promise.all([
      this.service.loadUserById(visitorId, true),
      this.service.loadVisitorExtras(visitorId),
    ]);
    const current = this.viewingVisitor();
    if (!current || Number(current.id) !== Number(visitorId)) return;
    const fresh = this.service.companions().find((c) => Number(c.id) === Number(visitorId));
    if (fresh) this.viewingVisitor.set({ ...fresh, gallery: fresh.gallery ?? current.gallery });
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
    // A signed-in member sees the visitor's real wall from the Web API
    // (GET /api/journey?authorId=); the guest tour reads its seeded feed.
    const fromApi = this.service.visitorWallPosts()[String(visitorId)];
    if (fromApi) return fromApi;
    return this.service.postsForWall(visitorId);
  }

  wallTarget(): { id: number; fullName: string } | null {
    const visitor = this.viewingVisitor();
    const me = this.service.currentUser()?.id ?? 1;
    if (!visitor || visitor.id === me || visitor.status !== 'connected') return null;
    return { id: visitor.id, fullName: visitor.fullName };
  }

  canPostOnVisitorWall(): boolean {
    return !!this.wallTarget();
  }

  onJourneyTextInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    const hit = hashtagAtCursor(input.value, input.selectionStart ?? input.value.length);
    if (!hit) {
      this.hashtagSuggestions.set([]);
      return;
    }
    const used = this.service.journeyPosts().flatMap((post) => post.hashtags ?? extractHashtags(post.text));
    this.hashtagSuggestions.set(suggestHashtags(hit.query, used));
  }

  applyHashtag(tag: string): void {
    const input = document.querySelector<HTMLTextAreaElement>('.composer-textarea');
    const cursor = input?.selectionStart ?? this.newJourneyText.length;
    const hit = hashtagAtCursor(this.newJourneyText, cursor);
    const start = hit?.start ?? this.newJourneyText.length;
    const end = hit ? cursor : this.newJourneyText.length;
    const next = insertHashtag(this.newJourneyText, start, end, tag);
    this.newJourneyText = next.text;
    this.hashtagSuggestions.set([]);
  }

  postHashtags(post: JourneyPost): string[] {
    return post.hashtags?.length ? post.hashtags : extractHashtags(post.text);
  }

  audienceLabel(post: JourneyPost): string {
    const mode = post.audience?.mode ?? 'public';
    if (mode === 'only-me') return 'Only Me';
    if (mode === 'companions') return 'Companions';
    if (mode === 'custom') return 'Custom';
    return 'Public';
  }

  composerAudienceLabel(): string {
    if (this.postAudience.mode === 'only-me') return '🔒 Only Me';
    if (this.postAudience.mode === 'companions') return '👥 Companions';
    if (this.postAudience.mode === 'custom') {
      const count = this.postAudience.allowIds?.length ?? 0;
      return count ? `✨ Custom · ${count} allowed` : '✨ Custom';
    }
    return '🌐 Public';
  }

  audienceCandidates(): Companion[] {
    const me = this.service.currentUser()?.id ?? 1;
    return this.service.visibleCompanions().filter((person) => Number(person.id) !== Number(me));
  }

  isPostOwner(post: JourneyPost): boolean {
    return Number(post.author.id) === Number(this.service.currentUser()?.id ?? 1);
  }

  showCustomAllowList(post: JourneyPost): boolean {
    return this.isPostOwner(post) && post.audience?.mode === 'custom';
  }

  allowedNames(post: JourneyPost): string {
    const ids = post.audience?.allowIds ?? [];
    if (!ids.length) return 'Only you';
    const names = ids.map(
      (id) => this.service.companions().find((person) => Number(person.id) === Number(id))?.fullName || 'Traveler',
    );
    if (names.length <= 4) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
  }

  isVideoMedia(url: string | null | undefined): boolean {
    if (!url) return false;
    return /^data:video\//i.test(url) || /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url);
  }

  postImageUrls(post: JourneyPost): string[] {
    const urls = post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];
    return urls.filter((url) => !this.isVideoMedia(url));
  }

  postVideoUrls(post: JourneyPost): string[] {
    const urls = post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];
    return urls.filter((url) => this.isVideoMedia(url));
  }

  openHashtag(tag: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.activeHashtag.set(tag.replace(/^#/, '').toLowerCase());
    if (this.viewingVisitor()) this.closeVisitorProfile();
    this.applySection('journey');
  }

  closeHashtag(): void {
    this.activeHashtag.set(null);
  }

  hashtagPosts(): JourneyPost[] {
    const tag = this.activeHashtag();
    return tag ? this.service.postsForHashtag(tag) : [];
  }

  canEditWallPost(post: JourneyPost): boolean {
    return this.service.canEditWallPost(post);
  }

  startEditPost(post: JourneyPost, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canEditWallPost(post)) {
      void this.confirmSvc.notify('This post can only be edited within 45 minutes of posting it on a companion’s Journey.');
      return;
    }
    this.editingPostId.set(post.id);
    this.editPostText = post.text;
    this.editPostMood = post.mood || this.selectedMood;
    this.editAudience = {
      mode: post.audience?.mode ?? 'public',
      allowIds: [...(post.audience?.allowIds ?? [])],
      denyIds: [...(post.audience?.denyIds ?? [])],
    };
  }

  saveEditPost(): void {
    const id = this.editingPostId();
    if (id == null) return;
    const ok = this.service.updateJourneyPost(id, {
      text: this.editPostText,
      mood: this.editPostMood,
      audience: this.editAudience,
    });
    if (ok) this.editingPostId.set(null);
  }

  readonly birthdayCards = computed(() => birthdayCards(this.connectedCompanions()));

  birthdaysFor(view: 'day' | 'week' | 'month'): BirthdayCard[] {
    const cards = this.birthdayCards();
    if (view === 'day') return cards.filter((card) => card.when === 'today' || card.when === 'tomorrow');
    if (view === 'week') return cards.filter((card) => card.dayOffset >= 0 && card.dayOffset <= 7);
    const month = new Date().getMonth();
    return cards.filter((card) => card.dayOffset >= 0 && card.date.getMonth() === month);
  }

  belatedBirthdays(): BirthdayCard[] {
    return this.birthdayCards().filter((card) => card.when === 'belated');
  }

  birthdayDraft(id: number): string {
    return this.birthdayDrafts()[id] ?? '';
  }

  setBirthdayDraft(id: number, value: string): void {
    this.birthdayDrafts.update((drafts) => ({ ...drafts, [id]: value }));
  }

  postBirthdayWish(card: BirthdayCard): void {
    const text = this.birthdayDraft(card.companion.id).trim();
    if (!text) return;
    const created = this.service.createJourneyPost(
      text,
      '🎂 Birthday Wish',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { mode: 'companions', allowIds: [], denyIds: [] },
      { id: card.companion.id, fullName: card.companion.fullName },
    );
    if (!created) return;
    this.setBirthdayDraft(card.companion.id, '');
  }

  myJourneyPostCount(): number {
    const me = this.service.currentUser()?.id ?? 1;
    return this.service.journeyPosts().filter((post) => Number(post.author.id) === Number(me)).length;
  }

  galleryAlbums() { return this.service.galleryAlbums(); }
  albumCover(album: GalleryAlbum): GalleryPhoto | undefined { return album.photos.find((photo) => photo.id === album.coverPhotoId) || album.photos[0]; }
  chooseAlbumCover(album: GalleryAlbum, event: Event): void {
    event.stopPropagation();
    const photoId = Number((event.target as HTMLSelectElement).value);
    if (photoId) this.service.setGalleryAlbumCover(album.id, photoId);
  }
  openGalleryAlbum(album: GalleryAlbum): void {
    this.openGalleryAlbumId.set(album.id);
    this.selectedGalleryAlbumId.set(album.isDefault ? undefined : album.id);
    this.showUploadCard.set(true);
  }
  closeGalleryAlbum(): void { this.openGalleryAlbumId.set(null); this.showUploadCard.set(false); }
  openedGalleryAlbum(): GalleryAlbum | undefined { return this.galleryAlbums().find((album) => album.id === this.openGalleryAlbumId()); }
  setAlbumPrivacy(album: GalleryAlbum, event: Event): void { this.service.setGalleryAlbumPrivacy(album.id, (event.target as HTMLSelectElement).value as GalleryAlbum['privacy']); }

  createGalleryAlbum(): void {
    const album = this.service.createGalleryAlbum(this.newAlbumName);
    if (album) { this.newAlbumName = ''; this.selectedGalleryAlbumId.set(album.id); }
  }

  protected readonly selectedStorageSlice = signal<string | null>(null);

  storageSlices() { return this.service.storageReport().slices; }
  storageSliceDetails() { return this.service.storageReport().slices.find((slice) => slice.id === this.selectedStorageSlice()); }
  selectStorageSlice(id: string): void { this.selectedStorageSlice.set(this.selectedStorageSlice() === id ? null : id); }
  deleteStoragePhoto(id: number): void { void this.service.deleteGalleryPhoto(id); }
  deleteStoragePost(id: number): void { this.service.deleteJourneyPost(id); }
  deleteStorageAlbum(id: number): void { this.service.deleteGalleryAlbum(id); }

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
    const q = this.searchQuery().trim();
    this.showSearchDropdown.set(q.length > 0);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (!q || !this.service.apiLive) {
      this.remoteSearchTravelers.set([]);
      return;
    }
    const seq = ++this.searchRequestSeq;
    this.searchDebounceTimer = setTimeout(() => {
      void this.service.searchUsers(q).then((hits) => {
        if (seq !== this.searchRequestSeq) return;
        this.remoteSearchTravelers.set(this.searchQuery().trim() === q ? hits : []);
      });
    }, 200);
  }

  openTravelerModal(companion: Companion): void {
    this.openVisitorProfile(companion);
  }

  closeTravelerModal(): void {
    this.viewingTraveler.set(null);
  }

  requestCompanionship(userId: number): void {
    const target = this.service.companions().find((c) => Number(c.id) === Number(userId));
    const rule = target?.whoCanConnect ?? 'everyone';
    if (rule === 'none') {
      void this.confirmSvc.notify(`${target?.fullName ?? 'This traveler'} is not accepting companionship requests.`);
      return;
    }
    if (rule === 'companions-of-companions' && this.getMutualCompanionsCount(Number(userId)) === 0) {
      void this.confirmSvc.notify(
        `${target?.fullName ?? 'This traveler'} only accepts requests from companions of their companions.`,
      );
      return;
    }
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

  canSubmitJourney(): boolean {
    const hasPhotos = this.journeyPhotoPreviews().length > 0 || !!this.journeyPhotoPreview();
    return (!!this.newJourneyText.trim() || hasPhotos) && !this.postingJourney();
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

      const wall = this.wallTarget();
      const created = this.service.createJourneyPost(
        this.newJourneyText,
        this.selectedMood,
        locationTag,
        placeId,
        primaryPhoto,
        this.selectedJourneyTaggedCompanions().length > 0
          ? [...this.selectedJourneyTaggedCompanions()]
          : undefined,
        allPreviews.length > 0 ? allPreviews : (primaryPhoto ? [primaryPhoto] : undefined),
        this.postAudience,
        wall ?? undefined,
      );
      if (!created) return;
      this.newJourneyText = '';
      this.postAudience = { mode: 'public', allowIds: [], denyIds: [] };
      this.hashtagSuggestions.set([]);
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

  isCommentSectionOpen(post: JourneyPost): boolean {
    const active = this.activeCommentPostId();
    if (active == null) return false;
    return active === post.id || (!!post.clientId && active === post.clientId);
  }

  toggleCommentSection(postId: number): void {
    const post =
      this.service.journeyPosts().find((p) => p.id === postId || p.clientId === postId) ??
      Object.values(this.service.visitorWallPosts())
        .flat()
        .find((p) => p.id === postId || p.clientId === postId);
    if (this.activeCommentPostId() === postId || (post && this.isCommentSectionOpen(post))) {
      this.activeCommentPostId.set(null);
    } else {
      this.activeCommentPostId.set(postId);
      this.journeyCommentText = '';
      const targetServerId = post?.id ?? postId;
      if (this.service.apiLive && targetServerId > 0 && targetServerId < 1_000_000_000_000) {
        void this.service.loadJourneyComments(targetServerId);
      }
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

    const shared = this.service.shareJourneyPost(post.id, this.shareThoughtText, this.shareAudience);
    if (!shared) return;
    this.shareAudience = { mode: 'public', allowIds: [], denyIds: [] };
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
    // The About me editor starts from what this member really stored (their profile on
    // the Web API, structured About me included). Nothing is invented: an empty field
    // stays empty until the member fills it in.
    const introVal = details?.intro || this.service.profile()?.aboutMe || '';
    this.aboutIntro = introVal;
    this.aboutGender = details?.gender || this.service.profile()?.gender || '';
    this.aboutDob = details?.dateOfBirth || this.service.profile()?.dateOfBirth || '';
    this.aboutLocation =
      details?.location ||
      (this.service.profile()?.cityName
        ? `${this.service.profile()!.cityName}, ${this.service.profile()!.countryName || ''}`
        : '');
    this.aboutHometown = details?.hometown || '';
    this.aboutRelationshipStatus = details?.relationshipStatus || '';
    this.aboutVisibility = { ...(details?.visibility ?? {}) };
    this.aboutLanguages.set(details?.languagesKnown ? [...details.languagesKnown] : []);
    this.aboutWorkExperiences.set(
      details?.workExperience ? JSON.parse(JSON.stringify(details.workExperience)) : [],
    );
    this.aboutEducation.set(
      details?.education ? JSON.parse(JSON.stringify(details.education)) : [],
    );
    this.aboutHobbies.set(details?.hobbies ? [...details.hobbies] : []);
    this.aboutInterests.set(details?.interests ? [...details.interests] : []);
    this.aboutContactEmail = details?.contactEmail || this.service.profile()?.email || '';
    this.aboutContactPhone = details?.contactPhone || this.service.profile()?.contactNumber || '';
    this.aboutSocialLinks.set(
      details?.socialLinks ? JSON.parse(JSON.stringify(details.socialLinks)) : [],
    );
    this.aboutThePersonText = details?.aboutThePerson || '';
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
      visibility: { ...this.aboutVisibility },
    };

    if (!this.service.updateAboutMeDetails(details)) return;
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
    // Companions only ever show what they actually wrote on their profile; when a
    // traveler has not written an intro yet the section stays empty (no invented
    // story). The seeded guest-tour people keep their authored intros.
    return visitor.aboutMe || visitor.bio || '';
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

  readonly followListKind = signal<'followers' | 'following' | null>(null);
  readonly followListOwnerId = signal<number | null>(null);
  protected readonly followListQuery = signal('');
  protected readonly followersPageQuery = signal('');
  protected readonly followingPageQuery = signal('');
  protected readonly circleMembersCircleId = signal<number | null>(null);
  protected readonly circleMembersQuery = signal('');

  openFollowList(kind: 'followers' | 'following', ownerId?: number): void {
    this.followListQuery.set('');
    this.followListKind.set(kind);
    this.followListOwnerId.set(ownerId ?? this.service.currentUser()?.id ?? 1);
  }

  closeFollowList(): void {
    this.followListKind.set(null);
    this.followListQuery.set('');
  }

  private filterPeople(people: Companion[], query: string): Companion[] {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) =>
      [person.fullName, person.city, person.country, person.profession].some((part) =>
        (part || '').toLowerCase().includes(q),
      ),
    );
  }

  filteredFollowList(): Companion[] {
    return this.filterPeople(this.followListPeople(), this.followListQuery());
  }

  filteredFollowers(): Companion[] {
    return this.filterPeople(this.myFollowers(), this.followersPageQuery());
  }

  filteredFollowing(): Companion[] {
    return this.filterPeople(this.myFollowing(), this.followingPageQuery());
  }

  followListTitle(): string {
    const kind = this.followListKind() === 'following' ? 'Following' : 'Followers';
    const ownerId = this.followListOwnerId();
    const me = this.service.currentUser()?.id ?? 1;
    if (!ownerId || ownerId === me) return kind;
    const owner = this.service.companions().find((c) => Number(c.id) === Number(ownerId));
    return owner ? `${owner.fullName.split(' ')[0]}'s ${kind.toLowerCase()}` : kind;
  }

  followListPeople(): Companion[] {
    const ownerId = this.followListOwnerId() ?? this.service.currentUser()?.id ?? 1;
    return this.followListKind() === 'following'
      ? this.service.peopleFollowing(ownerId)
      : this.service.peopleFollowers(ownerId);
  }

  myFollowers(): Companion[] {
    return this.service.peopleFollowers();
  }

  myFollowing(): Companion[] {
    return this.service.peopleFollowing();
  }

  followUser(userId: number): void {
    this.service.follow(userId);
  }

  unfollowUser(userId: number): void {
    this.service.unfollow(userId);
  }

  disconnectFollower(userId: number): void {
    this.service.disconnectFollower(userId);
  }

  removeCompanionship(userId: number): void {
    this.removeCompanionshipFromVisitor(userId);
  }

  pendingRequestNotice(name: string): void {
    void this.confirmSvc.notify(`Your companionship request to ${name} is still pending.`);
  }

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
    const limit = this.service.adminLimitError(this.service.currentUser()?.id ?? 1);
    if (limit) {
      this.circleError.set(limit);
      void this.confirmSvc.notify(limit);
      return;
    }
    this.newCircleName = '';
    this.newCircleDesc = '';
    this.newCircleIcon = '✈️';
    this.circlePhotoPreview.set(null);
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
      this.circlePhotoPreview() || undefined,
    );

    if (created) {
      this.showCreateCircleModal.set(false);
      this.circleError.set(null);
      this.service.openCircleChat(created);
    } else {
      const message = this.service.circleActionError() || 'Could not create this Circle.';
      this.circleError.set(message);
      void this.confirmSvc.notify(message);
    }
  }

  async deleteCircle(circleId: number, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const ok = await this.confirmSvc.confirm('Archive this Circle for everyone in it? It will move to Archived and no longer be active.', 'Archive');
    if (!ok) return;
    const removed = this.service.deleteCircle(circleId);
    if (!removed) {
      void this.confirmSvc.notify('Only an admin can delete this Circle.');
    }
  }

  openCircleChat(circle: Circle, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const me = this.service.currentUser()?.id ?? 1;
    if (!this.service.isCircleParticipant(circle, me)) {
      void this.confirmSvc.notify('You can only open a Circle you belong to.');
      return;
    }
    this.service.openCircleChat(circle);
  }

  getCircleMembers(memberIds: number[]): Companion[] {
    return this.service.companions().filter((c) => memberIds.includes(c.id));
  }

  protected readonly filteredCircles = computed(() => {
    const q = this.circleQuery().trim().toLowerCase();
    const role = this.circleRoleFilter();
    const me = this.service.currentUser()?.id ?? 1;
    const source = this.circleStatusTab() === 'archived' ? this.service.archivedCircles() : this.service.myCircles();
    return source.filter((c) => {
      const admin = this.service.isCircleAdmin(c, me);
      if (role === 'admin' && !admin) return false;
      if (role === 'member' && admin) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    });
  });

  isCircleAdmin(circle: Circle): boolean {
    return this.service.isCircleAdmin(circle, this.service.currentUser()?.id ?? 1);
  }

  circleUsage(circle: Circle) {
    return this.service.circleUsage(circle);
  }

  openCircleMembers(circle: Circle, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.circleMembersQuery.set('');
    this.circleMembersCircleId.set(circle.id);
  }

  closeCircleMembers(): void {
    this.circleMembersCircleId.set(null);
    this.circleMembersQuery.set('');
  }

  circleMembersTarget(): Circle | null {
    const id = this.circleMembersCircleId();
    return id == null ? null : (this.service.circles().find((c) => c.id === id) ?? null);
  }

  circleRoster(circle: Circle): Companion[] {
    const me = this.service.currentUser()?.id ?? 1;
    const people = this.getCircleMembers(circle.memberIds);
    const roster =
      circle.memberIds.includes(me) && !people.some((person) => person.id === me)
        ? [this.service.getCurrentUserAsCompanion(), ...people]
        : people;
    return [...roster].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  filteredCircleMembers(): Companion[] {
    const circle = this.circleMembersTarget();
    return circle ? this.filterPeople(this.circleRoster(circle), this.circleMembersQuery()) : [];
  }

  personIsCircleAdmin(circle: Circle, userId: number): boolean {
    return this.service.isCircleAdmin(circle, userId);
  }

  isCircleOwner(circle: Circle, userId: number): boolean {
    return circle.ownerId === userId;
  }

  makeCircleAdmin(circleId: number, userId: number): void {
    const error = this.service.promoteCircleAdmin(circleId, userId);
    if (error) void this.confirmSvc.notify(error);
  }

  removeCircleAdmin(circleId: number, userId: number): void {
    const error = this.service.demoteCircleAdmin(circleId, userId);
    if (error) void this.confirmSvc.notify(error);
  }

  deleteCircleMember(circleId: number, userId: number): void {
    const error = this.service.removeCircleMember(circleId, userId);
    if (error) void this.confirmSvc.notify(error);
  }

  changeCirclePhoto(circle: Circle, event: Event): void {
    event.stopPropagation();
    if (!this.isCircleAdmin(circle)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      void this.confirmSvc.notify('Circle photo must be 1 MB or smaller.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const ok = this.service.updateCircle(circle.id, { photoUrl: String(reader.result || '') });
      if (!ok) void this.confirmSvc.notify('Only an admin can change this Circle photo.');
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  isChatCircleAdmin(box: ActiveChatBox): boolean {
    if (!box.circleId) return false;
    const circle = this.service.circles().find((c) => c.id === box.circleId);
    return !!circle && this.isCircleAdmin(circle);
  }

  onCirclePhotoSelected(event: Event, target: 'create' | 'edit' = 'create'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      this.circleError.set('Circle photo must be 1 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      if (target === 'edit') this.editCirclePhoto = url;
      else this.circlePhotoPreview.set(url);
    };
    reader.readAsDataURL(file);
  }

  openEditCircle(circle: Circle, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.isCircleAdmin(circle)) return;
    this.editingCircleId.set(circle.id);
    this.newCircleName = circle.name;
    this.newCircleDesc = circle.description;
    this.editCirclePhoto = circle.photoUrl || '';
    this.circleError.set(null);
    this.showEditCircleModal.set(true);
  }

  saveEditCircle(): void {
    const id = this.editingCircleId();
    if (!id) return;
    if (!this.newCircleName.trim()) {
      this.circleError.set('Circle name is required.');
      return;
    }
    const ok = this.service.updateCircle(id, {
      name: this.newCircleName.trim(),
      description: this.newCircleDesc.trim(),
      photoUrl: this.editCirclePhoto || undefined,
    });
    if (!ok) {
      void this.confirmSvc.notify('Only an admin can change this Circle.');
      return;
    }
    this.showEditCircleModal.set(false);
  }

  openAddPeople(chatKey: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.addPeopleChatKey.set(chatKey);
    this.selectedAddPeopleIds.set([]);
    this.circleError.set(null);
    this.showAddPeopleModal.set(true);
  }

  peopleAvailableForOpenChat(): Companion[] {
    const key = this.addPeopleChatKey();
    if (key == null) return [];
    const box = this.chatBoxFor(key);
    return box ? this.companionsAvailableToAdd(box) : [];
  }

  companionsAvailableToAdd(box: ActiveChatBox): Companion[] {
    const already = new Set(box.participantIds ?? [box.companion.id]);
    return this.connectedCompanions().filter((c) => !already.has(c.id));
  }

  toggleAddPerson(id: number): void {
    const current = this.selectedAddPeopleIds();
    this.selectedAddPeopleIds.set(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  confirmAddPeople(): void {
    const key = this.addPeopleChatKey();
    if (key == null) return;
    const error = this.service.addPeopleToChat(key, this.selectedAddPeopleIds());
    if (error) {
      this.circleError.set(error);
      void this.confirmSvc.notify(error);
      return;
    }
    this.showAddPeopleModal.set(false);
  }

  openSaveCircle(chatKey: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const limit = this.service.adminLimitError(this.service.currentUser()?.id ?? 1);
    if (limit) {
      void this.confirmSvc.notify(limit);
      return;
    }
    this.saveCircleChatKey.set(chatKey);
    this.newCircleName = '';
    this.newCircleDesc = '';
    this.circlePhotoPreview.set(null);
    this.circleError.set(null);
    this.showSaveCircleModal.set(true);
  }

  confirmSaveCircle(): void {
    const key = this.saveCircleChatKey();
    if (key == null) return;
    if (!this.newCircleName.trim()) {
      this.circleError.set('Circle name is required.');
      return;
    }
    const created = this.service.saveChatAsCircle(
      key,
      this.newCircleName,
      this.newCircleDesc,
      this.circlePhotoPreview() || undefined,
    );
    if (!created) {
      const message = this.service.circleActionError() || 'Could not save this Circle.';
      this.circleError.set(message);
      void this.confirmSvc.notify(message);
      return;
    }
    this.showSaveCircleModal.set(false);
  }

  openManageCircle(circleId: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.managingCircleId.set(circleId);
    this.selectedAddPeopleIds.set([]);
    this.circleError.set(null);
    this.showManageCircleModal.set(true);
  }

  managingCircle(): Circle | null {
    const id = this.managingCircleId();
    return this.service.circles().find((c) => c.id === id) ?? null;
  }

  promoteInCircle(userId: number): void {
    const id = this.managingCircleId();
    if (!id) return;
    const error = this.service.promoteCircleAdmin(id, userId);
    if (error) {
      this.circleError.set(error);
      void this.confirmSvc.notify(error);
    }
  }

  addManagedMembers(): void {
    const id = this.managingCircleId();
    if (!id) return;
    const error = this.service.addCircleMembers(id, this.selectedAddPeopleIds());
    if (error) {
      this.circleError.set(error);
      void this.confirmSvc.notify(error);
      return;
    }
    this.selectedAddPeopleIds.set([]);
  }

  chatBoxFor(key: number): ActiveChatBox | undefined {
    return this.service.activeChatBoxes().find((b) => b.companionId === key);
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

  protected pendingChats(): PendingChat[] {
    return this.service.pendingChats().filter((chat) => chat.unreadCount > 0);
  }

  openPendingChat(chat: PendingChat): void {
    const known = this.service.companions().find((c) => c.id === chat.companionId);
    this.openChatWith(
      known ?? {
        id: chat.companionId,
        fullName: chat.fullName,
        profilePhotoUrl: chat.profilePhotoUrl,
        country: chat.country,
        city: chat.city,
        profession: chat.profession,
        isOnline: false,
        mutualCompanionsCount: 0,
        status: 'connected',
      },
    );
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
      preferredSeason: s.preferredSeason ?? '',
      theme: s.theme,
      timezone: s.timezone || '',
      whoCanConnect: s.whoCanConnect ?? 'everyone',
      whoCanVisitProfile: s.whoCanVisitProfile ?? 'everyone',
      showActiveStatusTo: s.showActiveStatusTo ?? 'everyone',
      whoCanSeeCompanionsList: s.whoCanSeeCompanionsList ?? 'everyone',
      allowCompanionTagging: s.allowCompanionTagging ?? true,
      approveTagsBeforePost: s.approveTagsBeforePost ?? false,
    });
    if (s.travelStyles) {
      this.selectedTravelStyles.set(s.travelStyles);
    }
  }

  async saveDetails(): Promise<void> {
    if (this.editForm.invalid) return;
    const v = this.editForm.getRawValue();
    // The form collects one full name plus the location cascade: the first / last name are
    // derived from it (the same rule the API applies) and the typed state is stored on the
    // member's row instead of being dropped.
    const names = splitFullName(v.fullName);
    await this.service.updateProfile({
      fullName: v.fullName ?? undefined,
      firstName: names.firstName || undefined,
      lastName: names.lastName || undefined,
      state: v.state ?? undefined,
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
      await this.service.addGalleryPhoto(file, this.newCaption, this.selectedGalleryAlbumId());
      this.selectedGalleryFile.set(null);
      this.galleryPreviewUrl.set(null);
      this.newCaption = '';
      this.showUploadCard.set(false);
    } finally {
      this.uploadingGallery.set(false);
    }
  }

  async deletePhoto(photoId: number, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const ok = await this.confirmSvc.confirm('Delete this photo from your gallery?', 'Delete');
    if (ok) await this.service.deleteGalleryPhoto(photoId);
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
      if (this.service.contentGuardMessage() || this.service.storageBlockMessage()) return;
      this.newPostText = '';
      this.selectedMessageBookTaggedCompanions.set([]);
      this.clearMessageBookPhoto();
    } catch {
      // The content guard or storage limit already raised a popup.
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

  async deleteComment(commentId: number, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const ok = await this.confirmSvc.confirm('Are you sure you want to delete this?', 'Delete');
    if (ok) await this.service.deleteComment(commentId);
  }

  /**
   * Requirement F — delete permissions, evaluated on the actual post (not the page):
   * • your own comments, anywhere (your Journey, MessageBook, others' Journeys);
   * • someone else's comment, only when it sits on your own Journey post.
   * Posts made by others — including the ones that appear in your Journey feed —
   * can never be deleted by you (only Hiden), and neither can the other members'
   * comments on those feed posts.
   */
  canDeleteComment(authorId: number, postOwnerId?: number): boolean {
    const currentUserId = this.service.currentUser()?.id || 1;
    if (authorId === currentUserId) return true;
    return postOwnerId !== undefined && postOwnerId === currentUserId;
  }

  canDeleteJourneyPost(post: JourneyPost): boolean {
    const currentUserId = this.service.currentUser()?.id || 1;
    return post.author.id === currentUserId;
  }

  async deleteJourneyPost(postId: number, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    const ok = await this.confirmSvc.confirm('Are you sure you want to delete this journey post?', 'Delete');
    if (ok) {
      this.service.deleteJourneyPost(postId);
    }
  }

  // Requirement G: Hide post option for other users' posts in Journey feed
  hideJourneyPost(postId: number): void {
    this.service.hideJourneyPost(postId);
  }

  // Requirement C: View own profile as visitor preview.
  // Pushes a history entry (#self-preview) so browser back returns to the
  // section the member was on. "self-preview" is deliberately not a section,
  // so the fragment deep-link handler ignores it on reload.
  viewOwnProfileAsVisitor(): void {
    const ownComp = this.service.getCurrentUserAsCompanion();
    this.viewingVisitor.set(ownComp);
    if (this.route.snapshot?.fragment !== 'self-preview') {
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: 'self-preview',
        queryParamsHandling: 'preserve',
      });
    }
  }

  // Requirement E: Facebook collage open full post detail modal
  openPostDetail(post: JourneyPost): void {
    this.viewingPostDetail.set(post);
    if (this.service.apiLive && post.id > 0 && post.id < 1_000_000_000_000 && post.comments.length === 0 && (post.commentCount ?? 0) > 0) {
      void this.service.loadJourneyComments(post.id).then((comments) => {
        if (this.viewingPostDetail()?.id === post.id) {
          this.viewingPostDetail.set({ ...post, comments });
        }
      });
    }
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

  async removeChatMsg(companionId: number, msgId: number): Promise<void> {
    const ok = await this.confirmSvc.confirm('Are you sure you want to remove this message?', 'Remove');
    if (ok) {
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
    if (this.service.contentGuardMessage() || this.service.storageBlockMessage()) return;
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
    // Live intersection (my connected companions ∩ the visitor's) — the same
    // numbers the hover preview card shows, so nothing mismatches anymore.
    return this.service.mutualCompanionsOf(targetId);
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

  // Requirement B: Work Experience and Education for visitor profile.
  // Only what the traveler actually stored is shown — an empty history stays empty.
  getVisitorWorkExperiences(visitor: Companion): WorkExperience[] {
    return visitor.aboutMeDetails?.workExperience ?? [];
  }

  getVisitorEducationHistory(visitor: Companion): EducationInfo[] {
    return visitor.aboutMeDetails?.education ?? [];
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

      const existing = this.service.profile()?.settings;
      await this.service.updateSettings({
        ...(existing || {
          emailNotificationsEnabled: true,
          phoneNotificationsEnabled: false,
          publicProfileEnabled: true,
          theme: 'light',
        }),
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
        preferredSeason: v.preferredSeason ?? '',
        theme: (v.theme as 'light' | 'dark' | 'system') ?? 'light',
        timezone: v.timezone ?? '',
        whoCanConnect: (v.whoCanConnect as 'everyone' | 'companions-of-companions' | 'none') ?? 'everyone',
        whoCanVisitProfile: (v.whoCanVisitProfile as 'everyone' | 'companions' | 'none') ?? 'everyone',
        showActiveStatusTo: (v.showActiveStatusTo as 'everyone' | 'companions' | 'only-me') ?? 'everyone',
        whoCanSeeCompanionsList: (v.whoCanSeeCompanionsList as 'everyone' | 'companions' | 'only-me') ?? 'everyone',
        allowCompanionTagging: v.allowCompanionTagging ?? true,
        approveTagsBeforePost: v.approveTagsBeforePost ?? false,
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

  setFieldAudience(field: AboutFieldKey, audience: FieldAudience): void {
    this.aboutVisibility = { ...this.aboutVisibility, [field]: audience };
  }

  audienceOf(field: AboutFieldKey): FieldAudience {
    return this.aboutVisibility[field] ?? { visibility: 'public' };
  }

  audienceShort(field: AboutFieldKey): string {
    const v = this.audienceOf(field).visibility;
    if (v === 'companions') return 'Companions';
    if (v === 'private') return 'Private';
    if (v === 'custom') return 'Custom';
    return 'Public';
  }

  visitorCanSee(field: AboutFieldKey): boolean {
    const visitor = this.viewingVisitor();
    if (!visitor) return true;
    const me = this.service.currentUser()?.id;
    const isSelf = me != null && visitor.id === me;
    const details = isSelf ? this.service.profile()?.aboutMeDetails : visitor.aboutMeDetails;
    const audience = details?.visibility?.[field] ?? { visibility: 'public' as const };
    if (isSelf) return audience.visibility === 'public';
    return this.audienceAllows(audience, visitor.status === 'connected', me ?? 0);
  }

  private audienceAllows(audience: FieldAudience, isCompanion: boolean, viewerId: number): boolean {
    switch (audience.visibility) {
      case 'private':
        return false;
      case 'companions':
        return isCompanion;
      case 'custom': {
        const listed = (audience.companionIds ?? []).includes(viewerId);
        return (audience.customMode ?? 'allow') === 'allow' ? listed : !listed;
      }
      default:
        return true;
    }
  }

  visitGate(): 'closed' | 'companions' | null {
    const visitor = this.viewingVisitor();
    if (!visitor) return null;
    const me = this.service.currentUser()?.id;
    const isSelf = me != null && visitor.id === me;
    const rule = isSelf
      ? (this.service.profile()?.settings?.whoCanVisitProfile ?? 'everyone')
      : (visitor.whoCanVisitProfile ?? 'everyone');
    if (isSelf) return null;
    if (rule === 'none') return 'closed';
    if (rule === 'companions' && visitor.status !== 'connected') return 'companions';
    return null;
  }

  relationshipLabel(c: Companion | null | undefined): string {
    return this.service.relationshipLabel(c);
  }

  presenceLabel(userId?: number | null): string {
    return this.service.presenceFor(userId).label;
  }

  async logoutDevice(deviceId: string): Promise<void> {
    const device = this.service.devices().find((d) => d.id === deviceId);
    const ok = await this.confirmSvc.confirm(
      device?.isCurrent
        ? 'Log out of this device? You will be signed out of NeverBeen on this browser.'
        : `Log out the session on ${device?.name ?? 'this device'}?`,
      'Log out',
    );
    if (!ok) return;
    const result = this.service.logoutDevice(deviceId);
    if (result === 'self') this.logout();
  }

  async blockDevice(deviceId: string): Promise<void> {
    const device = this.service.devices().find((d) => d.id === deviceId);
    const ok = await this.confirmSvc.confirm(
      `Block ${device?.name ?? 'this device'}? It will be signed out and cannot open your profile until you unblock it.`,
      'Block device',
    );
    if (!ok) return;
    const result = this.service.blockDevice(deviceId);
    if (result === 'self') this.logout();
  }

  unblockDevice(deviceId: string): void {
    this.service.unblockDevice(deviceId);
  }

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
