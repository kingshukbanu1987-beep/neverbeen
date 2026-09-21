export interface CurrentUser {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  status: 'Pending' | 'Active' | string;
  profileComplete: boolean;
  profilePhotoUrl?: string;
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
