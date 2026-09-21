export type UserActiveStatus = 'Active' | 'Busy' | "Don't Disturb" | 'Away' | 'Inactive' | 'Custom';

export interface CurrentUser {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  status: 'Pending' | 'Active' | string;
  profileComplete: boolean;
  profilePhotoUrl?: string;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  isProfileLocked?: boolean;
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
}

export interface GalleryPhoto {
  id: number;
  url: string;
  caption?: string;
  createdAtUtc: string;
}

export interface Profile {
  id: number;
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
  externalProfilePictureUrl?: string;
  createdAtUtc: string;
  settings: UserSettings;
  gallery: GalleryPhoto[];
  commentCount: number;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
  isProfileLocked?: boolean;
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
}

export interface AuthorInfo {
  id: number;
  fullName?: string;
  profilePhotoUrl?: string;
  profession?: string;
}

export interface CommunityComment {
  id: number;
  text: string;
  createdAtUtc: string;
  likeCount: number;
  dislikeCount: number;
  author: AuthorInfo;
  myReaction?: 'Like' | 'Dislike' | null;
  replyCount: number;
  parentId?: number | null;
  replies: CommunityComment[];
}

export interface ReactionResult {
  likeCount: number;
  dislikeCount: number;
  myReaction?: 'Like' | 'Dislike' | null;
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
  author: AuthorInfo;
  text: string;
  createdAtUtc: string;
  parentId?: number | null;
  likeCount?: number;
  isLiked?: boolean;
  replies?: JourneyComment[];
}

export interface JourneyPost {
  id: number;
  author: AuthorInfo;
  text: string;
  createdAtUtc: string;
  likeCount: number;
  isLiked?: boolean;
  comments: JourneyComment[];
  location?: string;
  mood?: string;
  placeId?: string;
  shareCount?: number;
  isShared?: boolean;
  sharedText?: string;
  originalPost?: JourneyPost;
  likers?: AuthorInfo[];
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
  fullName: string;
  profilePhotoUrl: string;
  country: string;
  city: string;
  profession: string;
  isOnline: boolean;
  mutualCompanionsCount: number;
  status: 'connected' | 'pending_outgoing' | 'pending_incoming' | 'none';
  bio?: string;
  isProfileLocked?: boolean;
  activeStatus?: UserActiveStatus;
  customStatusText?: string;
}

export interface Circle {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberIds: number[];
  createdAtUtc: string;
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
}

export interface ActiveChatBox {
  companionId: number;
  companion: Companion;
  isMinimized: boolean;
  draftText: string;
  messages: ChatMessage[];
}
