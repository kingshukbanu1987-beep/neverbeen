import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  Observable,
  TimeoutError as RxjsTimeoutError,
  firstValueFrom,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { CommunityBadgeService } from './community-badge.service';
import {
  AboutMeDetails,
  AbuseReport,
  ActiveChatBox,
  AuthorInfo,
  AuthResult,
  Circle,
  City,
  ChatMessage,
  CommunityComment,
  Companion,
  Country,
  CurrentUser,
  GalleryPhoto,
  GalleryAlbum,
  JourneyComment,
  JourneyPost,
  LoginDevice,
  NotificationItem,
  PostAudience,
  PagedResult,
  Profile,
  ReactionResult,
  ReactionType,
  REACTION_ICONS,
  UpdateProfileRequest,
  UserActiveStatus,
  UserReaction,
  UserSettings,
  generate20DigitUid,
} from '../models/community';
import {
  SEED_COUNTRIES,
  SEED_GENDERS,
  SEED_PROFESSIONS,
} from '../models/community-seed';
import { SEED_ASIAN_COMPANIONS } from '../models/community-asian-profiles';
import { ALL_SEED_INDIAN_COMPANIONS } from '../models/community-indian-profiles';
import { SEED_EXTENDED_JOURNEY_POSTS } from '../models/community-journey-feed-seed';
import {
  CIRCLES_SEED_VERSION,
  CIRCLES_SEED_VERSION_KEY,
  MAX_ADMIN_CIRCLES,
  MAX_MEMBER_CIRCLES,
  buildTravelCircles,
  isCircleAdmin,
  isCircleParticipant,
  normalizeCircle,
} from '../models/circle-seed';
import { statusIconClass } from '../shared/presence-dot/presence-dot';
import { inspectCommunityText } from '../pages/community/profile/content-guard';
import { extractHashtags } from '../pages/community/profile/hashtags';
import { StorageReport, StorageSlice, buildStorageReport, imageBytes, utf8Bytes } from '../pages/community/profile/storage-meter';
import { AdminModerationService } from './admin-moderation.service';
import {
  MAX_COMMUNITY_IMAGE_BYTES,
  compressCommunityImage,
  readImageAsDataUrl,
} from '../shared/community-image-compression';

export const TOKEN_KEY = 'neverbeen_auth_token';
export const USER_KEY = 'neverbeen_current_user';
export const PROFILE_KEY = 'neverbeen_user_profile';
/** localStorage flag: a visitor is exploring the Community without an account. */
export const GUEST_KEY = 'neverbeen_guest_browsing';
export const COMMENTS_KEY = 'neverbeen_comments';
export const JOURNEY_KEY = 'neverbeen_journey_posts';
export const COMPANIONS_KEY = 'neverbeen_companions';
export const FOLLOWS_KEY = 'neverbeen_follows';
export const FOLLOWS_SEED_VERSION = 'follows-v1';
export const FOLLOWS_SEED_VERSION_KEY = 'neverbeen_follows_seed';
export const CIRCLES_KEY = 'neverbeen_circles';
export const CIRCLE_READS_KEY = 'neverbeen_circle_reads';
export const DEVICES_KEY = 'neverbeen_devices';
/** Per-account browser identifier used to store device sign-in history on the API. */
export const DEVICE_ID_KEY_PREFIX = 'neverbeen_device_id';
export const NOTIFS_KEY = 'neverbeen_notifications';
export const PENDING_CHATS_KEY = 'neverbeen_pending_chats';
export const PENDING_CHATS_SEED_VERSION = 'pending-chats-v1';
export const PENDING_CHATS_SEED_VERSION_KEY = 'neverbeen_pending_chats_seed';
export const BLOCKED_USERS_KEY = 'neverbeen_blocked_users';
export const ABUSE_REPORTS_KEY = 'neverbeen_abuse_reports';
export const HIDDEN_POSTS_KEY = 'neverbeen_hidden_post_ids';
/**
 * Marker written while this browser holds the seeded "Explore as Guest" demo community
 * (demo members, circles, journey feed, message book, chats). It lets the app drop every
 * seeded dataset the moment a real Google / Facebook session starts, so a signed-in
 * member can never be shown demo people, demo circles or demo posts.
 */
export const DEMO_COMMUNITY_KEY = 'neverbeen_demo_community';

/**
 * Every localStorage key the "Explore as Guest" demo tour writes. A signed-in member's
 * browser is wiped of these datasets before their own (Web-API backed) data is loaded.
 */
const DEMO_COMMUNITY_STORAGE_KEYS: readonly string[] = [
  DEMO_COMMUNITY_KEY,
  COMMENTS_KEY,
  JOURNEY_KEY,
  COMPANIONS_KEY,
  FOLLOWS_KEY,
  FOLLOWS_SEED_VERSION_KEY,
  CIRCLES_KEY,
  CIRCLES_SEED_VERSION_KEY,
  CIRCLE_READS_KEY,
  DEVICES_KEY,
  NOTIFS_KEY,
  PENDING_CHATS_KEY,
  PENDING_CHATS_SEED_VERSION_KEY,
  BLOCKED_USERS_KEY,
  ABUSE_REPORTS_KEY,
  HIDDEN_POSTS_KEY,
];

/**
 * Public Google OAuth Web Client ID — safe (and required) in browser code.
 * The matching Client secret must never be shipped to the frontend.
 */
export const GOOGLE_CLIENT_ID =
  '211635270312-q7d8p4bd3ujakcoli0ggspbdj1b75tc4.apps.googleusercontent.com';
/** localStorage key remembering which Google account signed in. */
export const GOOGLE_ACCOUNT_KEY = 'neverbeen_google_account';

/** Identity extracted from a Google Identity Services credential. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
}

/** Outcome of starting the Google sign-in flow. */
export type GoogleSignInStep =
  | { step: 'identity'; identity: GoogleIdentity }
  | { step: 'show_google_button'; render: (host: HTMLElement) => void }
  | { step: 'unavailable' };

/**
 * Public Facebook App ID — safe (and required) in browser code.
 * The matching App secret must never be shipped to the frontend.
 */
export const FACEBOOK_APP_ID = '1075272841953402';
/** Graph API version used by the Facebook JS SDK. */
const FACEBOOK_GRAPH_VERSION = 'v26.0';
/** localStorage key remembering which Facebook account signed in. */
export const FACEBOOK_ACCOUNT_KEY = 'neverbeen_facebook_account';

/** Identity fetched from the Graph API after FB.login succeeds. */
export interface FacebookIdentity {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string;
}

/** Outcome of starting the Facebook sign-in flow. */
export type FacebookSignInStep =
  | { step: 'identity'; identity: FacebookIdentity }
  | { step: 'cancelled' }
  | { step: 'unavailable' };

/** Shared shape for completing a social (Google/Facebook) sign-in. */
interface SocialSignInParams {
  provider: string;
  storageKey: string;
  accountRef: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string;
}

// Curated authentic portrait & cover pools (Requirements E, F, G)
export const SEED_INDIAN_MALE_PORTRAITS = [
  'photo-1506794778202-cad84cf45f1d',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1500648767791-00dcc994a43e',
  'photo-1539571696357-5a69c17a67c6',
  'photo-1492562080023-ab3db95bfbce',
  'photo-1522075469751-3a6694fb2f61',
  'photo-1519085360753-af0119f7cbe7',
  'photo-1517070208541-6ddc4d3efbcb',
  'photo-1472099645785-5658abf4ff4e',
  'photo-1542909168-82c3e7fdca5c',
  'photo-1560250097-0b93528c311a',
  'photo-1513956589380-bad6acb9b9d4',
  'photo-1563240619-44ec0047592c',
  'photo-1582233479366-6d38bc390a08',
  'photo-1570295999919-56ceb5ecca61',
  'photo-1528892952291-009c663ce843',
  'photo-1501196354995-cbb51c65aaea',
];

export const SEED_INDIAN_FEMALE_PORTRAITS = [
  'photo-1544005313-94ddf0286df2',
  'photo-1517841905240-472988babdf9',
  'photo-1524504388940-b1c1722653e1',
  'photo-1531746020798-e6953c6e8e04',
  'photo-1567532939604-b6b5b0db2604',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1580489944761-15a19d654956',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1494790108377-be9c29b29330',
  'photo-1508214751196-bcfd4ca60f91',
  'photo-1534528741775-53994a69daeb',
  'photo-1558898479-33c0057a5d12',
  'photo-1548142813-c348350df52b',
  'photo-1516726817505-f5ed825624d8',
];

export const SEED_COVER_DESTINATIONS = [
  'photo-1506744038136-46273834b3fb',
  'photo-1507525428034-b723cf961d3e',
  'photo-1513635269975-59663e0ac1ad',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1469854523086-cc02fe5d8800',
  'photo-1502602898657-3e91760cbb34',
  'photo-1518684079-3c830dcef090',
  'photo-1524492412937-b28074a5d7da',
  'photo-1506905925346-21bda4d32df4',
  'photo-1433838552652-f9a46b332c40',
  'photo-1501785888041-af3ef285b470',
  'photo-1470071459604-3b5ec3a7fe05',
];

export const SEED_COVER_FAMILY = [
  'photo-1511895426328-dc8714191300',
  'photo-1475503572774-15a45e5d60b9',
  'photo-1542037104857-ffbb0b9155fb',
  'photo-1609234656388-0ff363383899',
  'photo-1536640712-4d4c36ff0e4e',
];

export const SEED_COVER_FRIENDS = [
  'photo-1529156069898-49953e39b3ac',
  'photo-1539635278303-d4002c07eae3',
  'photo-1517457373958-b7bdd4587205',
  'photo-1511632765486-a01980e01a18',
  'photo-1523580494863-6f3031224c94',
];

export const SEED_COVER_COLLEAGUES = [
  'photo-1522071820081-009f0129c71c',
  'photo-1517245386807-bb43f82c33c4',
  'photo-1556761175-5973dc0f32e7',
  'photo-1531482615713-2afd69097998',
  'photo-1519389950473-47ba0277781c',
];

/**
 * The written intro of the **seeded founder sample** (the "Explore as Guest" profile).
 * It is demo content that belongs to the demo member only — a signed-in member's About
 * me is always their own stored intro (or nothing at all).
 */
export const FOUNDER_RICH_INTRO =
  "I believe in Creativity, Future Proof Design and Strong Foundation in Programming, rest believe in me, I will deliver above your expectations.\n\n" +
  "I am Kingshuk, a Senior Software Engineer with vast IT experience, specializing in software development, requirements modelling, database modelling, application architecture design, and customer-facing delivery within the Manufacturing & Intelligence Services domain. I have worked with world-leading companies like Continental AG, Intel, E&Y, and others.\n\n" +
  "As the founder and principal architect of NeverBeen, I blend cutting-edge Generative AI technology with high-performance engineering to bring the world's most breathtaking vacation dreams to life—empowering travelers to discover authentic cultural stories, timeless landscapes, and global companionship.";

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

let autoIdCounter = 10000;
export function generateUniqueId(): number {
  return Date.now() * 1000 + (++autoIdCounter);
}

/**
 * First and last name derived from a typed full name ("Kingshuk Banu" → `Kingshuk` / `Banu`).
 * The registration form and the profile editor collect separate first/last names, so this is
 * only the fallback for a member who typed one line (the same rule the Web API applies).
 */
export function splitFullName(fullName?: string | null): { firstName: string; lastName: string } {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: words[0] ?? '', lastName: words.slice(1).join(' ') };
}

/**
 * Token of the make-believe “active member” account of the seeded demo community (the one
 * the specs open through `community-demo.testing.ts`). It is not a JWT and never belongs to
 * a real member: when the app is opened with it, the demo community is *not* restored — the
 * cookie is dropped and the visitor is treated like anybody else.
 */
export const DEMO_SESSION_TOKEN = 'jwt_default_active_token';

/** True when an auth cookie holds the demo marker rather than a real member's JWT. */
export function isDemoSessionToken(token: string | null | undefined): boolean {
  return token === DEMO_SESSION_TOKEN;
}

/**
 * True for the profile the demo/guest tour seeds into this browser (the founder's sample
 * member), and for any other make-believe account the preview flows created. Real members
 * always sign in with their own Google / Facebook address, so a `@neverbeen.example`
 * address or the bundled founder photo can only be demo data.
 */
export function isSeedProfile(profile: { email?: string | null; profilePhotoUrl?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  const email = (profile.email ?? '').toLowerCase();
  return email.endsWith('@neverbeen.example') || profile.profilePhotoUrl === '/author.jpeg';
}

export interface CreateAccountData {
  name: string;
  surname: string;
  email: string;
  country: string;
  state: string;
  city: string;
  gender: string;
  dateOfBirth: string;
  photoUrl: string;
  aboutMe?: string;
  profession?: string;
  /** The chosen profile photograph — uploaded to the Web API as a multipart file. */
  photo?: File | null;
}

/**
 * Response of `POST /api/auth/oauth/login` (the API's `AuthResultDto`).
 * The Web API exchanges the OAuth authorization code with the provider (the client
 * secret stays on the server) and answers with the JWT plus the flags that decide
 * where the member goes next: `profileComplete === false` → registration page.
 */
export interface ApiAuthResult {
  token: string;
  tokenType: string;
  expiresIn: number;
  isNewUser: boolean;
  profileComplete: boolean;
  message: string;
  user: {
    id: number;
    fullName?: string | null;
    email: string;
    status: string;
    profileComplete: boolean;
    profilePhotoUrl?: string | null;
  };
}

/** Response of `POST /api/registration` and `GET /api/profile/me` (the API's `ProfileDto`). */
export interface ApiProfileDto {
  id: number;
  fullName?: string | null;
  /** Own column on the member row (`Users.FirstName`); sent by the registration page. */
  firstName?: string | null;
  /** Own column on the member row (`Users.LastName`); sent by the registration page. */
  lastName?: string | null;
  email: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  countryId?: number | null;
  countryName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  /** State / province typed on the registration page (`Users.State`). */
  state?: string | null;
  pincode?: string | null;
  contactNumber?: string | null;
  postalAddress?: string | null;
  aboutMe?: string | null;
  /** Structured About-me sub-sections (intro, work, education, …) as JSON (patch: community-complete). */
  aboutMeDetailsJson?: string | null;
  /** Presence shown to other travelers: Active, Busy, Don't Disturb, Away, Inactive or Custom. */
  activeStatus?: string | null;
  /** Custom presence text used when `activeStatus` is "Custom". */
  customStatusText?: string | null;
  /** Relative API URL of the uploaded cover photograph (`/api/profile/{id}/cover`). */
  coverPhotoUrl?: string | null;
  profession?: string | null;
  status: string;
  profilePhotoUrl?: string | null;
  externalProfilePictureUrl?: string | null;
  createdAtUtc: string;
  settings?: Partial<UserSettings>;
  gallery?: GalleryPhoto[];
  commentCount: number;
}

/** Web API shapes of the community endpoints (neverbeen-api). Field names follow the C# DTOs. */
export interface ApiAuthorDto {
  id: number;
  uniqueId?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  profession?: string | null;
  country?: string | null;
  city?: string | null;
  isVerified?: boolean;
}

export interface ApiCompanionDto {
  id: number;
  uniqueId?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  coverPhotoUrl?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  isOnline?: boolean;
  mutualCompanionsCount?: number;
  status?: string;
  bio?: string | null;
  aboutMe?: string | null;
  aboutMeDetailsJson?: string | null;
  isProfileLocked?: boolean;
  activeStatus?: string | null;
  customStatusText?: string | null;
  isVerified?: boolean;
  /** True when the signed-in member already follows this traveler. */
  isFollowing?: boolean;
  relationshipStatus?: string | null;
  connectedCompanionIds?: number[] | null;
}

/**
 * One hit of the member directory search (`GET /api/users/search`): identity cards
 * plus the signed-in member's relationship to the hit, so the search drop-down can
 * offer Connect / Request Sent / Connected and Follow / Following directly.
 */
export interface ApiUserSearchResultDto {
  id: number;
  uniqueId?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  isOnline?: boolean;
  activeStatus?: string | null;
  isVerified?: boolean;
  isProfileLocked?: boolean;
  status?: string;
  isFollowing?: boolean;
  mutualCompanionsCount?: number;
}

export interface ApiCircleDto {
  id: number;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  photoUrl?: string | null;
  memberIds?: number[];
  adminIds?: number[];
  ownerId?: number;
  createdAtUtc?: string;
  archivedAtUtc?: string | null;
  unreadCount?: number;
}

export interface ApiCircleMessageDto {
  id: number;
  circleId?: number;
  senderId?: number;
  senderName?: string;
  text?: string;
  sentAtUtc?: string;
  replyToMessageId?: number | null;
  reactions?: { [emoji: string]: number } | null;
}

export interface ApiReactionDto {
  user?: ApiAuthorDto | null;
  type?: string;
  reactedAtUtc?: string | null;
}

export interface ApiJourneyCommentDto {
  id: number;
  postId?: number;
  author?: ApiAuthorDto | null;
  text?: string;
  createdAtUtc?: string;
  imageUrl?: string | null;
  parentId?: number | null;
  likeCount?: number;
  isLiked?: boolean;
  myReaction?: string | null;
  reactions?: ApiReactionDto[] | null;
  replies?: ApiJourneyCommentDto[] | null;
}

export interface ApiPostAudienceDto {
  mode?: string;
  allowIds?: number[] | null;
  denyIds?: number[] | null;
}

export interface ApiJourneyPostDto {
  id: number;
  author?: ApiAuthorDto | null;
  text?: string;
  createdAtUtc?: string;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  likeCount?: number;
  isLiked?: boolean;
  myReaction?: string | null;
  reactions?: ApiReactionDto[] | null;
  taggedCompanions?: ApiAuthorDto[] | null;
  comments?: ApiJourneyCommentDto[] | null;
  commentCount?: number;
  location?: string | null;
  mood?: string | null;
  placeId?: string | null;
  hashtags?: string[] | null;
  shareCount?: number;
  sharesCount?: number;
  isShared?: boolean;
  sharedText?: string | null;
  originalPost?: ApiJourneyPostDto | null;
  audience?: ApiPostAudienceDto | null;
  wallOwnerId?: number | null;
  wallOwnerName?: string | null;
  editedAtUtc?: string | null;
}

export interface ApiAuthorInfoDto {
  id?: number;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  profession?: string | null;
}

export interface ApiBookCommentDto {
  id: number;
  text?: string;
  createdAtUtc?: string;
  likeCount?: number;
  dislikeCount?: number;
  author?: ApiAuthorInfoDto | null;
  imageUrl?: string | null;
  myReaction?: string | null;
  replyCount?: number;
  replies?: ApiBookCommentDto[] | null;
}

export interface ApiChatMessageDto {
  id: number;
  conversationId?: number;
  senderId?: number;
  senderName?: string | null;
  receiverId?: number | null;
  text?: string;
  sentAtUtc?: string;
  replyToMessageId?: number | null;
  replyTo?: { id: number; senderName?: string | null; text?: string } | null;
  reactions?: { [emoji: string]: number } | null;
  myReaction?: string | null;
}

export interface ApiConversationDto {
  id: number;
  isGroup?: boolean;
  circleId?: number | null;
  ownerId?: number | null;
  participants?: ApiAuthorDto[] | null;
  lastMessage?: ApiChatMessageDto | null;
  unreadCount?: number;
  createdAtUtc?: string;
}

export interface ApiNotificationDto {
  id: number;
  type?: string;
  fromUser?: ApiAuthorDto | null;
  message?: string;
  createdAtUtc?: string;
  isRead?: boolean;
  requestId?: number | null;
  status?: string | null;
}

export interface ApiFollowDto {
  id: number;
  uniqueId?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  profession?: string | null;
  country?: string | null;
  city?: string | null;
  followedAtUtc?: string;
}

export interface ApiFollowCountsDto {
  followers?: number;
  following?: number;
  isFollowing?: boolean;
}

export interface ApiDeviceDto {
  id: string;
  name?: string;
  type?: string;
  os?: string;
  browser?: string;
  ipAddress?: string;
  macAddress?: string;
  location?: string;
  lastSeenUtc?: string;
  isCurrent?: boolean;
  isActive?: boolean;
  blocked?: boolean;
}

export interface ApiGalleryPhotoDto {
  id: number;
  url?: string;
  caption?: string | null;
  createdAtUtc?: string;
}

export interface ApiGalleryAlbumDto {
  id: number;
  name?: string;
  photos?: ApiGalleryPhotoDto[] | null;
  coverPhotoId?: number | null;
  privacy?: string | null;
  updatedAtUtc?: string;
}

export interface ApiBlockedUserDto {
  id: number;
  uniqueId?: string | null;
  fullName?: string | null;
  profilePhotoUrl?: string | null;
  blockedAtUtc?: string;
}

export interface ApiAbuseReportDto {
  id: number;
  targetType?: string;
  targetId?: number;
  reportedAuthor?: ApiAuthorDto | null;
  reportedByUserId?: number;
  reason?: string;
  details?: string | null;
  reporterEmail?: string | null;
  createdAtUtc?: string;
  status?: string;
}

/** A companion conversation waiting to be read. Counted by the header Chats badge. */
export interface PendingChat {
  companionId: number;
  fullName: string;
  profilePhotoUrl: string;
  profession: string;
  city: string;
  country: string;
  preview: string;
  unreadCount: number;
  sentAtUtc: string;
}

function loadJsonValue(key: string): unknown {
  if (typeof localStorage === 'undefined') return null;
  const str = localStorage.getItem(key);
  if (str == null) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/** How long a small API call (health, lookups, profile) may take before it is given up on. */
const API_TIMEOUT_MS = 20_000;
/** Registrations upload the profile photograph, so they may take a little longer. */
const REGISTRATION_TIMEOUT_MS = 45_000;

/** Raised when the Web API does not answer within its time budget. */
class ApiTimeoutError extends Error {
  constructor(readonly url: string) {
    super(`The NeverBeen Web API at ${url} did not answer in time.`);
    this.name = 'ApiTimeoutError';
  }
}

/** Applies the API time budget to a request and reports the offending URL when it expires. */
function withApiTimeout<T>(source: Observable<T>, url: string, ms = API_TIMEOUT_MS): Observable<T> {
  return source.pipe(timeout({ each: ms, with: () => throwError(() => new ApiTimeoutError(url)) }));
}

@Injectable({
  providedIn: 'root',
})
export class CommunityService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  /** Admin Console moderation — accounts disabled by an admin are hidden from the community. */
  private readonly moderation = inject(AdminModerationService);
  /**
   * True **only** while the seeded demo community is open — the “Explore as Guest” tour.
   * Nothing else turns it on: a signed-out visitor, a member who signed in with Google /
   * Facebook and a member restored from an auth cookie all get real (empty or Web-API
   * backed) data, and every dataset below stays empty until the Web API or the member
   * themselves fills it. `enterMemberSession()` clears the demo datasets the moment a real
   * session begins, so the seeded founder profile, demo travellers, circles, Journey feed,
   * Message Book, chats and notifications can never leak into a member's session.
   */
  private demoSession = false;
  /**
   * Base URL of the NeverBeen Web API (see `src/environments/environment.ts`).
   * The default `/neverbeen-api` path is proxied to the deployed ASP.NET Core API by
   * the dev server and by the Cloudflare Worker, so the browser stays same-origin.
   */
  readonly apiUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  /**
   * Whether the Web API answered the last request: `true` = the community is backed by the
   * database, `false` = the API is unreachable and the browser-only fallback is in use,
   * `null` = nothing has been called yet.
   */
  readonly apiOnline = signal<boolean | null>(null);
  /**
   * Where the most recent account creation was stored: `'database'` when the Web API
   * accepted the registration, `'local'` when only this browser could be written
   * (API unreachable or no signed-in OAuth session yet).
   */
  readonly accountSaveTarget = signal<'database' | 'local' | null>(null);
  /** Human-readable reason why a registration could not be stored in the database. */
  readonly accountSaveNotice = signal<string | null>(null);
  /** Why the last `GET /health` probe failed (wrong address, timeout, CORS, …). */
  readonly apiProbeDetail = signal<string | null>(null);

  /** Clears the registration notice shown across the community pages. */
  dismissAccountSaveNotice(): void {
    this.accountSaveNotice.set(null);
  }

  readonly token = signal<string | null>(getCookie(TOKEN_KEY));
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly comments = signal<CommunityComment[]>(this.loadComments());

  // Social Network State: Journey, Companions, Circles, Notifications, Messenger
  readonly journeyPosts = signal<JourneyPost[]>(this.loadJourneyPosts());
  readonly companions = signal<Companion[]>(this.loadCompanions());
  /** userId -> ids that person follows. */
  readonly follows = signal<Record<string, number[]>>(this.loadFollows());
  readonly circles = signal<Circle[]>(this.loadCircles());
  /** circleId -> ISO time the signed-in member last read that Circle chat. */
  readonly circleReads = signal<Record<string, string>>(this.loadCircleReads());
  readonly devices = signal<LoginDevice[]>(this.loadDevices());
  private currentDeviceRegistrationKey: string | null = null;
  private currentDeviceRegistrationInFlight: { key: string; promise: Promise<void> } | null = null;
  /** Circle the header search asked the profile page to open as a group chat. */
  readonly pendingCircleChatId = signal<number | null>(null);
  readonly circleActionError = signal<string | null>(null);
  readonly notifications = signal<NotificationItem[]>(this.loadNotifications());
  /** Dummy (and later real) conversations that still have unread messages. */
  readonly pendingChats = signal<PendingChat[]>(this.loadPendingChats());
  readonly activeChatBoxes = signal<ActiveChatBox[]>([]);
  readonly blockedUserIds = signal<number[]>(this.loadBlockedUsers());
  readonly abuseReports = signal<AbuseReport[]>(this.loadAbuseReports());
  readonly hiddenPostIds = signal<number[]>(this.loadHiddenPostIds());
  /** Follower/following counters as the Web API last answered for the signed-in member. */
  readonly followCounts = signal<ApiFollowCountsDto | null>(null);
  /** Followers of the signed-in member as the Web API last answered. */
  private readonly apiFollowers = signal<ApiFollowDto[]>([]);
  /** Members the signed-in member follows as the Web API last answered. */
  private readonly apiFollowing = signal<ApiFollowDto[]>([]);
  /** When the signed-in member's community data was last read from the Web API. */
  readonly communityLoadedAt = signal<string | null>(null);

  /**
   * True once `countries()` holds the Web API's own list rather than the generated seed list.
   * The ids in that list are the ones the API validates registrations against, so they must
   * not be replaced by the seed ids while the session lasts.
   */
  private countriesAreFromApi = false;
  readonly countries = signal<Country[]>(
    SEED_COUNTRIES.map((c) => ({
      id: c.id,
      isoCode2: c.isoCode2,
      name: c.name,
      phoneCode: c.phoneCode,
    })),
  );
  readonly professions = signal<string[]>(SEED_PROFESSIONS);
  readonly genders = signal<string[]>(SEED_GENDERS);

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());

  /** True while a visitor explores the whole Community default profile without an account. */
  readonly guestBrowsing = signal(false);

  /** Google Identity Services script loader (see loadGoogleGis). */
  private gisScriptPromise: Promise<boolean> | null = null;
  /** Resolver for the official fallback Google button's identity. */
  private googleManualIdentityResolve: ((identity: GoogleIdentity | null) => void) | null = null;
  /** Facebook JavaScript SDK loader (see loadFacebookSdk). */
  private fbsdkScriptPromise: Promise<boolean> | null = null;
  readonly isPending = computed(() => this.currentUser()?.status === 'Pending');

  // Filtered views ensuring blocked users cannot see or be seen by each other
  /** Accounts disabled from the Admin Console (the signed-in member is never hidden from themself). */
  private readonly adminDisabledIds = computed(() => {
    const selfId = this.currentUser()?.id;
    return new Set(this.moderation.disabledUserIds().filter((id) => id !== selfId));
  });

  readonly visibleCompanions = computed(() => {
    const disabled = this.adminDisabledIds();
    return this.companions().filter((c) => !this.blockedUserIds().includes(c.id) && !disabled.has(Number(c.id)));
  });

  readonly contentGuardMessage = signal<string | null>(null);
  readonly storageBlockMessage = signal<string | null>(null);

  readonly visibleJourneyPosts = computed(() => {
    const disabled = this.adminDisabledIds();
    const viewerId = this.currentUser()?.id ?? 1;
    return this.journeyPosts()
      .filter((p) => !this.blockedUserIds().includes(p.author.id))
      .filter((p) => !disabled.has(Number(p.author.id)))
      .filter((p) => !this.hiddenPostIds().includes(p.id))
      .filter((p) => this.canViewJourneyPost(p, viewerId));
  });

  readonly storageReport = computed(() => this.measureStorage());

  readonly visibleNotifications = computed(() =>
    this.notifications().filter((n) => !this.blockedUserIds().includes(n.fromUser.id)),
  );

  readonly unreadNotificationCount = computed(
    () => this.visibleNotifications().filter((n) => !n.isRead).length,
  );

  /**
   * Pending chats for the header badge: unread inbox threads, plus any open box
   * that still has unread messages and is not already counted from the inbox.
   */
  readonly unreadChatCount = computed(() => {
    const boxes = this.activeChatBoxes();
    const openIds = new Set(boxes.map((b) => b.companionId));
    const fromBoxes = boxes.filter((b) => (b.unreadCount ?? 0) > 0).length;
    const fromInbox = this.pendingChats().filter((c) => (c.unreadCount ?? 0) > 0 && !openIds.has(c.companionId)).length;
    return fromBoxes + fromInbox;
  });

  // Keep the root CommunityBadgeService (read by the always-mounted site navbar) in
  // step with the live unread counts — so the navbar never has to import this service.
  private readonly badgeBridge = inject(CommunityBadgeService);
  private readonly badgeSync = effect(() => {
    this.badgeBridge.sync(this.unreadNotificationCount(), this.unreadChatCount());
  });

  /** Circles the signed-in member belongs to (admin or member). */
  readonly myCircles = computed(() => {
    const me = this.currentUser()?.id ?? this.profile()?.id ?? 1;
    return this.circles().filter((c) => !c.archivedAtUtc && isCircleParticipant(c, me));
  });

  /** Deleted circles are retained locally so members can review their history. */
  readonly archivedCircles = computed(() => {
    const me = this.currentUser()?.id ?? this.profile()?.id ?? 1;
    return this.circles().filter((c) => !!c.archivedAtUtc && isCircleParticipant(c, me));
  });

  readonly adminCircleCount = computed(() => this.countAdminCircles(this.currentUser()?.id ?? this.profile()?.id ?? 1));
  readonly memberOnlyCircleCount = computed(() => this.countMemberOnlyCircles(this.currentUser()?.id ?? this.profile()?.id ?? 1));

  readonly onlineCompanions = computed(() =>
    this.visibleCompanions().filter((c) => c.status === 'connected' && c.isOnline),
  );

  readonly offlineCompanions = computed(() =>
    this.visibleCompanions().filter((c) => c.status === 'connected' && !c.isOnline),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopLiveUpdates());
    const existingCookieToken = getCookie(TOKEN_KEY);
    if (existingCookieToken && !isDemoSessionToken(existingCookieToken)) {
      // A real member session always supersedes guest browsing: the seeded demo community
      // is dropped before anything is read, and the member's own profile is restored from
      // their saved session or reloaded from the Web API — never from the demo seed.
      this.startMemberSession(existingCookieToken);
      return;
    }
    if (existingCookieToken) {
      // A cookie left by an older build's preview toggle (`DEMO_SESSION_TOKEN`) is not an
      // account session: it is dropped, and the visitor is treated like anybody else.
      deleteCookie(TOKEN_KEY);
    }
    // No account session: nothing is seeded. The visitor gets the whole “Explore as Guest”
    // tour only after choosing it on /community (or coming back to it).
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    if (typeof localStorage !== 'undefined' && localStorage.getItem(GUEST_KEY) === '1') {
      this.exploreAsGuest();
    }
  }

  // ---------------------------------------------------------------------------
  // Session / OAuth
  // ---------------------------------------------------------------------------

  /**
   * “Explore as Guest” — opens the whole Community default profile (the founder's
   * seeded member: journey, gallery, companions, circles, message book) without
   * creating an account session: no auth cookie or token is set, so
   * `isAuthenticated()` stays false and signing in remains possible at any time.
   *
   * This is the **only** member-facing entry into the seeded demo community (the Admin
   * Console opens it for its own preview pages): signing in with Google or Facebook always
   * starts a real session and clears the demo datasets.
   */
  exploreAsGuest(): void {
    this.demoSession = true;
    this.initDefaultMember({ asGuest: true });
    this.reloadCommunityData();
    this.guestBrowsing.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GUEST_KEY, '1');
      localStorage.setItem(DEMO_COMMUNITY_KEY, '1');
    }
  }

  /** Guest browsing ends the moment a real account session starts or the visitor logs out. */
  private exitGuestBrowsing(): void {
    this.guestBrowsing.set(false);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_KEY);
  }

  /**
   * Opens the seeded community for the **Admin Console**.
   *
   * The console is a site-owner preview of the community: it manages the seeded members,
   * posts, circles and notifications because `neverbeen-api` has no admin endpoints yet, so
   * it is the one surface besides “Explore as Guest” that reads that data. It never signs
   * anybody in and never puts a real member session aside — `AdminInsightsService` calls
   * this when an admin page is opened.
   */
  openAdminConsolePreview(): void {
    const token = this.token();
    // A real member is signed in: their own (Web-API backed) data is what the console
    // shows, exactly as it would for any other page.
    if (token && !isDemoSessionToken(token)) return;
    if (this.demoSession) return;
    this.demoSession = true;
    this.reloadCommunityData();
  }

  /**
   * Enters a real (Web-API backed) member session in this page: guest browsing ends and
   * every demo dataset — the seeded founder profile, demo companions, circles, journey
   * feed, chats and notifications — is dropped from the page and from this browser.
   */
  private enterMemberSession(): void {
    this.exitGuestBrowsing();
    this.demoSession = false;
    this.currentDeviceRegistrationKey = null;
    this.dropStoredDemoCommunity();
    this.resetSessionCommunityData();
    // Device history is account-scoped on the API. Do not carry another member's
    // cached rows into this session; the API hydrates the correct account's history.
    this.devices.set([]);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(DEVICES_KEY);
  }

  /**
   * Restores the signed-in member when the page is opened with an auth cookie: the demo
   * datasets are cleared, the saved session (when it belongs to a real member) is used and
   * the profile is otherwise reloaded from `GET /api/profile/me`.
   */
  private startMemberSession(token: string): void {
    this.enterMemberSession();
    this.token.set(token);

    const storedUser = this.loadJson<CurrentUser>(USER_KEY);
    const storedProfile = this.loadJson<Profile>(PROFILE_KEY);
    // A profile left behind by the demo tour (or by an older build that seeded the
    // founder profile for everybody) is never shown to a signed-in member.
    const usableProfile = isSeedProfile(storedProfile) ? null : storedProfile;
    const usableUser = isSeedProfile(storedUser) ? null : storedUser;

    this.currentUser.set(usableUser ?? (usableProfile ? this.currentUserFromProfile(usableProfile) : null));
    this.profile.set(usableProfile);
    if (usableProfile) {
      this.saveJson(PROFILE_KEY, usableProfile);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROFILE_KEY);
    }
    // No local record of this member: the database is the only source of their profile.
    if (!usableProfile) {
      void this.refreshProfileFromApi().then((loaded) => {
        if (loaded) void this.ensureCommunityLoaded(true);
      });
    }
    // The member's own community data (companions, circles, journey feed, message book,
    // chats, notifications, gallery, follows, devices, moderation state) is read from
    // the Web API — never from a demo seed left in this browser.
    if (usableProfile || usableUser) {
      void this.ensureCommunityLoaded(true);
    }
  }

  /** `CurrentUser` view of a stored profile (used when only the profile survived). */
  private currentUserFromProfile(p: Profile): CurrentUser {
    return {
      id: p.id,
      uniqueId: p.uniqueId || generate20DigitUid(p.id),
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: p.fullName,
      email: p.email,
      status: p.status ?? 'Active',
      profileComplete: true,
      profilePhotoUrl: p.profilePhotoUrl,
      coverPhotoUrl: p.coverPhotoUrl,
      activeStatus: p.activeStatus,
      customStatusText: p.customStatusText,
      isProfileLocked: p.isProfileLocked,
      isVerified: p.isVerified,
      verifiedEmail: p.verifiedEmail,
      verificationType: p.verificationType,
    };
  }

  /**
   * (Re)reads every community dataset for the current session. The loaders decide what
   * that is: the seeded guest-tour data while `demoSession` is set, and otherwise only
   * what this browser holds for the signed-in member (usually nothing — the Web API is
   * the source of truth for a real member).
   */
  private reloadCommunityData(): void {
    this.comments.set(this.loadComments());
    this.journeyPosts.set(this.loadJourneyPosts());
    this.companions.set(this.loadCompanions());
    this.follows.set(this.loadFollows());
    this.circles.set(this.loadCircles());
    this.circleReads.set(this.loadCircleReads());
    this.devices.set(this.loadDevices());
    this.notifications.set(this.loadNotifications());
    this.pendingChats.set(this.loadPendingChats());
    this.blockedUserIds.set(this.loadBlockedUsers());
    this.abuseReports.set(this.loadAbuseReports());
    this.hiddenPostIds.set(this.loadHiddenPostIds());
  }

  /**
   * Re-reads every community dataset for the session that is now open and drops the
   * transient chat state of the previous one. With `demoSession` cleared the seed loaders
   * return nothing but what this browser holds for the signed-in member, so nothing that
   * came from the guest tour can survive a sign-in — or a sign-out.
   */
  private resetSessionCommunityData(): void {
    this.reloadCommunityData();
    this.activeChatBoxes.set([]);
    this.circleActionError.set(null);
    this.pendingCircleChatId.set(null);
    // The cached profiles of visited members belong to the previous session.
    this.visitorWallPosts.set({});
    this.visitorGalleries.set({});
    this.visitorFollowCounts.set({});
  }

  /** Removes the demo community from this browser once a real member is signed in. */
  private dropStoredDemoCommunity(): void {
    if (typeof localStorage === 'undefined') return;
    if (!CommunityService.demoCommunityStored()) return;
    for (const key of DEMO_COMMUNITY_STORAGE_KEYS) localStorage.removeItem(key);
  }

  /** True when this browser still holds the seeded guest/demo community datasets. */
  private static demoCommunityStored(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return (
      localStorage.getItem(DEMO_COMMUNITY_KEY) === '1' ||
      localStorage.getItem(CIRCLES_SEED_VERSION_KEY) === CIRCLES_SEED_VERSION ||
      localStorage.getItem(FOLLOWS_SEED_VERSION_KEY) === FOLLOWS_SEED_VERSION ||
      localStorage.getItem(PENDING_CHATS_SEED_VERSION_KEY) === PENDING_CHATS_SEED_VERSION
    );
  }

  // ---------------------------------------------------------------------------
  // NeverBeen Web API (neverbeen-api — ASP.NET Core + PostgreSQL / Supabase)
  //
  // Every community call that must reach the database goes through these helpers:
  //   POST /api/auth/oauth/login   exchange the OAuth code for a JWT
  //   POST /api/registration       store a new member's profile (new member sign-up)
  //   GET  /api/profile/me         reload the signed-in member's profile
  //   GET  /api/lookup/...         countries, cities, professions, genders
  //   GET  /health                 is the API (and its database) reachable?
  //
  // When the API cannot be reached the pages keep working against the seeded demo
  // data in this browser, and the UI says so — nothing is silently "saved".
  // ---------------------------------------------------------------------------

  /** Absolute URL for an API path, e.g. `/api/registration`. */
  private apiEndpoint(path: string): string {
    return `${this.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** `Authorization: Bearer <jwt>` for the endpoints that require a signed-in member. */
  private authHeaders(): HttpHeaders {
    const token = this.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Turns an API-relative photo URL (`/api/profile/7/photo`) into one the browser can load. */
  private absoluteApiUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    return url.startsWith('/') ? `${this.apiUrl}${url}` : url;
  }

  /** Case- and diacritic-insensitive key used to match city/country names between datasets. */
  private static nameKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Checks `GET /health` on the Web API and remembers the answer, so every API-backed
   * feature can fall back to the browser-only demo data when the API is unreachable.
   *
   * Only the `connect` page uses this to pick an OAuth flow — account creation posts
   * straight to `/api/registration` (see `createNeverbeenAccount`), so a health-probe
   * hiccup can never block a sign-up from reaching the database.
   */
  async checkApiOnline(force = false): Promise<boolean> {
    if (!this.http) {
      this.apiOnline.set(false);
      this.apiProbeDetail.set('This browser build has no HTTP client configured.');
      return false;
    }
    if (!force && this.apiOnline() !== null) return this.apiOnline()!;

    const url = this.apiEndpoint('/health');
    try {
      const body = await firstValueFrom(withApiTimeout(this.http.get(url, { responseType: 'text' }), url));
      // The NeverBeen API answers its health check with "Healthy" / "Unhealthy".
      // Anything else (an HTML page from a static host or an SPA fallback) means the
      // configured address is not the API.
      if (/healthy|unhealthy|degraded/i.test(body ?? '')) {
        this.apiOnline.set(true);
        this.apiProbeDetail.set(null);
      } else {
        this.apiOnline.set(false);
        this.apiProbeDetail.set(
          `${url} answered with something that is not the NeverBeen API. ` +
            'Check that apiBaseUrl in src/environments/environment*.ts points at the API (not at the website).',
        );
      }
    } catch (error) {
      this.apiOnline.set(false);
      this.apiProbeDetail.set(this.unreachableDetail(url, error));
    }
    return this.apiOnline()!;
  }

  /**
   * Explains why a request to the Web API failed, in terms the member (or the developer
   * looking at the browser console) can act on: a timeout, a wrong address, or the
   * API's CORS allow-list not covering this page's origin.
   */
  private unreachableDetail(url: string, error?: unknown): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'this page';
    const reason =
      error instanceof ApiTimeoutError
        ? `did not answer within ${Math.round(API_TIMEOUT_MS / 1000)} seconds`
        : 'could not be reached from this page';
    return (
      `The NeverBeen Web API (${url}) ${reason}. Check that the address opens in a browser tab, ` +
      `and that this site's origin (${origin}) is listed in the API's Cors:AllowedOrigins setting.`
    );
  }

  /** Logs the technical error behind an API failure for the browser console. */
  private logApiFailure(action: string, url: string, error: unknown): void {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;
    const status = error instanceof HttpErrorResponse ? `HTTP ${error.status}` : (error as Error)?.name;
    console.warn(`[neverbeen] ${action} failed at ${url} (${status ?? 'unknown error'})`, error);
  }

  /** Message from an API error body (`{ "error": "…" }`) or a helpful fallback. */
  private apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'string' && body.trim() && !body.trim().startsWith('<')) {
        const match = body.match(/"error"\s*:\s*"([^"]+)"/);
        return match ? match[1] : body.trim().slice(0, 300);
      }
      if (body && typeof body === 'object' && 'error' in body) {
        const message = (body as { error?: unknown }).error;
        if (typeof message === 'string' && message.trim()) return message;
      }
      if (error.status === 0) {
        return 'The NeverBeen Web API could not be reached. Check your connection and try again.';
      }
      if (error.status === 401) return 'Your sign-in session has expired. Please sign in again.';
      if (error.status === 409) return 'That email address is already registered to another member.';
      return `${fallback} (HTTP ${error.status})`;
    }
    return error instanceof Error && error.message ? error.message : fallback;
  }

  /** True when the failure means “the API is unreachable”, not “the API rejected this”. */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) return error.status === 0;
    if (error instanceof ApiTimeoutError || error instanceof RxjsTimeoutError) return true;
    return error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message));
  }

  // ---------------------------------------------------------------------------
  // COMMUNITY ↔ WEB API INTEGRATION (complete)
  //
  // For a signed-in member every community dataset is read from the NeverBeen Web
  // API and every change is written straight back to it (write-through). The
  // seeded guest tour keeps its localStorage demo data — `apiLive` is false
  // there — and an API that cannot be reached degrades to the same local
  // behaviour, never to silent data loss.
  //
  //   GET  /api/companions                    companions + relationship status
  //   POST/DELETE /api/companions/{id}/…      request / accept / reject / cancel / remove
  //   GET  /api/circles (+ members/admins/messages)   travel circles
  //   GET  /api/journey …                     journey feed, posts, comments, reactions
  //   GET  /api/messagebook …                 message book comments + reactions
  //   GET  /api/messages/conversations …      1:1 and circle chats
  //   GET  /api/notifications …               notifications + unread counts
  //   GET  /api/gallery(+/albums)             gallery photos and albums
  //   GET  /api/follows/…                     followers / following / counts
  //   GET  /api/devices …                     signed-in devices
  //   GET  /api/moderation/…                  blocks, hidden posts, abuse reports
  //   PUT  /api/profile · /api/profile/settings · /api/profile/photo · cover
  // ---------------------------------------------------------------------------

  /**
   * True while a **real member** is signed in with a Web API session: community
   * reads hydrate from the API and community writes are sent to it. False for
   * the guest/demo tour, for signed-out visitors and in tests without an
   * HttpClient.
   */
  get apiLive(): boolean {
    const token = this.token();
    return !!this.http && !!token && !this.demoSession && !isDemoSessionToken(token);
  }

  /** GET against the Web API with the member's Bearer token; null when it fails. */
  private async apiGet<T>(path: string): Promise<T | null> {
    const res = await this.apiGetWithStatus<T>(path);
    return res.data;
  }

  /** GET against the Web API returning both the parsed payload and HTTP status code. */
  private async apiGetWithStatus<T>(
    path: string,
    silent404 = false,
  ): Promise<{ data: T | null; status: number }> {
    if (!this.http || !this.apiLive) return { data: null, status: 0 };
    const url = this.apiEndpoint(path);
    try {
      const data = await firstValueFrom(
        withApiTimeout(this.http.get<T>(url, { headers: this.authHeaders() }), url),
      );
      this.apiOnline.set(true);
      return { data, status: 200 };
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (!(silent404 && status === 404)) {
        this.logApiFailure(`GET ${path}`, url, error);
      }
      return { data: null, status };
    }
  }

  /** POST / PUT / DELETE against the Web API; null when it fails. */
  private async apiSend<T>(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T | null> {
    if (!this.http || !this.apiLive) return null;
    const url = this.apiEndpoint(path);
    try {
      const data = await firstValueFrom(
        withApiTimeout(
          this.http.request<T>(method, url, {
            headers: this.authHeaders(),
            body: body === undefined ? null : body,
          }),
          url,
        ),
      );
      this.apiOnline.set(true);
      return data;
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      this.logApiFailure(`${method} ${path}`, url, error);
      return null;
    }
  }

  /** Fire-and-forget Web API write (the UI already applied its optimistic update). */
  private apiWrite(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): void {
    void this.apiSend<unknown>(method, path, body);
  }

  /** Like apiSend, but also says why a write failed (the API's own message when it gave one). */
  private async apiSendReporting<T>(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<{ data: T | null; error: string | null }> {
    if (!this.http || !this.apiLive) return { data: null, error: 'Sign in to save this.' };
    const url = this.apiEndpoint(path);
    try {
      const data = await firstValueFrom(
        withApiTimeout(
          this.http.request<T>(method, url, {
            headers: this.authHeaders(),
            body: body === undefined ? null : body,
          }),
          url,
        ),
      );
      this.apiOnline.set(true);
      return { data, error: null };
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      this.logApiFailure(`${method} ${path}`, url, error);
      return { data: null, error: this.apiErrorMessage(error, 'The change could not be saved') };
    }
  }

  /** Parses a structured About-me JSON payload the Web API stores as a string. */
  private static parseAboutMeDetails(json?: string | null): AboutMeDetails | undefined {
    if (!json) return undefined;
    try {
      const parsed = JSON.parse(json) as AboutMeDetails;
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  /** AuthorInfo from the API's AuthorDto (photo URLs may be API-relative). */
  private authorFromApi(dto?: {
    id?: number | null;
    uniqueId?: string | null;
    fullName?: string | null;
    profilePhotoUrl?: string | null;
    profession?: string | null;
    country?: string | null;
    city?: string | null;
    isVerified?: boolean | null;
  } | null): AuthorInfo {
    return {
      id: dto?.id ?? 0,
      uniqueId: dto?.uniqueId ?? undefined,
      fullName: dto?.fullName ?? '',
      profilePhotoUrl: this.absoluteApiUrl(dto?.profilePhotoUrl) ?? '',
      profession: dto?.profession ?? '',
      country: dto?.country ?? undefined,
      city: dto?.city ?? undefined,
      isVerified: !!dto?.isVerified,
    };
  }

  /** Companion from the API's CompanionDto. */
  private companionFromApi(dto: ApiCompanionDto): Companion {
    return {
      id: dto.id,
      uniqueId: dto.uniqueId ?? generate20DigitUid(dto.id),
      fullName: dto.fullName ?? '',
      profilePhotoUrl: this.absoluteApiUrl(dto.profilePhotoUrl) ?? '',
      coverPhotoUrl: this.absoluteApiUrl(dto.coverPhotoUrl) ?? undefined,
      country: dto.country ?? '',
      city: dto.city ?? '',
      profession: dto.profession ?? '',
      isOnline: !!dto.isOnline,
      mutualCompanionsCount: dto.mutualCompanionsCount ?? 0,
      status: (dto.status as Companion['status']) || 'none',
      bio: dto.bio ?? undefined,
      aboutMe: dto.aboutMe ?? undefined,
      aboutMeDetails: CommunityService.parseAboutMeDetails(dto.aboutMeDetailsJson),
      isProfileLocked: !!dto.isProfileLocked,
      activeStatus: (dto.activeStatus as UserActiveStatus) ?? 'Active',
      customStatusText: dto.customStatusText ?? undefined,
      isVerified: !!dto.isVerified,
      isFollowing: !!dto.isFollowing,
      connectedCompanionIds: dto.connectedCompanionIds ?? undefined,
    };
  }

  /** Companion card from one hit of the API's member-directory search. */
  private searchResultFromApi(dto: ApiUserSearchResultDto): Companion {
    return {
      id: dto.id,
      uniqueId: dto.uniqueId ?? generate20DigitUid(dto.id),
      fullName: dto.fullName ?? '',
      profilePhotoUrl: this.absoluteApiUrl(dto.profilePhotoUrl) ?? '',
      country: dto.country ?? '',
      city: dto.city ?? '',
      profession: dto.profession ?? '',
      isOnline: !!dto.isOnline,
      mutualCompanionsCount: dto.mutualCompanionsCount ?? 0,
      status: (dto.status as Companion['status']) || 'none',
      isProfileLocked: !!dto.isProfileLocked,
      activeStatus: (dto.activeStatus as UserActiveStatus) ?? 'Active',
      isVerified: !!dto.isVerified,
      isFollowing: !!dto.isFollowing,
    };
  }

  /** Circle from the API's CircleDto (chat history loads separately per circle). */
  private circleFromApi(dto: ApiCircleDto): Circle {
    return normalizeCircle({
      id: dto.id,
      name: dto.name ?? '',
      description: dto.description ?? '',
      icon: dto.icon || '🌟',
      color: dto.color || '#2563eb',
      photoUrl: this.absoluteApiUrl(dto.photoUrl) ?? undefined,
      memberIds: dto.memberIds ?? [],
      adminIds: dto.adminIds ?? [],
      ownerId: dto.ownerId,
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      archivedAtUtc: dto.archivedAtUtc ?? undefined,
      messages: [],
    });
  }

  /** Journey comment (with its nested replies) from the API's JourneyCommentDto. */
  private journeyCommentFromApi(dto: ApiJourneyCommentDto): JourneyComment {
    return {
      id: dto.id,
      postId: dto.postId ?? undefined,
      author: this.authorFromApi(dto.author),
      text: dto.text ?? '',
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      imageUrl: this.absoluteApiUrl(dto.imageUrl) ?? undefined,
      parentId: dto.parentId ?? null,
      likeCount: dto.likeCount ?? 0,
      isLiked: !!dto.isLiked,
      myReaction: (dto.myReaction as ReactionType | null) ?? null,
      reactions: (dto.reactions ?? []).map((r) => ({
        user: this.authorFromApi(r.user),
        type: (r.type as ReactionType) || 'Like',
        reactedAtUtc: r.reactedAtUtc ?? undefined,
      })),
      replies: (dto.replies ?? []).map((reply) => this.journeyCommentFromApi(reply)),
    };
  }

  /** Journey post (with comments) from the API's JourneyPostDto. */
  private journeyPostFromApi(dto: ApiJourneyPostDto): JourneyPost {
    const mappedComments = (dto.comments ?? []).map((c) => this.journeyCommentFromApi(c));
    return {
      id: dto.id,
      commentCount: dto.commentCount ?? mappedComments.length,
      author: this.authorFromApi(dto.author),
      text: dto.text ?? '',
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      imageUrl: this.absoluteApiUrl(dto.imageUrl ?? dto.imageUrls?.[0]) ?? undefined,
      imageUrls: (dto.imageUrls ?? []).map((url) => this.absoluteApiUrl(url) ?? url),
      likeCount: dto.likeCount ?? 0,
      isLiked: !!dto.isLiked,
      myReaction: (dto.myReaction as ReactionType | null) ?? null,
      reactions: (dto.reactions ?? []).map((r) => ({
        user: this.authorFromApi(r.user),
        type: (r.type as ReactionType) || 'Like',
        reactedAtUtc: r.reactedAtUtc ?? undefined,
      })),
      taggedCompanions: (dto.taggedCompanions ?? []).map((a) => this.authorFromApi(a)),
      comments: mappedComments,
      location: dto.location ?? undefined,
      mood: dto.mood ?? undefined,
      placeId: dto.placeId ?? undefined,
      shareCount: dto.sharesCount ?? dto.shareCount ?? 0,
      isShared: !!dto.isShared,
      sharedText: dto.sharedText ?? undefined,
      originalPost: dto.originalPost ? this.journeyPostFromApi(dto.originalPost) : undefined,
      audience: dto.audience
        ? {
            mode: (dto.audience.mode as PostAudience['mode']) || 'public',
            allowIds: dto.audience.allowIds ?? undefined,
            denyIds: dto.audience.denyIds ?? undefined,
          }
        : undefined,
      hashtags: dto.hashtags ?? undefined,
      wallOwnerId: dto.wallOwnerId ?? undefined,
      wallOwnerName: dto.wallOwnerName ?? undefined,
      editedAtUtc: dto.editedAtUtc ?? undefined,
    };
  }

  /** Message-book comment (with replies) from the API's CommentDto. */
  private bookCommentFromApi(dto: ApiBookCommentDto): CommunityComment {
    return {
      id: dto.id,
      text: dto.text ?? '',
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      likeCount: dto.likeCount ?? 0,
      dislikeCount: dto.dislikeCount ?? 0,
      author: this.authorFromApi(dto.author),
      imageUrl: this.absoluteApiUrl(dto.imageUrl) ?? undefined,
      myReaction: (dto.myReaction as ReactionType | null) ?? null,
      replyCount: dto.replyCount ?? dto.replies?.length ?? 0,
      parentId: null,
      replies: (dto.replies ?? []).map((reply) => ({
        ...this.bookCommentFromApi(reply),
        parentId: dto.id,
      })),
    };
  }

  /** Chat message from the API's ChatMessageDto. */
  private chatMessageFromApi(dto: ApiChatMessageDto): ChatMessage {
    return {
      id: dto.id,
      senderId: dto.senderId ?? 0,
      receiverId: dto.receiverId ?? 0,
      text: dto.text ?? '',
      sentAtUtc: dto.sentAtUtc || new Date().toISOString(),
      reactions: dto.reactions ?? undefined,
      myReaction: dto.myReaction ?? undefined,
      replyTo: dto.replyTo
        ? {
            id: dto.replyTo.id,
            senderName: dto.replyTo.senderName ?? '',
            text: dto.replyTo.text ?? '',
          }
        : undefined,
    };
  }

  /** Notification from the API's NotificationDto. */
  private notificationFromApi(dto: ApiNotificationDto): NotificationItem {
    return {
      id: dto.id,
      type: (dto.type as NotificationItem['type']) || 'companionship_request',
      fromUser: this.authorFromApi(dto.fromUser),
      message: dto.message ?? '',
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      isRead: !!dto.isRead,
      requestId: dto.requestId ?? undefined,
      status: (dto.status as NotificationItem['status']) ?? undefined,
    };
  }

  /** Applies the API's SettingsDto answers onto the signed-in member's profile. */
  private applyApiSettings(settings: Partial<UserSettings>): void {
    this.profile.update((p) =>
      p
        ? { ...p, settings: CommunityService.defaultSettings({ ...p.settings, ...settings }) }
        : p,
    );
    this.saveJson(PROFILE_KEY, this.profile());
  }

  /**
   * (Re)reads every community dataset of the signed-in member from the Web API and
   * puts the answers into the signals the pages already render. One failure never
   * blocks the others: each fetch degrades to “keep what this browser has”.
   */
  async refreshCommunityFromApi(): Promise<void> {
    if (!this.http || !this.apiLive) return;
    const me = this.currentUser()?.id ?? this.profile()?.id;
    if (!me) return;
    // The API already has POST /api/devices and the LoginDevices table; this
    // registration write was missing, leaving signed-in Settings with an empty list.
    await this.registerCurrentDevice();
    this.startLiveUpdates();

    const [companions, followsCounts, followers, following, circles, journey, book, conversations, notifications, gallery, albums, devices, blocks, hidden, reports] =
      await Promise.all([
        this.apiGet<ApiCompanionDto[]>('/api/companions'),
        me ? this.apiGet<ApiFollowCountsDto>(`/api/follows/counts/${me}`) : Promise.resolve(null),
        this.apiGet<ApiFollowDto[]>('/api/follows/followers'),
        this.apiGet<ApiFollowDto[]>('/api/follows/following'),
        this.apiGet<ApiCircleDto[]>('/api/circles'),
        this.apiGet<PagedResult<ApiJourneyPostDto>>('/api/journey?pageSize=50'),
        this.apiGet<PagedResult<ApiBookCommentDto>>('/api/messagebook?pageSize=50&includeReplies=true'),
        this.apiGet<ApiConversationDto[]>('/api/messages/conversations'),
        this.apiGet<ApiNotificationDto[]>('/api/notifications'),
        this.apiGet<ApiGalleryPhotoDto[]>('/api/gallery'),
        this.apiGet<ApiGalleryAlbumDto[]>('/api/gallery/albums'),
        this.apiGet<ApiDeviceDto[]>('/api/devices'),
        this.apiGet<ApiBlockedUserDto[]>('/api/moderation/blocks'),
        this.apiGet<number[]>('/api/moderation/hidden-posts'),
        this.apiGet<ApiAbuseReportDto[]>('/api/moderation/reports'),
      ]);

    // Companions — the real directory of this member's relationships.
    if (companions) {
      this.companions.set(companions.map((dto) => this.companionFromApi(dto)));
      this.saveJson(COMPANIONS_KEY, this.companions());
      // Each companion also answers whether this member follows them.
      this.applyApiFollowFlags(this.companions());
    }

    // Followers / following — the API's own graph (see follows section below).
    if (following || followers) {
      this.apiFollowers.set(followers ?? []);
      this.apiFollowing.set(following ?? []);
      const graph: Record<string, number[]> = { ...this.follows() };
      if (following) {
        // The companions answer also says who this member follows (isFollowing);
        // union it in so a companion never drops out of the following list.
        const followedCompanions = (companions ?? [])
          .filter((c) => c.isFollowing)
          .map((c) => c.id);
        graph[String(me)] = Array.from(
          new Set([...following.map((f) => f.id), ...followedCompanions]),
        ).filter((id) => id !== me);
      }
      if (followers) {
        for (const follower of followers) {
          if (follower.id === me) continue;
          const key = String(follower.id);
          graph[key] = Array.from(new Set([...(graph[key] ?? []), me]));
        }
      }
      // Drop stale entries the API no longer knows about (e.g. an unfollow from
      // another browser): entries that mention me but are not in either list.
      const validIds = new Set<number>([
        ...(following ?? []).map((f) => f.id),
        ...(followers ?? []).map((f) => f.id),
        me,
      ]);
      for (const key of Object.keys(graph)) {
        if (Number(key) === me) continue;
        if (!validIds.has(Number(key))) delete graph[key];
      }
      this.follows.set(graph);
      this.persistFollows();
    }
    if (followsCounts) this.followCounts.set(followsCounts);

    // Circles — including archived ones (the Archived tab filters by archivedAtUtc).
    if (circles) {
      this.circles.set(circles.map((dto) => this.circleFromApi(dto)));
      this.saveJson(CIRCLES_KEY, this.circles());
    }

    // Journey feed.
    // GET /api/journey omits the comment list for performance (commentCount > 0 while
    // comments is []). Preserve any already-hydrated comments for each post and fetch
    // the full comment thread from GET /api/journey/{id}/comments when needed.
    if (journey) {
      const existingById = new Map(this.journeyPosts().map((p) => [p.id, p]));
      const postsToHydrateComments: number[] = [];
      const mapped = journey.items.map((dto) => {
        const post = this.journeyPostFromApi(dto);
        const prev = existingById.get(post.id);
        if (post.comments.length === 0 && prev && prev.comments.length > 0) {
          post.comments = prev.comments;
        }
        if ((dto.commentCount ?? 0) > 0 && (!dto.comments || dto.comments.length === 0)) {
          postsToHydrateComments.push(post.id);
        }
        return post;
      });
      this.journeyPosts.set(mapped);
      this.saveJson(JOURNEY_KEY, this.journeyPosts());
      for (const postId of postsToHydrateComments) {
        void this.loadJourneyComments(postId);
      }
    }

    // Harvest authors/users seen across follows, journey posts, message book, chats and
    // notifications so known community members are immediately searchable locally.
    this.harvestKnownAuthorsFromApi({
      me,
      followers,
      following,
      journey: journey?.items ?? null,
      book: book?.items ?? null,
      conversations,
      notifications,
    });

    // Message book.
    if (book) {
      this.comments.set(book.items.map((dto) => this.bookCommentFromApi(dto)));
      this.saveJson(COMMENTS_KEY, this.comments());
    }

    // Chats (conversation inbox; boxes hydrate when they are opened).
    if (conversations) this.pendingChats.set(this.pendingChatsFromApi(conversations));

    // Notifications.
    if (notifications) {
      this.notifications.set(notifications.map((dto) => this.notificationFromApi(dto)));
      this.saveJson(NOTIFS_KEY, this.notifications());
    }

    // Gallery (own photos + albums; stored on the profile like the settings).
    if (gallery || albums) {
      this.profile.update((p) =>
        p
          ? {
              ...p,
              gallery: gallery
                ? gallery.map((photo) => this.galleryPhotoFromApi(photo))
                : p.gallery,
              galleryAlbums: albums
                ? albums.map((album) => this.galleryAlbumFromApi(album))
                : p.galleryAlbums,
            }
          : p,
      );
      this.saveJson(PROFILE_KEY, this.profile());
    }

    // Devices, moderation state. The current-browser identity is local to this account;
    // do not trust stale IsCurrent flags left by a sign-in from another browser.
    if (devices) {
      const currentDeviceId = this.currentDeviceId();
      const mappedDevices = devices.map((dto) => ({
        ...this.deviceFromApi(dto),
        isCurrent: dto.id === currentDeviceId,
      }));
      if (!mappedDevices.some((device) => device.id === currentDeviceId)) {
        mappedDevices.unshift(this.detectCurrentDevice(currentDeviceId));
      }
      this.devices.set(mappedDevices);
      this.saveJson(DEVICES_KEY, this.devices());
    }
    if (blocks) {
      this.blockedUserIds.set(blocks.map((b) => b.id));
      this.saveJson(BLOCKED_USERS_KEY, this.blockedUserIds());
    }
    if (hidden) {
      this.hiddenPostIds.set(hidden);
      this.saveJson(HIDDEN_POSTS_KEY, hidden);
    }
    if (reports) {
      this.abuseReports.set(reports.map((dto) => this.abuseReportFromApi(dto)));
      this.saveJson(ABUSE_REPORTS_KEY, this.abuseReports());
    }

    this.communityLoadedAt.set(new Date().toISOString());
  }

  /** In-flight hydration (so parallel callers share one fan-out). */
  private communityHydration: Promise<void> | null = null;

  /**
   * Loads the signed-in member's community data from the Web API once per session;
   * `force` re-reads everything (used after sign-in and by the refresh affordances).
   */
  async ensureCommunityLoaded(force = false): Promise<void> {
    if (!this.apiLive) return;
    if (this.communityHydration && !force) return this.communityHydration;
    this.communityHydration = this.refreshCommunityFromApi().finally(() => {
      this.communityHydration = null;
    });
    return this.communityHydration;
  }

  /** Conversation inbox from the API's conversation list. */
  private pendingChatsFromApi(conversations: ApiConversationDto[]): PendingChat[] {
    const me = this.myId();
    return conversations
      .filter((c) => !c.circleId)
      .map((c) => {
        const partner = c.participants?.find((p) => p.id !== me) ?? c.participants?.[0];
        return {
          companionId: partner?.id ?? 0,
          fullName: partner?.fullName ?? 'NeverBeen Traveler',
          profilePhotoUrl: this.absoluteApiUrl(partner?.profilePhotoUrl) ?? '',
          profession: partner?.profession ?? '',
          city: partner?.city ?? '',
          country: partner?.country ?? '',
          preview: c.lastMessage?.text ?? '',
          unreadCount: c.unreadCount ?? 0,
          sentAtUtc: c.lastMessage?.sentAtUtc ?? c.createdAtUtc ?? new Date().toISOString(),
        };
      })
      .filter((chat) => !!chat.companionId);
  }

  private galleryPhotoFromApi(dto: ApiGalleryPhotoDto): GalleryPhoto {
    return {
      id: dto.id,
      url: this.absoluteApiUrl(dto.url) ?? dto.url ?? '',
      caption: dto.caption ?? undefined,
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
    };
  }

  private galleryAlbumFromApi(dto: ApiGalleryAlbumDto): GalleryAlbum {
    return {
      id: dto.id,
      name: dto.name ?? 'Album',
      photos: (dto.photos ?? []).map((photo) => this.galleryPhotoFromApi(photo)),
      coverPhotoId: dto.coverPhotoId ?? undefined,
      privacy: (dto.privacy as GalleryAlbum['privacy']) ?? 'public',
      updatedAtUtc: dto.updatedAtUtc || new Date().toISOString(),
    };
  }

  private deviceFromApi(dto: ApiDeviceDto): LoginDevice {
    return {
      id: dto.id,
      name: dto.name ?? 'Device',
      type: (dto.type as LoginDevice['type']) || 'Desktop',
      os: dto.os ?? '',
      browser: dto.browser ?? '',
      ipAddress: dto.ipAddress ?? '',
      macAddress: dto.macAddress ?? '',
      location: dto.location ?? '',
      lastSeenUtc: dto.lastSeenUtc || new Date().toISOString(),
      isCurrent: !!dto.isCurrent,
      isActive: dto.isActive ?? true,
      blocked: !!dto.blocked,
    };
  }

  private abuseReportFromApi(dto: ApiAbuseReportDto): AbuseReport {
    return {
      id: dto.id,
      targetType: (dto.targetType as AbuseReport['targetType']) || 'post',
      targetId: dto.targetId ?? 0,
      reportedAuthor: this.authorFromApi(dto.reportedAuthor),
      reportedByUserId: dto.reportedByUserId ?? 0,
      reason: dto.reason ?? '',
      details: dto.details ?? '',
      reporterEmail: dto.reporterEmail ?? undefined,
      createdAtUtc: dto.createdAtUtc || new Date().toISOString(),
      status: (dto.status as AbuseReport['status']) || 'pending',
    };
  }

  /** The map of default community settings used when the API did not send any. */
  private static defaultSettings(overrides?: Partial<UserSettings>): UserSettings {
    return {
      emailNotificationsEnabled: true,
      phoneNotificationsEnabled: false,
      publicProfileEnabled: true,
      theme: 'light',
      timezone: 'UTC',
      ...overrides,
    };
  }

  /** Maps a Web API `ProfileDto` onto the app's `Profile` shape. */
  private profileFromApi(dto: ApiProfileDto, fallback?: Partial<Profile>): Profile {
    const words = (dto.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const theme = dto.settings?.theme;
    return {
      ...(fallback ?? {}),
      id: dto.id,
      uniqueId: fallback?.uniqueId || generate20DigitUid(dto.id),
      // The stored FirstName / LastName columns win; splitting the full name is only the
      // fallback for an API build that does not answer them yet.
      firstName: dto.firstName?.trim() || words[0] || fallback?.firstName,
      lastName: dto.lastName?.trim() || words.slice(1).join(' ') || fallback?.lastName,
      fullName: dto.fullName ?? fallback?.fullName ?? '',
      email: dto.email ?? fallback?.email ?? '',
      gender: dto.gender ?? fallback?.gender,
      dateOfBirth: dto.dateOfBirth ? String(dto.dateOfBirth).slice(0, 10) : fallback?.dateOfBirth,
      age: dto.age ?? fallback?.age,
      countryId: dto.countryId ?? fallback?.countryId,
      countryName: dto.countryName ?? fallback?.countryName,
      country: dto.countryName ?? fallback?.country,
      cityId: dto.cityId ?? fallback?.cityId,
      cityName: dto.cityName ?? fallback?.cityName,
      city: dto.cityName ?? fallback?.city,
      // State / province — its own column on the member row.
      state: dto.state?.trim() || fallback?.state,
      pincode: dto.pincode ?? fallback?.pincode,
      contactNumber: dto.contactNumber ?? fallback?.contactNumber,
      postalAddress: dto.postalAddress ?? fallback?.postalAddress,
      aboutMe: dto.aboutMe ?? fallback?.aboutMe,
      profession: dto.profession ?? fallback?.profession ?? 'Traveler',
      status: dto.status || 'Active',
      profilePhotoUrl: this.absoluteApiUrl(dto.profilePhotoUrl) ?? fallback?.profilePhotoUrl,
      coverPhotoUrl: this.absoluteApiUrl(dto.coverPhotoUrl) ?? fallback?.coverPhotoUrl,
      externalProfilePictureUrl:
        dto.externalProfilePictureUrl ?? fallback?.externalProfilePictureUrl,
      createdAtUtc: dto.createdAtUtc || fallback?.createdAtUtc || new Date().toISOString(),
      settings: CommunityService.defaultSettings({
        ...(fallback?.settings ?? {}),
        ...(dto.settings ?? {}),
        theme:
          theme === 'dark' || theme === 'system' || theme === 'light'
            ? theme
            : (fallback?.settings?.theme ?? 'light'),
      }),
      gallery: dto.gallery ?? fallback?.gallery ?? [],
      commentCount: dto.commentCount ?? fallback?.commentCount ?? 0,
      activeStatus: (dto.activeStatus as UserActiveStatus) ?? fallback?.activeStatus,
      customStatusText: dto.customStatusText ?? fallback?.customStatusText,
      isProfileLocked: dto.settings?.isProfileLocked ?? fallback?.isProfileLocked,
      aboutMeDetails:
        CommunityService.parseAboutMeDetails(dto.aboutMeDetailsJson) ?? fallback?.aboutMeDetails,
      isVerified: dto.settings?.isVerified ?? fallback?.isVerified,
      verifiedEmail: dto.settings?.verificationEmail ?? fallback?.verifiedEmail,
      verificationType: (dto.settings?.verificationType as Profile['verificationType']) ?? fallback?.verificationType,
    };
  }

  /** Countries from the Web API, falling back to the generated seed list. */
  async loadCountries(): Promise<Country[]> {
    if (this.http) {
      try {
        const url = this.apiEndpoint('/api/lookup/countries');
        const countries = await firstValueFrom(withApiTimeout(this.http.get<Country[]>(url), url));
        if (countries?.length) {
          this.apiOnline.set(true);
          this.countriesAreFromApi = true;
          this.countries.set(
            countries.map((c) => ({
              id: c.id,
              isoCode2: c.isoCode2,
              name: c.name,
              phoneCode: c.phoneCode,
            })),
          );
        }
      } catch {
        /* keep the generated seed list */
      }
    }
    return this.countries();
  }

  /** Profession options from the Web API, falling back to the generated seed list. */
  async loadProfessions(): Promise<string[]> {
    if (this.http) {
      try {
        const url = this.apiEndpoint('/api/lookup/professions');
        const professions = await firstValueFrom(withApiTimeout(this.http.get<string[]>(url), url));
        if (professions?.length) {
          this.apiOnline.set(true);
          this.professions.set(professions);
        }
      } catch {
        /* keep the generated seed list */
      }
    }
    return this.professions();
  }

  /** Gender options from the Web API, falling back to the generated seed list. */
  async loadGenders(): Promise<string[]> {
    if (this.http) {
      try {
        const url = this.apiEndpoint('/api/lookup/genders');
        const genders = await firstValueFrom(withApiTimeout(this.http.get<string[]>(url), url));
        if (genders?.length) {
          this.apiOnline.set(true);
          this.genders.set(genders);
        }
      } catch {
        /* keep the generated seed list */
      }
    }
    return this.genders();
  }

  /**
   * Cities the Web API stores for a country, or `null` when the API could not be asked
   * (unreachable, timed out, or no HTTP client in this build).
   *
   * This list is the **only** authority on the ids the API accepts: `POST /api/registration`
   * and `PUT /api/profile` look the city row up and answer
   * "The selected city does not belong to the selected country." whenever
   * `city.CountryId != countryId`, so a city id may never be taken from the local seed when
   * the API is reachable. An empty array is a real answer ("this country has no cities yet")
   * and must not be replaced by the seed either.
   */
  private async apiCitiesForCountry(countryId: number): Promise<City[] | null> {
    if (!this.http) return null;
    try {
      const url = this.apiEndpoint(`/api/lookup/countries/${countryId}/cities`);
      const cities = await firstValueFrom(withApiTimeout(this.http.get<City[]>(url), url));
      if (Array.isArray(cities)) {
        this.apiOnline.set(true);
        return cities;
      }
    } catch {
      /* the API could not answer — the caller falls back to the seed list */
    }
    return null;
  }

  /** City options for a country from the Web API, falling back to the generated seed list. */
  async loadCitiesForCountry(countryId: number): Promise<City[]> {
    const apiCities = await this.apiCitiesForCountry(countryId);
    if (apiCities) return apiCities;
    const seed = SEED_COUNTRIES.find((c) => c.id === countryId);
    return seed ? seed.cities : [];
  }

  /**
   * Country id the Web API uses for a country name.
   *
   * The API's own `GET /api/lookup/countries` list is asked first: those ids are the ones the
   * registration endpoint validates the city against, so a city id must never be derived from
   * another id space. Only when the API cannot be reached (or does not list the country) do we
   * fall back to the generated seed ids — which is also what the browser-only flow uses.
   */
  async resolveCountryId(countryName: string): Promise<number | null> {
    const key = CommunityService.nameKey(countryName);
    // Once the API has answered with its country list there is no reason to ask again: that
    // list stays the authority for the ids this session sends. A database seeded from
    // neverbeen-database/seed.sql numbers its countries differently from community-seed.ts,
    // and sending the seed ids is what made the API answer "The selected city does not belong
    // to the selected country."
    const countries = this.countriesAreFromApi ? this.countries() : await this.loadCountries();
    const apiMatch = countries.find((c) => CommunityService.nameKey(c.name) === key);
    if (apiMatch) return apiMatch.id;
    const seed = SEED_COUNTRIES.find((c) => CommunityService.nameKey(c.name) === key);
    return seed?.id ?? null;
  }

  /**
   * City id the Web API uses for a city name inside a country.
   *
   * The country's city list comes from the API itself (`GET
   * /api/lookup/countries/{id}/cities`), so the id returned here always belongs to the country
   * that is sent with it and the API's country/city cross-check can never fail. The generated
   * seed list is matched only while the API is unreachable (browser-only flow), where
   * `countryName` lets the seed country be found by name when the id came from the API.
   */
  async resolveCityId(
    countryId: number,
    cityName: string,
    countryName?: string,
  ): Promise<number | null> {
    const match = (cities: City[]): number | null => {
      const key = CommunityService.nameKey(cityName);
      const exact = cities.find((c) => CommunityService.nameKey(c.name) === key);
      if (exact) return exact.id;
      const partial = cities.find((c) => {
        const candidate = CommunityService.nameKey(c.name);
        return candidate.startsWith(key) || key.startsWith(candidate);
      });
      return partial?.id ?? null;
    };

    const apiCities = await this.apiCitiesForCountry(countryId);
    if (apiCities) return match(apiCities);

    // The API could not be asked: the generated seed list numbers countries/cities
    // independently, so look the country up by name as well as by id.
    const countryKey = countryName ? CommunityService.nameKey(countryName) : '';
    const seed =
      SEED_COUNTRIES.find((c) => c.id === countryId) ??
      (countryKey
        ? SEED_COUNTRIES.find((c) => CommunityService.nameKey(c.name) === countryKey)
        : undefined);
    return seed ? match(seed.cities) : null;
  }

  // ---------------------------------------------------------------------------
  // OAuth against the Web API
  // ---------------------------------------------------------------------------

  /** Where the OAuth providers send the browser back to (registered in each provider console). */
  readonly oauthRedirectUri =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';

  /**
   * Starts the OAuth **authorization-code** flow with the provider: the Web API needs the
   * code (not a browser identity token) to sign the member in and to mint the JWT that
   * `POST /api/registration` requires. The provider redirects back to `/auth/callback`.
   */
  startOAuthRedirect(provider: 'google' | 'facebook' | 'microsoft' | string): boolean {
    if (typeof window === 'undefined') return false;
    const redirect = encodeURIComponent(this.oauthRedirectUri);
    const state = encodeURIComponent(provider.toLowerCase());
    let url: string;
    switch (provider.toLowerCase()) {
      case 'google':
        url =
          `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
          `&redirect_uri=${redirect}&response_type=code&scope=${encodeURIComponent('openid email profile')}` +
          `&state=${state}&prompt=select_account`;
        break;
      case 'facebook':
        url =
          `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(FACEBOOK_APP_ID)}` +
          `&redirect_uri=${redirect}&response_type=code&scope=${encodeURIComponent('email,public_profile')}` +
          `&state=${state}`;
        break;
      default:
        return false;
    }
    window.location.assign(url);
    return true;
  }

  /** Exchanges an OAuth authorization code for a JWT through the Web API. */
  private async tryApiOauthLogin(provider: string, code: string): Promise<AuthResult | null> {
    if (!this.http) return null;
    if (!(await this.checkApiOnline(true))) return null;
    const url = this.apiEndpoint('/api/auth/oauth/login');
    try {
      const dto = await firstValueFrom(
        withApiTimeout(this.http.post<ApiAuthResult>(url, { provider, code }), url),
      );
      return await this.applyApiSession(dto, provider);
    } catch (error) {
      if (this.isNetworkError(error)) {
        this.logApiFailure('POST /api/auth/oauth/login', url, error);
        this.apiOnline.set(false);
        this.apiProbeDetail.set(this.unreachableDetail(url, error));
        return null;
      }
      throw new Error(this.apiErrorMessage(error, `Sign-in with ${provider} failed`));
    }
  }

  /** Stores the JWT + member returned by the Web API and loads the profile when it exists. */
  private async applyApiSession(dto: ApiAuthResult, provider: string): Promise<AuthResult> {
    // A real NeverBeen account: the guest/demo community ends here.
    this.enterMemberSession();
    setCookie(TOKEN_KEY, dto.token, 30);
    this.token.set(dto.token);

    const words = (dto.user?.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const userId = dto.user?.id ?? 0;
    const user: CurrentUser = {
      id: userId,
      uniqueId: userId ? generate20DigitUid(userId) : undefined,
      firstName: words[0] ?? '',
      lastName: words.slice(1).join(' '),
      fullName: dto.user?.fullName ?? '',
      email: dto.user?.email ?? '',
      status: dto.user?.status ?? 'Pending',
      profileComplete: dto.user?.profileComplete ?? false,
      profilePhotoUrl: this.absoluteApiUrl(dto.user?.profilePhotoUrl),
    };
    this.currentUser.set(user);
    this.saveJson(USER_KEY, user);
    // Record the sign-in without making authentication wait on device-history I/O.
    void this.registerCurrentDevice().catch(() => undefined);

    if (dto.profileComplete) {
      await this.refreshProfileFromApi();
      // Complete profile: the whole community dataset of this member is read too.
      void this.ensureCommunityLoaded(true);
    } else {
      this.profile.set(null);
    }

    return {
      token: dto.token,
      tokenType: dto.tokenType || 'Bearer',
      expiresIn: dto.expiresIn,
      isNewUser: dto.isNewUser,
      profileComplete: dto.profileComplete,
      message: dto.message || `Signed in successfully via ${provider}.`,
      user,
    };
  }

  /** Reloads the signed-in member's profile from `GET /api/profile/me`. */
  async refreshProfileFromApi(): Promise<Profile | null> {
    if (!this.http || !this.token()) return null;
    try {
      const url = this.apiEndpoint('/api/profile/me');
      const dto = await firstValueFrom(
        withApiTimeout(this.http.get<ApiProfileDto>(url, { headers: this.authHeaders() }), url),
      );
      const profile = this.profileFromApi(dto, this.profile() ?? undefined);
      this.profile.set(profile);
      this.saveJson(PROFILE_KEY, profile);
      const syncedUser = this.currentUserFromProfile(profile);
      this.currentUser.set(syncedUser);
      this.saveJson(USER_KEY, syncedUser);
      this.apiOnline.set(true);
      return profile;
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      return null;
    }
  }

  /**
   * Signs a member in with one of the OAuth providers.
   *
   * With a real authorization `code` the Web API performs the exchange, creates / loads the
   * member row and mints the JWT; without one (the sandbox preview, where the provider SDK
   * cannot hand a code over) the app can only prepare the registration form — it never
   * invents an account, so no demo profile or demo community data is ever shown here.
   */
  async loginWithOAuth(provider: 'google' | 'facebook' | string, code = ''): Promise<AuthResult> {
    // Every sign-in leaves guest browsing behind: the demo community is dropped before the
    // member's own profile (from the API, or from this browser's saved session) is put in
    // place.
    this.enterMemberSession();

    // A real code is exchanged for a JWT by the Web API, which also creates the "Pending"
    // member row that the registration page later completes. Only the sandbox preview's
    // `mock_code_…` placeholders take the local route below.
    if (code.length > 0 && !code.startsWith('mock_code_')) {
      const apiResult = await this.tryApiOauthLogin(provider, code);
      if (apiResult) return apiResult;
    }

    // No identity could be verified (no API, no code): the member types their own details on
    // the registration form. Nothing about them is guessed or seeded.
    const pendingUser: CurrentUser = {
      id: generateUniqueId(),
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      status: 'Pending',
      profileComplete: false,
      profilePhotoUrl: '',
    };
    this.token.set(null);
    this.currentUser.set(pendingUser);
    this.profile.set(null);
    this.saveJson(USER_KEY, pendingUser);

    return {
      token: '',
      tokenType: 'Bearer',
      expiresIn: 0,
      isNewUser: true,
      profileComplete: false,
      message: 'New member detected, registration required.',
      user: pendingUser,
    };
  }

  // ---------------------------------------------------------------------------
  // Google OAuth (Sign in with Google via Google Identity Services)
  //
  // SECURITY: only the public OAuth Client ID ships in browser code — the Client
  // secret must NEVER be embedded in the frontend (it would be public). GIS issues
  // the credential directly to the browser; no secret is needed for this flow.
  // ---------------------------------------------------------------------------

  /**
   * Loads https://accounts.google.com/gsi/client once. Resolves false when the
   * script is blocked/unreachable so callers can fall back gracefully (the
   * sandbox preview blocks some egress; real end-user browsers load it fine).
   */
  private loadGoogleGis(): Promise<boolean> {
    if ((globalThis as any).google?.accounts?.id) {
      return Promise.resolve(true);
    }
    if (!this.gisScriptPromise) {
      const promise = new Promise<boolean>((resolve) => {
        if (typeof document === 'undefined') {
          resolve(false);
          return;
        }
        let settled = false;
        const settle = (loaded: boolean) => {
          if (settled) return;
          settled = true;
          resolve(loaded && !!(globalThis as any).google?.accounts?.id);
        };
        const existing = document.querySelector<HTMLScriptElement>('script[data-nb-gis]');
        if (existing) {
          // Script tag already present — wait for it (or time out).
          if ((globalThis as any).google?.accounts?.id) {
            settle(true);
            return;
          }
          existing.addEventListener('load', () => settle(true));
          existing.addEventListener('error', () => settle(false));
        } else {
          const script = document.createElement('script');
          script.id = 'nb-gis-script';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.setAttribute('data-nb-gis', 'true');
          script.addEventListener('load', () => settle(true));
          script.addEventListener('error', () => settle(false));
          document.head.appendChild(script);
        }
        window.setTimeout(() => settle(false), 4000);
      });
      this.gisScriptPromise = promise;
      // Allow a retry on the next click when this attempt failed.
      promise.then((ok) => {
        if (!ok) {
          this.gisScriptPromise = null;
        }
      });
    }
    return this.gisScriptPromise;
  }

  /**
   * Starts the real Google sign-in:
   *  1. Tries the One-Tap/prompt flow — resolves `{ step: 'identity' }` when the
   *     member picks an account;
   *  2. If Google skips/dismisses the prompt (common with FedCM), resolves
   *     `{ step: 'show_google_button' }` — the caller renders the official
   *     Google button via `render()` and the identity arrives through
   *     `awaitGoogleIdentity()`;
   *  3. Resolves `{ step: 'unavailable' }` when GIS cannot run (script blocked,
   *     test environment, popup failure) so callers can use the preview fallback.
   */
  async signInWithGoogle(): Promise<GoogleSignInStep> {
    // Google Identity Services cannot run under jsdom/test runners — bail
    // immediately so unit tests don't stall waiting for a script that never loads.
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return { step: 'unavailable' };
    }

    const gisReady = await this.loadGoogleGis();
    const gis = (globalThis as any).google?.accounts?.id;
    if (!gisReady || !gis) {
      return { step: 'unavailable' };
    }

    return new Promise<GoogleSignInStep>((resolve) => {
      let settled = false;
      const settle = (step: GoogleSignInStep) => {
        if (settled) return;
        settled = true;
        resolve(step);
      };

      const showOfficialButton: GoogleSignInStep = {
        step: 'show_google_button',
        render: (host: HTMLElement) => {
          try {
            gis.renderButton(host, {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              width: 260,
            });
          } catch {
            /* rendered only once per panel */
          }
        },
      };

      gis.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential?: string }) => {
          const identity = response.credential
            ? this.decodeGoogleCredential(response.credential)
            : null;
          if (!identity) {
            settle({ step: 'unavailable' });
            this.googleManualIdentityResolve?.(null);
            this.googleManualIdentityResolve = null;
            return;
          }
          if (!settled) {
            settle({ step: 'identity', identity });
            return;
          }
          // Second stage: the official fallback button delivered the credential.
          const manual = this.googleManualIdentityResolve;
          this.googleManualIdentityResolve = null;
          manual?.(identity);
        },
        error_callback: (err: { type?: string }) => {
          if (err?.type === 'popup_failed_to_open') {
            settle({ step: 'unavailable' });
          } else {
            // popup_closed / unknown — offer the official button instead.
            settle(showOfficialButton);
          }
        },
      });

      try {
        gis.prompt(() => {
          // Called when the One-Tap prompt is skipped or dismissed.
          settle(showOfficialButton);
        });
      } catch {
        settle(showOfficialButton);
      }
    });
  }

  /** Waits for the identity delivered by the official fallback Google button. */
  awaitGoogleIdentity(): Promise<GoogleIdentity | null> {
    return new Promise<GoogleIdentity | null>((resolve) => {
      this.googleManualIdentityResolve = resolve;
    });
  }

  /** Cancels a pending official-button wait (member pressed Cancel). */
  cancelGoogleIdentity(): void {
    const manual = this.googleManualIdentityResolve;
    this.googleManualIdentityResolve = null;
    manual?.(null);
  }

  /**
   * Completes sign-in from a verified Google identity:
   *  - a NeverBeen profile already stored for this Google email → active session
   *    straight to the profile;
   *  - otherwise a brand-new member → prefilled pending account (name, surname,
   *    email from Google) and the registration form.
   */
  /** Completes sign-in from a Google Identity Services credential. */
  completeGoogleSignIn(identity: GoogleIdentity): AuthResult {
    return this.completeSocialSignIn({
      provider: 'Google',
      storageKey: GOOGLE_ACCOUNT_KEY,
      accountRef: identity.sub,
      email: identity.email,
      name: identity.name,
      firstName: identity.givenName,
      lastName: identity.familyName,
      picture: identity.picture,
    });
  }

  /** Completes sign-in from a Facebook Graph API identity. */
  completeFacebookSignIn(identity: FacebookIdentity): AuthResult {
    return this.completeSocialSignIn({
      provider: 'Facebook',
      storageKey: FACEBOOK_ACCOUNT_KEY,
      accountRef: identity.id,
      email: identity.email,
      name: identity.name,
      firstName: identity.firstName,
      lastName: identity.lastName,
      picture: identity.picture,
    });
  }

  /**
   * Shared completion for social sign-in (Google / Facebook):
   *  - a NeverBeen profile already stored for this email → active session
   *    straight to the profile;
   *  - otherwise a brand-new member → prefilled pending account (name, surname,
   *    email, photo from the provider) and the registration form.
   */
  private completeSocialSignIn(p: SocialSignInParams): AuthResult {
    // The Google / Facebook account is real: drop the demo community before the member's
    // own profile (when this browser already knows it) is restored.
    this.enterMemberSession();
    this.saveJson(p.storageKey, {
      ref: p.accountRef,
      email: p.email,
      name: p.name,
      picture: p.picture,
      signedInAtUtc: new Date().toISOString(),
    });

    // A profile seeded by the demo tour never counts as this member's own profile.
    const storedProfile = this.loadJson<Profile>(PROFILE_KEY);
    const sameEmail =
      !isSeedProfile(storedProfile) &&
      !!storedProfile?.email &&
      storedProfile.email.toLowerCase() === p.email.toLowerCase();

    if (storedProfile && sameEmail) {
      const token = 'nb_auth_key_' + Math.random().toString(36).substring(2) + '_' + Date.now();
      setCookie(TOKEN_KEY, token, 30);

      const existingUser: CurrentUser = {
        id: storedProfile.id,
        uniqueId: storedProfile.uniqueId || generate20DigitUid(storedProfile.id),
        firstName: storedProfile.firstName || p.firstName,
        lastName: storedProfile.lastName || p.lastName,
        fullName: storedProfile.fullName || p.name,
        email: p.email,
        status: 'Active',
        profileComplete: true,
        profilePhotoUrl: storedProfile.profilePhotoUrl || p.picture || '',
        activeStatus: 'Active',
        customStatusText: '',
        isProfileLocked: storedProfile.settings?.isProfileLocked ?? false,
        isVerified: false,
        verificationType: null,
        verifiedEmail: undefined,
      };

      this.token.set(token);
      this.currentUser.set(existingUser);
      this.profile.set(storedProfile);
      this.saveJson(USER_KEY, existingUser);
      this.upsertCurrentDevice(this.detectCurrentDevice(this.currentDeviceId()));

      return {
        token,
        tokenType: 'Bearer',
        expiresIn: 2592000,
        isNewUser: false,
        profileComplete: true,
        message: `Signed in successfully with ${p.provider}.`,
        user: existingUser,
      };
    }

    // New member: real social identity, community profile not created yet.
    const nameParts = p.name.trim().split(/\s+/);
    const newUser: CurrentUser = {
      id: generateUniqueId(),
      firstName: p.firstName || nameParts[0] || '',
      lastName: p.lastName || nameParts.slice(1).join(' ') || '',
      fullName: p.name || '',
      email: p.email,
      status: 'Pending',
      profileComplete: false,
      profilePhotoUrl: p.picture || '',
    };
    this.token.set(null);
    this.currentUser.set(newUser);
    this.profile.set(null);
    this.saveJson(USER_KEY, newUser);

    return {
      token: '',
      tokenType: 'Bearer',
      expiresIn: 0,
      isNewUser: true,
      profileComplete: false,
      message: `New ${p.provider} member detected, registration required.`,
      user: newUser,
    };
  }

  // ---------------------------------------------------------------------------
  // Facebook OAuth (Sign in with Facebook via the JavaScript SDK)
  //
  // SECURITY: only the public App ID ships in browser code — the App secret must
  // NEVER be embedded in the frontend. FB.login() + Graph /me give the identity
  // with public_profile + email (no app review required for these permissions).
  // ---------------------------------------------------------------------------

  /**
   * Loads https://connect.facebook.net/en_US/sdk.js once and calls FB.init with
   * the public App ID. Resolves false when blocked/unreachable so callers can
   * fall back gracefully (sandbox egress may block it; end-user browsers load it).
   */
  private loadFacebookSdk(): Promise<boolean> {
    if ((globalThis as any).FB?.init) {
      return Promise.resolve(true);
    }
    if (!this.fbsdkScriptPromise) {
      const promise = new Promise<boolean>((resolve) => {
        if (typeof document === 'undefined') {
          resolve(false);
          return;
        }
        let settled = false;
        const settle = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok && !!(globalThis as any).FB?.init);
        };

        let inited = false;
        // The SDK invokes window.fbAsyncInit as soon as it finishes loading.
        (globalThis as any).fbAsyncInit = () => {
          if (inited) return;
          try {
            (globalThis as any).FB.init({
              appId: FACEBOOK_APP_ID,
              cookie: false,
              xfbml: false,
              autoLogAppEvents: false,
              version: FACEBOOK_GRAPH_VERSION,
            });
            inited = true;
            settle(true);
          } catch {
            settle(false);
          }
        };

        // Fresh injection — drop any previous failed attempt.
        const stale = document.querySelector<HTMLScriptElement>('script[data-nb-fbsdk]');
        if (stale) {
          stale.remove();
        }
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-nb-fbsdk', 'true');
        script.addEventListener('load', () => {
          // Manual init for SDK builds that don't auto-invoke fbAsyncInit.
          if (!(globalThis as any).FB?.init) {
            settle(false);
          } else {
            (globalThis as any).fbAsyncInit();
          }
        });
        script.addEventListener('error', () => settle(false));
        document.head.appendChild(script);
        window.setTimeout(() => settle(false), 4000);
      });
      this.fbsdkScriptPromise = promise;
      // Allow a retry on the next click when this attempt failed.
      promise.then((ok) => {
        if (!ok) {
          this.fbsdkScriptPromise = null;
        }
      });
    }
    return this.fbsdkScriptPromise;
  }

  /**
   * Starts the real Facebook sign-in (FB.login popup → Graph /me):
   *  - `{ step: 'identity' }` — the member authorised the app;
   *  - `{ step: 'cancelled' }` — the member closed/declined the dialog;
   *  - `{ step: 'unavailable' }` — SDK blocked or the Graph call failed, so
   *    callers can use the preview fallback.
   */
  async signInWithFacebook(): Promise<FacebookSignInStep> {
    // The Facebook SDK cannot run under jsdom/test runners — bail immediately.
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return { step: 'unavailable' };
    }

    const sdkReady = await this.loadFacebookSdk();
    const FB = (globalThis as any).FB;
    if (!sdkReady || !FB?.login) {
      return { step: 'unavailable' };
    }

    return new Promise<FacebookSignInStep>((resolve) => {
      let settled = false;
      const settle = (step: FacebookSignInStep) => {
        if (settled) return;
        settled = true;
        resolve(step);
      };

      try {
        FB.login(
          (response: { authResponse?: { accessToken?: string; userID?: string } | null }) => {
            if (!response?.authResponse) {
              settle({ step: 'cancelled' });
              return;
            }
            FB.api(
              '/me',
              { fields: 'id,name,email,first_name,last_name,picture.type(large)' },
              (me: {
                id?: string;
                name?: string;
                email?: string;
                first_name?: string;
                last_name?: string;
                picture?: { data?: { url?: string } };
                error?: unknown;
              }) => {
                if (!me || me.error || !me.id) {
                  settle({ step: 'unavailable' });
                  return;
                }
                const name =
                  me.name ||
                  `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() ||
                  'NeverBeen Traveler';
                settle({
                  step: 'identity',
                  identity: {
                    id: String(me.id),
                    // Users can decline the email permission — keep a stable
                    // provider-scoped address so the account still links.
                    email: me.email || `${me.id}@facebook.neverbeen.example`,
                    name,
                    firstName: me.first_name || name.split(' ')[0] || '',
                    lastName: me.last_name || '',
                    picture: me.picture?.data?.url || '',
                  },
                });
              },
            );
          },
          { scope: 'public_profile,email', auth_type: 'rerequest' },
        );
      } catch {
        settle({ step: 'unavailable' });
      }
    });
  }

  /** Decodes the GIS credential (JWT) payload — name/email/picture/sub. */
  private decodeGoogleCredential(credential: string): GoogleIdentity | null {
    try {
      const part = credential.split('.')[1];
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };
      if (!payload.sub || !payload.email) {
        return null;
      }
      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
        name: payload.name || payload.email,
        givenName: payload.given_name || '',
        familyName: payload.family_name || '',
        picture: payload.picture || '',
      };
    } catch {
      return null;
    }
  }

  /**
   * Test-only: opens one of the two make-believe accounts of the seeded demo community
   * (an active “founder” member or a brand-new pending one). It is **not reachable from the
   * application** — the product's only entry into the demo data is `exploreAsGuest()`; the
   * specs reach this method through `community-demo.testing.ts`.
   */
  private openDemoAccount(mode: 'new_pending' | 'active_member'): void {
    this.exitGuestBrowsing();
    this.demoSession = true;
    if (mode === 'new_pending') {
      this.reloadCommunityData();
      const pendingUser: CurrentUser = {
        id: 99,
        firstName: 'Alex',
        lastName: 'Vance',
        fullName: 'Alex Vance',
        email: 'alex.vance@example.com',
        status: 'Pending',
        profileComplete: false,
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      };
      deleteCookie(TOKEN_KEY);
      this.token.set(null);
      this.currentUser.set(pendingUser);
      this.profile.set(null);
      this.saveJson(USER_KEY, pendingUser);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
      }
    } else {
      setCookie(TOKEN_KEY, DEMO_SESSION_TOKEN, 30);
      this.initDefaultMember();
      this.reloadCommunityData();
    }
  }

  logout(): void {
    this.exitGuestBrowsing();
    const u = this.currentUser();
    if (u) {
      this.currentUser.set({ ...u, activeStatus: 'Inactive' });
    }
    deleteCookie(TOKEN_KEY);
    this.stopLiveUpdates();
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    this.activeChatBoxes.set([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PROFILE_KEY);
      for (const key of DEMO_COMMUNITY_STORAGE_KEYS) localStorage.removeItem(key);
    }
    // Signed out again: the community is empty until somebody signs in or takes the
    // “Explore as Guest” tour — no dataset of the session that just ended is left behind.
    this.demoSession = false;
    this.resetSessionCommunityData();
  }

  // ---------------------------------------------------------------------------
  // Active Status & Profile Lock
  // ---------------------------------------------------------------------------

  updateActiveStatus(status: UserActiveStatus, customText?: string): void {
    let sanitized = '';
    if (customText) {
      sanitized = customText.replace(/[^A-Za-z ]/g, '').substring(0, 15).trim();
    }
    this.currentUser.update((u) => (u ? { ...u, activeStatus: status, customStatusText: sanitized } : null));
    this.profile.update((p) => (p ? { ...p, activeStatus: status, customStatusText: sanitized } : null));
    this.saveJson(USER_KEY, this.currentUser());
    this.saveJson(PROFILE_KEY, this.profile());
    // Presence lives in the member row's own columns on the Web API
    // (PUT /api/profile — ActiveStatus / CustomStatusText, patch: community-complete).
    if (this.apiLive) {
      this.apiWrite('PUT', '/api/profile', {
        activeStatus: status,
        customStatusText: sanitized || undefined,
      });
    }
  }

  toggleProfileLock(): boolean {
    const next = !this.profile()?.isProfileLocked;
    this.setProfileLock(next);
    return next;
  }

  setProfileLock(locked: boolean): void {
    this.profile.update((p) => {
      if (!p) return null;
      return {
        ...p,
        isProfileLocked: locked,
        settings: {
          ...p.settings,
          isProfileLocked: locked,
        },
      };
    });
    this.currentUser.update((u) => (u ? { ...u, isProfileLocked: locked } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(USER_KEY, this.currentUser());
    // The lock is part of the member's Settings section on the Web API.
    if (this.apiLive) this.apiWrite('PUT', '/api/profile/settings', this.profile()!.settings);
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  async getCitiesForCountry(countryId: number): Promise<City[]> {
    return this.loadCitiesForCountry(countryId);
  }

  // ---------------------------------------------------------------------------
  // Registration / Account Creation
  // ---------------------------------------------------------------------------

  /**
   * Creates the new member's account.
   *
   * The registration is **sent to the NeverBeen Web API** (`POST /api/registration`,
   * multipart/form-data with the profile photograph and the signed-in member's JWT), which
   * stores the member in the PostgreSQL / Supabase database and flips the account from
   * "Pending" to "Active". The returned profile is what the app then shows.
   *
   * When the API is unreachable — or when the visitor is not signed in through OAuth, so the
   * API has no "Pending" member to complete — the account is created in this browser only and
   * `accountSaveNotice()` explains that it never reached the database.
   */
  async createNeverbeenAccount(data: CreateAccountData): Promise<Profile> {
    this.accountSaveNotice.set(null);
    this.accountSaveTarget.set(null);

    // Registration is part of the Community upload flow too. Use the same optimized
    // bytes for the API multipart upload and the browser-only preview/fallback.
    if (data.photo) {
      const source = data.photo;
      const photo = await this.prepareCommunityPhoto(source);
      data = {
        ...data,
        photo,
        photoUrl: photo === source ? data.photoUrl : await readImageAsDataUrl(photo),
      };
    }

    if (this.http) {
      const stored = await this.tryApiRegister(data);
      if (stored) {
        this.accountSaveTarget.set('database');
        return stored;
      }
    }

    const profile = this.createLocalAccount(data);
    this.accountSaveTarget.set('local');
    return profile;
  }

  /**
   * Sends the registration to the Web API. Returns the stored profile, `null` when the
   * browser-only fallback should run, and throws when the API rejected the details.
   */
  private async tryApiRegister(data: CreateAccountData): Promise<Profile | null> {
    // The registration POST is attempted straight away — no health probe in front of it, so
    // a slow/cold API or a failing probe can never stop the member from being stored.
    const url = this.apiEndpoint('/api/registration');

    // Country and city ids are resolved against the API's own lookup lists: the API stores a
    // city only for the country it was seeded with and rejects any other pair with
    // "The selected city does not belong to the selected country."
    const countryId = await this.resolveCountryId(data.country);
    const cityId =
      countryId == null ? null : await this.resolveCityId(countryId, data.city, data.country);
    if (countryId == null || cityId == null) {
      throw new Error(
        `The NeverBeen database does not know ${data.city} in ${data.country}. ` +
          'Please pick another country and city from the lists — they contain every city ' +
          'registration accepts.',
      );
    }

    const form = new FormData();
    form.append('fullName', `${data.name} ${data.surname}`.trim());
    // First name, last name and state are stored as their own columns on the member row
    // (Users.FirstName / LastName / State), so they are posted next to the full name
    // instead of only being folded into it. Form binding is case-insensitive.
    form.append('firstName', data.name.trim());
    form.append('lastName', data.surname.trim());
    form.append('state', data.state.trim());
    form.append('gender', data.gender);
    form.append('dateOfBirth', data.dateOfBirth);
    form.append('countryId', String(countryId));
    form.append('cityId', String(cityId));
    form.append('email', data.email);
    form.append('profession', data.profession ?? 'Others');
    if (data.aboutMe) form.append('aboutMe', data.aboutMe);
    if (data.photo) form.append('photo', data.photo, data.photo.name || 'profile-photo.jpg');

    try {
      const dto = await firstValueFrom(
        withApiTimeout(
          this.http!.post<ApiProfileDto>(url, form, { headers: this.authHeaders() }),
          url,
          REGISTRATION_TIMEOUT_MS,
        ),
      );

      // The profile the API stored is the one shown: it carries the names and the state
      // the member typed (the fallback only covers an API build that does not answer
      // them yet — see docs/patches/neverbeen-api-registration-names-state.patch).
      const profile = this.profileFromApi(dto, {
        firstName: data.name,
        lastName: data.surname,
        state: data.state,
      });
      this.profile.set(profile);
      this.saveJson(PROFILE_KEY, profile);

      const user = this.currentUser();
      if (user) {
        const updated: CurrentUser = {
          ...user,
          id: profile.id,
          uniqueId: profile.uniqueId || generate20DigitUid(profile.id),
          fullName: profile.fullName,
          email: profile.email,
          status: 'Active',
          profileComplete: true,
          profilePhotoUrl: profile.profilePhotoUrl,
        };
        this.currentUser.set(updated);
        this.saveJson(USER_KEY, updated);
      }
      this.apiOnline.set(true);
      return profile;
    } catch (error) {
      this.logApiFailure('POST /api/registration', url, error);
      if (this.isNetworkError(error)) {
        this.apiOnline.set(false);
        this.apiProbeDetail.set(this.unreachableDetail(url, error));
        this.accountSaveNotice.set(
          `${this.unreachableDetail(url, error)} This account was saved in this browser only.`,
        );
        return null;
      }
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // No (or expired) OAuth session: the API only completes profiles for members who
        // signed in with Google / Facebook first. Keep the page usable, but say so.
        this.accountSaveNotice.set(
          'Sign in with Google or Facebook first — the NeverBeen database stores each member ' +
            'against their sign-in account. This account was saved in this browser only.',
        );
        return null;
      }
      throw new Error(this.apiErrorMessage(error, 'The NeverBeen Web API rejected the registration'));
    }
  }

  /** Browser-only account creation used while the Web API cannot be reached. */
  private createLocalAccount(data: CreateAccountData): Profile {
    const token = 'nb_auth_key_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    this.enterMemberSession();
    setCookie(TOKEN_KEY, token, 30);

    const countryObj = this.countries().find(
      (c) => c.name.toLowerCase() === data.country.toLowerCase(),
    );

    const newId = this.currentUser()?.id || Date.now();
    const newProfile: Profile = {
      id: newId,
      uniqueId: generate20DigitUid(newId),
      firstName: data.name,
      lastName: data.surname,
      fullName: `${data.name} ${data.surname}`.trim(),
      email: data.email,
      country: data.country,
      countryId: countryObj?.id || 1,
      countryName: data.country,
      state: data.state,
      city: data.city,
      cityName: data.city,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      profilePhotoUrl: data.photoUrl,
      aboutMe:
        data.aboutMe ||
        `Passionate traveler from ${data.city}, ${data.country}. Exploring dream destinations and sharing memories with the NeverBeen Community.`,
      profession: data.profession || 'Traveler',
      status: 'Active',
      createdAtUtc: new Date().toISOString(),
      settings: {
        publicProfileEnabled: true,
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        theme: 'light',
        timezone: 'UTC',
      },
      gallery: [],
      commentCount: 0,
    };

    const newUser: CurrentUser = {
      id: newProfile.id,
      uniqueId: newProfile.uniqueId,
      firstName: newProfile.firstName,
      lastName: newProfile.lastName,
      fullName: newProfile.fullName,
      email: newProfile.email,
      status: 'Active',
      profileComplete: true,
      profilePhotoUrl: newProfile.profilePhotoUrl,
    };

    this.token.set(token);
    this.currentUser.set(newUser);
    this.profile.set(newProfile);
    this.saveJson(USER_KEY, newUser);
    this.saveJson(PROFILE_KEY, newProfile);
    this.upsertCurrentDevice(this.detectCurrentDevice(this.currentDeviceId()));

    return newProfile;
  }

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  async updateProfile(req: UpdateProfileRequest): Promise<Profile> {
    const current = this.profile()!;
    const country = req.countryId
      ? SEED_COUNTRIES.find((c) => c.id === req.countryId)
      : undefined;
    const city =
      country && req.cityId ? country.cities.find((ct) => ct.id === req.cityId) : undefined;

    const updated: Profile = {
      ...current,
      fullName: req.fullName ?? current.fullName,
      // First name, last name and state are the member's own columns on the row — an edit
      // that carries them is stored as it was typed, and only then is the full name used to
      // derive what the caller left out.
      firstName: req.firstName?.trim() || splitFullName(req.fullName).firstName || current.firstName,
      lastName: req.lastName?.trim() || splitFullName(req.fullName).lastName || current.lastName,
      state: req.state?.trim() ?? current.state,
      gender: req.gender ?? current.gender,
      dateOfBirth: req.dateOfBirth ?? current.dateOfBirth,
      countryId: req.countryId ?? current.countryId,
      countryName: country?.name ?? current.countryName,
      country: country?.name ?? current.country,
      cityId: req.cityId ?? current.cityId,
      cityName: city?.name ?? current.cityName,
      city: city?.name ?? current.city,
      pincode: req.pincode ?? current.pincode,
      contactNumber: req.contactNumber ?? current.contactNumber,
      postalAddress: req.postalAddress ?? current.postalAddress,
      aboutMe: req.aboutMe ?? current.aboutMe,
      profession: req.profession ?? current.profession,
      aboutMeDetails: req.aboutMeDetails ?? current.aboutMeDetails,
      activeStatus: req.activeStatus ?? current.activeStatus,
      customStatusText: req.customStatusText ?? current.customStatusText,
      isProfileLocked: req.isProfileLocked ?? current.isProfileLocked,
    };

    this.profile.set(updated);
    this.saveJson(PROFILE_KEY, updated);
    // The header / sidebar greet the member by the same names the profile now carries.
    this.currentUser.update((u) =>
      u
        ? {
            ...u,
            fullName: updated.fullName,
            firstName: updated.firstName,
            lastName: updated.lastName,
          }
        : null,
    );
    this.saveJson(USER_KEY, this.currentUser());

    // Signed-in members persist every detail on the Web API (PUT /api/profile); the
    // API's answer is the truth and replaces the optimistic profile when it arrives.
    if (this.apiLive) {
      const saved = await this.putProfileToApi(req);
      if (saved) {
        this.profile.set(saved);
        this.saveJson(PROFILE_KEY, saved);
        this.currentUser.update((u) =>
          u
            ? {
                ...u,
                fullName: saved.fullName,
                firstName: saved.firstName,
                lastName: saved.lastName,
                activeStatus: saved.activeStatus,
                customStatusText: saved.customStatusText,
                isProfileLocked: saved.isProfileLocked,
                aboutMeDetails: saved.aboutMeDetails,
              }
            : null,
        );
        this.saveJson(USER_KEY, this.currentUser());
        return saved;
      }
    }
    return updated;
  }

  /**
   * PUT /api/profile — sends the editable details (including the structured About-me
   * JSON, the presence and the profile lock, which the API stores in its own columns)
   * and maps the fresh `ProfileDto` answer onto the app's profile.
   */
  private async putProfileToApi(req: UpdateProfileRequest): Promise<Profile | null> {
    const current = this.profile();
    if (!current) return null;
    const body: Record<string, unknown> = {
      fullName: req.fullName ?? undefined,
      firstName: req.firstName ?? undefined,
      lastName: req.lastName ?? undefined,
      state: req.state ?? undefined,
      gender: req.gender ?? undefined,
      dateOfBirth: req.dateOfBirth ?? undefined,
      countryId: req.countryId ?? undefined,
      cityId: req.cityId ?? undefined,
      pincode: req.pincode ?? undefined,
      contactNumber: req.contactNumber ?? undefined,
      postalAddress: req.postalAddress ?? undefined,
      aboutMe: req.aboutMe ?? undefined,
      profession: req.profession ?? undefined,
      // Structured About me sub-sections + presence + lock (patch: community-complete).
      aboutMeDetailsJson: req.aboutMeDetails
        ? JSON.stringify(req.aboutMeDetails)
        : req.aboutMeDetails === null
          ? ''
          : undefined,
      activeStatus: req.activeStatus ?? undefined,
      customStatusText: req.customStatusText ?? undefined,
      isProfileLocked: req.isProfileLocked ?? undefined,
    };
    for (const key of Object.keys(body)) {
      if (body[key] === undefined) delete body[key];
    }

    const dto = await this.apiSend<ApiProfileDto>('PUT', '/api/profile', body);
    return dto ? this.profileFromApi(dto, current) : null;
  }

  updateAboutMeDetails(details: AboutMeDetails): boolean {
    if (this.blockedByGuard(details.intro) || this.blockedByGuard(details.aboutThePerson)) return false;
    this.profile.update((p) => (p ? { ...p, aboutMeDetails: details } : null));
    this.currentUser.update((u) => (u ? { ...u, aboutMeDetails: details } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(USER_KEY, this.currentUser());
    // The structured About me is stored on the member row as JSON (PUT /api/profile).
    if (this.apiLive) {
      void this.apiSend<ApiProfileDto>('PUT', '/api/profile', {
        aboutMeDetailsJson: JSON.stringify(details),
      }).then((dto) => {
        if (!dto) return;
        const saved = this.profileFromApi(dto, this.profile() ?? undefined);
        this.profile.update((p) => (p ? { ...saved, aboutMeDetails: details } : p));
        this.saveJson(PROFILE_KEY, this.profile());
      });
    }
    return true;
  }

  readonly MAX_IMAGE_SIZE_BYTES = MAX_COMMUNITY_IMAGE_BYTES;

  /** Compresses an image selected anywhere in Community to the API's 100 KB upload limit. */
  prepareCommunityPhoto(file: File): Promise<File> {
    return compressCommunityImage(file, this.MAX_IMAGE_SIZE_BYTES);
  }

  async uploadProfilePhoto(file: File): Promise<string> {
    file = await this.prepareCommunityPhoto(file);
    if (!this.storageAllows(file.size)) throw new Error(this.storageBlockMessage() || 'Storage limit reached.');
    // Signed-in members upload to the Web API (PUT /api/profile/photo, multipart):
    // the photograph is stored on the member row and served from /api/profile/{id}/photo.
    if (this.apiLive) {
      const dto = await this.uploadProfilePhotoToApi('PUT', '/api/profile/photo', file);
      if (dto) {
        const saved = this.profileFromApi(dto, this.profile() ?? undefined);
        this.profile.set(saved);
        this.currentUser.update((u) => (u ? { ...u, profilePhotoUrl: saved.profilePhotoUrl } : null));
        this.saveJson(PROFILE_KEY, saved);
        this.saveJson(USER_KEY, this.currentUser());
        return saved.profilePhotoUrl ?? '';
      }
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const photoUrl = reader.result as string;
        this.profile.update((p) => (p ? { ...p, profilePhotoUrl: photoUrl } : null));
        this.currentUser.update((u) => (u ? { ...u, profilePhotoUrl: photoUrl } : null));
        this.saveJson(PROFILE_KEY, this.profile());
        this.saveJson(USER_KEY, this.currentUser());
        resolve(photoUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  /** Multipart photograph upload against the API; returns the fresh profile. */
  private async uploadProfilePhotoToApi(
    method: 'PUT' | 'POST',
    path: string,
    file: File,
    caption?: string,
  ): Promise<ApiProfileDto | null> {
    if (!this.http || !this.apiLive) return null;
    const url = this.apiEndpoint(path);
    const form = new FormData();
    form.append('photo', file);
    if (caption !== undefined) form.append('caption', caption);
    try {
      const data = await firstValueFrom(
        withApiTimeout(
          this.http.request<ApiProfileDto>(method, url, { headers: this.authHeaders(), body: form, responseType: 'json' }),
          url,
          REGISTRATION_TIMEOUT_MS,
        ),
      );
      this.apiOnline.set(true);
      return data;
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      this.logApiFailure(`${method} ${path}`, url, error);
      return null;
    }
  }

  async uploadCoverPhoto(file: File): Promise<string> {
    file = await this.prepareCommunityPhoto(file);
    if (!this.storageAllows(file.size)) throw new Error(this.storageBlockMessage() || 'Storage limit reached.');
    // Cover photographs go to the Web API too (PUT /api/profile/cover — patch:
    // community-complete). Without that endpoint yet, the local copy is kept.
    if (this.apiLive) {
      const dto = await this.uploadCoverPhotoToApi(file);
      if (dto) {
        const saved = this.profileFromApi(dto, this.profile() ?? undefined);
        this.profile.set(saved);
        this.currentUser.update((u) => (u ? { ...u, coverPhotoUrl: saved.coverPhotoUrl } : null));
        this.saveJson(PROFILE_KEY, saved);
        this.saveJson(USER_KEY, this.currentUser());
        return saved.coverPhotoUrl ?? '';
      }
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const coverUrl = reader.result as string;
        this.profile.update((p) => (p ? { ...p, coverPhotoUrl: coverUrl } : null));
        this.currentUser.update((u) => (u ? { ...u, coverPhotoUrl: coverUrl } : null));
        this.saveJson(PROFILE_KEY, this.profile());
        this.saveJson(USER_KEY, this.currentUser());
        resolve(coverUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  /** PUT /api/profile/cover (multipart) — answered with the fresh ProfileDto. */
  private async uploadCoverPhotoToApi(file: File): Promise<ApiProfileDto | null> {
    if (!this.http || !this.apiLive) return null;
    const url = this.apiEndpoint('/api/profile/cover');
    const form = new FormData();
    form.append('photo', file);
    try {
      const data = await firstValueFrom(
        withApiTimeout(this.http.put<ApiProfileDto>(url, form, { headers: this.authHeaders() }), url, REGISTRATION_TIMEOUT_MS),
      );
      this.apiOnline.set(true);
      return data;
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      this.logApiFailure('PUT /api/profile/cover', url, error);
      return null;
    }
  }

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    this.profile.update((p) => (p ? { ...p, settings } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    // Signed-in members save the whole Settings section on the Web API
    // (PUT /api/profile/settings) and adopt the stored answer.
    if (this.apiLive) {
      const saved = await this.apiSend<Partial<UserSettings>>('PUT', '/api/profile/settings', settings);
      if (saved) this.applyApiSettings(saved);
      return { ...settings, ...(saved ?? {}) } as UserSettings;
    }
    return settings;
  }

  // Requirement C: Verification through Work or University Email
  verifyUserEmail(email: string, type: 'work' | 'university'): void {
    this.currentUser.update((u) =>
      u ? { ...u, isVerified: true, verifiedEmail: email, verificationType: type } : null,
    );
    this.profile.update((p) =>
      p
        ? {
            ...p,
            isVerified: true,
            verifiedEmail: email,
            verificationType: type,
            settings: {
              ...(p.settings || {}),
              isVerified: true,
              verificationEmail: email,
              verificationType: type,
              verifiedAtUtc: new Date().toISOString(),
            },
          }
        : null,
    );

    // Update all journey posts authored by current user so author.isVerified is true
    const currentUserId = this.currentUser()?.id || 1;
    this.journeyPosts.update((posts) =>
      posts.map((p) =>
        p.author.id === currentUserId ? { ...p, author: { ...p.author, isVerified: true } } : p,
      ),
    );

    this.saveJson(USER_KEY, this.currentUser());
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    // Verification is part of the member's Settings on the Web API
    // (PUT /api/profile/settings honours IsVerified / VerificationEmail / VerificationType).
    if (this.apiLive && this.profile()?.settings) {
      this.apiWrite('PUT', '/api/profile/settings', this.profile()!.settings);
    }
  }

  removeUserVerification(): void {
    this.currentUser.update((u) =>
      u ? { ...u, isVerified: false, verifiedEmail: undefined, verificationType: null } : null,
    );
    this.profile.update((p) =>
      p
        ? {
            ...p,
            isVerified: false,
            verifiedEmail: undefined,
            verificationType: null,
            settings: {
              ...(p.settings || {}),
              isVerified: false,
              verificationEmail: undefined,
              verificationType: null,
            },
          }
        : null,
    );

    const currentUserId = this.currentUser()?.id || 1;
    this.journeyPosts.update((posts) =>
      posts.map((p) =>
        p.author.id === currentUserId ? { ...p, author: { ...p.author, isVerified: false } } : p,
      ),
    );

    this.saveJson(USER_KEY, this.currentUser());
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    if (this.apiLive && this.profile()?.settings) {
      this.apiWrite('PUT', '/api/profile/settings', this.profile()!.settings);
    }
  }

  // ---------------------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------------------

  async addGalleryPhoto(file: File, caption?: string, albumId?: number): Promise<GalleryPhoto> {
    file = await this.prepareCommunityPhoto(file);
    if (!this.storageAllows(file.size)) {
      throw new Error(this.storageBlockMessage() || 'Storage limit reached.');
    }
    // Signed-in members upload to the Web API (POST /api/gallery, multipart) and the
    // stored photograph (served from /api/gallery/{id}) replaces the local preview.
    if (this.apiLive) {
      const dto = await this.uploadGalleryPhotoToApi(file, caption);
      if (dto) {
        const stored = this.galleryPhotoFromApi(dto);
        this.profile.update((p) => {
          if (!p) return null;
          return {
            ...p,
            gallery: [stored, ...p.gallery],
            galleryAlbums: (p.galleryAlbums ?? []).map((album) =>
              album.id === albumId
                ? { ...album, photos: [stored, ...album.photos], coverPhotoId: album.coverPhotoId ?? stored.id, updatedAtUtc: stored.createdAtUtc }
                : album,
            ),
          };
        });
        this.saveJson(PROFILE_KEY, this.profile());
        if (albumId) this.apiWrite('PUT', `/api/gallery/albums/${albumId}/photos/${stored.id}`);
        return stored;
      }
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newPhoto: GalleryPhoto = {
          id: generateUniqueId(),
          url: reader.result as string,
          caption: caption || 'NeverBeen AI Vacation Memoir',
          createdAtUtc: new Date().toISOString(),
        };

        this.profile.update((p) => {
          if (!p) return null;
          return {
            ...p,
            gallery: [newPhoto, ...p.gallery],
            galleryAlbums: (p.galleryAlbums ?? []).map((album) => album.id === albumId ? { ...album, photos: [newPhoto, ...album.photos], coverPhotoId: album.coverPhotoId ?? newPhoto.id, updatedAtUtc: newPhoto.createdAtUtc } : album),
          };
        });

        this.saveJson(PROFILE_KEY, this.profile());
        resolve(newPhoto);
      };
      reader.readAsDataURL(file);
    });
  }

  /** POST /api/gallery (multipart field "photo", optional caption). */
  private async uploadGalleryPhotoToApi(file: File, caption?: string): Promise<ApiGalleryPhotoDto | null> {
    if (!this.http || !this.apiLive) return null;
    const url = this.apiEndpoint('/api/gallery');
    const form = new FormData();
    form.append('photo', file);
    if (caption) form.append('caption', caption);
    try {
      const data = await firstValueFrom(
        withApiTimeout(this.http.post<ApiGalleryPhotoDto>(url, form, { headers: this.authHeaders() }), url, REGISTRATION_TIMEOUT_MS),
      );
      this.apiOnline.set(true);
      return data;
    } catch (error) {
      if (this.isNetworkError(error)) this.apiOnline.set(false);
      this.logApiFailure('POST /api/gallery', url, error);
      return null;
    }
  }

  galleryAlbums(): GalleryAlbum[] {
    const profile = this.profile();
    if (!profile) return [];
    const saved = profile.galleryAlbums ?? [];
    const defaults: GalleryAlbum[] = ['Profile Photos', 'Cover Photos'].map((name, index) => {
      const image = index === 0 ? profile.profilePhotoUrl : profile.coverPhotoUrl;
      const photo = image ? { id: -(index + 1), url: image, caption: name, createdAtUtc: new Date().toISOString() } : undefined;
      return { id: -(index + 1), name, photos: photo ? [photo] : [], coverPhotoId: photo?.id, privacy: saved.find((item) => item.name === name)?.privacy || 'public', isDefault: true, updatedAtUtc: new Date().toISOString() };
    });
    return [...defaults, ...saved.filter((album) => !defaults.some((item) => item.name === album.name)).sort((a, b) => b.updatedAtUtc.localeCompare(a.updatedAtUtc))];
  }

  createGalleryAlbum(name: string): GalleryAlbum | null {
    const clean = name.trim();
    if (!clean || ['profile photos', 'cover photos'].includes(clean.toLowerCase())) return null;
    const album: GalleryAlbum = { id: generateUniqueId(), name: clean, photos: [], updatedAtUtc: new Date().toISOString() };
    this.profile.update((p) => p ? { ...p, galleryAlbums: [album, ...(p.galleryAlbums ?? [])] } : null);
    this.saveJson(PROFILE_KEY, this.profile());
    // Stored on the Web API for signed-in members (POST /api/gallery/albums); the
    // server's album replaces the optimistic one when the answer arrives.
    if (this.apiLive) {
      void this.apiSend<ApiGalleryAlbumDto>('POST', '/api/gallery/albums', { name: clean }).then((dto) => {
        if (!dto) return;
        const stored = this.galleryAlbumFromApi(dto);
        this.profile.update((p) =>
          p
            ? {
                ...p,
                galleryAlbums: (p.galleryAlbums ?? []).map((a) => (a.id === album.id ? stored : a)),
              }
            : p,
        );
        this.saveJson(PROFILE_KEY, this.profile());
      });
    }
    return album;
  }

  setGalleryAlbumCover(albumId: number, photoId: number): void {
    this.profile.update((p) => p ? { ...p, galleryAlbums: (p.galleryAlbums ?? []).map((a) => a.id === albumId ? { ...a, coverPhotoId: photoId, updatedAtUtc: new Date().toISOString() } : a) } : null);
    this.saveJson(PROFILE_KEY, this.profile());
    if (this.apiLive && albumId > 0) this.apiWrite('PUT', `/api/gallery/albums/${albumId}`, { coverPhotoId: photoId });
  }

  deleteGalleryAlbum(albumId: number): void {
    if (albumId < 0) return;
    this.profile.update((p) => p ? { ...p, galleryAlbums: (p.galleryAlbums ?? []).filter((a) => a.id !== albumId) } : null);
    this.saveJson(PROFILE_KEY, this.profile());
    if (this.apiLive && albumId > 0) this.apiWrite('DELETE', `/api/gallery/albums/${albumId}`);
  }

  setGalleryAlbumPrivacy(albumId: number, privacy: GalleryAlbum['privacy']): void {
    if (!privacy) return;
    this.profile.update((p) => {
      if (!p) return null;
      const name = albumId === -1 ? 'Profile Photos' : albumId === -2 ? 'Cover Photos' : undefined;
      const albums = p.galleryAlbums ?? [];
      if (name && !albums.some((a) => a.name === name)) return { ...p, galleryAlbums: [...albums, { id: albumId, name, photos: [], privacy, isDefault: true, updatedAtUtc: new Date().toISOString() }] };
      return { ...p, galleryAlbums: albums.map((a) => a.id === albumId ? { ...a, privacy, updatedAtUtc: new Date().toISOString() } : a) };
    });
    this.saveJson(PROFILE_KEY, this.profile());
    if (this.apiLive && albumId > 0) this.apiWrite('PUT', `/api/gallery/albums/${albumId}`, { privacy });
  }

  async deleteGalleryPhoto(photoId: number): Promise<void> {
    this.profile.update((p) => {
      if (!p) return null;
      return {
        ...p,
        gallery: p.gallery.filter((item) => item.id !== photoId),
      };
    });
    this.saveJson(PROFILE_KEY, this.profile());
    if (this.apiLive && photoId > 0) await this.apiSend<unknown>('DELETE', `/api/gallery/${photoId}`);
  }

  // ---------------------------------------------------------------------------
  // Message Book Comments
  // ---------------------------------------------------------------------------

  async postComment(
    text: string,
    parentId?: number,
    imageUrl?: string,
    taggedCompanions?: AuthorInfo[],
  ): Promise<CommunityComment> {
    if (this.blockedByGuard(text) || !this.storageAllows(utf8Bytes(text) + imageBytes(imageUrl))) {
      throw new Error('blocked');
    }
    const user = this.currentUser();
    const newComment: CommunityComment = {
      id: generateUniqueId(),
      text,
      imageUrl: imageUrl || undefined,
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      author: {
        id: user?.id ?? 1,
        fullName: user?.fullName || 'NeverBeen Traveler',
        profession: this.profile()?.profession || 'Member',
        profilePhotoUrl: this.memberPhotoUrl() || undefined,
      },
      myReaction: null,
      reactions: [],
      taggedCompanions: taggedCompanions && taggedCompanions.length > 0 ? taggedCompanions : undefined,
      replyCount: 0,
      parentId: parentId ?? null,
      replies: [],
    };

    if (parentId) {
      this.comments.update((list) =>
        this.addNestedMessageBookReply(list, parentId, newComment),
      );
    } else {
      this.comments.update((list) => [newComment, ...list]);
    }

    this.saveJson(COMMENTS_KEY, this.comments());

    // Signed-in members write the entry to the Web API (POST /api/messagebook); the
    // stored answer (real id, real author, attached photograph) replaces the draft.
    if (this.apiLive) {
      // MessageBook.ImageUrl is a short URL column, not a place to persist a large base64
      // data URL. Store the optimized bytes through the existing multipart gallery API first.
      let apiImageUrl = imageUrl || undefined;
      if (apiImageUrl?.startsWith('data:') && apiImageUrl.length > 1024) {
        apiImageUrl = (await this.uploadDataUrlForComment(apiImageUrl, text.slice(0, 80))) ?? undefined;
      }
      const dto = await this.apiSend<ApiBookCommentDto>('POST', '/api/messagebook', {
        text,
        parentId: parentId ?? undefined,
        imageUrl: apiImageUrl,
      });
      if (dto) {
        const stored = this.bookCommentFromApi(dto);
        if (!stored.imageUrl && imageUrl) stored.imageUrl = imageUrl;
        this.comments.update((list) => {
          const replace = (entries: CommunityComment[]): CommunityComment[] =>
            entries.map((entry) =>
              entry.id === newComment.id
                ? stored
                : { ...entry, replies: replace(entry.replies) },
            );
          return replace(list);
        });
        this.saveJson(COMMENTS_KEY, this.comments());
        return stored;
      }
    }
    return newComment;
  }

  private addNestedMessageBookReply(
    list: CommunityComment[],
    parentId: number,
    newReply: CommunityComment,
  ): CommunityComment[] {
    return list.map((c) => {
      if (c.id === parentId) {
        return {
          ...c,
          replyCount: (c.replyCount || 0) + 1,
          replies: [...c.replies, newReply],
        };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: this.addNestedMessageBookReply(c.replies, parentId, newReply),
        };
      }
      return c;
    });
  }

  async toggleReaction(commentId: number, reactionType: 'like' | 'dislike' | ReactionType): Promise<void> {
    const target: ReactionType =
      reactionType === 'like' ? 'Heart' : reactionType === 'dislike' ? 'Dislike' : reactionType;

    this.comments.update((list) =>
      list.map((post) => {
        if (post.id === commentId) {
          return this.computeReaction(post, target);
        }
        return {
          ...post,
          replies: post.replies.map((reply) =>
            reply.id === commentId ? this.computeReaction(reply, target) : reply,
          ),
        };
      }),
    );
    this.saveJson(COMMENTS_KEY, this.comments());
    // The reaction is stored on the Web API (POST /api/messagebook/{id}/reactions);
    // the counters it answers with are the ones the page keeps.
    if (this.apiLive) {
      const result = await this.apiSend<{ likeCount: number; dislikeCount: number; myReaction?: string | null }>(
        'POST',
        `/api/messagebook/${commentId}/reactions`,
        { type: target },
      );
      if (result) {
        this.comments.update((list) => {
          const apply = (entries: CommunityComment[]): CommunityComment[] =>
            entries.map((entry) =>
              entry.id === commentId
                ? {
                    ...entry,
                    likeCount: result.likeCount,
                    dislikeCount: result.dislikeCount,
                    myReaction: (result.myReaction as ReactionType | null) ?? null,
                  }
                : { ...entry, replies: apply(entry.replies) },
            );
          return apply(list);
        });
        this.saveJson(COMMENTS_KEY, this.comments());
      }
    }
  }

  reactToComment(commentId: number, reaction: ReactionType): void {
    this.toggleReaction(commentId, reaction);
  }

  async deleteComment(commentId: number): Promise<void> {
    this.comments.update((list) =>
      list
        .filter((post) => post.id !== commentId)
        .map((post) => ({
          ...post,
          replies: post.replies.filter((r) => r.id !== commentId),
          replyCount: post.replies.filter((r) => r.id !== commentId).length,
        })),
    );
    this.saveJson(COMMENTS_KEY, this.comments());
    // Server rows carry small int ids; the optimistic drafts of the guest tour use
    // time-based ids, which are never sent for deletion.
    if (this.apiLive && commentId > 0 && commentId <= 0x7fffffff) {
      await this.apiSend<unknown>('DELETE', `/api/messagebook/${commentId}`);
    }
  }

  private computeReaction(
    item: CommunityComment,
    target: ReactionType,
  ): CommunityComment {
    let likeCount = item.likeCount || 0;
    let dislikeCount = item.dislikeCount || 0;
    let myReaction: ReactionType | null = item.myReaction ?? null;
    let reactions: UserReaction[] = item.reactions ? [...item.reactions] : [];

    const user = this.currentUser();
    const currentAuthor: AuthorInfo = {
      id: user?.id ?? 1,
      fullName: user?.fullName || 'Kingshuk',
      profession: this.profile()?.profession || 'Travel Creator',
      profilePhotoUrl: this.memberPhotoUrl(),
    };

    if (myReaction === target) {
      myReaction = null;
      reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
      if (target === 'Dislike') dislikeCount = Math.max(0, dislikeCount - 1);
      else likeCount = Math.max(0, likeCount - 1);
    } else {
      if (myReaction === 'Dislike') dislikeCount = Math.max(0, dislikeCount - 1);
      else if (myReaction) likeCount = Math.max(0, likeCount - 1);

      myReaction = target;
      if (target === 'Dislike') dislikeCount++;
      else likeCount++;

      reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
      reactions.unshift({ user: currentAuthor, type: target, reactedAtUtc: new Date().toISOString() });
    }

    return { ...item, likeCount, dislikeCount, myReaction, reactions };
  }

  // ---------------------------------------------------------------------------
  // JOURNEY (Facebook-like Wall Feeds)
  // ---------------------------------------------------------------------------

  readonly MAX_COMPANIONS = 500;

  /** Tracks in-flight POST /api/journey requests so comments added immediately still reach the server. */
  private readonly pendingPostCreations = new Map<number, Promise<number | null>>();

  /** Updates a post across both the main Journey feed and any cached visitor wall feeds. */
  private updatePostEverywhere(
    matcher: (post: JourneyPost) => boolean,
    updater: (post: JourneyPost) => JourneyPost,
  ): void {
    this.journeyPosts.update((list) => list.map((p) => (matcher(p) ? updater(p) : p)));
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    this.visitorWallPosts.update((map) => {
      let changed = false;
      const next: Record<string, JourneyPost[]> = {};
      for (const [key, posts] of Object.entries(map)) {
        if (posts.some(matcher)) {
          changed = true;
          next[key] = posts.map((p) => (matcher(p) ? updater(p) : p));
        } else {
          next[key] = posts;
        }
      }
      return changed ? next : map;
    });
  }

  /** Fetches the full comment tree of a Journey post from `GET /api/journey/{id}/comments`. */
  async loadJourneyComments(postId: number): Promise<JourneyComment[]> {
    if (!this.apiLive || !(postId > 0) || postId >= 1_000_000_000_000) {
      const existing = this.journeyPosts().find((p) => p.id === postId || p.clientId === postId);
      return existing?.comments ?? [];
    }
    const dtos = await this.apiGet<ApiJourneyCommentDto[]>(`/api/journey/${postId}/comments`);
    if (!dtos) {
      const existing = this.journeyPosts().find((p) => p.id === postId);
      return existing?.comments ?? [];
    }
    const mapped = dtos.map((c) => this.journeyCommentFromApi(c));
    this.updatePostEverywhere(
      (p) => p.id === postId,
      (p) => {
        // Keep any optimistic local comments not yet in the server response.
        const serverIds = new Set<number>();
        const collectIds = (list: JourneyComment[]) => {
          for (const item of list) {
            serverIds.add(item.id);
            if (item.replies?.length) collectIds(item.replies);
          }
        };
        collectIds(mapped);
        const unsavedLocal = (p.comments ?? []).filter(
          (c) => c.id >= 1_000_000_000_000 && !serverIds.has(c.id),
        );
        const merged = [...mapped, ...unsavedLocal];
        return {
          ...p,
          comments: merged,
          commentCount: Math.max(p.commentCount ?? 0, merged.length),
        };
      },
    );
    return mapped;
  }

  createJourneyPost(
    text: string,
    mood?: string,
    location?: string,
    placeId?: string,
    imageUrl?: string,
    taggedCompanions?: AuthorInfo[],
    imageUrls?: string[],
    audience?: PostAudience,
    wallOwner?: { id: number; fullName: string },
  ): JourneyPost | null {
    if (this.blockedByGuard(text)) return null;
    const photoBytes = (imageUrls ?? (imageUrl ? [imageUrl] : [])).reduce((sum, url) => sum + imageBytes(url), 0);
    if (!this.storageAllows(utf8Bytes(text) + photoBytes)) return null;
    const user = this.currentUser();
    const profile = this.profile();
    const allImages = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : undefined);
    const primaryImage = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : undefined);
    const selfId = user?.id ?? profile?.id ?? 1;
    const newPost: JourneyPost = {
      id: generateUniqueId(),
      commentCount: 0,
      author: {
        id: selfId,
        uniqueId: profile?.uniqueId || user?.uniqueId || generate20DigitUid(selfId),
        fullName: user?.fullName || profile?.fullName || 'Kingshuk',
        profession: profile?.profession || 'Senior Software Engineer and founder of NeverBeen',
        profilePhotoUrl: this.memberPhotoUrl(),
        isVerified: !!user?.isVerified || !!profile?.isVerified,
      },
      text: text.trim(),
      imageUrl: primaryImage,
      imageUrls: allImages,
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      shareCount: 0,
      comments: [],
      reactions: [],
      taggedCompanions: taggedCompanions && taggedCompanions.length > 0 ? taggedCompanions : undefined,
      mood: mood || undefined,
      location: location || (profile?.cityName ? `${profile.cityName}, ${profile.countryName || ''}` : undefined),
      placeId: placeId || undefined,
      audience: audience ?? { mode: 'public', allowIds: [], denyIds: [] },
      hashtags: extractHashtags(text),
      wallOwnerId: wallOwner?.id,
      wallOwnerName: wallOwner?.fullName,
    };

    this.journeyPosts.update((list) => [newPost, ...list]);
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    if (wallOwner?.id) {
      const key = String(wallOwner.id);
      this.visitorWallPosts.update((map) =>
        map[key] ? { ...map, [key]: [newPost, ...map[key]] } : map,
      );
    }
    // Signed-in members write the post to the Web API (POST /api/journey); the stored
    // answer (database id, comments, reactions) replaces the optimistic copy.
    if (this.apiLive) {
      const creationPromise = this.createJourneyPostOnApi(newPost, taggedCompanions ?? [], wallOwner);
      this.pendingPostCreations.set(newPost.id, creationPromise);
      void creationPromise.finally(() => {
        this.pendingPostCreations.delete(newPost.id);
      });
    }
    return newPost;
  }

  /** POST /api/journey (+ the tagged companions), then reconciles the feed. */
  private async createJourneyPostOnApi(
    optimistic: JourneyPost,
    taggedCompanions: AuthorInfo[],
    wallOwner?: { id: number; fullName: string },
  ): Promise<number | null> {
    const dto = await this.apiSend<ApiJourneyPostDto>('POST', '/api/journey', {
      text: optimistic.text,
      imageUrls: optimistic.imageUrls ?? (optimistic.imageUrl ? [optimistic.imageUrl] : undefined),
      location: optimistic.location ?? undefined,
      mood: optimistic.mood ?? undefined,
      placeId: optimistic.placeId ?? undefined,
      hashtags: optimistic.hashtags ?? undefined,
      audience: optimistic.audience
        ? { mode: optimistic.audience.mode, allowIds: optimistic.audience.allowIds ?? [], denyIds: optimistic.audience.denyIds ?? [] }
        : undefined,
      taggedCompanionIds: taggedCompanions.map((a) => a.id).filter((id) => id > 0),
      wallOwnerId: optimistic.wallOwnerId ?? wallOwner?.id ?? undefined,
    });
    if (!dto) return null;
    const stored = this.journeyPostFromApi(dto);
    this.updatePostEverywhere(
      (p) => p.id === optimistic.id || p.clientId === optimistic.id,
      (p) => ({
        ...stored,
        clientId: optimistic.id,
        comments: stored.comments.length > 0 ? stored.comments : p.comments,
        commentCount: Math.max(stored.commentCount ?? 0, p.comments.length),
      }),
    );
    return stored.id;
  }

  shareJourneyPost(originalPostId: number, userThought?: string, audience?: PostAudience): JourneyPost | null {
    const original = this.journeyPosts().find((p) => p.id === originalPostId);
    if (!original) return null;
    if (userThought && this.blockedByGuard(userThought)) return null;
    if (!this.storageAllows(utf8Bytes(userThought))) return null;

    // Increment share count on original
    this.journeyPosts.update((list) =>
      list.map((p) =>
        p.id === originalPostId ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p,
      ),
    );

    const user = this.currentUser();
    const profile = this.profile();
    const sharedPost: JourneyPost = {
      id: generateUniqueId(),
      author: {
        id: user?.id ?? 1,
        fullName: user?.fullName || 'Kingshuk',
        profession: profile?.profession || 'Senior Software Engineer and founder of NeverBeen',
        profilePhotoUrl: this.memberPhotoUrl(),
        isVerified: !!user?.isVerified || !!profile?.isVerified,
      },
      text: userThought ? userThought.trim() : '',
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      shareCount: 0,
      comments: [],
      isShared: true,
      originalPost: { ...original },
      audience: audience ?? { mode: 'public', allowIds: [], denyIds: [] },
      hashtags: extractHashtags(userThought ?? ''),
    };

    this.journeyPosts.update((list) => [sharedPost, ...list]);
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    // Shares are Journey posts with an OriginalPostId on the Web API.
    if (this.apiLive) {
      void this.apiSend<ApiJourneyPostDto>('POST', '/api/journey', {
        text: sharedPost.text,
        originalPostId: originalPostId > 0 ? originalPostId : undefined,
        sharedText: sharedPost.text || undefined,
        audience: audience
          ? { mode: audience.mode, allowIds: audience.allowIds ?? [], denyIds: audience.denyIds ?? [] }
          : undefined,
      }).then((dto) => {
        if (!dto) return;
        const stored = this.journeyPostFromApi(dto);
        this.journeyPosts.update((list) => list.map((p) => (p.id === sharedPost.id ? stored : p)));
        this.saveJson(JOURNEY_KEY, this.journeyPosts());
      });
    }
    return sharedPost;
  }

  readonly WALL_EDIT_WINDOW_MS = 45 * 60 * 1000;

  canViewJourneyPost(post: JourneyPost, viewerId = this.currentUser()?.id ?? 1): boolean {
    if (Number(post.author.id) === Number(viewerId)) return true;
    if (this.authorBlockedViewer(post.author.id, viewerId)) return false;
    const audience = post.audience ?? { mode: 'public' as const };
    // Custom is an allow list. Companions who were not allowed cannot see it.
    if (audience.mode === 'custom') {
      return (audience.allowIds ?? []).some((id) => Number(id) === Number(viewerId));
    }
    if (audience.mode === 'only-me') return false;
    if (post.wallOwnerId != null && Number(post.wallOwnerId) === Number(viewerId)) return true;
    if (audience.mode === 'public') return true;
    const connected = this.companions().some((c) => c.id === post.author.id && c.status === 'connected');
    if (audience.mode === 'companions') return connected;
    return true;
  }

  authorBlockedViewer(authorId: number, viewerId = this.currentUser()?.id ?? 1): boolean {
    return !!this.companions().find((c) => c.id === authorId)?.blockedViewerIds?.includes(viewerId);
  }

  postsForWall(ownerId: number): JourneyPost[] {
    return this.visibleJourneyPosts().filter((p) => p.author.id === ownerId || p.wallOwnerId === ownerId);
  }

  postsForHashtag(tag: string): JourneyPost[] {
    const needle = tag.replace(/^#/, '').toLowerCase();
    const viewerId = this.currentUser()?.id ?? 1;
    const disabled = this.adminDisabledIds();
    return this.journeyPosts().filter((post) => {
      const tags = (post.hashtags?.length ? post.hashtags : extractHashtags(post.text)).map((t) => t.toLowerCase());
      if (!tags.includes(needle)) return false;
      if (this.blockedUserIds().includes(post.author.id) || disabled.has(Number(post.author.id))) return false;
      if (this.hiddenPostIds().includes(post.id)) return false;
      if (this.authorBlockedViewer(post.author.id, viewerId)) return false;
      return this.canViewJourneyPost(post, viewerId);
    });
  }

  canEditWallPost(post: JourneyPost, now = Date.now()): boolean {
    const me = this.currentUser()?.id ?? 1;
    if (post.author.id !== me || !post.wallOwnerId || post.wallOwnerId === me) return false;
    return now - new Date(post.createdAtUtc).getTime() < this.WALL_EDIT_WINDOW_MS;
  }

  updateJourneyPost(postId: number, patch: { text: string; mood?: string; audience?: PostAudience }): boolean {
    const post = this.journeyPosts().find((p) => p.id === postId);
    if (!post || !this.canEditWallPost(post)) return false;
    if (this.blockedByGuard(patch.text)) return false;
    if (!this.storageAllows(Math.max(0, utf8Bytes(patch.text) - utf8Bytes(post.text)))) return false;
    this.journeyPosts.update((list) =>
      list.map((p) =>
        p.id === postId
          ? {
              ...p,
              text: patch.text.trim(),
              mood: patch.mood,
              audience: patch.audience ?? p.audience,
              hashtags: extractHashtags(patch.text),
              editedAtUtc: new Date().toISOString(),
            }
          : p,
      ),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    // Wall-post edits are stored on the Web API (PUT /api/journey/{id}).
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      this.apiWrite('PUT', `/api/journey/${postId}`, {
        text: patch.text.trim(),
        mood: patch.mood ?? undefined,
        audience: (patch.audience ?? post.audience)
          ? {
              mode: (patch.audience ?? post.audience)!.mode,
              allowIds: (patch.audience ?? post.audience)!.allowIds ?? [],
              denyIds: (patch.audience ?? post.audience)!.denyIds ?? [],
            }
          : undefined,
      });
    }
    return true;
  }

  storageAllows(extraBytes = 0): boolean {
    if (this.storageReport().used + extraBytes <= this.storageReport().limit) return true;
    this.storageBlockMessage.set(
      'You have used all 25 MB of profile storage. Delete posts, photos, or chats before adding anything new.',
    );
    return false;
  }

  private blockedByGuard(text: string | null | undefined): boolean {
    const result = inspectCommunityText(text);
    if (result.ok) return false;
    this.contentGuardMessage.set(result.message);
    return true;
  }

  private measureStorage(): StorageReport {
    const me = this.currentUser()?.id ?? 1;
    const profile = this.profile();
    const mine = this.journeyPosts().filter((p) => p.author.id === me);
    const commentText = (comments: JourneyComment[]): number =>
      comments.reduce((sum, c) => {
        const own = c.author.id === me ? utf8Bytes(c.text) + imageBytes(c.imageUrl) : 0;
        return sum + own + commentText(c.replies ?? []);
      }, 0);
    const chatText = this.activeChatBoxes().reduce(
      (sum, box) => sum + box.messages.filter((m) => m.senderId === me).reduce((n, m) => n + utf8Bytes(m.text), 0),
      0,
    );
    const circleText = this.circles()
      .filter((c) => c.ownerId === me || (c.memberIds ?? []).includes(me))
      .reduce((sum, c) => sum + (c.messages ?? []).filter((m) => m.senderId === me).reduce((n, m) => n + utf8Bytes(m.text), 0), 0);
    const book = this.comments().filter((c) => c.author.id === me);
    const slices: StorageSlice[] = [
      { id: 'journey-text', label: 'Journey text', color: '#6366f1', bytes: mine.reduce((n, p) => n + utf8Bytes(p.text), 0) },
      {
        id: 'journey-photos',
        label: 'Journey photos',
        color: '#f59e0b',
        bytes: mine.reduce((n, p) => n + (p.imageUrls ?? (p.imageUrl ? [p.imageUrl] : [])).reduce((s, url) => s + imageBytes(url), 0), 0),
      },
      { id: 'comments', label: 'Comments', color: '#06b6d4', bytes: this.journeyPosts().reduce((n, p) => n + commentText(p.comments ?? []), 0) },
      { id: 'messagebook', label: 'MessageBook', color: '#3b82f6', bytes: book.reduce((n, c) => n + utf8Bytes(c.text) + imageBytes(c.imageUrl), 0) },
      { id: 'chats', label: 'Chats', color: '#8b5cf6', bytes: chatText + circleText },
      { id: 'gallery', label: 'Gallery', color: '#ec4899', bytes: (profile?.gallery ?? []).reduce((n, photo) => n + imageBytes(photo.url) + utf8Bytes(photo.caption), 0) },
      { id: 'profile', label: 'Profile & cover', color: '#10b981', bytes: imageBytes(profile?.profilePhotoUrl) + imageBytes(profile?.coverPhotoUrl) },
      {
        id: 'about',
        label: 'About me',
        color: '#64748b',
        bytes: utf8Bytes(profile?.aboutMe) + utf8Bytes(profile?.aboutMeDetails?.intro) + utf8Bytes(profile?.aboutMeDetails?.aboutThePerson),
      },
    ];
    return buildStorageReport(slices);
  }

  toggleJourneyLike(postId: number): void {
    this.reactToJourneyPost(postId, 'Heart');
  }

  reactToJourneyPost(postId: number, reaction: ReactionType): void {
    const user = this.currentUser();
    const prof = this.profile();
    const selfId = user?.id ?? prof?.id ?? 1;
    const currentAuthor: AuthorInfo = {
      id: selfId,
      uniqueId: prof?.uniqueId || user?.uniqueId || generate20DigitUid(selfId),
      fullName: user?.fullName || prof?.fullName || 'Kingshuk',
      profession: prof?.profession || 'Senior Software Engineer and founder of NeverBeen',
      profilePhotoUrl: this.memberPhotoUrl(),
    };

    this.updatePostEverywhere(
      (post) => post.id === postId || post.clientId === postId,
      (post) => {
        let reactions: UserReaction[] = post.reactions ? [...post.reactions] : [];
        const existing = reactions.find((r) => r.user.id === currentAuthor.id);
        let myReaction: ReactionType | null = post.myReaction ?? null;
        let isLiked = post.isLiked ?? false;
        let likeCount = post.likeCount || 0;

        if (existing && existing.type === reaction) {
          // Toggle off
          reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
          myReaction = null;
          isLiked = false;
          likeCount = Math.max(0, likeCount - 1);
        } else {
          reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
          reactions.unshift({ user: currentAuthor, type: reaction, reactedAtUtc: new Date().toISOString() });
          if (!existing) {
            likeCount++;
          }
          myReaction = reaction;
          isLiked = reaction !== 'Dislike';
        }

        const likers = reactions.map((r) => r.user);
        return { ...post, reactions, myReaction, isLiked, likeCount, likers };
      },
    );
    // Reactions are stored on the Web API (POST /api/journey/{id}/reactions); the
    // counters it answers with are the ones the feed keeps.
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      void this.apiSend<{ likeCount: number; myReaction?: string | null }>(
        'POST',
        `/api/journey/${postId}/reactions`,
        { reactionType: reaction },
      ).then((result) => {
        if (!result) return;
        this.updatePostEverywhere(
          (p) => p.id === postId || p.clientId === postId,
          (p) => ({
            ...p,
            likeCount: result.likeCount,
            myReaction: (result.myReaction as ReactionType | null) ?? null,
            isLiked: !!result.myReaction && result.myReaction !== 'Dislike',
          }),
        );
      });
    }
  }

  addJourneyComment(
    postId: number,
    text: string,
    parentCommentId?: number,
    imageUrl?: string,
    taggedCompanions?: AuthorInfo[],
  ): void {
    if (this.blockedByGuard(text) || !this.storageAllows(utf8Bytes(text) + imageBytes(imageUrl))) return;
    const user = this.currentUser();
    const prof = this.profile();
    const selfId = user?.id ?? prof?.id ?? 1;
    const newComment: JourneyComment = {
      id: generateUniqueId(),
      postId,
      author: {
        id: selfId,
        uniqueId: prof?.uniqueId || user?.uniqueId || generate20DigitUid(selfId),
        fullName: user?.fullName || prof?.fullName || 'Kingshuk',
        profession: prof?.profession || 'Senior Software Engineer and founder of NeverBeen',
        profilePhotoUrl: this.memberPhotoUrl(),
        isVerified: !!user?.isVerified || !!prof?.isVerified,
      },
      text: text.trim(),
      imageUrl: imageUrl || undefined,
      createdAtUtc: new Date().toISOString(),
      parentId: parentCommentId ?? null,
      likeCount: 0,
      isLiked: false,
      reactions: [],
      replies: [],
    };

    this.updatePostEverywhere(
      (post) => post.id === postId || post.clientId === postId,
      (post) => {
        const nextComments = parentCommentId
          ? this.addNestedJourneyReply(post.comments, parentCommentId, newComment)
          : [...post.comments, newComment];
        return {
          ...post,
          comments: nextComments,
          commentCount: Math.max((post.commentCount ?? post.comments.length) + 1, nextComments.length),
        };
      },
    );

    // Comments are written to the Web API (POST /api/journey/{id}/comments).
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      void this.persistJourneyCommentOnApi(postId, newComment, parentCommentId, imageUrl);
    }
  }

  /** Persists a Journey comment to `POST /api/journey/{id}/comments`, awaiting in-flight post creation if needed. */
  private async persistJourneyCommentOnApi(
    postId: number,
    newComment: JourneyComment,
    parentCommentId?: number,
    imageUrl?: string,
  ): Promise<void> {
    let targetPostId = postId;
    const pendingPost = this.pendingPostCreations.get(postId);
    if (pendingPost) {
      const resolvedId = await pendingPost;
      if (!resolvedId) return;
      targetPostId = resolvedId;
    } else {
      const matched = this.journeyPosts().find((p) => p.clientId === postId);
      if (matched) targetPostId = matched.id;
    }

    let apiImageUrl = imageUrl || undefined;
    if (apiImageUrl && apiImageUrl.startsWith('data:') && apiImageUrl.length > 1024) {
      const uploaded = await this.uploadDataUrlForComment(apiImageUrl, newComment.text.slice(0, 80));
      apiImageUrl = uploaded ?? undefined;
    }

    const validParentId =
      parentCommentId && parentCommentId > 0 && parentCommentId < 1_000_000_000_000
        ? parentCommentId
        : undefined;

    const dto = await this.apiSend<ApiJourneyCommentDto>(
      'POST',
      `/api/journey/${targetPostId}/comments`,
      {
        text: newComment.text || (imageUrl ? '📷' : ''),
        parentId: validParentId,
        imageUrl: apiImageUrl,
      },
    );
    if (!dto) return;
    const stored = this.journeyCommentFromApi(dto);
    if (!stored.imageUrl && newComment.imageUrl) {
      stored.imageUrl = newComment.imageUrl;
    }
    this.updatePostEverywhere(
      (post) => post.id === targetPostId || post.id === postId || post.clientId === postId,
      (post) => {
        const replace = (comments: JourneyComment[]): JourneyComment[] =>
          comments.map((c) =>
            c.id === newComment.id
              ? {
                  ...stored,
                  replies: stored.replies?.length ? stored.replies : (c.replies ?? []),
                }
              : { ...c, replies: replace(c.replies ?? []) },
          );
        return { ...post, comments: replace(post.comments) };
      },
    );
  }

  /** Converts a base64 data URL into a short API gallery URL so it fits JourneyComment.ImageUrl (MaxLength 1024). */
  private async uploadDataUrlForComment(dataUrl: string, caption?: string): Promise<string | null> {
    try {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
      if (!match) return null;
      const mime = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      const ext = mime.split('/')[1] || 'jpg';
      const file = new File([bytes], `comment-${Date.now()}.${ext}`, { type: mime });
      const dto = await this.uploadGalleryPhotoToApi(file, caption);
      return dto?.url ?? null;
    } catch {
      return null;
    }
  }

  private addNestedJourneyReply(
    comments: JourneyComment[],
    parentId: number,
    newReply: JourneyComment,
  ): JourneyComment[] {
    return comments.map((c) => {
      if (c.id === parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
        };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: this.addNestedJourneyReply(c.replies, parentId, newReply),
        };
      }
      return c;
    });
  }

  toggleJourneyCommentLike(postId: number, commentId: number): void {
    this.reactToJourneyComment(postId, commentId, 'Heart');
  }

  reactToJourneyComment(postId: number, commentId: number, reaction: ReactionType): void {
    const user = this.currentUser();
    const prof = this.profile();
    const selfId = user?.id ?? prof?.id ?? 1;
    const currentAuthor: AuthorInfo = {
      id: selfId,
      uniqueId: prof?.uniqueId || user?.uniqueId || generate20DigitUid(selfId),
      fullName: user?.fullName || prof?.fullName || 'Kingshuk',
      profession: prof?.profession || 'Senior Software Engineer and founder of NeverBeen',
      profilePhotoUrl: this.memberPhotoUrl(),
    };

    this.updatePostEverywhere(
      (post) => post.id === postId || post.clientId === postId,
      (post) => ({
        ...post,
        comments: this.applyCommentReactionRecursive(post.comments, commentId, reaction, currentAuthor),
      }),
    );
    // Comment reactions live on the Web API too (POST /api/journey/comments/{id}/reactions);
    // the counter it answers with replaces the optimistic one.
    if (this.apiLive && commentId > 0 && commentId <= 0x7fffffffffffffff) {
      void this.apiSend<{ likeCount: number }>(
        'POST',
        `/api/journey/comments/${commentId}/reactions`,
        { reactionType: reaction },
      ).then((result) => {
        if (!result) return;
        this.updatePostEverywhere(
          () => true,
          (post) => ({
            ...post,
            comments: this.applyCommentLikeCount(post.comments, commentId, result.likeCount),
          }),
        );
      });
    }
  }

  /** Applies the Web API's authoritative like counter to one journey comment. */
  private applyCommentLikeCount(
    comments: JourneyComment[],
    targetId: number,
    likeCount: number,
  ): JourneyComment[] {
    return comments.map((c) => {
      if (c.id === targetId) return { ...c, likeCount };
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: this.applyCommentLikeCount(c.replies, targetId, likeCount) };
      }
      return c;
    });
  }

  private applyCommentReactionRecursive(
    comments: JourneyComment[],
    targetId: number,
    reaction: ReactionType,
    currentAuthor: AuthorInfo,
  ): JourneyComment[] {
    return comments.map((c) => {
      if (c.id === targetId) {
        let reactions: UserReaction[] = c.reactions ? [...c.reactions] : [];
        const existing = reactions.find((r) => r.user.id === currentAuthor.id);
        let myReaction: ReactionType | null = c.myReaction ?? null;
        let isLiked = c.isLiked ?? false;
        let likeCount = c.likeCount || 0;

        if (existing && existing.type === reaction) {
          // Toggle off
          reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
          myReaction = null;
          isLiked = false;
          likeCount = Math.max(0, likeCount - 1);
        } else {
          reactions = reactions.filter((r) => r.user.id !== currentAuthor.id);
          reactions.unshift({ user: currentAuthor, type: reaction, reactedAtUtc: new Date().toISOString() });
          if (!existing) {
            likeCount++;
          }
          myReaction = reaction;
          isLiked = reaction !== 'Dislike';
        }

        return { ...c, reactions, myReaction, isLiked, likeCount };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: this.applyCommentReactionRecursive(c.replies, targetId, reaction, currentAuthor),
        };
      }
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // MEMBER DIRECTORY (search any traveler + open any profile — Requirement A)
  //
  // Guest mode carries the whole seeded directory in this browser, so a name
  // typed into the search box always finds somebody. Signed-in members only
  // hold their real companions locally, so the directory is asked on the Web
  // API instead:
  //   GET /api/users/search?query=…        find members by name (Requirement A)
  //   GET /api/users/{id} · /uid/{uid}     open any member's profile
  //   GET /api/journey?authorId=…          their wall posts
  //   GET /api/gallery/users/{id}          their gallery
  //   GET /api/follows/counts/{id}         their follower / following counts
  // Every traveler the directory answers is upserted into `companions()`, so
  // the relationship buttons (companion request, follow) and the profile URL
  // (?id=<20-digit uid>) keep working with the exact same code paths the
  // guest tour uses.
  // ---------------------------------------------------------------------------

  /** Extra profile data of a visited member, fetched from the Web API per visitor. */
  readonly visitorWallPosts = signal<Record<string, JourneyPost[]>>({});
  readonly visitorGalleries = signal<Record<string, GalleryPhoto[]>>({});
  readonly visitorFollowCounts = signal<Record<string, ApiFollowCountsDto>>({});

  /**
   * Inserts or updates one traveler in the companions list (never duplicates),
   * so directory hits behave exactly like the seeded directory of the guest
   * tour: their status, follow state and profile URL resolve everywhere.
   */
  upsertCompanion(companion: Companion): void {
    const numId = Number(companion.id);
    if (!numId || Number.isNaN(numId)) return;
    this.companions.update((list) => {
      const index = list.findIndex((c) => Number(c.id) === numId);
      if (index === -1) return [...list, companion];
      const existing = list[index];
      return list.map((c, i) =>
        i === index
          ? {
              ...companion,
              // Keep the richer local copy of fields a directory hit does not carry.
              coverPhotoUrl: companion.coverPhotoUrl ?? existing.coverPhotoUrl,
              bio: companion.bio ?? existing.bio,
              aboutMe: companion.aboutMe ?? existing.aboutMe,
              aboutMeDetails: companion.aboutMeDetails ?? existing.aboutMeDetails,
              gallery: companion.gallery ?? existing.gallery,
              connectedCompanionIds: companion.connectedCompanionIds ?? existing.connectedCompanionIds,
            }
          : c,
      );
    });
    this.saveJson(COMPANIONS_KEY, this.companions());
  }

  /**
   * Local directory search — the same matching rules the profile page search
   * uses (name / city / country / profession). The signed-in member is part of
   * the directory too: the Web API's member search never returns the member
   * themself, and the seeded guest directory does not list the founder as a
   * companion — without this, a member typing their own name (e.g. the founder
   * "Kingshuk") would always get "No travelers or circles match".
   */
  searchCompanionsLocally(query: string): Companion[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const matches = (c: Companion): boolean => {
      const haystack = [
        c.fullName,
        c.city,
        c.country,
        c.profession,
        c.bio,
        c.aboutMe,
        c.uniqueId,
        c.aboutMeDetails?.hometown,
        c.aboutMeDetails?.location,
        c.aboutMeDetails?.contactEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(q)) return true;
      return tokens.length > 1 && tokens.every((token) => haystack.includes(token));
    };
    const hits = this.visibleCompanions().filter(matches);
    const me =
      this.currentUser() || this.profile() ? this.getCurrentUserAsCompanion() : null;
    if (me && matches(me) && !hits.some((c) => Number(c.id) === Number(me.id))) {
      // Your own card: opens your profile, but is never a Connect / Follow target.
      hits.unshift({ ...me, status: 'none' });
    }
    return hits;
  }

  /** Set once `GET /api/users/search` answers HTTP 404 (unapplied backend patch). */
  private usersDirectoryEndpointMissing = false;
  /** User ids already probed on `GET /api/companions/{id}` when `/api/users/*` is missing. */
  private readonly probedCompanionDirectoryIds = new Set<number>();
  private directoryFallbackPromise: Promise<void> | null = null;

  /**
   * Harvests user / author records already present in API feed, message-book, follow, chat
   * and notification responses into `companions()` so known community members are
   * immediately searchable without extra HTTP round-trips.
   */
  private harvestKnownAuthorsFromApi(sources: {
    me: number;
    followers: ApiFollowDto[] | null;
    following: ApiFollowDto[] | null;
    journey: ApiJourneyPostDto[] | null;
    book: ApiBookCommentDto[] | null;
    conversations: ApiConversationDto[] | null;
    notifications: ApiNotificationDto[] | null;
  }): void {
    const existingIds = new Set<number>(this.companions().map((c) => Number(c.id)));
    existingIds.add(Number(sources.me));
    const discovered = new Map<number, Companion>();

    const addAuthor = (a?: {
      id?: number | null;
      uniqueId?: string | null;
      fullName?: string | null;
      profilePhotoUrl?: string | null;
      profession?: string | null;
      country?: string | null;
      city?: string | null;
      isVerified?: boolean | null;
    } | null) => {
      const id = Number(a?.id ?? 0);
      if (!id || id <= 0 || existingIds.has(id) || discovered.has(id)) return;
      const name = (a?.fullName ?? '').trim();
      if (!name) return;
      discovered.set(id, {
        id,
        uniqueId: a?.uniqueId ?? generate20DigitUid(id),
        fullName: name,
        profilePhotoUrl: this.absoluteApiUrl(a?.profilePhotoUrl) ?? '',
        country: a?.country ?? '',
        city: a?.city ?? '',
        profession: a?.profession ?? '',
        isOnline: false,
        mutualCompanionsCount: 0,
        status: 'none',
        isVerified: !!a?.isVerified,
      });
    };

    for (const f of sources.followers ?? []) addAuthor(f);
    for (const f of sources.following ?? []) addAuthor(f);
    for (const post of sources.journey ?? []) {
      addAuthor(post.author);
      for (const tagged of post.taggedCompanions ?? []) addAuthor(tagged);
      for (const r of post.reactions ?? []) addAuthor(r.user);
    }
    const harvestBook = (items: ApiBookCommentDto[] | null | undefined) => {
      for (const item of items ?? []) {
        addAuthor(item.author);
        if (item.replies?.length) harvestBook(item.replies);
      }
    };
    harvestBook(sources.book);
    for (const conv of sources.conversations ?? []) {
      for (const p of conv.participants ?? []) addAuthor(p);
    }
    for (const n of sources.notifications ?? []) {
      addAuthor(n.fromUser);
    }

    if (discovered.size > 0) {
      for (const comp of discovered.values()) {
        this.upsertCompanion(comp);
      }
    }
  }

  /**
   * Fallback directory discovery when `GET /api/users/search` returns HTTP 404 on the Web API:
   * `GET /api/companions/{id}` is live on `CompanionsController` and returns a `CompanionDto`
   * for any registered user id in `_db.Users`.
   */
  private async discoverUsersViaCompanionsEndpoint(): Promise<void> {
    if (!this.apiLive) return;
    if (this.directoryFallbackPromise) return this.directoryFallbackPromise;

    const run = async () => {
      const me = this.myId();
      const maxExisting = this.companions().reduce(
        (max, c) => (c.id > 0 && c.id < 10000 ? Math.max(max, Number(c.id)) : max),
        me > 0 && me < 10000 ? me : 1,
      );
      const upperBound = Math.min(Math.max(maxExisting + 15, 25), 60);
      const candidateIds: number[] = [];
      for (let id = 1; id <= upperBound; id++) {
        if (id === me || this.probedCompanionDirectoryIds.has(id)) continue;
        if (this.companions().some((c) => Number(c.id) === id && c.country && c.city)) {
          this.probedCompanionDirectoryIds.add(id);
          continue;
        }
        candidateIds.push(id);
      }

      const batchSize = 5;
      let consecutiveMisses = 0;
      for (let i = 0; i < candidateIds.length; i += batchSize) {
        const batch = candidateIds.slice(i, i + batchSize);
        for (const id of batch) this.probedCompanionDirectoryIds.add(id);
        const results = await Promise.all(
          batch.map((id) => this.apiGetWithStatus<ApiCompanionDto>(`/api/companions/${id}`, true)),
        );
        let foundInBatch = 0;
        for (const res of results) {
          if (res.data && res.data.id) {
            foundInBatch++;
            const comp = this.companionFromApi(res.data);
            this.upsertCompanion(comp);
            this.applyApiFollowFlags([comp]);
          }
        }
        if (foundInBatch === 0) {
          consecutiveMisses += batch.length;
          if (consecutiveMisses >= 10) break;
        } else {
          consecutiveMisses = 0;
        }
      }
    };

    this.directoryFallbackPromise = run().finally(() => {
      this.directoryFallbackPromise = null;
    });
    return this.directoryFallbackPromise;
  }

  /**
   * Finds members by the typed name. Signed-in members ask the Web API's
   * directory (`GET /api/users/search`) — which knows every registered
   * traveler, not only this member's companions; the guest tour and any
   * API hiccup fall back to the directory held in this browser. The hits are
   * merged into `companions()` (with their follow state into the local
   * graph), so opening their profile, sending a companion request and
   * following them all work straight from the drop-down.
   */
  async searchUsers(query: string): Promise<Companion[]> {
    const q = query.trim();
    if (!q) return [];

    if (this.apiLive) {
      if (this.usersDirectoryEndpointMissing) {
        await this.discoverUsersViaCompanionsEndpoint();
        return this.searchCompanionsLocally(q);
      }
      const { data: dtos, status } = await this.apiGetWithStatus<ApiUserSearchResultDto[]>(
        `/api/users/search?query=${encodeURIComponent(q)}&limit=25`,
      );
      if (dtos) {
        const hits = dtos.map((dto) => this.searchResultFromApi(dto));
        for (const hit of hits) this.upsertCompanion(hit);
        this.applyApiFollowFlags(hits);
        // Answer with the merged directory entries plus any local matches (including self).
        const byId = new Map(hits.map((h) => [Number(h.id), h]));
        const remoteMatched = this.companions()
          .filter((c) => byId.has(Number(c.id)))
          .filter((c) => !this.isUserBlocked(c.id));
        const localMatched = this.searchCompanionsLocally(q);
        const combined: Companion[] = [...remoteMatched];
        for (const loc of localMatched) {
          if (!combined.some((c) => Number(c.id) === Number(loc.id))) {
            combined.push(loc);
          }
        }
        return combined;
      }
      if (status === 404) {
        this.usersDirectoryEndpointMissing = true;
        await this.discoverUsersViaCompanionsEndpoint();
      }
      // The API could not be reached — fall through to the local directory.
    }
    return this.searchCompanionsLocally(q);
  }

  /** Merges the directory's follow flags into the local follow graph (additions only). */
  private applyApiFollowFlags(hits: Companion[]): void {
    const me = this.myId();
    this.follows.update((graph) => {
      const key = String(me);
      const list = new Set(graph[key] ?? []);
      let changed = false;
      for (const hit of hits) {
        if (hit.isFollowing && Number(hit.id) !== me && !list.has(Number(hit.id))) {
          list.add(Number(hit.id));
          changed = true;
        }
      }
      return changed ? { ...graph, [key]: Array.from(list) } : graph;
    });
    this.persistFollows();
  }

  /** Extracts the numeric userId encoded in a 20-digit NeverBeen UID (`8920153401` + 10 digits) or numeric string. */
  private static numericIdFromUid(uid: string): number | null {
    const trimmed = uid.trim();
    if (/^8920153401\d{10}$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed.slice(10), 10);
      return parsed > 0 ? parsed : null;
    }
    if (/^\d+$/.test(trimmed) && trimmed.length <= 10) {
      const parsed = Number.parseInt(trimmed, 10);
      return parsed > 0 ? parsed : null;
    }
    return null;
  }

  /**
   * Opens any member by the id used in profile URLs: the numeric member id or
   * the 20-digit unique id. Local directory first; a signed-in member's
   * unknown id is resolved on the Web API (`GET /api/users/uid/{uid}` /
   * `GET /api/users/{id}`) and upserted, exactly like the guest tour resolves
   * every seeded traveler. `null` = the API said "no such member" (or is
   * unreachable and the browser directory does not know the id either).
   */
  async loadUserByUid(uid: string): Promise<Companion | null> {
    const local = this.companions().find(
      (c) =>
        c.uniqueId === uid ||
        String(c.id) === uid ||
        generate20DigitUid(c.id) === uid,
    );
    if (local) return local;
    if (!this.apiLive) return null;

    const trimmed = uid.trim();
    const path = /^\d{20}$/.test(trimmed)
      ? `/api/users/uid/${trimmed}`
      : /^\d+$/.test(trimmed)
        ? `/api/users/${trimmed}`
        : null;
    if (!path) return null;

    let dto: ApiCompanionDto | null = null;
    if (!this.usersDirectoryEndpointMissing) {
      const res = await this.apiGetWithStatus<ApiCompanionDto>(path);
      dto = res.data;
      if (!dto && res.status === 404) {
        const numericId = CommunityService.numericIdFromUid(trimmed);
        if (numericId && numericId > 0 && numericId <= 0x7fffffff) {
          dto = await this.apiGet<ApiCompanionDto>(`/api/companions/${numericId}`);
        }
      }
    } else {
      const numericId = CommunityService.numericIdFromUid(trimmed);
      if (numericId && numericId > 0 && numericId <= 0x7fffffff) {
        dto = await this.apiGet<ApiCompanionDto>(`/api/companions/${numericId}`);
      }
    }
    if (!dto) return null;
    const companion = this.companionFromApi(dto);
    this.upsertCompanion(companion);
    this.applyApiFollowFlags([companion]);
    return this.companions().find((c) => Number(c.id) === Number(companion.id)) ?? companion;
  }

  /** Opens any member by their numeric id (directory hit, post author, …). */
  async loadUserById(userId: number, force = false): Promise<Companion | null> {
    const numId = Number(userId);
    const local = this.companions().find((c) => Number(c.id) === numId);
    if (local && !force) return local;
    if (!this.apiLive || !(numId > 0) || numId > 0x7fffffff) return local ?? null;

    // GET /api/users/{id} answers the same CompanionDto the companions endpoints
    // use — cover photo, About-me JSON, relationship status, follow state included.
    let dto: ApiCompanionDto | null = null;
    if (!this.usersDirectoryEndpointMissing) {
      const res = await this.apiGetWithStatus<ApiCompanionDto>(`/api/users/${numId}`);
      dto = res.data;
      if (!dto && res.status === 404) {
        dto = await this.apiGet<ApiCompanionDto>(`/api/companions/${numId}`);
      }
    } else {
      dto = await this.apiGet<ApiCompanionDto>(`/api/companions/${numId}`);
    }
    if (!dto) return local ?? null;
    const companion = this.companionFromApi(dto);
    this.upsertCompanion(companion);
    this.applyApiFollowFlags([companion]);
    return this.companions().find((c) => Number(c.id) === numId) ?? companion;
  }

  /**
   * The extra datasets of a visited profile (their wall posts, gallery and
   * follower counts), read from the Web API so a signed-in member sees any
   * traveler's profile as completely as the guest tour does. Each part that
   * the API cannot answer keeps whatever this browser already holds.
   */
  async loadVisitorExtras(visitorId: number): Promise<void> {
    const numId = Number(visitorId);
    if (!this.apiLive || !(numId > 0) || numId > 0x7fffffff) return;
    const key = String(numId);

    const [wall, gallery, counts] = await Promise.all([
      this.apiGet<PagedResult<ApiJourneyPostDto>>(`/api/journey?authorId=${numId}&pageSize=50`),
      this.apiGet<ApiGalleryPhotoDto[]>(`/api/gallery/users/${numId}`),
      this.apiGet<ApiFollowCountsDto>(`/api/follows/counts/${numId}`),
    ]);

    if (wall) {
      const existingWall = this.visitorWallPosts()[key] ?? [];
      const existingMain = this.journeyPosts();
      const postsToHydrateComments: number[] = [];
      const mapped = wall.items.map((dto) => {
        const post = this.journeyPostFromApi(dto);
        const prev =
          existingWall.find((p) => p.id === post.id) ??
          existingMain.find((p) => p.id === post.id);
        if (post.comments.length === 0 && prev && prev.comments.length > 0) {
          post.comments = prev.comments;
        }
        if ((dto.commentCount ?? 0) > 0 && (!dto.comments || dto.comments.length === 0)) {
          postsToHydrateComments.push(post.id);
        }
        return post;
      });
      this.visitorWallPosts.update((map) => ({
        ...map,
        [key]: mapped,
      }));
      for (const postId of postsToHydrateComments) {
        void this.loadJourneyComments(postId);
      }
    }
    if (gallery) {
      const photos = gallery.map((photo) => this.galleryPhotoFromApi(photo));
      this.visitorGalleries.update((map) => ({ ...map, [key]: photos }));
      // The visitor card renders its gallery from the companions entry.
      this.companions.update((list) =>
        list.map((c) => (Number(c.id) === numId ? { ...c, gallery: photos } : c)),
      );
      this.saveJson(COMPANIONS_KEY, this.companions());
    }
    if (counts) {
      this.visitorFollowCounts.update((map) => ({ ...map, [key]: counts }));
    }
  }

  /** Follow counters the Web API last answered for `userId` (self or a visitor). */
  private apiFollowCountsFor(userId: number): ApiFollowCountsDto | null {
    const numId = Number(userId);
    if (numId === this.myId()) return this.followCounts();
    return this.visitorFollowCounts()[String(numId)] ?? null;
  }

  // ---------------------------------------------------------------------------
  // COMPANIONS & REQUESTS
  // ---------------------------------------------------------------------------

  sendCompanionshipRequest(targetUserId: number): void {
    const numId = Number(targetUserId);
    this.companions.update((list) =>
      list.map((c) => (Number(c.id) === numId ? { ...c, status: 'pending_outgoing' as const } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
    // Stored on the Web API (POST /api/companions/{id}/request) for signed-in members.
    if (this.apiLive && numId > 0) {
      // A request the Web API did not store was never delivered: the optimistic state is withdrawn.
      void this.apiSendReporting<unknown>('POST', `/api/companions/${numId}/request`).then(({ error }) => {
        if (!error) return;
        this.companions.update((list) =>
          list.map((c) =>
            Number(c.id) === numId && c.status === 'pending_outgoing' ? { ...c, status: 'none' as const } : c,
          ),
        );
        this.saveJson(COMPANIONS_KEY, this.companions());
      });
    }
    // Sending a companionship request follows that traveler by default.
    this.follow(numId);
  }

  cancelCompanionshipRequest(targetUserId: number): void {
    const numId = Number(targetUserId);
    this.companions.update((list) =>
      list.map((c) => (Number(c.id) === numId ? { ...c, status: 'none' as const } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
    if (this.apiLive && numId > 0) this.apiWrite('DELETE', `/api/companions/${numId}/request`);
  }

  approveCompanionshipRequest(notificationId: number, fromUserId: number): boolean {
    const connectedCount = this.companions().filter((c) => c.status === 'connected').length;
    if (connectedCount >= this.MAX_COMPANIONS) {
      return false;
    }

    // Connect in companions
    this.companions.update((list) =>
      list.map((c) => (c.id === fromUserId ? { ...c, status: 'connected' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());

    // Update notification status
    this.notifications.update((list) =>
      list.map((n) =>
        n.id === notificationId ? { ...n, status: 'approved', isRead: true } : n,
      ),
    );
    this.saveJson(NOTIFS_KEY, this.notifications());
    // Accepted on the Web API (POST /api/companions/{id}/accept); the fresh
    // companions list and notification answer replace the optimistic state.
    if (this.apiLive && fromUserId > 0) {
      void this.apiSend<unknown>('POST', `/api/companions/${fromUserId}/accept`).then((result) => {
        void this.refreshCompanionsAndNotifications();
        return result;
      });
      this.markNotificationReadOnApi(notificationId);
    }
    return true;
  }

  rejectCompanionshipRequest(notificationId: number, fromUserId: number): void {
    this.companions.update((list) =>
      list.map((c) => (c.id === fromUserId ? { ...c, status: 'none' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());

    this.notifications.update((list) =>
      list.map((n) =>
        n.id === notificationId ? { ...n, status: 'rejected', isRead: true } : n,
      ),
    );
    this.saveJson(NOTIFS_KEY, this.notifications());
    if (this.apiLive && fromUserId > 0) {
      this.apiWrite('POST', `/api/companions/${fromUserId}/reject`);
      this.markNotificationReadOnApi(notificationId);
    }
  }

  removeCompanion(companionId: number): void {
    this.companions.update((list) =>
      list.map((c) => (c.id === companionId ? { ...c, status: 'none' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
    if (this.apiLive && companionId > 0) {
      this.apiWrite('DELETE', `/api/companions/${companionId}`);
    }
  }

  /** Re-reads the companions list and the notifications from the Web API. */
  private async refreshCompanionsAndNotifications(): Promise<void> {
    const [companions, notifications] = await Promise.all([
      this.apiGet<ApiCompanionDto[]>('/api/companions'),
      this.apiGet<ApiNotificationDto[]>('/api/notifications'),
    ]);
    if (companions) {
      this.companions.set(companions.map((dto) => this.companionFromApi(dto)));
      this.saveJson(COMPANIONS_KEY, this.companions());
    }
    if (notifications) {
      this.notifications.set(notifications.map((dto) => this.notificationFromApi(dto)));
      this.saveJson(NOTIFS_KEY, this.notifications());
    }
  }

  /** Marks one notification read on the Web API (small int ids only). */
  private markNotificationReadOnApi(notificationId: number): void {
    if (this.apiLive && notificationId > 0 && notificationId <= 0x7fffffffffffffff) {
      this.apiWrite('POST', `/api/notifications/${notificationId}/read`);
    }
  }

  // ---------------------------------------------------------------------------
  // LIVE UPDATES — requests, notifications and chats reach the other member without
  // a reload. The Web API has no push channel, so the signed-in page re-reads them on
  // a short timer, and again when the tab is back in focus.
  // ---------------------------------------------------------------------------

  /** How often a signed-in member's page re-reads requests, notifications and chats. */
  private static readonly LIVE_POLL_MS = 4000;
  private liveTimer: ReturnType<typeof setInterval> | null = null;
  private livePollInFlight = false;
  /** Latest message seen per 1:1 conversation, so a new message can be told apart from history. */
  private readonly lastSeenConversationMessage = new Map<number, number>();
  /** Chat bubbles that the Web API has not stored yet. */
  private readonly unsentChatIds = new Set<number>();
  /** The conversation start in flight per companion. */
  private readonly conversationStarts = new Map<number, Promise<ApiConversationDto | null>>();
  /** Circles being saved to the Web API, keyed by their draft id. */
  private readonly pendingCircleSaves = new Map<number, Promise<Circle | null>>();

  /** The signed-in member's photo: the profile first, the session user second. */
  readonly memberPhotoUrl = computed(
    () => this.profile()?.profilePhotoUrl || this.currentUser()?.profilePhotoUrl || '',
  );

  private readonly onPageVisible = (): void => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      void this.pollLiveUpdates();
    }
  };

  private startLiveUpdates(): void {
    if (this.liveTimer !== null || !this.apiLive) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.liveTimer = setInterval(() => void this.pollLiveUpdates(), CommunityService.LIVE_POLL_MS);
    window.addEventListener('focus', this.onPageVisible);
    document.addEventListener('visibilitychange', this.onPageVisible);
  }

  private stopLiveUpdates(): void {
    if (this.liveTimer !== null) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
    if (typeof window !== 'undefined') window.removeEventListener('focus', this.onPageVisible);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onPageVisible);
  }

  /** One live round: requests and notifications, the chat inbox, and every open Circle chat. */
  private async pollLiveUpdates(): Promise<void> {
    if (!this.apiLive) {
      this.stopLiveUpdates();
      return;
    }
    if (this.livePollInFlight) return;
    this.livePollInFlight = true;
    try {
      await Promise.all([
        this.refreshCompanionsAndNotifications(),
        this.refreshChatInbox(),
        ...this.activeChatBoxes()
          .filter((b) => !!b.circleId)
          .map((b) => this.refreshCircleMessages(b.circleId as number)),
      ]);
    } finally {
      this.livePollInFlight = false;
    }
  }

  /**
   * Reads the chat inbox. A new message from a companion pops their chat open (or un-minimizes
   * it) and refreshes the chat when it is open.
   */
  private async refreshChatInbox(): Promise<void> {
    const conversations = await this.apiGet<ApiConversationDto[]>('/api/messages/conversations');
    if (!conversations) return;
    const me = this.myId();
    this.pendingChats.set(this.pendingChatsFromApi(conversations));

    for (const conversation of conversations) {
      const last = conversation.lastMessage;
      // Circle chats are refreshed through their own messages.
      if (!last || conversation.circleId) continue;
      const previous = this.lastSeenConversationMessage.get(conversation.id);
      this.lastSeenConversationMessage.set(conversation.id, last.id);
      // The first look only records the baseline; nothing is "new" yet.
      if (previous === undefined || previous === last.id) continue;

      const fromPartner = (last.senderId ?? 0) !== me;
      const open = this.activeChatBoxes().find((b) => b.conversationId === conversation.id);
      if (open) {
        await this.refreshOpenConversation(open.companionId, conversation.id);
        const shown = this.activeChatBoxes().find((b) => b.conversationId === conversation.id);
        if (shown?.isMinimized && fromPartner) {
          this.activeChatBoxes.update((boxes) =>
            boxes.map((b) => (b.conversationId === conversation.id ? { ...b, isMinimized: false } : b)),
          );
        }
        if (shown && !shown.isMinimized && fromPartner) {
          this.apiWrite('POST', `/api/messages/conversations/${conversation.id}/read`);
        }
      } else if (fromPartner && !conversation.isGroup) {
        const partner = conversation.participants?.find((p) => p.id !== me);
        if (partner) this.popUpChat(partner);
      }
    }
  }

  /** Opens the chat with a companion who has just written to this member. */
  private popUpChat(partner: ApiAuthorDto): void {
    const companion =
      this.companions().find((c) => Number(c.id) === partner.id) ??
      this.followPersonFromApi(partner.id) ??
      this.chatPartnerAsCompanion(partner);
    this.openChatBox(companion);
  }

  private chatPartnerAsCompanion(partner: ApiAuthorDto): Companion {
    return {
      id: partner.id,
      uniqueId: partner.uniqueId ?? generate20DigitUid(partner.id),
      fullName: partner.fullName ?? 'NeverBeen Traveler',
      profilePhotoUrl: this.absoluteApiUrl(partner.profilePhotoUrl) ?? '',
      country: partner.country ?? '',
      city: partner.city ?? '',
      profession: partner.profession ?? '',
      isOnline: false,
      mutualCompanionsCount: 0,
      status: 'none',
    };
  }

  /** Re-reads one open 1:1 chat's history into its box. */
  private async refreshOpenConversation(companionId: number, conversationId: number): Promise<void> {
    const history = await this.apiGet<ApiChatMessageDto[]>(
      `/api/messages/conversations/${conversationId}?pageSize=100`,
    );
    if (!history) return;
    const incoming = history.map((dto) => this.chatMessageFromApi(dto));
    this.activeChatBoxes.update((boxes) =>
      boxes.map((box) =>
        box.companionId === companionId
          ? { ...box, messages: this.mergeChatMessages(box.messages, incoming) }
          : box,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Admin Console operations (persisted exactly like the member-side mutations)
  // ---------------------------------------------------------------------------

  /** Admin: patch any fields on a community member (verification, lock, status…). */
  adminPatchCompanion(companionId: number, patch: Partial<Companion>): void {
    this.companions.update((list) =>
      list.map((c) => (Number(c.id) === Number(companionId) ? { ...c, ...patch } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
  }

  /** Admin: permanently remove a community member from the directory. */
  adminDeleteCompanion(companionId: number): void {
    this.companions.update((list) => list.filter((c) => Number(c.id) !== Number(companionId)));
    this.saveJson(COMPANIONS_KEY, this.companions());
  }

  /**
   * Admin: replace a whole community dataset in memory and persist it
   * (used by Data Management — retention purges, erasure, quality fixes, restores).
   */
  adminReplaceDataset(key: string, value: unknown): boolean {
    switch (key) {
      case COMPANIONS_KEY:
        this.companions.set(value as Companion[]);
        break;
      case JOURNEY_KEY:
        this.journeyPosts.set(value as JourneyPost[]);
        break;
      case COMMENTS_KEY:
        this.comments.set(value as CommunityComment[]);
        break;
      case CIRCLES_KEY:
        this.circles.set(value as Circle[]);
        break;
      case NOTIFS_KEY:
        this.notifications.set(value as NotificationItem[]);
        break;
      case ABUSE_REPORTS_KEY:
        this.abuseReports.set(value as AbuseReport[]);
        break;
      case HIDDEN_POSTS_KEY:
        this.hiddenPostIds.set(value as number[]);
        break;
      case BLOCKED_USERS_KEY:
        this.blockedUserIds.set(value as number[]);
        break;
      default:
        return false;
    }
    this.saveJson(key, value);
    return true;
  }

  /** Admin: wipe a whole dataset (re-seeds on next load). */
  adminClearDataset(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  /** Admin: total bytes currently used by all NeverBeen datasets in localStorage. */
  adminStorageUsage(): { key: string; bytes: number }[] {
    if (typeof localStorage === 'undefined') return [];
    const usage: { key: string; bytes: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('neverbeen_')) continue;
      const value = localStorage.getItem(key) ?? '';
      usage.push({ key, bytes: value.length * 2 }); // UTF-16 code units
    }
    return usage.sort((a, b) => b.bytes - a.bytes);
  }

  /** Admin: every NeverBeen dataset as a single JSON document (for export). */
  adminExportData(): string {
    const source: Record<string, unknown> = {};
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('neverbeen_')) continue;
        source[key] = loadJsonValue(key);
      }
    }
    source['__exportedAtUtc'] = new Date().toISOString();
    return JSON.stringify(source, null, 2);
  }

  /** Journey posts authored by a member (used by the admin user table). */
  journeyPostCountFor(userId: number): number {
    let n = 0;
    for (const post of this.journeyPosts()) {
      if (post.author?.id === userId) n++;
    }
    return n;
  }

  getCurrentUserAsCompanion(): Companion {
    const user = this.currentUser();
    const prof = this.profile();
    const selfId = user?.id || prof?.id || 1;
    return {
      id: selfId,
      uniqueId: prof?.uniqueId || user?.uniqueId || generate20DigitUid(selfId),
      fullName: prof?.fullName || user?.fullName || 'Kingshuk',
      profilePhotoUrl: this.memberPhotoUrl(),
      coverPhotoUrl:
        prof?.coverPhotoUrl ||
        user?.coverPhotoUrl ||
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80&uid=founder',
      country: prof?.countryName || prof?.country || 'India',
      city: prof?.cityName || prof?.city || 'Kolkata',
      profession: prof?.profession || 'Senior Software Engineer and founder of NeverBeen',
      isOnline: true,
      activeStatus: prof?.activeStatus || user?.activeStatus || 'Active',
      mutualCompanionsCount: 0,
      status: 'connected',
      isProfileLocked: !!prof?.isProfileLocked || !!user?.isProfileLocked,
      isVerified: !!user?.isVerified || !!prof?.isVerified,
      aboutMe: prof?.aboutMe,
      aboutMeDetails: prof?.aboutMeDetails || user?.aboutMeDetails,
      gallery: prof?.gallery,
    };
  }

  getVisitorConnectedCompanions(visitorId: number): Companion[] {
    const all = this.companions();
    const visitor = all.find((c) => c.id === visitorId);
    const currentUserId = this.currentUser()?.id || 1;

    // Distinct connected companion networks per user
    const explicitNetworks: Record<number, number[]> = {
      // Elena Rostova (33): connected to fellow creators & explorers
      33: [12, 42, 88, 55, 72, 73, 74, 101, 102, 103, 104],
      // Marco Rossi (12): connected to architects, photographers & European travelers
      12: [33, 42, 55, 73, 74, 101, 105, 106, 107],
      // Chloe Dupont (42): Riviera artists & coastal explorers
      42: [33, 12, 55, 73, 102, 103, 108, 109],
      // Kenji Sato (88): urban photographers & Asian wandering companions
      88: [33, 55, 42, 101, 103, 106, 107, 110, 111],
      // Liam O'Connor (55): outdoor trek guides & Atlantic hikers
      55: [33, 12, 42, 88, 74, 104, 105, 112, 113],
      // Maya Patel (71): Indian & international designers (current user is pending incoming)
      71: [101, 105, 114, 88, 115, 116, 117],
      // Lucas Vance (72)
      72: [33, 12, 73, 74, 105, 108, 119],
      // Isabella Santos (73)
      73: [33, 12, 42, 72, 74, 103, 120],
      // Noah Weber (74)
      74: [33, 12, 55, 72, 73, 104, 121],
    };

    let targetIds: number[];
    if (visitor?.connectedCompanionIds && visitor.connectedCompanionIds.length > 0) {
      targetIds = [...visitor.connectedCompanionIds];
    } else if (explicitNetworks[visitorId]) {
      targetIds = [...explicitNetworks[visitorId]];
    } else {
      // Deterministic distinct subset for any other companion based on visitorId
      const commonMutuals = [12, 33, 42, 55, 88].filter((id) => id !== visitorId);
      const candidates = all.filter((c) => c.id !== visitorId && c.id !== currentUserId && !commonMutuals.includes(c.id));
      const targetCount = 6 + (Math.abs(visitorId * 31 + 7) % 7); // 6 to 12 companions
      let seed = Math.abs(visitorId * 2654435761);
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      const shuffled = [...candidates];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(nextRand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const numMutuals = 2 + (Math.abs(visitorId * 17) % 3); // 2 to 4 mutuals
      const selectedMutuals = commonMutuals.slice(0, numMutuals);
      targetIds = [...selectedMutuals, ...shuffled.slice(0, targetCount).map((c) => c.id)];
    }

    // Map targetIds to Companion objects from the live companions store
    let result = targetIds
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is Companion => !!c && c.id !== visitorId);

    // If current user is connected with this visitor, add current user to the front
    const isConnectedWithCurrentUser = visitor?.status === 'connected';
    if (isConnectedWithCurrentUser) {
      const userComp = this.getCurrentUserAsCompanion();
      result = [userComp, ...result.filter((c) => c.id !== currentUserId)];
    } else {
      result = result.filter((c) => c.id !== currentUserId);
    }

    return result;
  }

  /**
   * The TRUE mutual companion list for `targetId`: my connected companions who
   * are also connected with them. Single source of truth so the Companions page,
   * the mutuals modal and the hover preview card always agree.
   */
  mutualCompanionsOf(targetId: number): Companion[] {
    const currentUserId = this.currentUser()?.id || 1;
    const myConnected = this.visibleCompanions().filter((c) => c.status === 'connected');
    return this.getVisitorConnectedCompanions(targetId).filter(
      (vc) => vc.id !== currentUserId && vc.id !== targetId && myConnected.some((mc) => mc.id === vc.id),
    );
  }

  mutualCompanionsCountOf(targetId: number): number {
    return this.mutualCompanionsOf(targetId).length;
  }

  getRichIntroForUser(): string {
    // A real member only ever sees the intro they actually stored on their profile
    // (About me → Intro / About me text). The written founder intro stays available
    // for the seeded founder sample (the guest tour), which seeds with it.
    if (!this.profile() || isSeedProfile(this.profile())) {
      return FOUNDER_RICH_INTRO;
    }
    return this.profile()?.aboutMeDetails?.intro || this.profile()?.aboutMe || '';
  }

  getRichIntroForCompanion(c: {
    id?: number;
    fullName: string;
    city?: string;
    country?: string;
    profession?: string;
    bio?: string;
    aboutMe?: string;
    aboutMeDetails?: AboutMeDetails;
  }): string {
    const rawIntro = c.aboutMeDetails?.intro;
    if (rawIntro && rawIntro.trim().length > 150 && rawIntro.includes('\n')) {
      return rawIntro;
    }

    const id = c.id;
    if (id === 33 || c.fullName.includes('Elena Rostova')) {
      return (
        "I find my deepest peace gazing out the window of a regional train as it winds between mist-shrouded pine forests and turquoise alpine lakes. Growing up with an insatiable fascination for European rail journeys and old-world literature, I set out to chronicle the forgotten trails, high-altitude passes, and family-owned chalets that never appear on conventional postcards.\n\n" +
        "Through my writing and photography, I celebrate slow travel—spending weeks in a single canton or valley, learning dialect phrases, and hiking up to remote mountain huts before sunrise. Traveling with the NeverBeen community has connected me with incredible adventurers who share my passion for crisp morning air, railway maps, and stories told around crackling hearths.\n\n" +
        "Every journey is an invitation to slow down, disconnect from digital noise, and rediscover the wonder hidden in ordinary landscapes."
      );
    }

    if (id === 12 || c.fullName.includes('Marco Rossi')) {
      return (
        "To me, travel is a continuous dialogue with history, light, and geometry. Born in Rome, I spent my childhood surrounded by classical columns and weathered travertine, which inspired a lifelong career studying historic coastal architecture and classical arches across Southern Europe. When I journey along the Mediterranean—from the pastel cliffs of Amalfi to the ancient harbors of Greece—I study the intimate interplay of sunlight, stone, and the sea.\n\n" +
        "My travel journals are filled with ink sketches of porticos, arches, and seaside fortresses, alongside conversations with elderly stonemasons who preserve centuries-old craft traditions. Through NeverBeen, I share architectural insights and discover hidden gems where human ingenuity harmonizes with breathtaking natural landscapes.\n\n" +
        "Architecture isn't just about buildings; it's about the living souls who inhabit them across generations."
      );
    }

    if (id === 42 || c.fullName.includes('Chloe Dupont')) {
      return (
        "Chasing the golden hour along rugged Mediterranean coastlines has been my life's compass. From the lavender fields of Provence to the sapphire coves of the French Riviera, I seek out the fleeting moments when dawn breaks over turquoise waters and turns sea spray into pure amber light.\n\n" +
        "My journeys are guided by intuition and tides rather than strict itineraries. I love setting up my tripod on wind-swept limestone cliffs before the world awakens, waiting patiently for the exact moment the horizon catches fire. NeverBeen lets me share these visual sanctuaries with fellow wanderers seeking serenity in nature's grand designs.\n\n" +
        "Photography reminds me that perfection is never static—it exists in a wave crashing or sunlight shifting across a cliff face."
      );
    }

    if (id === 88 || c.fullName.includes('Kenji Sato')) {
      return (
        "My world moves to the rhythm of neon reflections on rain-slicked asphalt and the serene chime of windbells at dawn in ancient temple gardens. As a street photographer navigating Tokyo, Kyoto, and Osaka, I roam alleyways with a compact prime lens, searching for transient human emotions that tell the deeper story of modern urban Japan.\n\n" +
        "Whether capturing a salaryman contemplating a quiet subway platform or an artisan steaming bamboo baskets in an old market, my goal is to freeze poetic moments in time. Connecting with companions on NeverBeen fuels my desire to explore beyond the metropolis—trekking pilgrim trails in Kumano Kodo and discovering untamed coastlines in Hokkaido.\n\n" +
        "In the fastest-paced cities on Earth, the most profound stories happen when you stop and simply watch."
      );
    }

    if (id === 55 || c.fullName.includes('Liam O\'Connor')) {
      return (
        "There is something sacred about standing on the wind-battered edge of the Cliffs of Moher, with ocean spray in your face and nothing between you and the open Atlantic. As an adventure guide and wilderness enthusiast, I have led backcountry expeditions across Ireland's Wild Atlantic Way, the Scottish Highlands, and the jagged fjords of Scandinavia.\n\n" +
        "I believe true adventure begins when the trail ends and the weather turns unpredictable. Guiding travelers through peat bogs, ancient stone circles, and mountain summits has taught me resilience, humility, and the unmatched camaraderie forged over a warm brew at the end of a grueling day on the ridge.\n\n" +
        "The wilderness doesn't care about your schedule, and that is precisely why we must venture into it."
      );
    }

    if (id === 71 || c.fullName.includes('Maya Patel')) {
      return (
        "Between designing digital interfaces and exploring century-old stepwells in Rajasthan, I search for the timeless balance between aesthetics, utility, and soul. Travel has taught me to strip away excess and practice minimalism—living out of a single carry-on while immersing myself in the sensory wonder of bustling spice markets, desert music festivals, and carved sandstone palaces.\n\n" +
        "Every journey across the subcontinent deepens my appreciation for indigenous craft, sustainable living, and the warm hospitality of strangers who welcome you with a cup of hot masala chai. Through NeverBeen, I hope to inspire mindful travel that honors cultural heritage and leaves a gentle footprint wherever we wander.\n\n" +
        "When we travel light, our hearts and minds have the room to carry back treasures that cannot be bought."
      );
    }

    if (id === 72 || c.fullName.includes('Lucas Vance')) {
      return (
        "Berlin taught me that every city is a palimpsest of forgotten revolutions, hidden art dens, and unexpected green sanctuaries. As an independent documentary filmmaker, I traverse Central and Eastern Europe with an audio recorder and lightweight rig, documenting experimental art collectives, abandoned railway stations, and stories of cultural reinvention.\n\n" +
        "I travel to listen rather than speak. The heart of Europe beats in converted warehouse studios, underground electronic clubs, and late-night bakeries where people from every corner of the globe cross paths and share dreams.\n\n" +
        "NeverBeen gives me a canvas to weave sound, light, and wanderlust together with kindred creative spirits."
      );
    }

    if (id === 73 || c.fullName.includes('Isabella Santos')) {
      return (
        "To know Portugal is to love the scent of salt air mingling with grilled sardines in Lisbon's Alfama and the golden hues of terraced vineyards cascading down the Douro Valley. As a food and wine writer, I journey through sleepy coastal villages, hidden mountain quintas, and bustling municipal markets.\n\n" +
        "I believe the true heritage of a nation is preserved on its plates and in the hospitality of its cooks. Sharing freshly baked pastéis de nata with neighborhood bakers or listening to melancholic Fado guitars in a dimly lit tavern gives travel its unforgettable texture.\n\n" +
        "Through NeverBeen, I hope to guide fellow wanderers to authentic culinary discoveries that nourish both body and soul."
      );
    }

    if (id === 74 || c.fullName.includes('Noah Weber')) {
      return (
        "High on the glaciated ridges of the Swiss Alps, silence has a physical weight. As an alpinist and mountaineering guide based in Zurich, I spend my summers navigating crevasse fields and technical granite walls, and my winters ski touring through untouched powder in the Bernese Oberland.\n\n" +
        "The mountains teach an uncompromising honesty. Above the cloud line, life becomes refreshingly simple: watch the weather, trust your rope partner, and respect the ancient forces that sculpted our planet.\n\n" +
        "On NeverBeen, I share high-altitude routes, mountain safety knowledge, and sunrise vistas that remind us how grand the Earth truly is."
      );
    }

    // Dynamic tailored rich story for any companion
    const name = c.fullName || 'Traveler';
    const city = c.city || 'Wanderlust City';
    const country = c.country || 'Global';
    const profession = c.profession || 'Passionate Explorer';

    return (
      `Ever since I set out on my first expedition beyond the familiar neighborhoods of ${city}, exploring the world has been an essential chapter of my personal journey. Working as a ${profession.toLowerCase()} in ${city}, ${country}, I have always believed that travel is far more than visiting famous monuments—it is about discovering the soul of a place, the rhythm of its daily life, and the warmth of the people who call it home.\n\n` +
      `Whether wandering historic cobblestone lanes tucked away in quiet districts, hiking scenic trails at daybreak, or savoring regional delicacies at bustling neighborhood markets, I find inspiration in unexpected, unhurried moments. Every landscape tells a story of human resilience, local heritage, and nature's quiet majesty.\n\n` +
      `Through NeverBeen, I look forward to connecting with fellow wanderers, exchanging authentic travel experiences, and sharing journeys that celebrate curiosity, mindful exploration, and global companionship.`
    );
  }

  // ---------------------------------------------------------------------------
  // BLOCK / UNBLOCK USERS (Requirement B)
  // ---------------------------------------------------------------------------

  blockUser(userId: number): void {
    if (!this.blockedUserIds().includes(userId)) {
      this.blockedUserIds.update((list) => [...list, userId]);
      this.saveJson(BLOCKED_USERS_KEY, this.blockedUserIds());
    }
    // Break companionship connection and both follow directions.
    this.companions.update((list) =>
      list.map((c) => (c.id === userId ? { ...c, status: 'none' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
    this.unfollow(userId);
    this.disconnectFollower(userId);

    // Close any active chat with this user
    this.closeChatBox(userId);
    // Blocks live on the Web API (POST /api/moderation/blocks/{id}).
    if (this.apiLive && userId > 0) this.apiWrite('POST', `/api/moderation/blocks/${userId}`);
  }

  unblockUser(userId: number): void {
    this.blockedUserIds.update((list) => list.filter((id) => id !== userId));
    this.saveJson(BLOCKED_USERS_KEY, this.blockedUserIds());
    if (this.apiLive && userId > 0) this.apiWrite('DELETE', `/api/moderation/blocks/${userId}`);
  }

  isUserBlocked(userId: number): boolean {
    return this.blockedUserIds().includes(userId);
  }

  getBlockedUsers(): Companion[] {
    const ids = this.blockedUserIds();
    return this.companions().filter((c) => ids.includes(c.id));
  }

  // ---------------------------------------------------------------------------
  // REPORT ABUSE (Requirement C)
  // ---------------------------------------------------------------------------

  submitAbuseReport(data: {
    targetType: 'post' | 'comment' | 'message';
    targetId: number;
    reportedAuthor: AuthorInfo;
    reason: string;
    details: string;
    reporterEmail?: string;
  }): AbuseReport {
    const user = this.currentUser();
    const newReport: AbuseReport = {
      id: generateUniqueId(),
      targetType: data.targetType,
      targetId: data.targetId,
      reportedAuthor: data.reportedAuthor,
      reportedByUserId: user?.id ?? 1,
      reason: data.reason,
      details: data.details,
      reporterEmail: data.reporterEmail || user?.email,
      createdAtUtc: new Date().toISOString(),
      status: 'pending',
    };

    this.abuseReports.update((list) => [newReport, ...list]);
    this.saveJson(ABUSE_REPORTS_KEY, this.abuseReports());
    // Abuse reports are stored on the Web API (POST /api/moderation/reports) for
    // signed-in members; the stored report replaces the optimistic copy.
    if (this.apiLive) {
      void this.apiSend<ApiAbuseReportDto>('POST', '/api/moderation/reports', {
        targetType: data.targetType,
        targetId: data.targetId,
        reportedAuthorId: data.reportedAuthor.id,
        reason: data.reason,
        details: data.details || undefined,
        reporterEmail: data.reporterEmail || user?.email || undefined,
      }).then((dto) => {
        if (!dto) return;
        const stored = this.abuseReportFromApi(dto);
        this.abuseReports.update((list) => list.map((r) => (r.id === newReport.id ? stored : r)));
        this.saveJson(ABUSE_REPORTS_KEY, this.abuseReports());
      });
    }
    return newReport;
  }

  // ---------------------------------------------------------------------------
  // CIRCLES (admin max 500, non-admin membership max 1000)
  // ---------------------------------------------------------------------------

  countAdminCircles(userId: number): number {
    return this.circles().filter((c) => !c.archivedAtUtc && isCircleAdmin(c, userId)).length;
  }

  countMemberOnlyCircles(userId: number): number {
    return this.circles().filter((c) => !c.archivedAtUtc && isCircleParticipant(c, userId) && !isCircleAdmin(c, userId)).length;
  }

  isCircleAdmin(circle: Circle, userId: number): boolean {
    return isCircleAdmin(circle, userId);
  }

  isCircleParticipant(circle: Circle, userId: number): boolean {
    return isCircleParticipant(circle, userId);
  }

  /** Null when the member may become an admin; otherwise a popup-ready error. */
  adminLimitError(userId: number): string | null {
    const count = this.countAdminCircles(userId);
    if (count < MAX_ADMIN_CIRCLES) return null;
    const me = this.currentUser()?.id ?? 1;
    const who = userId === me ? 'You' : this.companionName(userId);
    return `${who} can create or admin a maximum of ${MAX_ADMIN_CIRCLES} Circles. That limit is already reached (${count}).`;
  }

  /** Null when the member may join as a non-admin; otherwise a popup-ready error. */
  memberLimitError(userId: number): string | null {
    const count = this.countMemberOnlyCircles(userId);
    if (count < MAX_MEMBER_CIRCLES) return null;
    const me = this.currentUser()?.id ?? 1;
    const who = userId === me ? 'You' : this.companionName(userId);
    return `${who} can be a member of a maximum of ${MAX_MEMBER_CIRCLES} Circles where they are not an admin. That limit is already reached (${count}).`;
  }

  private companionName(userId: number): string {
    return this.companions().find((c) => c.id === userId)?.fullName || 'This traveler';
  }

  createCircle(
    name: string,
    description: string,
    memberIds: number[],
    icon = '🌟',
    color = '#2563eb',
    photoUrl?: string,
  ): Circle | null {
    const me = this.currentUser()?.id ?? 1;
    const adminError = this.adminLimitError(me);
    if (adminError) {
      this.circleActionError.set(adminError);
      return null;
    }
    for (const id of memberIds) {
      if (id === me) continue;
      const memberError = this.memberLimitError(id);
      if (memberError) {
        this.circleActionError.set(memberError);
        return null;
      }
    }

    const newCircle = normalizeCircle({
      id: generateUniqueId(),
      name: name.trim(),
      description: description.trim() || 'A circle of travel companions.',
      icon,
      color,
      photoUrl,
      ownerId: me,
      adminIds: [me],
      memberIds: Array.from(new Set([me, ...memberIds])),
      createdAtUtc: new Date().toISOString(),
      messages: [],
    });

    this.circleActionError.set(null);
    this.circles.update((list) => [...list, newCircle]);
    this.saveJson(CIRCLES_KEY, this.circles());
    // Circles are stored on the Web API (POST /api/circles) for signed-in members. The
    // Circle only counts as created once the API has stored it — see circleSaved().
    if (this.apiLive) {
      const saved = this.saveCircleOnApi(newCircle);
      this.pendingCircleSaves.set(newCircle.id, saved);
      void saved.finally(() => this.pendingCircleSaves.delete(newCircle.id));
    }
    return newCircle;
  }

  /**
   * Resolves once the Web API has stored a Circle made by createCircle(): the stored Circle,
   * or null when it was not saved (the optimistic copy is removed and circleActionError says why).
   */
  circleSaved(circleId: number): Promise<Circle | null> {
    return (
      this.pendingCircleSaves.get(circleId) ??
      Promise.resolve(this.circles().find((c) => c.id === circleId) ?? null)
    );
  }

  private async saveCircleOnApi(draft: Circle): Promise<Circle | null> {
    const result = await this.apiSendReporting<ApiCircleDto>('POST', '/api/circles', {
      name: draft.name,
      description: draft.description,
      icon: draft.icon,
      color: draft.color,
      photoUrl: draft.photoUrl ?? undefined,
      memberIds: draft.memberIds,
    });
    if (result.data) {
      // The stored circle (database id, members) replaces the optimistic copy.
      const stored = this.circleFromApi(result.data);
      this.circles.update((list) => list.map((c) => (c.id === draft.id ? stored : c)));
      this.saveJson(CIRCLES_KEY, this.circles());
      // A chat box that was saved as this Circle follows the stored circle id.
      this.activeChatBoxes.update((boxes) =>
        boxes.map((b) =>
          b.circleId === draft.id ? { ...b, circleId: stored.id, companionId: -Math.abs(stored.id) } : b,
        ),
      );
      return stored;
    }
    // Not stored (rejected, or the API could not be reached): it must not stay on screen as if saved.
    this.circles.update((list) => list.filter((c) => c.id !== draft.id));
    this.saveJson(CIRCLES_KEY, this.circles());
    this.closeChatBox(-Math.abs(draft.id));
    this.circleActionError.set(result.error ?? 'Your Circle could not be saved. Please try again.');
    return null;
  }

  deleteCircle(circleId: number): boolean {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle || !isCircleAdmin(circle, me)) return false;
    this.circles.update((list) =>
      list.map((c) => (c.id === circleId ? normalizeCircle({ ...c, archivedAtUtc: new Date().toISOString() }) : c)),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.closeChatBox(-Math.abs(circleId));
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff) {
      this.apiWrite('DELETE', `/api/circles/${circleId}`);
    }
    return true;
  }

  updateCircle(
    circleId: number,
    patch: Partial<Pick<Circle, 'name' | 'description' | 'photoUrl' | 'icon' | 'color'>>,
  ): boolean {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle || !isCircleAdmin(circle, me)) return false;
    this.circles.update((list) =>
      list.map((c) => (c.id === circleId ? normalizeCircle({ ...c, ...patch }) : c)),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.syncOpenCircleChat(circleId);
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff) {
      this.apiWrite('PUT', `/api/circles/${circleId}`, {
        name: patch.name ?? circle.name,
        description: patch.description ?? circle.description,
        icon: patch.icon ?? circle.icon,
        color: patch.color ?? circle.color,
        photoUrl: patch.photoUrl ?? circle.photoUrl ?? undefined,
      });
    }
    return true;
  }

  addCircleMembers(circleId: number, userIds: number[]): string | null {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle) return 'Circle not found.';
    if (!isCircleAdmin(circle, me)) return 'Only an admin can add people to this Circle.';
    for (const id of userIds) {
      if ((circle.memberIds ?? []).includes(id) || isCircleAdmin(circle, id)) continue;
      const memberError = this.memberLimitError(id);
      if (memberError) {
        this.circleActionError.set(memberError);
        return memberError;
      }
    }
    this.circles.update((list) =>
      list.map((c) =>
        c.id === circleId
          ? normalizeCircle({ ...c, memberIds: Array.from(new Set([...(c.memberIds ?? []), ...userIds])) })
          : c,
      ),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.syncOpenCircleChat(circleId);
    this.circleActionError.set(null);
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff) {
      for (const id of userIds) {
        if (id > 0) this.apiWrite('POST', `/api/circles/${circleId}/members/${id}`);
      }
    }
    return null;
  }

  promoteCircleAdmin(circleId: number, userId: number): string | null {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle) return 'Circle not found.';
    if (!isCircleAdmin(circle, me)) return 'Only an admin can make someone an admin.';
    if (isCircleAdmin(circle, userId)) return null;
    const adminError = this.adminLimitError(userId);
    if (adminError) {
      this.circleActionError.set(adminError);
      return adminError;
    }
    this.circles.update((list) =>
      list.map((c) =>
        c.id === circleId
          ? normalizeCircle({
              ...c,
              adminIds: Array.from(new Set([...(c.adminIds ?? []), userId])),
              memberIds: Array.from(new Set([...(c.memberIds ?? []), userId])),
            })
          : c,
      ),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.circleActionError.set(null);
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff && userId > 0) {
      this.apiWrite('POST', `/api/circles/${circleId}/admins/${userId}?admin=true`);
    }
    return null;
  }

  demoteCircleAdmin(circleId: number, userId: number): string | null {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle) return 'Circle not found.';
    if (!isCircleAdmin(circle, me)) return 'Only an admin can change admins.';
    if (userId === circle.ownerId) return 'The Circle owner stays an admin.';
    if (!isCircleAdmin(circle, userId)) return null;
    this.circles.update((list) =>
      list.map((c) =>
        c.id === circleId
          ? normalizeCircle({ ...c, adminIds: (c.adminIds ?? []).filter((id) => id !== userId) })
          : c,
      ),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.syncOpenCircleChat(circleId);
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff && userId > 0) {
      this.apiWrite('POST', `/api/circles/${circleId}/admins/${userId}?admin=false`);
    }
    return null;
  }

  removeCircleMember(circleId: number, userId: number): string | null {
    const me = this.currentUser()?.id ?? 1;
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle) return 'Circle not found.';
    if (!isCircleAdmin(circle, me)) return 'Only an admin can remove someone from this Circle.';
    if (userId === circle.ownerId) return 'The Circle owner cannot be removed.';
    if (userId === me) return 'You cannot remove yourself from this list.';
    this.circles.update((list) =>
      list.map((c) =>
        c.id === circleId
          ? normalizeCircle({
              ...c,
              adminIds: (c.adminIds ?? []).filter((id) => id !== userId),
              memberIds: (c.memberIds ?? []).filter((id) => id !== userId),
            })
          : c,
      ),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.syncOpenCircleChat(circleId);
    if (this.apiLive && circleId > 0 && circleId <= 0x7fffffff && userId > 0) {
      this.apiWrite('DELETE', `/api/circles/${circleId}/members/${userId}`);
    }
    return null;
  }

  private loadCircleReads(): Record<string, string> {
    return this.loadJson<Record<string, string>>(CIRCLE_READS_KEY) ?? {};
  }

  markCircleRead(circleId: number, at = new Date().toISOString()): void {
    const key = String(circleId);
    this.circleReads.update((map) => ({ ...map, [key]: at }));
    this.saveJson(CIRCLE_READS_KEY, this.circleReads());
  }

  circleLastUsedIso(circle: Circle): string | null {
    const times = (circle.messages ?? [])
      .map((message) => new Date(message.sentAtUtc).getTime())
      .filter((time) => !Number.isNaN(time));
    if (!times.length) return circle.createdAtUtc || null;
    return new Date(Math.max(...times)).toISOString();
  }

  circleUnreadCount(circle: Circle, userId = this.currentUser()?.id ?? 1): number {
    const readAt = this.circleReads()[String(circle.id)];
    const readMs = readAt ? new Date(readAt).getTime() : 0;
    return (circle.messages ?? []).filter(
      (message) => message.senderId !== userId && new Date(message.sentAtUtc).getTime() > readMs,
    ).length;
  }

  circleIsLive(circle: Circle): boolean {
    const open = this.activeChatBoxes().some((box) => box.circleId === circle.id && !box.isMinimized);
    if (open) return true;
    const last = this.circleLastUsedIso(circle);
    if (!last) return false;
    const age = Date.now() - new Date(last).getTime();
    return age >= 0 && age < 10 * 60 * 1000;
  }

  circleUsage(circle: Circle): { live: boolean; status: string; chats: number; unread: number; lastLabel: string } {
    const last = this.circleLastUsedIso(circle);
    const live = this.circleIsLive(circle);
    const span = last ? this.elapsedLabel(last) : '';
    return {
      live,
      status: live ? 'Active' : span ? `Inactive since ${span}` : 'Inactive',
      chats: circle.messages?.length ?? 0,
      unread: this.circleUnreadCount(circle),
      lastLabel: !last ? 'No chats yet' : span === 'just now' ? 'Last chat just now' : `Last chat ${span} ago`,
    };
  }

  private elapsedLabel(iso: string): string {
    const ms = Math.max(0, Date.now() - new Date(iso).getTime());
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const days = Math.floor(ms / day);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years >= 1) return years === 1 ? '1 year' : `${years} years`;
    if (months >= 1) return months === 1 ? '1 month' : `${months} months`;
    if (days >= 1) return days === 1 ? '1 day' : `${days} days`;
    const hours = Math.floor(ms / hour);
    if (hours >= 1) return hours === 1 ? '1 hour' : `${hours} hours`;
    const minutes = Math.floor(ms / minute);
    if (minutes >= 1) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    return 'just now';
  }

  private syncOpenCircleChat(circleId: number): void {
    const circle = this.circles().find((c) => c.id === circleId);
    if (!circle) return;
    const key = -Math.abs(circleId);
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.circleId === circleId || b.companionId === key
          ? {
              ...b,
              circleId,
              isGroup: true,
              participantIds: circle.memberIds,
              companion: this.circleAsCompanion(circle),
              messages: circle.messages?.length
                ? this.mergeChatMessages(b.messages ?? [], circle.messages)
                : b.messages ?? [],
            }
          : b,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  markNotificationsRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.saveJson(NOTIFS_KEY, this.notifications());
    // All of the member's notifications are marked read on the Web API too.
    if (this.apiLive) this.apiWrite('POST', '/api/notifications/read-all');
  }

  /** The member is looking at this chat: clear its unread badge. */
  markChatRead(companionId: number): void {
    const box = this.activeChatBoxes().find((b) => b.companionId === companionId);
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) => (b.companionId === companionId ? { ...b, unreadCount: 0 } : b)),
    );
    this.markPendingChatRead(companionId);
    if (box?.circleId) this.markCircleRead(box.circleId);
    // The read receipt reaches the Web API for member chats.
    if (this.apiLive && box?.conversationId) {
      this.apiWrite('POST', `/api/messages/conversations/${box.conversationId}/read`);
    }
  }

  markPendingChatRead(companionId: number): void {
    if (!this.pendingChats().some((c) => c.companionId === companionId && c.unreadCount > 0)) return;
    this.pendingChats.update((list) => list.map((c) => (c.companionId === companionId ? { ...c, unreadCount: 0 } : c)));
    this.saveJson(PENDING_CHATS_KEY, this.pendingChats());
  }

  // ---------------------------------------------------------------------------
  // MESSENGER (Popup Facebook-like Chat Boxes - Max 5)
  // ---------------------------------------------------------------------------

  circleAsCompanion(circle: Circle): Companion {
    return {
      id: -Math.abs(circle.id),
      fullName: circle.name,
      profilePhotoUrl: circle.photoUrl || '',
      country: 'Circle',
      city: `${circle.memberIds.length} travelers`,
      profession: 'Travel Circle',
      isOnline: true,
      activeStatus: 'Active',
      mutualCompanionsCount: 0,
      status: 'connected',
      bio: circle.description,
    };
  }

  openCircleChat(circle: Circle): void {
    const me = this.currentUser()?.id ?? 1;
    if (!isCircleParticipant(circle, me)) return;
    const key = -Math.abs(circle.id);
    const current = this.activeChatBoxes();
    const existing = current.find((b) => b.companionId === key || b.circleId === circle.id);
    this.markCircleRead(circle.id);
    if (existing) {
      this.activeChatBoxes.update((boxes) =>
        boxes.map((b) => (b.companionId === existing.companionId ? { ...b, isMinimized: false, unreadCount: 0 } : b)),
      );
      return;
    }
    let updated = [...current];
    if (updated.length >= 5) updated.shift();
    // Signed-in members read the Circle's chat history from the Web API
    // (GET /api/circles/{id}/messages); the guest tour keeps its seeded greeting.
    if (this.apiLive && circle.id > 0 && circle.id <= 0x7fffffff) {
      this.activeChatBoxes.set([
        ...updated,
        {
          companionId: key,
          companion: this.circleAsCompanion(circle),
          isMinimized: false,
          draftText: '',
          unreadCount: 0,
          messages: circle.messages ?? [],
          isGroup: true,
          circleId: circle.id,
          participantIds: circle.memberIds,
          ownerId: circle.ownerId ?? me,
        },
      ]);
      void this.refreshCircleMessages(circle.id);
      return;
    }
    const messages = circle.messages?.length
      ? circle.messages
      : [
          {
            id: generateUniqueId(),
            senderId: circle.memberIds.find((id) => id !== me) ?? me,
            receiverId: 0,
            text: `This is ${circle.name}. Say hello and plan the next trip.`,
            sentAtUtc: new Date().toISOString(),
          },
        ];
    this.activeChatBoxes.set([
      ...updated,
      {
        companionId: key,
        companion: this.circleAsCompanion(circle),
        isMinimized: false,
        draftText: '',
        unreadCount: 0,
        messages,
        isGroup: true,
        circleId: circle.id,
        participantIds: circle.memberIds,
        ownerId: circle.ownerId ?? me,
      },
    ]);
  }

  /** Loads a Circle's group-chat history from the Web API into any open box. */
  private async refreshCircleMessages(circleId: number): Promise<void> {
    const messages = await this.apiGet<ApiCircleMessageDto[]>(`/api/circles/${circleId}/messages?pageSize=100`);
    if (!messages) return;
    const current = this.circles().find((c) => c.id === circleId)?.messages ?? [];
    const mapped = this.mergeChatMessages(current, messages.map((dto) => this.chatMessageFromApi(dto)));
    this.circles.update((list) =>
      list.map((c) => (c.id === circleId ? { ...c, messages: mapped } : c)),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    this.syncOpenCircleChat(circleId);
  }

  addPeopleToChat(chatKey: number, userIds: number[]): string | null {
    const box = this.activeChatBoxes().find((b) => b.companionId === chatKey);
    if (!box) return 'That chat is not open.';
    const me = this.currentUser()?.id ?? 1;
    const adding = userIds.filter((id) => id !== me);
    if (adding.length === 0) return 'Choose at least one companion.';

    if (box.circleId) {
      return this.addCircleMembers(box.circleId, adding);
    }

    for (const id of adding) {
      const memberError = this.memberLimitError(id);
      if (memberError && this.countMemberOnlyCircles(id) >= MAX_MEMBER_CIRCLES) {
        // Adding to an unsaved group chat does not consume a Circle slot yet.
      }
    }

    const participantIds = Array.from(new Set([...(box.participantIds ?? [box.companion.id]), ...adding]));
    const names = participantIds
      .map((id) => this.companions().find((c) => c.id === id)?.fullName)
      .filter((n): n is string => !!n);
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === chatKey
          ? {
              ...b,
              isGroup: true,
              ownerId: b.ownerId ?? me,
              participantIds,
              companion: {
                ...b.companion,
                fullName: names.length > 0 ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : 'Group chat',
                profession: 'Group chat',
                city: `${participantIds.length} travelers`,
              },
            }
          : b,
      ),
    );
    return null;
  }

  saveChatAsCircle(chatKey: number, name: string, description: string, photoUrl?: string): Circle | null {
    const box = this.activeChatBoxes().find((b) => b.companionId === chatKey);
    if (!box) {
      this.circleActionError.set('Open the group chat before saving it as a Circle.');
      return null;
    }
    if (box.circleId) {
      this.circleActionError.set('This chat is already a Circle.');
      return null;
    }
    const me = this.currentUser()?.id ?? 1;
    const memberIds = Array.from(new Set([me, ...(box.participantIds ?? [box.companion.id])]));
    const created = this.createCircle(name, description, memberIds.filter((id) => id !== me), '✈️', '#2563eb', photoUrl);
    if (!created) return null;
    this.circles.update((list) =>
      list.map((c) => (c.id === created.id ? { ...c, messages: box.messages } : c)),
    );
    this.saveJson(CIRCLES_KEY, this.circles());
    const saved = this.circles().find((c) => c.id === created.id) ?? created;
    const key = -Math.abs(saved.id);
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === chatKey
          ? {
              ...b,
              companionId: key,
              circleId: saved.id,
              isGroup: true,
              ownerId: me,
              participantIds: saved.memberIds,
              companion: this.circleAsCompanion(saved),
            }
          : b,
      ),
    );
    return saved;
  }

  openChatBox(companion: Companion): void {
    const current = this.activeChatBoxes();
    const existingIndex = current.findIndex((b) => b.companionId === companion.id);

    if (existingIndex > -1) {
      // Un-minimize if already open
      this.activeChatBoxes.update((boxes) =>
        boxes.map((b) => (b.companionId === companion.id ? { ...b, isMinimized: false } : b)),
      );
      return;
    }

    // Maximum 5 chat boxes can be open at a time
    let updated = [...current];
    if (updated.length >= 5) {
      updated.shift(); // remove oldest
    }

    // Signed-in members chat through the Web API: the conversation is started /
    // reused (POST /api/messages/conversations) and its real history is loaded —
    // no invented greeting is ever placed in a member's chat.
    if (this.apiLive && companion.id > 0) {
      const pendingApi = this.pendingChats().find((c) => c.companionId === companion.id);
      const newBox: ActiveChatBox = {
        companionId: companion.id,
        companion,
        isMinimized: false,
        draftText: '',
        unreadCount: pendingApi?.unreadCount ?? 0,
        messages: [],
      };
      this.activeChatBoxes.set([...updated, newBox]);
      void this.openConversationOnApi(companion, pendingApi);
      return;
    }

    const pending = this.pendingChats().find((c) => c.companionId === companion.id && c.unreadCount > 0);
    const newBox: ActiveChatBox = {
      companionId: companion.id,
      companion,
      isMinimized: false,
      draftText: '',
      // A waiting inbox thread keeps its unread count; otherwise the greeting counts as one unread chat.
      unreadCount: pending?.unreadCount ?? 1,
      messages: [
        {
          id: 1,
          senderId: companion.id,
          receiverId: 1,
          text: pending?.preview ?? `Hey Kingshuk! So wonderful to connect here on NeverBeen. Are you planning any trips soon?`,
          sentAtUtc: pending?.sentAtUtc ?? new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    };

    this.activeChatBoxes.set([...updated, newBox]);
  }

  /** Starts (or reuses) the 1:1 conversation and loads its messages into the open box. */
  private async openConversationOnApi(companion: Companion, pending?: PendingChat): Promise<void> {
    const conversation = await this.ensureConversation(companion.id);
    if (!conversation) return;
    const history = await this.apiGet<ApiChatMessageDto[]>(
      `/api/messages/conversations/${conversation.id}?pageSize=100`,
    );
    const incoming = (history ?? []).map((dto) => this.chatMessageFromApi(dto));
    this.activeChatBoxes.update((boxes) =>
      boxes.map((box) =>
        box.companionId === companion.id
          ? {
              ...box,
              conversationId: conversation.id,
              messages: this.mergeChatMessages(box.messages, incoming),
              unreadCount: conversation.unreadCount ?? pending?.unreadCount ?? 0,
            }
          : box,
      ),
    );
    if ((conversation.unreadCount ?? 0) > 0) {
      this.apiWrite('POST', `/api/messages/conversations/${conversation.id}/read`);
    }
  }

  /** The member's 1:1 conversation with a companion, reused or started on the Web API (one call at a time). */
  private ensureConversation(companionId: number): Promise<ApiConversationDto | null> {
    const inFlight = this.conversationStarts.get(companionId);
    if (inFlight) return inFlight;
    const started = this.apiSend<ApiConversationDto>('POST', '/api/messages/conversations', {
      companionId,
    }).then((conversation) => {
      this.conversationStarts.delete(companionId);
      if (conversation) {
        this.activeChatBoxes.update((boxes) =>
          boxes.map((b) => (b.companionId === companionId ? { ...b, conversationId: conversation.id } : b)),
        );
      }
      return conversation;
    });
    this.conversationStarts.set(companionId, started);
    return started;
  }

  closeChatBox(companionId: number): void {
    this.activeChatBoxes.update((boxes) => boxes.filter((b) => b.companionId !== companionId));
  }

  toggleMinimizeChatBox(companionId: number): void {
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === companionId ? { ...b, isMinimized: !b.isMinimized } : b,
      ),
    );
  }

  sendChatMessage(
    companionId: number,
    text: string,
    replyTo?: { id: number; senderName: string; text: string } | null,
  ): void {
    if (!text.trim()) return;
    if (this.blockedByGuard(text) || !this.storageAllows(utf8Bytes(text))) return;

    const newMsg: ChatMessage = {
      id: generateUniqueId(),
      senderId: this.myId(),
      receiverId: companionId,
      text: text.trim(),
      sentAtUtc: new Date().toISOString(),
      replyTo: replyTo || undefined,
    };

    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === companionId
          ? {
              ...b,
              draftText: '',
              replyingToMessage: null,
              messages: [...b.messages, newMsg],
            }
          : b,
      ),
    );
    const box = this.activeChatBoxes().find((b) => b.companionId === companionId);

    // Signed-in members store the message on the Web API — 1:1 chats through
    // POST /api/messages/conversations/{id}/messages and Circle chats through
    // POST /api/circles/{id}/messages — and no simulated reply is ever added.
    if (this.apiLive) {
      this.unsentChatIds.add(newMsg.id);
      void this.deliverChatMessage(companionId, newMsg, replyTo);
      return;
    }

    if (box?.circleId) {
      this.circles.update((list) =>
        list.map((c) => (c.id === box.circleId ? { ...c, messages: [...(box.messages ?? [])] } : c)),
      );
      this.saveJson(CIRCLES_KEY, this.circles());
    }

    // Auto simulated friendly reply after a moment (1:1 chats only, guest tour).
    if (box?.isGroup) return;
    setTimeout(() => {
      const companion = this.companions().find((c) => c.id === companionId);
      if (!companion) return;

      const replyMsg: ChatMessage = {
        id: generateUniqueId(),
        senderId: companionId,
        receiverId: 1,
        text: `That sounds incredible! Let's definitely share photographs in our Circle when we return. 📸✨`,
        sentAtUtc: new Date().toISOString(),
        replyTo: {
          id: newMsg.id,
          senderName: 'Kingshuk',
          text: newMsg.text,
        },
      };

      this.activeChatBoxes.update((boxes) =>
        boxes.map((b) =>
          b.companionId === companionId
            ? { ...b, unreadCount: (b.unreadCount ?? 0) + 1, messages: [...b.messages, replyMsg] }
            : b,
        ),
      );
    }, 1200);
  }

  /** Swaps an optimistic chat message for the one the Web API stored. */
  /**
   * Stores a sent chat message on the Web API: a Circle chat through the Circle, a 1:1 chat
   * through its conversation (started first when it is not loaded yet). The stored message
   * replaces the bubble. A message the API did not store is taken back out of the chat, and its
   * text goes back into the composer, so nothing looks sent that was not.
   */
  private async deliverChatMessage(
    companionId: number,
    draft: ChatMessage,
    replyTo?: { id: number; senderName: string; text: string } | null,
  ): Promise<void> {
    const payload = {
      text: draft.text,
      replyToMessageId:
        replyTo?.id && replyTo.id > 0 && replyTo.id <= 0x7fffffffffffffff ? replyTo.id : undefined,
    };
    const box = this.activeChatBoxes().find((b) => b.companionId === companionId);
    let stored: ApiChatMessageDto | ApiCircleMessageDto | null = null;
    if (box?.circleId && box.circleId > 0 && box.circleId <= 0x7fffffff) {
      stored = await this.apiSend<ApiCircleMessageDto>('POST', `/api/circles/${box.circleId}/messages`, payload);
    } else {
      // The conversation is reused when the box already knows it; otherwise it is started first.
      const conversationId = box?.conversationId ?? (await this.ensureConversation(companionId))?.id;
      if (conversationId) {
        stored = await this.apiSend<ApiChatMessageDto>(
          'POST',
          `/api/messages/conversations/${conversationId}/messages`,
          payload,
        );
      }
    }
    this.unsentChatIds.delete(draft.id);
    if (stored) {
      this.replaceOptimisticChatMessage(companionId, draft.id, stored);
      return;
    }
    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === companionId
          ? {
              ...b,
              messages: b.messages.filter((m) => m.id !== draft.id),
              draftText: b.draftText || draft.text,
            }
          : b,
      ),
    );
  }

  /** Server history, plus any bubble that is still being sent, so a refresh never drops it. */
  private mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const stored = new Set(incoming.map((m) => m.id));
    const unsent = current.filter((m) => this.unsentChatIds.has(m.id) && !stored.has(m.id));
    return [...incoming, ...unsent];
  }

  private replaceOptimisticChatMessage(
    companionId: number,
    optimisticId: number,
    dto: ApiChatMessageDto | ApiCircleMessageDto | null,
  ): void {
    if (!dto) return;
    const stored = this.chatMessageFromApi(dto as ApiChatMessageDto);
    this.activeChatBoxes.update((boxes) =>
      boxes.map((box) =>
        box.companionId === companionId
          ? { ...box, messages: box.messages.map((m) => (m.id === optimisticId ? stored : m)) }
          : box,
      ),
    );
  }

  reactToChatMessage(companionId: number, messageId: number, emoji: string): void {
    this.activeChatBoxes.update((boxes) =>
      boxes.map((box) => {
        if (box.companionId !== companionId) return box;
        const messages = box.messages.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          let myReaction = msg.myReaction;
          if (myReaction === emoji) {
            reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
            if (reactions[emoji] === 0) delete reactions[emoji];
            myReaction = undefined;
          } else {
            if (myReaction && reactions[myReaction]) {
              reactions[myReaction] = Math.max(0, reactions[myReaction] - 1);
              if (reactions[myReaction] === 0) delete reactions[myReaction];
            }
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            myReaction = emoji;
          }
          return { ...msg, reactions, myReaction };
        });
        return { ...box, messages };
      }),
    );
    // Message reactions are tallied on the Web API (POST /api/messages/{id}/reactions).
    if (this.apiLive && messageId > 0 && messageId <= 0x7fffffffffffffff) {
      this.apiWrite('POST', `/api/messages/${messageId}/reactions`, { emoji });
    }
  }

  removeChatMessage(companionId: number, messageId: number): void {
    this.activeChatBoxes.update((boxes) =>
      boxes.map((box) =>
        box.companionId === companionId
          ? {
              ...box,
              messages: box.messages.filter((m) => m.id !== messageId),
              replyingToMessage:
                box.replyingToMessage?.id === messageId ? null : box.replyingToMessage,
            }
          : box,
      ),
    );
  }

  deleteJourneyPost(postId: number): void {
    this.journeyPosts.update((list) => list.filter((p) => p.id !== postId && p.clientId !== postId));
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    this.visitorWallPosts.update((map) => {
      const next: Record<string, JourneyPost[]> = {};
      for (const [key, posts] of Object.entries(map)) {
        next[key] = posts.filter((p) => p.id !== postId && p.clientId !== postId);
      }
      return next;
    });
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      this.apiWrite('DELETE', `/api/journey/${postId}`);
    }
  }

  hideJourneyPost(postId: number): void {
    if (!this.hiddenPostIds().includes(postId)) {
      this.hiddenPostIds.update((list) => [...list, postId]);
      this.saveJson(HIDDEN_POSTS_KEY, this.hiddenPostIds());
    }
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      this.apiWrite('POST', `/api/journey/${postId}/hide`);
    }
  }

  unhideJourneyPost(postId: number): void {
    this.hiddenPostIds.update((list) => list.filter((id) => id !== postId));
    this.saveJson(HIDDEN_POSTS_KEY, this.hiddenPostIds());
    if (this.apiLive && postId > 0 && postId <= 0x7fffffffffffffff) {
      this.apiWrite('DELETE', `/api/journey/${postId}/hide`);
    }
  }

  isPostHidden(postId: number): boolean {
    return this.hiddenPostIds().includes(postId);
  }

  private loadHiddenPostIds(): number[] {
    return this.loadJson<number[]>(HIDDEN_POSTS_KEY) || [];
  }

  deleteJourneyComment(postId: number, commentId: number): void {
    const removeCommentRecursive = (list: JourneyComment[]): JourneyComment[] => {
      return list
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? removeCommentRecursive(c.replies) : [],
        }));
    };

    this.updatePostEverywhere(
      (post) => post.id === postId || post.clientId === postId,
      (post) => {
        const nextComments = removeCommentRecursive(post.comments || []);
        return {
          ...post,
          comments: nextComments,
          commentCount: Math.max(0, (post.commentCount ?? post.comments.length) - 1),
        };
      },
    );
    if (this.apiLive && commentId > 0 && commentId <= 0x7fffffffffffffff) {
      this.apiWrite('DELETE', `/api/journey/comments/${commentId}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Local Seed / Storage Helpers
  // ---------------------------------------------------------------------------

  private initDefaultMember(options: { asGuest?: boolean } = {}): void {
    const defaultAboutMeDetails: AboutMeDetails = {
      intro: this.getRichIntroForUser(),
      gender: 'Male',
      dateOfBirth: '1987-07-02',
      location: 'Kolkata, West Bengal, India',
      hometown: 'Kolkata, India',
      relationshipStatus: 'Single',
      languagesKnown: ['Bengali', 'English', 'Hindi'],
      workExperience: [
        {
          id: 1,
          company: 'NeverBeen',
          yearFrom: '2024',
          yearTo: '',
          currentlyWorkHere: true,
          country: 'India',
          city: 'Kolkata',
          town: 'Salt Lake City',
          description:
            'Founder & Principal Architect driving AI-generated travel photography platform, requirements modelling, and scalable full-stack architecture.',
        },
        {
          id: 2,
          company: 'Continental AG',
          yearFrom: '2020',
          yearTo: '2024',
          currentlyWorkHere: false,
          country: 'Germany / India',
          city: 'Frankfurt / Bangalore',
          description:
            'Senior Software Engineer specializing in application architecture, microservices, and customer-facing delivery within Manufacturing & Intelligence Services.',
        },
        {
          id: 3,
          company: 'Intel Corporation',
          yearFrom: '2016',
          yearTo: '2020',
          currentlyWorkHere: false,
          country: 'India',
          city: 'Bangalore',
          description:
            'Software Engineer focused on high-performance C#.NET, database modelling, REST APIs, and distributed workflows.',
        },
        {
          id: 4,
          company: 'Ernst & Young (EY)',
          yearFrom: '2012',
          yearTo: '2016',
          currentlyWorkHere: false,
          country: 'India',
          city: 'Kolkata',
          description:
            'Technology consultant delivering enterprise web APIs, SQL database optimization, and 3-tier architecture solutions.',
        },
      ],
      education: [
        {
          id: 1,
          institutionName: 'Heritage Institute of Technology, Kolkata',
          level: 'University',
          courseOrDegree: 'B.Tech in Computer Science and Engineering',
          yearFrom: '2005',
          yearTo: '2009',
          currentlyStudying: false,
        },
      ],
      hobbies: [
        'Creative Programming',
        'Application Architecture',
        'Generative AI Design',
        'Landscape Exploration',
        'Coffee Tasting',
      ],
      interests: [
        'C#.NET & Microservices',
        'Future-Proof Systems',
        'SOLID & Design Patterns',
        'Travel Photography',
        'Database Optimization',
      ],
      contactEmail: 'kingshuk.founder@neverbeen.example',
      contactPhone: '+91 98300 12345',
      socialLinks: [
        { platform: 'Instagram', urlOrHandle: '@kingshuk_founder' },
        { platform: 'Facebook', urlOrHandle: 'facebook.com/kingshuk.neverbeen' },
        { platform: 'X', urlOrHandle: '@kingshuk_dev' },
      ],
      aboutThePerson:
        'I am Kingshuk, a Senior Software Engineer with vast IT experience, specializing in software development, requirements modelling, database modelling, application architecture design, and customer-facing delivery within the Manufacturing & Intelligence Services domain. I have worked with world-leading companies like Continental AG, Intel, E&Y, and others. I believe in Creativity, Future Proof Design and Strong Foundation in Programming, rest believe in me, I will deliver above your expectations.',
    };

    const defaultProfile: Profile = {
      id: 1,
      uniqueId: generate20DigitUid(1),
      firstName: 'Kingshuk',
      lastName: '',
      fullName: 'Kingshuk',
      email: 'kingshuk.founder@neverbeen.example',
      gender: 'Male',
      dateOfBirth: '1987-07-02',
      age: 39,
      country: 'India',
      countryId: 101,
      countryName: 'India',
      state: 'West Bengal',
      city: 'Kolkata',
      cityId: 700001,
      cityName: 'Kolkata',
      pincode: '700107',
      contactNumber: '+91 98300 12345',
      postalAddress: 'Salt Lake City, Kolkata, West Bengal, 700107',
      aboutMe:
        'Senior Software Engineer and founder of NeverBeen. I believe in Creativity, Future Proof Design and Strong Foundation in Programming, rest believe in me, I will deliver above your expectations.',
      profession: 'Senior Software Engineer and founder of NeverBeen',
      status: 'Active',
      profilePhotoUrl: '/author.jpeg',
      coverPhotoUrl:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80&uid=founder',
      createdAtUtc: '2026-01-01T00:00:00Z',
      activeStatus: 'Active',
      customStatusText: '',
      isProfileLocked: false,
      isVerified: false,
      verifiedEmail: undefined,
      verificationType: null,
      aboutMeDetails: defaultAboutMeDetails,
      settings: {
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        publicProfileEnabled: true,
        theme: 'light',
        timezone: 'Asia/Kolkata',
        isProfileLocked: false,
        whoCanMessage: 'everyone',
        searchVisibility: true,
        journeyVisibility: 'public',
        soundNotificationsEnabled: true,
        twoFactorEnabled: false,
        travelStyles: ['Generative AI', 'Architecture & Heritage', 'Solo Exploration'],
        preferredSeason: 'Winter & Autumn',
      },
      gallery: [
        {
          id: 101,
          url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
          caption: 'Morning light on Parisian balconies',
          createdAtUtc: '2026-08-15T09:00:00Z',
        },
        {
          id: 102,
          url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
          caption: 'Courtyard architecture at dusk',
          createdAtUtc: '2026-08-22T18:30:00Z',
        },
        {
          id: 103,
          url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
          caption: 'Sunset over Champ de Mars',
          createdAtUtc: '2026-09-02T19:15:00Z',
        },
      ],
      commentCount: 3,
    };

    const defaultUser: CurrentUser = {
      id: defaultProfile.id,
      uniqueId: defaultProfile.uniqueId,
      firstName: defaultProfile.firstName,
      lastName: defaultProfile.lastName,
      fullName: defaultProfile.fullName,
      email: defaultProfile.email,
      status: defaultProfile.status,
      profileComplete: true,
      profilePhotoUrl: defaultProfile.profilePhotoUrl,
      coverPhotoUrl: defaultProfile.coverPhotoUrl,
      activeStatus: 'Active',
      customStatusText: '',
      isProfileLocked: false,
      isVerified: false,
      verifiedEmail: undefined,
      verificationType: null,
      aboutMeDetails: defaultAboutMeDetails,
    };

    // Guests get the same whole default profile, but never an account session.
    this.token.set(options.asGuest ? null : DEMO_SESSION_TOKEN);
    this.currentUser.set(defaultUser);
    this.profile.set(defaultProfile);
    if (!options.asGuest) {
      this.saveJson(USER_KEY, defaultUser);
      this.saveJson(PROFILE_KEY, defaultProfile);
    }
  }

  private loadComments(): CommunityComment[] {
    const saved = this.loadJson<CommunityComment[]>(COMMENTS_KEY);
    if (saved && saved.length > 0) return saved;
    // The seeded Message Book belongs to the guest tour only — a signed-in member starts
    // with an empty one until the Web API returns their own conversations.
    if (!this.demoSession) return [];

    const marcoAuthor: AuthorInfo = {
      id: 12,
      fullName: 'Marco Rossi',
      profession: 'Private Sector Professional',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    };
    const kingshukAuthor: AuthorInfo = {
      id: 1,
      fullName: 'Kingshuk',
      profession: 'Senior Software Engineer and founder of NeverBeen',
      profilePhotoUrl: '/author.jpeg',
      isVerified: false,
    };
    const sophiaAuthor = kingshukAuthor;
    const elenaAuthor: AuthorInfo = {
      id: 33,
      fullName: 'Elena Rostova',
      profession: 'Travel Blogger',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    };

    return [
      {
        id: 1,
        text: 'Just received my high-resolution prints from the Kyoto Bamboo Forest set! The light rays cutting through the grove look 100% genuine. Has anyone here tested the Amalfi Coast packages yet?',
        createdAtUtc: '2026-09-21T06:12:00Z',
        likeCount: 8,
        dislikeCount: 0,
        author: marcoAuthor,
        myReaction: 'Heart',
        reactions: [
          { user: sophiaAuthor, type: 'Heart', reactedAtUtc: '2026-09-21T06:15:00Z' },
          { user: elenaAuthor, type: 'Fire', reactedAtUtc: '2026-09-21T06:16:00Z' },
          { user: marcoAuthor, type: 'Love', reactedAtUtc: '2026-09-21T06:18:00Z' },
        ],
        replyCount: 2,
        replies: [
          {
            id: 2,
            text: 'I ordered the Amalfi Coast prints last weekend! The cliffside colors in Positano during golden hour are breathtaking. Definitely recommend pairing it with Mediterranean casual style.',
            createdAtUtc: '2026-09-21T06:45:00Z',
            likeCount: 4,
            dislikeCount: 0,
            author: sophiaAuthor,
            myReaction: null,
            reactions: [
              { user: marcoAuthor, type: 'Love', reactedAtUtc: '2026-09-21T06:47:00Z' },
              { user: elenaAuthor, type: 'Fire', reactedAtUtc: '2026-09-21T06:48:00Z' },
            ],
            replyCount: 0,
            parentId: 1,
            replies: [],
          },
        ],
      },
    ];
  }

  private loadJourneyPosts(): JourneyPost[] {
    const saved = this.loadJson<JourneyPost[]>(JOURNEY_KEY);
    // A signed-in member sees their own posts only (no seeded travellers in the feed).
    if (!this.demoSession) return saved ?? [];
    const baseList: JourneyPost[] = this.getBaseSeedJourneyPosts();

    let merged: JourneyPost[] = [];
    if (saved && saved.length >= 500) {
      return saved;
    } else if (saved && saved.length > 0) {
      merged = [...saved];
      for (const p of SEED_EXTENDED_JOURNEY_POSTS) {
        if (!merged.some((m) => m.id === p.id)) {
          merged.push(p);
        }
      }
    } else {
      merged = [...baseList, ...SEED_EXTENDED_JOURNEY_POSTS];
    }
    return this.withMultiTagExamples(merged);
  }

  /** So the feed shows "Maya with 10 others" without editing the giant seed file. */
  private withMultiTagExamples(posts: JourneyPost[]): JourneyPost[] {
    if (posts.some((p) => (p.taggedCompanions?.length ?? 0) > 1)) return posts;
    const extras: AuthorInfo[] = [
      { id: 33, fullName: 'Elena Rostova', profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', profession: 'Travel Blogger' },
      { id: 12, fullName: 'Marco Rossi', profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', profession: 'Architect' },
      { id: 42, fullName: 'Chloe Dupont', profilePhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', profession: 'Landscape Photographer' },
      { id: 88, fullName: 'Kenji Sato', profilePhotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', profession: 'Student & Street Shooter' },
      { id: 55, fullName: "Liam O'Connor", profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', profession: 'Adventure Guide' },
      { id: 101, fullName: 'Aarav Sharma', profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', profession: 'Heritage Architect' },
      { id: 102, fullName: 'Mei Lin', profilePhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', profession: 'Traveler' },
      { id: 103, fullName: 'Hiro Tanaka', profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', profession: 'Traveler' },
      { id: 104, fullName: 'Sana Iqbal', profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', profession: 'Traveler' },
      { id: 105, fullName: 'Ravi Menon', profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', profession: 'Traveler' },
      { id: 106, fullName: 'Ananya Das', profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', profession: 'Traveler' },
    ];
    let expanded = 0;
    return posts.map((p) => {
      if (expanded >= 2) return p;
      const tagged = p.taggedCompanions ?? [];
      if (tagged.length !== 1) return p;
      const more = extras.filter((e) => e.id !== tagged[0].id);
      const take = expanded === 0 ? 10 : 2;
      expanded += 1;
      return { ...p, taggedCompanions: [tagged[0], ...more.slice(0, take)] };
    }).map((p, index) => {
      if (p.hashtags?.length || /#\w/.test(p.text)) return p;
      if (index % 17 !== 0) return p;
      const tags = ['alps', 'sunset', 'slowtravel', 'streetfood', 'neverbeen'];
      return { ...p, hashtags: [tags[index % tags.length]] };
    });
  }

  private getBaseSeedJourneyPosts(): JourneyPost[] {

    const seedLikers: AuthorInfo[] = [
      {
        id: 12,
        fullName: 'Marco Rossi',
        profession: 'Architect',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 33,
        fullName: 'Elena Rostova',
        profession: 'Travel Blogger',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 42,
        fullName: 'Chloe Dupont',
        profession: 'Landscape Photographer',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 88,
        fullName: 'Kenji Sato',
        profession: 'Street Shooter',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 55,
        fullName: "Liam O'Connor",
        profession: 'Adventure Guide',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 71,
        fullName: 'Maya Patel',
        profession: 'UI/UX Designer',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 72,
        fullName: 'Lucas Vance',
        profession: 'Documentary Filmmaker',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 73,
        fullName: 'Isabella Santos',
        profession: 'Food & Wine Writer',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 74,
        fullName: 'Noah Weber',
        profession: 'Alpinist',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 75,
        fullName: 'Amara Okafor',
        profession: 'Cultural Explorer',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 76,
        fullName: 'Lars Lindqvist',
        profession: 'Polar Guide',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 77,
        fullName: 'Mei-Ling Chen',
        profession: 'Travel Journalist',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      },
      {
        id: 78,
        fullName: 'Mateo Alvarez',
        profession: 'Climber & Drone Pilot',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80',
      },
    ];

    const kingshukAuthor: AuthorInfo = {
      id: 1,
      fullName: 'Kingshuk',
      profession: 'Senior Software Engineer and founder of NeverBeen',
      profilePhotoUrl: '/author.jpeg',
      isVerified: false,
    };
    const sophiaAuthor = kingshukAuthor;

    const seedReactions1: UserReaction[] = [
      { user: kingshukAuthor, type: 'Heart', reactedAtUtc: '2026-09-21T09:35:00Z' },
      { user: seedLikers[0], type: 'Fire', reactedAtUtc: '2026-09-21T09:36:00Z' },
      { user: seedLikers[1], type: 'Love', reactedAtUtc: '2026-09-21T09:37:00Z' },
      { user: seedLikers[2], type: 'Fire', reactedAtUtc: '2026-09-21T09:38:00Z' },
      { user: seedLikers[3], type: 'Heart', reactedAtUtc: '2026-09-21T09:39:00Z' },
      { user: seedLikers[4], type: 'Laugh', reactedAtUtc: '2026-09-21T09:40:00Z' },
      { user: seedLikers[5], type: 'Clapping', reactedAtUtc: '2026-09-21T09:41:00Z' },
      { user: seedLikers[6], type: 'Smile', reactedAtUtc: '2026-09-21T09:42:00Z' },
      { user: seedLikers[7], type: 'Heart', reactedAtUtc: '2026-09-21T09:43:00Z' },
      { user: seedLikers[8], type: 'Fire', reactedAtUtc: '2026-09-21T09:44:00Z' },
      { user: seedLikers[9], type: 'Shocked', reactedAtUtc: '2026-09-21T09:45:00Z' },
      { user: seedLikers[10], type: 'Love', reactedAtUtc: '2026-09-21T09:46:00Z' },
    ];

    return [
      {
        id: 101,
        author: {
          id: 33,
          fullName: 'Elena Rostova',
          profession: 'Travel Blogger',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        },
        text: 'Arrived at Lake Como this morning! The golden morning fog lifting over Bellagio is pure cinematic magic. Testing out my new NeverBeen vacation series presets. Who has favorite coffee spots in Varenna? ☕🇮🇹',
        createdAtUtc: '2026-09-21T09:30:00Z',
        likeCount: 19,
        isLiked: true,
        myReaction: 'Heart',
        reactions: seedReactions1,
        likers: [kingshukAuthor, ...seedLikers],
        location: 'Lake Como, Italy',
        mood: '🌿 Blissful',
        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
        comments: [
          {
            id: 201,
            author: {
              id: 12,
              fullName: 'Marco Rossi',
              profession: 'Architect',
              profilePhotoUrl:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            },
            text: 'Head over to Cafe Varenna right by the ferry dock—best view of the lake and great macchiato!',
            createdAtUtc: '2026-09-21T09:48:00Z',
            likeCount: 3,
            isLiked: false,
            myReaction: null,
            reactions: [
              { user: sophiaAuthor, type: 'Love', reactedAtUtc: '2026-09-21T09:50:00Z' },
              { user: seedLikers[1], type: 'Fire', reactedAtUtc: '2026-09-21T09:51:00Z' },
              { user: seedLikers[2], type: 'Heart', reactedAtUtc: '2026-09-21T09:52:00Z' },
            ],
          },
        ],
      },
      {
        id: 102,
        author: {
          id: 12,
          fullName: 'Marco Rossi',
          profession: 'Architect',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        },
        text: 'Finalized the print proofs for my Amalfi Coast cliffside portfolio. The warm sunset lighting against the pastel houses is so realistic that my colleagues thought I was in Campania last week! NeverBeen is truly on another level.',
        imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
        createdAtUtc: '2026-09-21T08:15:00Z',
        likeCount: 24,
        isLiked: false,
        myReaction: null,
        reactions: seedReactions1.slice(1, 9),
        likers: seedLikers,
        location: 'Positano, Italy',
        mood: '✨ Inspired',
        comments: [],
      },
      {
        id: 103,
        author: sophiaAuthor,
        text: 'Preparing my autumn bucket list: Lauterbrunnen waterfalls, Zermatt alpine trails, and Kyoto maple foliage! Planning to publish a comprehensive photography journey for the NeverBeen community next week. What destination are you dreaming about right now? 🏔️🍁',
        createdAtUtc: '2026-09-20T18:20:00Z',
        likeCount: 31,
        isLiked: true,
        myReaction: 'Heart',
        reactions: seedReactions1,
        likers: seedLikers,
        location: 'Paris, France',
        mood: '✈️ Wanderlust',
        comments: [
          {
            id: 202,
            author: {
              id: 33,
              fullName: 'Elena Rostova',
              profession: 'Travel Blogger',
              profilePhotoUrl:
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
            },
            text: 'Lauterbrunnen in autumn is unbelievable Kingshuk! The valley mist creates natural depth in every portrait.',
            createdAtUtc: '2026-09-20T19:05:00Z',
            likeCount: 2,
            isLiked: true,
            myReaction: 'Smile',
            reactions: [
              { user: kingshukAuthor, type: 'Smile', reactedAtUtc: '2026-09-20T19:10:00Z' },
              { user: seedLikers[0], type: 'Heart', reactedAtUtc: '2026-09-20T19:12:00Z' },
            ],
          },
        ],
      },
      {
        id: 104,
        author: {
          id: 88,
          fullName: 'Kenji Sato',
          profession: 'Student & Street Shooter',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        },
        text: 'Night stroll through Shibuya and Omoide Yokocho under misty rain. The clear vinyl umbrellas with neon sign reflections make every street feel like a movie frame.',
        createdAtUtc: '2026-09-20T14:10:00Z',
        likeCount: 15,
        isLiked: false,
        myReaction: null,
        reactions: seedReactions1.slice(2, 6),
        likers: seedLikers,
        location: 'Tokyo, Japan',
        mood: '🏮 Serene',
        comments: [],
      },
      {
        id: 105,
        author: {
          id: 33,
          fullName: 'Elena Rostova',
          profession: 'Travel Blogger',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        },
        text: 'Traversing the Bernina Express across Swiss viaducts. Snowy peaks above and vibrant alpine meadows below—unmatched journey memories! 🚂🏔️',
        imageUrl:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        createdAtUtc: '2026-09-21T10:00:00Z',
        likeCount: 42,
        isLiked: true,
        myReaction: 'Heart',
        reactions: seedReactions1,
        likers: seedLikers,
        location: 'St. Moritz, Switzerland',
        mood: '❄️ Scenic',
        comments: [],
      },
    ];
  }

  private isFemaleCompanion(c: Companion, index: number): boolean {
    if (c.aboutMeDetails?.gender) {
      return c.aboutMeDetails.gender.toLowerCase() === 'female';
    }
    const femaleNames = [
      'ananya', 'priya', 'shreya', 'pooja', 'sneha', 'debolina', 'tanushree', 'riya',
      'ishita', 'meera', 'payel', 'moumita', 'swati', 'nandita', 'aditi', 'kavita',
      'sunita', 'madhuri', 'anita', 'geeta', 'elena', 'aarti', 'jyoti', 'radha',
      'farhana', 'ayesha', 'fatima', 'zainab', 'maryam', 'nusrat', 'maya',
      'sara', 'nisha', 'neha', 'divya', 'rupa', 'suman', 'shikha', 'archana',
    ];
    const first = (c.fullName || '').toLowerCase().split(' ')[0];
    if (femaleNames.some((fn) => first.includes(fn))) return true;
    return index % 2 === 0;
  }

  private myId(): number {
    return Number(this.currentUser()?.id || 1);
  }

  private loadFollows(): Record<string, number[]> {
    const saved = this.loadJson<Record<string, number[]>>(FOLLOWS_KEY);
    if (!this.demoSession) {
      return saved && typeof saved === 'object' ? saved : {};
    }
    if (typeof localStorage !== 'undefined') {
      const version = localStorage.getItem(FOLLOWS_SEED_VERSION_KEY);
      if (version === FOLLOWS_SEED_VERSION && saved && typeof saved === 'object') {
        return saved;
      }
    }
    const seeded = this.seedFollows();
    this.saveJson(FOLLOWS_KEY, seeded);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FOLLOWS_SEED_VERSION_KEY, FOLLOWS_SEED_VERSION);
    }
    return seeded;
  }

  /** Seed a mixed follow graph so both pages have companions, pending requests, and strangers. */
  private seedFollows(): Record<string, number[]> {
    const me = this.myId();
    const graph: Record<string, number[]> = {};
    const add = (from: number, to: number) => {
      if (!from || !to || from === to) return;
      const key = String(from);
      const list = graph[key] ?? [];
      if (!list.includes(to)) list.push(to);
      graph[key] = list;
    };
    const people = this.companions();
    for (const person of people) {
      if (person.status === 'pending_outgoing' || person.status === 'connected') {
        add(me, person.id);
      }
      if (person.status === 'pending_incoming' || (person.status === 'connected' && person.id % 2 === 0)) {
        add(person.id, me);
      }
      if (person.status === 'none' && person.id % 5 === 0) add(person.id, me);
      if (person.status === 'none' && person.id % 7 === 0) add(me, person.id);
      const others = people.filter((other) => other.id !== person.id);
      if (!others.length) continue;
      add(person.id, others[person.id % others.length].id);
      add(person.id, others[(person.id * 3) % others.length].id);
    }
    return graph;
  }

  private persistFollows(): void {
    this.saveJson(FOLLOWS_KEY, this.follows());
    if (this.demoSession && typeof localStorage !== 'undefined') {
      localStorage.setItem(FOLLOWS_SEED_VERSION_KEY, FOLLOWS_SEED_VERSION);
    }
  }

  private resolvePeople(ids: number[]): Companion[] {
    const me = this.myId();
    const blocked = new Set(this.blockedUserIds());
    const seen = new Set<number>();
    const people: Companion[] = [];
    for (const id of ids) {
      const num = Number(id);
      if (!num || seen.has(num) || blocked.has(num)) continue;
      seen.add(num);
      const person =
        num === me
          ? this.getCurrentUserAsCompanion()
          : (this.companions().find((c) => Number(c.id) === num) ??
            // A follower who is not (yet) a companion still resolves from the
            // Web API's follower/following lists.
            this.followPersonFromApi(num));
      if (person) people.push(person);
    }
    return people;
  }

  /** Minimal Companion card for a member known only from the API's follow lists. */
  private followPersonFromApi(userId: number): Companion | undefined {
    const dto =
      this.apiFollowers().find((f) => f.id === userId) ??
      this.apiFollowing().find((f) => f.id === userId);
    if (!dto) return undefined;
    return {
      id: dto.id,
      uniqueId: dto.uniqueId ?? generate20DigitUid(dto.id),
      fullName: dto.fullName ?? 'NeverBeen Traveler',
      profilePhotoUrl: this.absoluteApiUrl(dto.profilePhotoUrl) ?? '',
      country: dto.country ?? '',
      city: dto.city ?? '',
      profession: dto.profession ?? '',
      isOnline: false,
      mutualCompanionsCount: 0,
      status: 'none',
    };
  }

  followingIds(userId: number = this.myId()): number[] {
    return this.follows()[String(userId)] ?? [];
  }

  followerIds(userId: number = this.myId()): number[] {
    const target = Number(userId);
    return Object.entries(this.follows())
      .filter(([, ids]) => ids.some((id) => Number(id) === target))
      .map(([id]) => Number(id));
  }

  followingCount(userId: number = this.myId()): number {
    // The Web API's own counters win for visitors — their follow graph lives
    // in the database, not in this browser.
    const counts = this.apiFollowCountsFor(userId);
    if (counts && Number(userId) !== this.myId()) return counts.following ?? 0;
    return this.peopleFollowing(userId).length;
  }

  followerCount(userId: number = this.myId()): number {
    const counts = this.apiFollowCountsFor(userId);
    if (counts && Number(userId) !== this.myId()) return counts.followers ?? 0;
    return this.peopleFollowers(userId).length;
  }

  peopleFollowing(userId: number = this.myId()): Companion[] {
    return this.resolvePeople(this.followingIds(userId));
  }

  peopleFollowers(userId: number = this.myId()): Companion[] {
    return this.resolvePeople(this.followerIds(userId));
  }

  isFollowing(targetUserId: number, actorId: number = this.myId()): boolean {
    return this.followingIds(actorId).some((id) => Number(id) === Number(targetUserId));
  }

  follow(targetUserId: number, actorId: number = this.myId()): void {
    const target = Number(targetUserId);
    const actor = Number(actorId);
    if (!target || !actor || target === actor || this.blockedUserIds().includes(target)) return;
    if (this.isFollowing(target, actor)) return;
    this.follows.update((graph) => {
      const key = String(actor);
      return { ...graph, [key]: [...(graph[key] ?? []), target] };
    });
    this.persistFollows();
    // The follow graph lives on the Web API (POST /api/follows/{id}).
    if (this.apiLive && target > 0 && actor === this.myId()) {
      this.apiWrite('POST', `/api/follows/${target}`);
    }
  }

  unfollow(targetUserId: number, actorId: number = this.myId()): void {
    const target = Number(targetUserId);
    const actor = Number(actorId);
    this.follows.update((graph) => {
      const key = String(actor);
      return { ...graph, [key]: (graph[key] ?? []).filter((id) => Number(id) !== target) };
    });
    this.persistFollows();
    if (this.apiLive && target > 0 && actor === this.myId()) {
      this.apiWrite('DELETE', `/api/follows/${target}`);
    }
  }

  /** Stop this person from following me (or `ownerId`). */
  disconnectFollower(followerId: number, ownerId: number = this.myId()): void {
    this.unfollow(ownerId, followerId);
  }

  private loadCompanions(): Companion[] {
    const saved = this.loadJson<Companion[]>(COMPANIONS_KEY);
    // Signed-in members get their real companions from the Web API — never the seeded
    // directory of demo travellers.
    if (!this.demoSession) {
      return (saved ?? []).map((c) => ({
        ...c,
        uniqueId: c.uniqueId || generate20DigitUid(c.id),
      }));
    }
    const baseList: Companion[] = this.getDefaultSeedCompanions();

    let merged: Companion[] = [];
    if (saved && saved.length > 0) {
      merged = saved.map((c) => ({
        ...c,
        uniqueId: c.uniqueId || generate20DigitUid(c.id),
      }));
      // Merge in any missing Asian companions so all 90 are available
      for (const asian of SEED_ASIAN_COMPANIONS) {
        if (!merged.some((c) => c.id === asian.id || c.uniqueId === asian.uniqueId)) {
          merged.push(asian);
        }
      }
      // Merge in any missing Indian companions (500 WB/Kolkata + 100 other Indian states)
      for (const indian of ALL_SEED_INDIAN_COMPANIONS) {
        if (!merged.some((c) => c.id === indian.id || c.uniqueId === indian.uniqueId)) {
          merged.push(indian);
        }
      }
    } else {
      merged = [...baseList, ...SEED_ASIAN_COMPANIONS, ...ALL_SEED_INDIAN_COMPANIONS];
    }

    const incomingSeedIds = new Set([71, 1003, 1007, 1012, 1018]);

    return merged.map((c, index) => {
      const rawIntro = c.aboutMeDetails?.intro;
      const intro = !rawIntro || rawIntro.length < 150 ? this.getRichIntroForCompanion(c) : rawIntro;

      // Requirement F: Profile picture strictly matching Gender, Age, Ethnicity
      const isFemale = this.isFemaleCompanion(c, index);
      let profilePhotoUrl = c.profilePhotoUrl;
      if (c.id === 33) {
        profilePhotoUrl = `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80&user=33`;
      } else if (c.id === 12) {
        profilePhotoUrl = `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80&user=12`;
      } else {
        const portraitPool = isFemale ? SEED_INDIAN_FEMALE_PORTRAITS : SEED_INDIAN_MALE_PORTRAITS;
        const photoId = portraitPool[Math.abs(c.id * 17 + index) % portraitPool.length];
        // Requirement E: Unique profile photo per user
        profilePhotoUrl = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=400&q=80&user=${c.id}`;
      }

      // Requirement G: Cover picture is different (destinations, family, friends, colleagues)
      const coverCat = Math.abs(c.id * 13 + index) % 10;
      let coverPhotoId = '';
      if (coverCat < 4) {
        coverPhotoId = SEED_COVER_DESTINATIONS[Math.abs(c.id + index) % SEED_COVER_DESTINATIONS.length];
      } else if (coverCat < 6) {
        coverPhotoId = SEED_COVER_FAMILY[Math.abs(c.id + index) % SEED_COVER_FAMILY.length];
      } else if (coverCat < 8) {
        coverPhotoId = SEED_COVER_FRIENDS[Math.abs(c.id + index) % SEED_COVER_FRIENDS.length];
      } else {
        coverPhotoId = SEED_COVER_COLLEAGUES[Math.abs(c.id + index) % SEED_COVER_COLLEAGUES.length];
      }
      // Requirement E: Unique cover photo per user
      const coverPhotoUrl = `https://images.unsplash.com/${coverPhotoId}?auto=format&fit=crop&w=1200&q=80&cover=${c.id}&uid=${c.uniqueId || c.id}`;

      // Requirement C: Exactly 60% of companions are verified with blue tick
      const isVerified = (index % 5) < 3; // 3 out of 5 = 60.0%
      const verificationType: 'work' | 'university' = index % 2 === 0 ? 'work' : 'university';
      const cleanName = c.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      const verifiedEmail = `${cleanName}@${index % 2 === 0 ? 'techcorp.com' : 'university.edu'}`;

      let status = c.status;
      if (incomingSeedIds.has(c.id)) {
        status = 'pending_incoming';
      }

      const whoCanConnect = c.whoCanConnect ?? (c.isProfileLocked ? 'companions-of-companions' : 'everyone');
      const whoCanVisitProfile = c.whoCanVisitProfile ?? (c.isProfileLocked ? 'companions' : 'everyone');

      return {
        ...c,
        status,
        profilePhotoUrl,
        coverPhotoUrl,
        isVerified,
        verificationType,
        verifiedEmail,
        whoCanConnect,
        whoCanVisitProfile,
        uniqueId: c.uniqueId || generate20DigitUid(c.id),
        aboutMeDetails: {
          ...(c.aboutMeDetails || {}),
          intro,
          gender: isFemale ? 'Female' : 'Male',
        },
      };
    });
  }

  private getDefaultSeedCompanions(): Companion[] {
    const elenaAboutMe: AboutMeDetails = {
      intro: this.getRichIntroForCompanion({ id: 33, fullName: 'Elena Rostova' }),
      gender: 'Female',
      dateOfBirth: '1994-08-12',
      location: 'Paris, France',
      hometown: 'Nice, France',
      relationshipStatus: 'In a relationship',
      languagesKnown: ['French', 'English', 'German'],
      workExperience: [
        {
          id: 11,
          company: 'Voyage Panorama Publications',
          yearFrom: '2020',
          yearTo: '',
          currentlyWorkHere: true,
          country: 'France',
          city: 'Paris',
          town: 'Montmartre',
          description: 'Senior travel columnist covering Swiss rail journeys and Alpine itineraries.',
        },
      ],
      education: [
        {
          id: 21,
          institutionName: 'Sciences Po Paris',
          level: 'University',
          courseOrDegree: 'Bachelor in Communication & Media',
          yearFrom: '2012',
          yearTo: '2016',
          currentlyStudying: false,
        },
        {
          id: 22,
          institutionName: 'Lycée Masséna Nice',
          level: 'High School',
          courseOrDegree: 'Baccalauréat Littéraire',
          yearFrom: '2009',
          yearTo: '2012',
          currentlyStudying: false,
        },
      ],
      hobbies: ['Traveling', 'Journaling', 'Reading', 'Photography', 'Camping'],
      interests: ['Train Journeys', 'Glacier Trails', 'Sunset Chasing', 'Wine Tasting', 'Local Markets'],
      contactEmail: 'elena.rostova@travelers.example',
      contactPhone: '+33 6 92 34 56 78',
      socialLinks: [
        { platform: 'Instagram', urlOrHandle: '@elena_on_rails' },
        { platform: 'Facebook', urlOrHandle: 'facebook.com/elena.rostova.wander' },
      ],
      aboutThePerson:
        'Passionate travel blogger exploring alpine vistas, hidden cafes, and train adventures across Central Europe. Sharing stories and photos with fellow NeverBeen wanderers!',
    };

    const marcoAboutMe: AboutMeDetails = {
      intro: this.getRichIntroForCompanion({ id: 12, fullName: 'Marco Rossi' }),
      gender: 'Male',
      dateOfBirth: '1991-11-03',
      location: 'Rome, Italy',
      hometown: 'Naples, Italy',
      relationshipStatus: 'Single',
      languagesKnown: ['Italian', 'English'],
      workExperience: [
        {
          id: 31,
          company: 'Studio Architettura Roma',
          yearFrom: '2018',
          yearTo: '',
          currentlyWorkHere: true,
          country: 'Italy',
          city: 'Rome',
          town: 'Trastevere',
          description: 'Principal architect specializing in seaside historic conservation.',
        },
      ],
      education: [
        {
          id: 41,
          institutionName: 'Sapienza University of Rome',
          level: 'University',
          courseOrDegree: 'Master of Architecture & Urban Design',
          yearFrom: '2010',
          yearTo: '2016',
          currentlyStudying: false,
        },
      ],
      hobbies: ['Urban Sketching', 'Photography', 'Coffee Brewing', 'Cycling'],
      interests: ['Architecture', 'Historical Heritage', 'Art Galleries', 'Street Food'],
      contactEmail: 'marco.rossi@architettura.example',
      contactPhone: '+39 06 4991 0022',
      socialLinks: [
        { platform: 'Instagram', urlOrHandle: '@marco.arch.rome' },
        { platform: 'X', urlOrHandle: '@marco_rossi_arch' },
      ],
      aboutThePerson:
        'I travel to sketch and photograph timeless seaside structures along the Mediterranean cliffs. I believe buildings carry memory and soul.',
    };

    const mayaAboutMe: AboutMeDetails = {
      intro: this.getRichIntroForCompanion({ id: 71, fullName: 'Maya Patel' }),
      gender: 'Female',
      dateOfBirth: '1995-03-24',
      location: 'Mumbai, India',
      hometown: 'Jaipur, India',
      relationshipStatus: 'In a relationship',
      languagesKnown: ['English', 'Hindi', 'Gujarati'],
      workExperience: [
        {
          id: 51,
          company: 'Desi Design Studio',
          yearFrom: '2021',
          yearTo: '',
          currentlyWorkHere: true,
          country: 'India',
          city: 'Mumbai',
          town: 'Bandra',
          description: 'Lead UX designer.',
        },
      ],
      education: [
        {
          id: 61,
          institutionName: 'National Institute of Design',
          level: 'University',
          courseOrDegree: 'Bachelor of Design',
          yearFrom: '2013',
          yearTo: '2017',
          currentlyStudying: false,
        },
      ],
      hobbies: ['Painting', 'Photography', 'Yoga'],
      interests: ['Historical Heritage', 'Art Galleries', 'Cultural Festivals'],
      contactEmail: 'maya.patel@design.example',
      contactPhone: '+91 98200 12345',
      socialLinks: [{ platform: 'Instagram', urlOrHandle: '@maya_pixels' }],
      aboutThePerson: 'Passionate about Indian architectural heritage and minimalist travel essentials.',
    };

    return [
      {
        id: 33,
        fullName: 'Elena Rostova',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        country: 'France',
        city: 'Paris',
        profession: 'Travel Blogger',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 8,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Documenting scenic train routes and mountain lakes across Europe.',
        aboutMe:
          'Passionate travel blogger exploring alpine vistas, hidden cafes, and train adventures across Central Europe. Sharing stories and photos with fellow NeverBeen wanderers!',
        aboutMeDetails: elenaAboutMe,
        gallery: [
          {
            id: 331,
            url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
            caption: 'Sunset over Lauterbrunnen',
            createdAtUtc: '2026-09-18T10:00:00Z',
          },
          {
            id: 332,
            url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80',
            caption: 'Zermatt peak reflections',
            createdAtUtc: '2026-09-19T14:30:00Z',
          },
        ],
      },
      {
        id: 12,
        fullName: 'Marco Rossi',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
        country: 'Italy',
        city: 'Rome',
        profession: 'Architect',
        isOnline: true,
        activeStatus: 'Busy',
        mutualCompanionsCount: 12,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Architectural photographer with a focus on historical Italian coastlines.',
        aboutMe:
          'Rome-based architect studying historic coastal architecture and classical arches. I travel to sketch and photograph timeless seaside structures.',
        aboutMeDetails: marcoAboutMe,
        gallery: [
          {
            id: 121,
            url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=600&q=80',
            caption: 'Amalfi cliffside pastel houses',
            createdAtUtc: '2026-09-17T11:00:00Z',
          },
        ],
      },
      {
        id: 42,
        fullName: 'Chloe Dupont',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
        country: 'France',
        city: 'Nice',
        profession: 'Landscape Photographer',
        isOnline: true,
        activeStatus: 'Away',
        mutualCompanionsCount: 5,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Chasing turquoise waves and golden light along the French Riviera.',
        aboutMe:
          'Golden-hour lover capturing Mediterranean bays, sailing routes, and dramatic coastal cliffs from Nice to Monaco.',
        gallery: [],
      },
      {
        id: 88,
        fullName: 'Kenji Sato',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
        country: 'Japan',
        city: 'Tokyo',
        profession: 'Student & Street Shooter',
        isOnline: false,
        activeStatus: 'Inactive',
        mutualCompanionsCount: 3,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Exploring traditional shrines and night neon in Kanto & Kansai.',
        aboutMe:
          'Capturing street life under neon lights and quiet morning temples in Tokyo, Kyoto, and Osaka.',
        gallery: [],
      },
      {
        id: 55,
        fullName: 'Liam O\'Connor',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        country: 'Ireland',
        city: 'Dublin',
        profession: 'Adventure Guide',
        isOnline: false,
        activeStatus: "Don't Disturb",
        mutualCompanionsCount: 4,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Hiking the Wild Atlantic Way and Scottish Highlands.',
        aboutMe:
          'Guiding outdoor adventures along rugged cliffs, ancient ruins, and misty islands.',
        gallery: [],
      },
      // Non-connected travelers (searchable & can send requests)
      {
        id: 71,
        fullName: 'Maya Patel',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        country: 'India',
        city: 'Mumbai',
        profession: 'UI/UX Designer',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 2,
        status: 'pending_incoming', // Requested companionship!
        isProfileLocked: true, // Profile is locked!
        bio: 'Minimalist traveler exploring heritage forts and colorful desert fairs.',
        aboutMe:
          'Passionate about Indian architectural heritage, colorful textiles, and minimalist travel essentials.',
        aboutMeDetails: mayaAboutMe,
        gallery: [
          {
            id: 711,
            url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
            caption: 'Hawa Mahal courtyards',
            createdAtUtc: '2026-09-10T12:00:00Z',
          },
        ],
      },
      {
        id: 72,
        fullName: 'Lucas Vance',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        country: 'Germany',
        city: 'Berlin',
        profession: 'Documentary Filmmaker',
        isOnline: false,
        activeStatus: 'Inactive',
        mutualCompanionsCount: 1,
        status: 'none',
        isProfileLocked: false,
        bio: 'Urban exploration and historical travel across Central Europe.',
        aboutMe:
          'Creating visual documentaries centered on forgotten historical routes and creative cultural centers.',
        gallery: [],
      },
      {
        id: 73,
        fullName: 'Isabella Santos',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
        country: 'Portugal',
        city: 'Lisbon',
        profession: 'Food & Wine Writer',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 6,
        status: 'none',
        isProfileLocked: false,
        bio: 'Sharing secret viewpoints and culinary treasures across the Iberian peninsula.',
        aboutMe:
          'Lisbon local roaming vineyards in Douro and coastal seafood shacks from Porto to the Algarve.',
        gallery: [],
      },
      {
        id: 74,
        fullName: 'Noah Weber',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
        country: 'Switzerland',
        city: 'Zurich',
        profession: 'Alpinist',
        isOnline: false,
        activeStatus: 'Busy',
        mutualCompanionsCount: 7,
        status: 'none',
        isProfileLocked: true, // Profile is locked!
        bio: 'High altitude mountaineer exploring glaciers and remote Swiss ridges.',
        aboutMe:
          'Ice climbing, ski touring, and technical ascents across Valais and the Bernese Oberland.',
        gallery: [],
      },
    ];
  }

  private loadCircles(): Circle[] {
    const saved = this.loadJson<Circle[]>(CIRCLES_KEY);
    // A signed-in member sees only circles they really own or belong to — the seeded
    // travel circles stay in the guest tour.
    if (!this.demoSession) {
      return (saved ?? []).map((c) => normalizeCircle(c));
    }
    const version =
      typeof localStorage !== 'undefined' ? localStorage.getItem(CIRCLES_SEED_VERSION_KEY) : null;
    if (version === CIRCLES_SEED_VERSION && saved && saved.length > 0) {
      return saved.map((c) => normalizeCircle(c));
    }
    const seed = buildTravelCircles(1);
    this.saveJson(CIRCLES_KEY, seed);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CIRCLES_SEED_VERSION_KEY, CIRCLES_SEED_VERSION);
    }
    return seed;
  }

  private loadPendingChats(): PendingChat[] {
    const saved = this.loadJson<PendingChat[]>(PENDING_CHATS_KEY);
    // No dummy conversations for a signed-in member — their own threads come from the API.
    if (!this.demoSession) return saved ?? [];
    const version = typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_CHATS_SEED_VERSION_KEY) : null;
    if (version === PENDING_CHATS_SEED_VERSION && saved) return saved;
    const seed = this.buildPendingChatSeed();
    this.saveJson(PENDING_CHATS_KEY, seed);
    if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_CHATS_SEED_VERSION_KEY, PENDING_CHATS_SEED_VERSION);
    return seed;
  }

  /** Three waiting conversations so the header Chats badge and browser tab can be checked. */
  private buildPendingChatSeed(): PendingChat[] {
    const connected = this.companions().filter((c) => c.status === 'connected' && c.id > 0);
    const preferred = [12, 33, 42, 71]
      .map((id) => connected.find((c) => c.id === id))
      .filter((c): c is Companion => !!c);
    const chosen = preferred.length >= 3 ? preferred.slice(0, 3) : connected.slice(0, 3);
    const previews = [
      'The sunrise platform is still free if you want to join.',
      'I left three photos from the night market in our chat.',
      'Are we still meeting at the station tomorrow?',
    ];
    return chosen.map((c, i) => ({
      companionId: c.id,
      fullName: c.fullName,
      profilePhotoUrl: c.profilePhotoUrl,
      profession: c.profession,
      city: c.city,
      country: c.country,
      preview: previews[i] ?? 'Sent you a message.',
      unreadCount: 1,
      sentAtUtc: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    }));
  }

  private loadNotifications(): NotificationItem[] {
    const saved = this.loadJson<NotificationItem[]>(NOTIFS_KEY);
    if (saved && saved.length > 0) return saved;
    // The three seeded notices (Maya's request, Marco's like, Elena's comment) are part of
    // the guest tour; a signed-in member's notifications come from the community itself.
    if (!this.demoSession) return [];

    return [
      {
        id: 1,
        type: 'companionship_request',
        fromUser: {
          id: 71,
          fullName: 'Maya Patel',
          profession: 'UI/UX Designer',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        },
        message: 'sent you a Request for Companionship.',
        createdAtUtc: '2026-09-21T09:10:00Z',
        isRead: false,
        requestId: 1,
        status: 'pending',
      },
      {
        id: 2,
        type: 'journey_like',
        fromUser: {
          id: 12,
          fullName: 'Marco Rossi',
          profession: 'Architect',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        },
        message: 'liked your Journey post about autumn travel in the Swiss Alps.',
        createdAtUtc: '2026-09-21T07:45:00Z',
        isRead: false,
      },
      {
        id: 3,
        type: 'journey_comment',
        fromUser: {
          id: 33,
          fullName: 'Elena Rostova',
          profession: 'Travel Blogger',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        },
        message: 'commented on your Journey post: "The architecture and scenery look unbelievable Kingshuk!"',
        createdAtUtc: '2026-09-20T19:05:00Z',
        isRead: true,
      },
    ];
  }

  private loadBlockedUsers(): number[] {
    const saved = this.loadJson<number[]>(BLOCKED_USERS_KEY);
    return saved || [];
  }

  private loadAbuseReports(): AbuseReport[] {
    const saved = this.loadJson<AbuseReport[]>(ABUSE_REPORTS_KEY);
    return saved || [];
  }

  presenceFor(
    userId?: number | null,
    hint?: { activeStatus?: UserActiveStatus; customStatusText?: string; isOnline?: boolean } | AuthorInfo | Companion | null,
  ): { status: UserActiveStatus; label: string; klass: string } {
    const me = this.currentUser();
    const hinted = hint as { activeStatus?: UserActiveStatus; customStatusText?: string; isOnline?: boolean } | null | undefined;
    let status: UserActiveStatus | undefined = hinted?.activeStatus;
    let custom = hinted?.customStatusText;
    let online = hinted?.isOnline;
    if (userId != null && me && userId === me.id) {
      status = me.activeStatus;
      custom = me.customStatusText;
      online = true;
    } else if (userId != null) {
      const companion = this.companions().find((c) => c.id === userId);
      if (companion) {
        status = companion.activeStatus;
        custom = companion.customStatusText;
        online = companion.isOnline;
      }
    }
    if (!status) status = online === false ? 'Inactive' : 'Active';
    const label = status === 'Custom' && custom ? custom : status;
    return { status, label, klass: statusIconClass(status) };
  }

  relationshipLabel(companion: Companion | null | undefined): string {
    if (!companion) return '';
    return (
      companion.relationshipStatus ||
      companion.aboutMeDetails?.relationshipStatus ||
      'Exploring solo'
    );
  }

  // ---------------------------------------------------------------------------
  // DEVICES USED (current sessions + up to 10 previous devices)
  // ---------------------------------------------------------------------------

  /** Stable opaque id for this browser, scoped to the signed-in account. */
  private currentDeviceId(
    accountId: number | string = this.currentUser()?.id ?? this.profile()?.id ?? 'anonymous',
  ): string {
    const storageKey = `${DEVICE_ID_KEY_PREFIX}:${accountId}`;
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (saved) return saved;
      const created = this.generateDeviceId();
      if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, created);
      return created;
    } catch {
      return this.generateDeviceId();
    }
  }

  private generateDeviceId(): string {
    const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    if (cryptoApi?.getRandomValues) {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      return `nb-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    }
    return `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  /** Registers this browser with the existing authenticated POST /api/devices endpoint. */
  private async registerCurrentDevice(): Promise<void> {
    if (!this.apiLive) return;
    const userId = this.currentUser()?.id ?? this.profile()?.id;
    if (userId == null) return;

    const device = this.detectCurrentDevice(this.currentDeviceId());
    const key = `${userId}:${device.id}`;
    if (this.currentDeviceRegistrationKey === key) return;
    if (this.currentDeviceRegistrationInFlight) {
      if (this.currentDeviceRegistrationInFlight.key === key) {
        await this.currentDeviceRegistrationInFlight.promise;
        return;
      }
      await this.currentDeviceRegistrationInFlight.promise;
    }

    this.upsertCurrentDevice(device);
    const promise = (async () => {
      const dto = await this.apiSend<ApiDeviceDto>('POST', '/api/devices', {
        id: device.id,
        name: device.name,
        type: device.type,
        os: device.os,
        browser: device.browser,
        isCurrent: true,
      });
      if (!dto) return;

      this.upsertCurrentDevice({ ...this.deviceFromApi(dto), isCurrent: true });
      this.currentDeviceRegistrationKey = key;
    })();
    this.currentDeviceRegistrationInFlight = { key, promise };
    try {
      await promise;
    } finally {
      if (this.currentDeviceRegistrationInFlight?.key === key) {
        this.currentDeviceRegistrationInFlight = null;
      }
    }
  }

  private upsertCurrentDevice(device: LoginDevice): void {
    const accountId = this.currentUser()?.id ?? this.profile()?.id;
    const anonymousDeviceId = accountId == null ? null : this.currentDeviceId('anonymous');
    this.devices.update((list) => [
      { ...device, isCurrent: true },
      ...list
        .filter((existing) => existing.id !== device.id && existing.id !== anonymousDeviceId)
        .map((existing) => ({ ...existing, isCurrent: false })),
    ]);
    this.saveJson(DEVICES_KEY, this.devices());
  }

  visibleDevices(): LoginDevice[] {
    const all = this.devices();
    const active = all.filter((d) => d.isActive && !d.blocked);
    const previous = all
      .filter((d) => !d.isActive || d.blocked)
      .sort((a, b) => b.lastSeenUtc.localeCompare(a.lastSeenUtc))
      .slice(0, 10);
    return [...active, ...previous];
  }

  logoutDevice(deviceId: string): 'self' | 'remote' | 'missing' {
    const device = this.devices().find((d) => d.id === deviceId);
    if (!device) return 'missing';
    this.devices.update((list) =>
      list.map((d) => (d.id === deviceId ? { ...d, isActive: false, isCurrent: false, lastSeenUtc: new Date().toISOString() } : d)),
    );
    this.saveJson(DEVICES_KEY, this.devices());
    if (device.isCurrent) return 'self';
    return 'remote';
  }

  blockDevice(deviceId: string): 'self' | 'remote' | 'missing' {
    const device = this.devices().find((d) => d.id === deviceId);
    if (!device) return 'missing';
    this.devices.update((list) =>
      list.map((d) =>
        d.id === deviceId
          ? { ...d, blocked: true, isActive: false, isCurrent: false, lastSeenUtc: new Date().toISOString() }
          : d,
      ),
    );
    this.saveJson(DEVICES_KEY, this.devices());
    // Device blocks are stored on the Web API (POST /api/devices/{id}/block?blocked=true).
    if (this.apiLive) this.apiWrite('POST', `/api/devices/${encodeURIComponent(deviceId)}/block?blocked=true`);
    if (device.isCurrent) return 'self';
    return 'remote';
  }

  unblockDevice(deviceId: string): void {
    this.devices.update((list) => list.map((d) => (d.id === deviceId ? { ...d, blocked: false } : d)));
    this.saveJson(DEVICES_KEY, this.devices());
    if (this.apiLive) this.apiWrite('POST', `/api/devices/${encodeURIComponent(deviceId)}/block?blocked=false`);
  }

  private loadDevices(): LoginDevice[] {
    const saved = this.loadJson<LoginDevice[]>(DEVICES_KEY);
    const detected = this.detectCurrentDevice();
    if (saved && saved.length > 0) {
      const hasCurrent = saved.some((d) => d.id === detected.id);
      const next = saved.map((d) =>
        d.id === detected.id
          ? { ...detected, blocked: d.blocked, isActive: d.blocked ? false : true, isCurrent: !d.blocked }
          : { ...d, isCurrent: false },
      );
      return hasCurrent ? next : [detected, ...next].slice(0, 16);
    }
    // A signed-in member sees only the device they are really using: the previous
    // sessions in the seed (other phones, tablets, IP addresses) are demo data.
    if (!this.demoSession) return [this.anonymisedDevice(detected)];
    const seed = this.seedDevices(detected);
    this.saveJson(DEVICES_KEY, seed);
    return seed;
  }

  /** The member's own device, without the invented IP address / MAC / location. */
  private anonymisedDevice(device: LoginDevice): LoginDevice {
    return { ...device, ipAddress: '', macAddress: '', location: '' };
  }

  private detectCurrentDevice(deviceId = this.currentDeviceId()): LoginDevice {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const ua = nav?.userAgent ?? '';
    const userAgentData = nav as (Navigator & { userAgentData?: { mobile?: boolean; platform?: string } }) | null;
    const platform = userAgentData?.userAgentData?.platform || nav?.platform || '';
    const isIpad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
    const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    const isMobile = userAgentData?.userAgentData?.mobile ?? /Mobile|iPhone|iPod/i.test(ua);
    const type: LoginDevice['type'] =
      isIpad || isAndroidTablet || /Tablet/i.test(ua)
        ? 'Tablet'
        : isMobile
          ? 'Phone'
          : /Mac/i.test(`${ua} ${platform}`)
            ? 'Laptop'
            : 'Desktop';

    let os = 'Unknown OS';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      const version = /OS ([\d_]+)/i.exec(ua)?.[1]?.replace(/_/g, '.');
      os = version ? `iOS ${version}` : 'iOS';
    } else if (/Android/i.test(ua)) {
      const version = /Android ([\d.]+)/i.exec(ua)?.[1];
      os = version ? `Android ${version}` : 'Android';
    } else if (/Windows/i.test(`${ua} ${platform}`)) {
      const version = /Windows NT ([\d.]+)/i.exec(ua)?.[1];
      os = version === '10.0' ? 'Windows 10 / 11' : version ? `Windows ${version}` : 'Windows';
    } else if (/Mac/i.test(`${ua} ${platform}`)) {
      os = 'macOS';
    } else if (/CrOS/i.test(ua)) {
      os = 'ChromeOS';
    } else if (/Linux/i.test(`${ua} ${platform}`)) {
      os = 'Linux';
    }

    const browser = /Edg\//i.test(ua)
      ? 'Edge'
      : /OPR\//i.test(ua)
        ? 'Opera'
        : /SamsungBrowser\//i.test(ua)
          ? 'Samsung Internet'
          : /Firefox\//i.test(ua)
            ? 'Firefox'
            : /CriOS\//i.test(ua)
              ? 'Chrome'
              : /Chrome\//i.test(ua)
                ? 'Chrome'
                : /Safari\//i.test(ua)
                  ? 'Safari'
                  : 'Browser';
    const family = /iPhone/i.test(ua) ? 'iPhone' : isIpad ? 'iPad' : type;

    return {
      id: deviceId,
      name: `${family} · ${browser}`,
      type,
      os,
      browser,
      // Browsers do not expose a real hardware MAC or network address. Never invent
      // security-sensitive values; the API may fill the IP from its trusted request.
      ipAddress: '',
      macAddress: '',
      location: '',
      lastSeenUtc: new Date().toISOString(),
      isCurrent: true,
      isActive: true,
      blocked: false,
    };
  }

  private seedDevices(current: LoginDevice): LoginDevice[] {
    const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
    const previous: LoginDevice[] = [
      { id: 'device-iphone', name: 'iPhone 15 Pro · Safari', type: 'Phone', os: 'iOS 18.1', browser: 'Safari', ipAddress: '103.25.184.42', macAddress: this.stableMac('iphone'), location: 'Kolkata, India', lastSeenUtc: ago(2), isCurrent: false, isActive: true, blocked: false },
      { id: 'device-ipad', name: 'iPad Pro · Safari', type: 'Tablet', os: 'iPadOS 18', browser: 'Safari', ipAddress: '103.25.184.58', macAddress: this.stableMac('ipad'), location: 'Kolkata, India', lastSeenUtc: ago(5), isCurrent: false, isActive: true, blocked: false },
      { id: 'device-pixel', name: 'Pixel 8 · Chrome', type: 'Phone', os: 'Android 15', browser: 'Chrome', ipAddress: '49.37.12.90', macAddress: this.stableMac('pixel'), location: 'Bengaluru, India', lastSeenUtc: ago(30), isCurrent: false, isActive: false, blocked: false },
      { id: 'device-galaxy', name: 'Galaxy S24 · Samsung Internet', type: 'Phone', os: 'Android 14', browser: 'Samsung Internet', ipAddress: '122.176.44.18', macAddress: this.stableMac('galaxy'), location: 'Delhi, India', lastSeenUtc: ago(54), isCurrent: false, isActive: false, blocked: false },
      { id: 'device-win', name: 'Office Desktop · Edge', type: 'Desktop', os: 'Windows 11', browser: 'Edge', ipAddress: '202.142.88.16', macAddress: this.stableMac('win'), location: 'Salt Lake, Kolkata', lastSeenUtc: ago(80), isCurrent: false, isActive: false, blocked: false },
      { id: 'device-mbp', name: 'MacBook Pro · Chrome', type: 'Laptop', os: 'macOS Sequoia', browser: 'Chrome', ipAddress: '157.48.201.77', macAddress: this.stableMac('mbp'), location: 'Mumbai, India', lastSeenUtc: ago(120), isCurrent: false, isActive: false, blocked: false },
      { id: 'device-linux', name: 'ThinkPad · Firefox', type: 'Laptop', os: 'Ubuntu 24.04', browser: 'Firefox', ipAddress: '45.118.22.9', macAddress: this.stableMac('linux'), location: 'Hyderabad, India', lastSeenUtc: ago(200), isCurrent: false, isActive: false, blocked: false },
    ];
    return [current, ...previous];
  }

  private stableMac(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
    const bytes = [0x02, (h >> 16) & 0xff, (h >> 8) & 0xff, h & 0xff, (h >> 24) & 0xff, (h >> 4) & 0xff];
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  }

  private loadJson<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    const str = localStorage.getItem(key);
    if (!str) return null;
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  }

  private saveJson<T>(key: string, val: T): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {
        /* ignore storage quota errors so in-memory state keeps working */
      }
    }
  }
}
