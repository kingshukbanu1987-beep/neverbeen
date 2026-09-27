export type UserActiveStatus = 'Active' | 'Busy' | "Don't Disturb" | 'Away' | 'Inactive' | 'Custom';

export type ReactionType =
  | 'Like'
  | 'Dislike'
  | 'Love'
  | 'Smile'
  | 'Laugh'
  | 'Cry'
  | 'Heart'
  | 'Clapping'
  | 'Confused'
  | 'Shocked'
  | 'Angry'
  | 'Fire';

export const REACTION_ICONS: Record<ReactionType, string> = {
  Like: '👍',
  Dislike: '👎',
  Love: '🥰',
  Smile: '😊',
  Laugh: '😆',
  Cry: '😢',
  Heart: '❤️',
  Clapping: '👏',
  Confused: '😕',
  Shocked: '😲',
  Angry: '😡',
  Fire: '🔥',
};

export interface UserReaction {
  user: AuthorInfo;
  type: ReactionType;
  reactedAtUtc?: string;
}

export const HOLD_REACTION_OPTIONS: ReactionType[] = [
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
];

export interface WorkExperience {
  id: number;
  company: string;
  yearFrom: string;
  yearTo?: string;
  currentlyWorkHere: boolean;
  country: string;
  city: string;
  town?: string;
  description?: string;
}

export const AVAILABLE_HOBBIES: string[] = [
  'Photography',
  'Alpine Hiking',
  'Coffee Brewing',
  'Scuba Diving',
  'Journaling',
  'Vinyl Records',
  'Skiing',
  'Traveling',
  'Cooking',
  'Reading',
  'Swimming',
  'Cycling',
  'Gaming',
  'Painting',
  'Camping',
  'Fishing',
  'Bird Watching',
  'Dancing',
  'Yoga',
  'Gardening',
  'Surfing',
  'Rock Climbing',
  'Pottery',
  'Calligraphy',
];

export const AVAILABLE_INTERESTS: string[] = [
  'Architecture',
  'Historical Heritage',
  'Sunset Chasing',
  'Train Journeys',
  'Street Food',
  'Glacier Trails',
  'Art Galleries',
  'Mountain Climbing',
  'Sailing',
  'Wildlife Safari',
  'Cultural Festivals',
  'Astronomy',
  'Eco-Tourism',
  'Wine Tasting',
  'Road Trips',
  'Backpacking',
  'Local Markets',
  'Ocean Conservation',
  'Philosophy',
  'Urban Sketching',
];

export function getTopReactionIcons(reactions?: UserReaction[], max = 3): string[] {
  if (!reactions || reactions.length === 0) return [];
  const counts = new Map<ReactionType, number>();
  for (const r of reactions) {
    counts.set(r.type, (counts.get(r.type) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([type]) => REACTION_ICONS[type] || '❤️');
}

export function getTopReactionIcon(reactions?: UserReaction[]): string {
  if (!reactions || reactions.length === 0) return '❤️';
  const counts = new Map<ReactionType, number>();
  for (const r of reactions) {
    counts.set(r.type, (counts.get(r.type) || 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? (REACTION_ICONS[sorted[0][0]] || '❤️') : '❤️';
}

export type EducationLevel = 'University' | 'High School' | 'Primary School';

export interface EducationInfo {
  id: number;
  institutionName: string;
  level: EducationLevel;
  courseOrDegree: string;
  yearFrom: string;
  yearTo?: string;
  currentlyStudying: boolean;
}

export interface SocialMediaLink {
  platform: 'Facebook' | 'Instagram' | 'X';
  urlOrHandle: string;
}

/** Who may see one About me field. */
export type FieldVisibility = 'public' | 'companions' | 'private' | 'custom';

/** Customize: only these companions can see, or everyone except these companions. */
export type CustomAudienceMode = 'allow' | 'deny';

export interface FieldAudience {
  visibility: FieldVisibility;
  customMode?: CustomAudienceMode;
  companionIds?: number[];
}

export type AboutFieldKey =
  | 'intro'
  | 'gender'
  | 'dateOfBirth'
  | 'location'
  | 'hometown'
  | 'relationshipStatus'
  | 'languagesKnown'
  | 'workExperience'
  | 'education'
  | 'hobbies'
  | 'interests'
  | 'contactEmail'
  | 'contactPhone'
  | 'socialLinks'
  | 'aboutThePerson';

export type AboutVisibilityMap = Partial<Record<AboutFieldKey, FieldAudience>>;

export const ABOUT_FIELD_LABELS: Record<AboutFieldKey, string> = {
  intro: 'Intro & travel story',
  gender: 'Gender',
  dateOfBirth: 'Date of birth',
  location: 'Current location',
  hometown: 'Hometown',
  relationshipStatus: 'Relationship status',
  languagesKnown: 'Languages',
  workExperience: 'Work experience',
  education: 'Education',
  hobbies: 'Hobbies',
  interests: 'Interests',
  contactEmail: 'Email',
  contactPhone: 'Phone',
  socialLinks: 'Social links',
  aboutThePerson: 'About the person',
};

export interface AboutMeDetails {
  intro?: string;
  gender?: string;
  dateOfBirth?: string;
  location?: string;
  hometown?: string;
  relationshipStatus?: 'Single' | 'In a relationship' | 'Married' | "It's complicated" | 'Exploring solo' | string;
  languagesKnown?: string[];
  workExperience?: WorkExperience[];
  education?: EducationInfo[];
  hobbies?: string[];
  interests?: string[];
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: SocialMediaLink[];
  aboutThePerson?: string;
  /** Per-field audience. Missing fields are treated as Public. */
  visibility?: AboutVisibilityMap;
}

export function generate20DigitUid(id: number | string): string {
  const str = String(id).padStart(10, '0');
  const basePrefix = '8920153401';
  return `${basePrefix}${str}`;
}

export interface CurrentUser {
  id: number;
  uniqueId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  status: 'Pending' | 'Active' | string;
  profileComplete: boolean;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  isProfileLocked?: boolean;
  aboutMeDetails?: AboutMeDetails;
  isVerified?: boolean;
  verifiedEmail?: string;
  verificationType?: 'work' | 'university' | null;
}

export interface AuthResult {
  token: string;
  tokenType: string;
  expiresIn: number;
  isNewUser: boolean;
  profileComplete: boolean;
  message: string;
  user: CurrentUser;
}

export interface UserSettings {
  emailNotificationsEnabled: boolean;
  phoneNotificationsEnabled: boolean;
  publicProfileEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  timezone?: string;
  isProfileLocked?: boolean;
  whoCanMessage?: 'everyone' | 'companions' | 'none';
  searchVisibility?: boolean;
  journeyVisibility?: 'public' | 'companions';
  soundNotificationsEnabled?: boolean;
  twoFactorEnabled?: boolean;
  travelStyles?: string[];
  preferredSeason?: string;
  /** Who may send me a companionship request. */
  whoCanConnect?: 'everyone' | 'companions-of-companions' | 'none';
  /** Who may open my profile. */
  whoCanVisitProfile?: 'everyone' | 'companions' | 'none';
  /** Who sees my active / away / busy presence. */
  showActiveStatusTo?: 'everyone' | 'companions' | 'only-me';
  /** Who sees the companions list on my profile. */
  whoCanSeeCompanionsList?: 'everyone' | 'companions' | 'only-me';
  /** Companions may tag me in Journey posts. */
  allowCompanionTagging?: boolean;
  /** Tags that mention me wait for my approval. */
  approveTagsBeforePost?: boolean;
  isVerified?: boolean;
  verificationEmail?: string;
  verificationType?: 'work' | 'university' | null;
  verifiedAtUtc?: string;
}

export interface GalleryPhoto {
  id: number;
  url: string;
  caption?: string;
  createdAtUtc: string;
}

export interface Profile {
  id: number;
  uniqueId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  country?: string;
  countryId?: number;
  countryName?: string;
  state?: string;
  city?: string;
  cityId?: number;
  cityName?: string;
  pincode?: string;
  contactNumber?: string;
  postalAddress?: string;
  aboutMe?: string;
  profession?: string;
  status: string;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  externalProfilePictureUrl?: string;
  createdAtUtc: string;
  settings: UserSettings;
  gallery: GalleryPhoto[];
  commentCount: number;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  isProfileLocked?: boolean;
  aboutMeDetails?: AboutMeDetails;
  isVerified?: boolean;
  verifiedEmail?: string;
  verificationType?: 'work' | 'university' | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  countryId?: number;
  cityId?: number;
  pincode?: string;
  contactNumber?: string;
  postalAddress?: string;
  aboutMe?: string;
  profession?: string;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  isProfileLocked?: boolean;
  aboutMeDetails?: AboutMeDetails;
}

export interface AuthorInfo {
  id: number;
  uniqueId?: string;
  fullName?: string;
  profilePhotoUrl?: string;
  profession?: string;
  country?: string;
  city?: string;
  isVerified?: boolean;
}

export interface CommunityComment {
  id: number;
  text: string;
  createdAtUtc: string;
  likeCount: number;
  dislikeCount: number;
  author: AuthorInfo;
  imageUrl?: string;
  myReaction?: ReactionType | null;
  reactions?: UserReaction[];
  taggedCompanions?: AuthorInfo[];
  replyCount: number;
  parentId?: number | null;
  replies: CommunityComment[];
}

export interface ReactionResult {
  likeCount: number;
  dislikeCount: number;
  myReaction?: ReactionType | null;
}

export interface Country {
  id: number;
  isoCode2: string;
  name: string;
  phoneCode?: string;
}

export interface City {
  id: number;
  name: string;
  countryId?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface JourneyComment {
  id: number;
  postId?: number;
  author: AuthorInfo;
  text: string;
  createdAtUtc: string;
  imageUrl?: string;
  parentId?: number | null;
  likeCount?: number;
  isLiked?: boolean;
  myReaction?: ReactionType | null;
  reactions?: UserReaction[];
  replies?: JourneyComment[];
}

/** Who may see a Journey post or a share. */
export type PostAudienceMode = 'public' | 'companions' | 'custom';

export interface PostAudience {
  mode: PostAudienceMode;
  /** Custom: only these companions can see the post. */
  allowIds?: number[];
  /** Custom: these companions cannot see the post. A person cannot be in both lists. */
  denyIds?: number[];
}

export interface JourneyPost {
  id: number;
  author: AuthorInfo;
  text: string;
  createdAtUtc: string;
  imageUrl?: string;
  imageUrls?: string[];
  likeCount: number;
  isLiked?: boolean;
  myReaction?: ReactionType | null;
  reactions?: UserReaction[];
  taggedCompanions?: AuthorInfo[];
  comments: JourneyComment[];
  location?: string;
  mood?: string;
  placeId?: string;
  shareCount?: number;
  sharesCount?: number;
  isShared?: boolean;
  sharedText?: string;
  originalPost?: JourneyPost;
  likers?: AuthorInfo[];
  audience?: PostAudience;
  hashtags?: string[];
  /** Set when the post was written on another companion's Journey wall. */
  wallOwnerId?: number;
  wallOwnerName?: string;
  editedAtUtc?: string;
}

export interface AbuseReport {
  id: number;
  targetType: 'post' | 'comment' | 'message';
  targetId: number;
  reportedAuthor: AuthorInfo;
  reportedByUserId: number;
  reason: string;
  details: string;
  reporterEmail?: string;
  createdAtUtc: string;
  status: 'pending' | 'reviewed';
}

export interface Companion {
  id: number;
  uniqueId?: string;
  fullName: string;
  profilePhotoUrl: string;
  coverPhotoUrl?: string;
  country: string;
  city: string;
  profession: string;
  isOnline: boolean;
  mutualCompanionsCount: number;
  status: 'connected' | 'pending_outgoing' | 'pending_incoming' | 'none';
  bio?: string;
  aboutMe?: string;
  aboutMeDetails?: AboutMeDetails;
  gallery?: GalleryPhoto[];
  isProfileLocked?: boolean;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  connectedCompanionIds?: number[];
  isVerified?: boolean;
  verifiedEmail?: string;
  relationshipStatus?: string;
  /** Who may send this traveler a companionship request. */
  whoCanConnect?: 'everyone' | 'companions-of-companions' | 'none';
  /** Who may open this traveler's profile. */
  whoCanVisitProfile?: 'everyone' | 'companions' | 'none';
  /** Member ids this traveler has blocked. */
  blockedViewerIds?: number[];
}

export interface Circle {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Cover photo for the Circle (upload or stock travel image). */
  photoUrl?: string;
  memberIds: number[];
  /** Admins can edit, delete, add members and promote admins. Owner is always an admin. */
  adminIds?: number[];
  ownerId?: number;
  createdAtUtc: string;
  /** Group-chat history for this Circle. */
  messages?: ChatMessage[];
}

/** A browser / phone / tablet the member has signed in from. */
export interface LoginDevice {
  id: string;
  name: string;
  type: 'Phone' | 'Tablet' | 'Laptop' | 'Desktop';
  os: string;
  browser: string;
  ipAddress: string;
  macAddress: string;
  location: string;
  lastSeenUtc: string;
  isCurrent: boolean;
  isActive: boolean;
  blocked: boolean;
}

export interface NotificationItem {
  id: number;
  type: 'companionship_request' | 'companionship_accepted' | 'journey_like' | 'journey_comment';
  fromUser: AuthorInfo;
  message: string;
  createdAtUtc: string;
  isRead: boolean;
  requestId?: number;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  sentAtUtc: string;
  reactions?: { [emoji: string]: number };
  myReaction?: string;
  replyTo?: {
    id: number;
    senderName: string;
    text: string;
  };
}

export interface ActiveChatBox {
  companionId: number;
  companion: Companion;
  isMinimized: boolean;
  draftText: string;
  /** Companion messages the member has not seen yet (drives the header badge). */
  unreadCount: number;
  messages: ChatMessage[];
  replyingToMessage?: ChatMessage | null;
  showEmojiPicker?: boolean;
  showActionMenuForMsgId?: number | null;
  /** True once other travelers have been added to this chat. */
  isGroup?: boolean;
  /** Set when the group has been saved as a Circle. */
  circleId?: number;
  /** Everyone in the chat, including the companion the chat started with. */
  participantIds?: number[];
  /** Member who started the chat / owns the Circle. */
  ownerId?: number;
}
