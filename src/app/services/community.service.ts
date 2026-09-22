import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  JourneyComment,
  JourneyPost,
  NotificationItem,
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

export const TOKEN_KEY = 'neverbeen_auth_token';
export const USER_KEY = 'neverbeen_current_user';
export const PROFILE_KEY = 'neverbeen_user_profile';
export const COMMENTS_KEY = 'neverbeen_comments';
export const JOURNEY_KEY = 'neverbeen_journey_posts';
export const COMPANIONS_KEY = 'neverbeen_companions';
export const CIRCLES_KEY = 'neverbeen_circles';
export const NOTIFS_KEY = 'neverbeen_notifications';
export const BLOCKED_USERS_KEY = 'neverbeen_blocked_users';
export const ABUSE_REPORTS_KEY = 'neverbeen_abuse_reports';

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
}

@Injectable({
  providedIn: 'root',
})
export class CommunityService {
  private readonly http = inject(HttpClient, { optional: true });
  readonly apiUrl = 'http://localhost:5080';

  readonly token = signal<string | null>(getCookie(TOKEN_KEY));
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly comments = signal<CommunityComment[]>(this.loadComments());

  // Social Network State: Journey, Companions, Circles, Notifications, Messenger
  readonly journeyPosts = signal<JourneyPost[]>(this.loadJourneyPosts());
  readonly companions = signal<Companion[]>(this.loadCompanions());
  readonly circles = signal<Circle[]>(this.loadCircles());
  readonly notifications = signal<NotificationItem[]>(this.loadNotifications());
  readonly activeChatBoxes = signal<ActiveChatBox[]>([]);
  readonly blockedUserIds = signal<number[]>(this.loadBlockedUsers());
  readonly abuseReports = signal<AbuseReport[]>(this.loadAbuseReports());

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
  readonly isPending = computed(() => this.currentUser()?.status === 'Pending');

  // Filtered views ensuring blocked users cannot see or be seen by each other
  readonly visibleCompanions = computed(() =>
    this.companions().filter((c) => !this.blockedUserIds().includes(c.id)),
  );

  readonly visibleJourneyPosts = computed(() =>
    this.journeyPosts().filter((p) => !this.blockedUserIds().includes(p.author.id)),
  );

  readonly visibleNotifications = computed(() =>
    this.notifications().filter((n) => !this.blockedUserIds().includes(n.fromUser.id)),
  );

  readonly unreadNotificationCount = computed(
    () => this.visibleNotifications().filter((n) => !n.isRead).length,
  );

  readonly onlineCompanions = computed(() =>
    this.visibleCompanions().filter((c) => c.status === 'connected' && c.isOnline),
  );

  readonly offlineCompanions = computed(() =>
    this.visibleCompanions().filter((c) => c.status === 'connected' && !c.isOnline),
  );

  constructor() {
    const existingCookieToken = getCookie(TOKEN_KEY);
    if (existingCookieToken) {
      const storedUser = this.loadJson<CurrentUser>(USER_KEY);
      const storedProfile = this.loadJson<Profile>(PROFILE_KEY);
      if (storedUser && storedProfile) {
        if (!storedProfile.aboutMeDetails?.intro || storedProfile.aboutMeDetails.intro.length < 150) {
          const richIntro = this.getRichIntroForUser();
          storedProfile.aboutMeDetails = {
            ...(storedProfile.aboutMeDetails || {}),
            intro: richIntro,
          };
          storedUser.aboutMeDetails = {
            ...(storedUser.aboutMeDetails || {}),
            intro: richIntro,
          };
          this.saveJson(USER_KEY, storedUser);
          this.saveJson(PROFILE_KEY, storedProfile);
        }
        this.token.set(existingCookieToken);
        this.currentUser.set(storedUser);
        this.profile.set(storedProfile);
      } else {
        this.initDefaultMember();
      }
    } else {
      // User is not signed in
      this.token.set(null);
      this.currentUser.set(null);
      this.profile.set(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Session / OAuth
  // ---------------------------------------------------------------------------

  async loginWithOAuth(
    provider: 'google' | 'facebook' | 'microsoft' | string,
    isExistingUserOrCode: boolean | string = false,
  ): Promise<AuthResult> {
    const isExistingUser =
      typeof isExistingUserOrCode === 'boolean' ? isExistingUserOrCode : false;
    const token = 'nb_auth_key_' + Math.random().toString(36).substring(2) + '_' + Date.now();

    if (isExistingUser) {
      setCookie(TOKEN_KEY, token, 30);
      const existingUser: CurrentUser = {
        id: 1,
        firstName: 'Sophia',
        lastName: 'Laurent',
        fullName: 'Sophia Laurent',
        email: `sophia.${provider.toLowerCase()}@neverbeen.example`,
        status: 'Active',
        profileComplete: true,
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        activeStatus: 'Active',
        customStatusText: '',
        isProfileLocked: false,
      };

      const existingProfile: Profile = {
        id: 1,
        firstName: 'Sophia',
        lastName: 'Laurent',
        fullName: 'Sophia Laurent',
        email: `sophia.${provider.toLowerCase()}@neverbeen.example`,
        gender: 'Female',
        dateOfBirth: '1996-04-18',
        age: 28,
        country: 'France',
        countryId: 58,
        countryName: 'France',
        state: 'Île-de-France',
        city: 'Paris',
        cityId: 320,
        cityName: 'Paris',
        pincode: '75001',
        contactNumber: '+33 6 88 41 92 01',
        postalAddress: '14 Rue de Castiglione, 75001 Paris',
        aboutMe:
          'Travel filmmaker and visual storyteller. Passionate about hidden alleys across Europe, alpine sunrises in the Swiss Alps, and sunset tones along the Mediterranean coast. Sharing AI vacation journeys with the NeverBeen community!',
        profession: 'Content Creator',
        status: 'Active',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        coverPhotoUrl:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        createdAtUtc: '2026-08-10T14:22:00Z',
        activeStatus: 'Active',
        customStatusText: '',
        isProfileLocked: false,
        settings: {
          emailNotificationsEnabled: true,
          phoneNotificationsEnabled: false,
          publicProfileEnabled: true,
          theme: 'light',
          timezone: 'Europe/Paris',
          isProfileLocked: false,
          whoCanMessage: 'everyone',
          searchVisibility: true,
          journeyVisibility: 'public',
          soundNotificationsEnabled: true,
          twoFactorEnabled: false,
          travelStyles: ['Photography', 'Solo Exploration', 'Culinary'],
          preferredSeason: 'Autumn & Spring',
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

      this.token.set(token);
      this.currentUser.set(existingUser);
      this.profile.set(existingProfile);
      this.saveJson(USER_KEY, existingUser);
      this.saveJson(PROFILE_KEY, existingProfile);

      return {
        token,
        tokenType: 'Bearer',
        expiresIn: 2592000,
        isNewUser: false,
        profileComplete: true,
        message: `Signed in successfully via ${provider}.`,
        user: existingUser,
      };
    } else {
      // New member: not registered yet
      const newUser: CurrentUser = {
        id: generateUniqueId(),
        firstName: '',
        lastName: '',
        fullName: '',
        email: `traveler.${provider.toLowerCase()}@neverbeen.example`,
        status: 'Pending',
        profileComplete: false,
        profilePhotoUrl: '',
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
        message: 'New member detected, registration required.',
        user: newUser,
      };
    }
  }

  loginAsDemoUser(mode: 'new_pending' | 'active_member'): void {
    if (mode === 'new_pending') {
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
      setCookie(TOKEN_KEY, 'jwt_default_active_token', 30);
      this.initDefaultMember();
    }
  }

  logout(): void {
    const u = this.currentUser();
    if (u) {
      this.currentUser.set({ ...u, activeStatus: 'Inactive' });
    }
    deleteCookie(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    this.activeChatBoxes.set([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(COMMENTS_KEY);
      localStorage.removeItem(JOURNEY_KEY);
      localStorage.removeItem(COMPANIONS_KEY);
      localStorage.removeItem(CIRCLES_KEY);
      localStorage.removeItem(NOTIFS_KEY);
    }
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
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  async getCitiesForCountry(countryId: number): Promise<City[]> {
    if (this.http) {
      try {
        return await firstValueFrom(
          this.http.get<City[]>(`${this.apiUrl}/api/lookup/countries/${countryId}/cities`),
        );
      } catch {
        // Fall through
      }
    }
    const seed = SEED_COUNTRIES.find((c) => c.id === countryId);
    return seed ? seed.cities : [];
  }

  // ---------------------------------------------------------------------------
  // Registration / Account Creation
  // ---------------------------------------------------------------------------

  async createNeverbeenAccount(data: CreateAccountData): Promise<Profile> {
    const token = 'nb_auth_key_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    setCookie(TOKEN_KEY, token, 30);

    const countryObj = this.countries().find(
      (c) => c.name.toLowerCase() === data.country.toLowerCase(),
    );

    const newProfile: Profile = {
      id: this.currentUser()?.id || Date.now(),
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

    return newProfile;
  }

  async registerUser(formData: FormData): Promise<Profile> {
    const name = (formData.get('name') as string) || (formData.get('fullName') as string) || 'Alex';
    const surname = (formData.get('surname') as string) || 'Vance';
    const email = (formData.get('email') as string) || 'alex.vance@example.com';
    const country = (formData.get('country') as string) || 'France';
    const state = (formData.get('state') as string) || 'Île-de-France';
    const city = (formData.get('city') as string) || 'Paris';
    const gender = (formData.get('gender') as string) || 'Other';
    const dateOfBirth = (formData.get('dateOfBirth') as string) || '1995-05-15';
    const photoUrl =
      (formData.get('photoUrl') as string) ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

    return this.createNeverbeenAccount({
      name,
      surname,
      email,
      country,
      state,
      city,
      gender,
      dateOfBirth,
      photoUrl,
    });
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
    };

    this.profile.set(updated);
    this.saveJson(PROFILE_KEY, updated);
    return updated;
  }

  updateAboutMeDetails(details: AboutMeDetails): void {
    this.profile.update((p) => (p ? { ...p, aboutMeDetails: details } : null));
    this.currentUser.update((u) => (u ? { ...u, aboutMeDetails: details } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(USER_KEY, this.currentUser());
  }

  readonly MAX_IMAGE_SIZE_BYTES = 100 * 1024; // 100 KB limit (Requirement A)

  async uploadProfilePhoto(file: File): Promise<string> {
    if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Picture size exceeds 100 KB limit.');
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

  async uploadCoverPhoto(file: File): Promise<string> {
    if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Picture size exceeds 100 KB limit.');
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

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    this.profile.update((p) => (p ? { ...p, settings } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    return settings;
  }

  // ---------------------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------------------

  async addGalleryPhoto(file: File, caption?: string): Promise<GalleryPhoto> {
    if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Picture size exceeds 100 KB limit.');
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
          };
        });

        this.saveJson(PROFILE_KEY, this.profile());
        resolve(newPhoto);
      };
      reader.readAsDataURL(file);
    });
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
        profilePhotoUrl: user?.profilePhotoUrl,
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
      fullName: user?.fullName || 'Sophia Laurent',
      profession: this.profile()?.profession || 'Travel Creator',
      profilePhotoUrl: user?.profilePhotoUrl,
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

  createJourneyPost(
    text: string,
    mood?: string,
    location?: string,
    placeId?: string,
    imageUrl?: string,
    taggedCompanions?: AuthorInfo[],
    imageUrls?: string[],
  ): JourneyPost {
    const user = this.currentUser();
    const profile = this.profile();
    const allImages = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : undefined);
    const primaryImage = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : undefined);
    const newPost: JourneyPost = {
      id: generateUniqueId(),
      author: {
        id: user?.id ?? 1,
        fullName: user?.fullName || 'Sophia Laurent',
        profession: profile?.profession || 'Travel Filmmaker',
        profilePhotoUrl:
          user?.profilePhotoUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
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
    };

    this.journeyPosts.update((list) => [newPost, ...list]);
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    return newPost;
  }

  shareJourneyPost(originalPostId: number, userThought?: string): JourneyPost | null {
    const original = this.journeyPosts().find((p) => p.id === originalPostId);
    if (!original) return null;

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
        fullName: user?.fullName || 'Sophia Laurent',
        profession: profile?.profession || 'Traveler',
        profilePhotoUrl:
          user?.profilePhotoUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
      text: userThought ? userThought.trim() : '',
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      shareCount: 0,
      comments: [],
      isShared: true,
      originalPost: { ...original },
    };

    this.journeyPosts.update((list) => [sharedPost, ...list]);
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    return sharedPost;
  }

  toggleJourneyLike(postId: number): void {
    this.reactToJourneyPost(postId, 'Heart');
  }

  reactToJourneyPost(postId: number, reaction: ReactionType): void {
    const user = this.currentUser();
    const currentAuthor: AuthorInfo = {
      id: user?.id ?? 1,
      fullName: user?.fullName || 'Sophia Laurent',
      profession: this.profile()?.profession || 'Travel Creator',
      profilePhotoUrl:
        user?.profilePhotoUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    };

    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
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
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
  }

  addJourneyComment(
    postId: number,
    text: string,
    parentCommentId?: number,
    imageUrl?: string,
    taggedCompanions?: AuthorInfo[],
  ): void {
    const user = this.currentUser();
    const newComment: JourneyComment = {
      id: generateUniqueId(),
      author: {
        id: user?.id ?? 1,
        fullName: user?.fullName || 'Sophia Laurent',
        profession: this.profile()?.profession || 'Member',
        profilePhotoUrl: user?.profilePhotoUrl,
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

    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
          if (parentCommentId) {
            return {
              ...post,
              comments: this.addNestedJourneyReply(post.comments, parentCommentId, newComment),
            };
          }
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
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
    const currentAuthor: AuthorInfo = {
      id: user?.id ?? 1,
      fullName: user?.fullName || 'Sophia Laurent',
      profession: this.profile()?.profession || 'Member',
      profilePhotoUrl: user?.profilePhotoUrl,
    };

    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: this.applyCommentReactionRecursive(post.comments, commentId, reaction, currentAuthor),
          };
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
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
  // COMPANIONS & REQUESTS
  // ---------------------------------------------------------------------------

  sendCompanionshipRequest(targetUserId: number): void {
    this.companions.update((list) =>
      list.map((c) => (c.id === targetUserId ? { ...c, status: 'pending_outgoing' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
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
  }

  removeCompanion(companionId: number): void {
    this.companions.update((list) =>
      list.map((c) => (c.id === companionId ? { ...c, status: 'none' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());
  }

  getCurrentUserAsCompanion(): Companion {
    const user = this.currentUser();
    const prof = this.profile();
    return {
      id: user?.id || 1,
      uniqueId: user?.uniqueId || prof?.uniqueId || generate20DigitUid(1),
      fullName: prof?.fullName || user?.fullName || 'Sophia Laurent',
      profilePhotoUrl:
        prof?.profilePhotoUrl ||
        user?.profilePhotoUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      coverPhotoUrl:
        prof?.coverPhotoUrl ||
        user?.coverPhotoUrl ||
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      country: prof?.country || 'France',
      city: prof?.city || 'Paris',
      profession: prof?.profession || 'Content Creator',
      isOnline: true,
      activeStatus: prof?.activeStatus || 'Active',
      mutualCompanionsCount: 0,
      status: 'connected',
      isProfileLocked: !!prof?.isProfileLocked,
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
      const candidates = all.filter((c) => c.id !== visitorId && c.id !== currentUserId);
      const targetCount = 8 + (Math.abs(visitorId * 31 + 7) % 9); // 8 to 16 companions
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
      targetIds = shuffled.slice(0, targetCount).map((c) => c.id);
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

  getRichIntroForUser(): string {
    return (
      "Ever since I packed my vintage 35mm film camera into a weathered canvas backpack for my first solo train trip through the Swiss Alps, travel has been more than a passion—it is the lens through which I experience the world. I believe the most unforgettable memories aren't found in crowded tourist plazas, but at dawn in quiet Parisian alleyways, smelling freshly baked brioche as the streetlights flicker off, or listening to fishermen untangle their nets on the pebbled beaches of the Mediterranean.\n\n" +
      "Over the past five years, I have wandered across eighteen countries, documenting the quiet cadence of local life, ancient stone architecture, and culinary traditions that have survived generations. As a filmmaker and storyteller with NeverBeen, my mission is to capture authentic moments that inspire others to step outside their comfort zones, embrace spontaneity, and build meaningful connections with kindred spirits across every continent.\n\n" +
      "Whether scaling granite ridges in the Pyrenees, navigating misty canals in Bruges, or sharing mint tea with carpet weavers in North African souks, I travel to listen, learn, and preserve stories that celebrate our shared humanity."
    );
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
    // Break companionship connection
    this.companions.update((list) =>
      list.map((c) => (c.id === userId ? { ...c, status: 'none' } : c)),
    );
    this.saveJson(COMPANIONS_KEY, this.companions());

    // Close any active chat with this user
    this.closeChatBox(userId);
  }

  unblockUser(userId: number): void {
    this.blockedUserIds.update((list) => list.filter((id) => id !== userId));
    this.saveJson(BLOCKED_USERS_KEY, this.blockedUserIds());
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
    return newReport;
  }

  // ---------------------------------------------------------------------------
  // CIRCLES (Max 5)
  // ---------------------------------------------------------------------------

  createCircle(
    name: string,
    description: string,
    memberIds: number[],
    icon = '🌟',
    color = '#2563eb',
  ): Circle | null {
    if (this.circles().length >= 5) {
      return null;
    }

    const newCircle: Circle = {
      id: generateUniqueId(),
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      memberIds,
      createdAtUtc: new Date().toISOString(),
    };

    this.circles.update((list) => [...list, newCircle]);
    this.saveJson(CIRCLES_KEY, this.circles());
    return newCircle;
  }

  deleteCircle(circleId: number): void {
    this.circles.update((list) => list.filter((c) => c.id !== circleId));
    this.saveJson(CIRCLES_KEY, this.circles());
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  markNotificationsRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.saveJson(NOTIFS_KEY, this.notifications());
  }

  // ---------------------------------------------------------------------------
  // MESSENGER (Popup Facebook-like Chat Boxes - Max 5)
  // ---------------------------------------------------------------------------

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

    const newBox: ActiveChatBox = {
      companionId: companion.id,
      companion,
      isMinimized: false,
      draftText: '',
      messages: [
        {
          id: 1,
          senderId: companion.id,
          receiverId: 1,
          text: `Hey Sophia! So wonderful to connect here on NeverBeen. Are you planning any trips soon?`,
          sentAtUtc: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    };

    this.activeChatBoxes.set([...updated, newBox]);
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

    const newMsg: ChatMessage = {
      id: generateUniqueId(),
      senderId: 1,
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

    // Auto simulated friendly reply after a moment
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
          senderName: 'Sophia Laurent',
          text: newMsg.text,
        },
      };

      this.activeChatBoxes.update((boxes) =>
        boxes.map((b) =>
          b.companionId === companionId
            ? { ...b, messages: [...b.messages, replyMsg] }
            : b,
        ),
      );
    }, 1200);
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
    this.journeyPosts.update((list) => list.filter((p) => p.id !== postId));
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
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

    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: removeCommentRecursive(post.comments || []),
          };
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
  }

  // ---------------------------------------------------------------------------
  // Local Seed / Storage Helpers
  // ---------------------------------------------------------------------------

  private initDefaultMember(): void {
    const defaultAboutMeDetails: AboutMeDetails = {
      intro: this.getRichIntroForUser(),
      gender: 'Female',
      dateOfBirth: '1996-04-18',
      location: 'Paris, France',
      hometown: 'Lyon, France',
      relationshipStatus: 'Exploring solo',
      languagesKnown: ['English', 'French', 'Italian', 'Spanish'],
      workExperience: [
        {
          id: 1,
          company: 'WanderLust Media Studio',
          yearFrom: '2022',
          yearTo: '',
          currentlyWorkHere: true,
          country: 'France',
          city: 'Paris',
          town: '1st Arrondissement',
          description:
            'Lead visual director producing AI-enhanced travel memoirs and landscape editorial series.',
        },
        {
          id: 2,
          company: 'Alpine Cinema Productions',
          yearFrom: '2019',
          yearTo: '2022',
          currentlyWorkHere: false,
          country: 'Switzerland',
          city: 'Zurich',
          town: 'Altstadt',
          description:
            'Assistant cinematographer capturing high-altitude mountaineering documentaries.',
        },
      ],
      education: [
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
      hobbies: [
        'Photography',
        'Alpine Hiking',
        'Coffee Brewing',
        'Scuba Diving',
        'Journaling',
        'Vinyl Records',
        'Skiing',
      ],
      interests: [
        'Architecture',
        'Historical Heritage',
        'Sunset Chasing',
        'Train Journeys',
        'Street Food',
        'Glacier Trails',
      ],
      contactEmail: 'sophia.laurent@neverbeen.example',
      contactPhone: '+33 6 88 41 92 01',
      socialLinks: [
        { platform: 'Instagram', urlOrHandle: '@sophia.in.the.wild' },
        { platform: 'Facebook', urlOrHandle: 'facebook.com/sophialaurent.travel' },
        { platform: 'X', urlOrHandle: '@sophia_visuals' },
      ],
      aboutThePerson:
        'I fell in love with storytelling while crossing the Swiss viaducts as a teenager. Today, I travel with a lightweight camera kit and an open heart, seeking authentic human connections, vibrant morning markets, and silent alpine dawns across Europe and beyond.',
    };

    const defaultProfile: Profile = {
      id: 1,
      uniqueId: generate20DigitUid(1),
      firstName: 'Sophia',
      lastName: 'Laurent',
      fullName: 'Sophia Laurent',
      email: 'sophia.laurent@neverbeen.example',
      gender: 'Female',
      dateOfBirth: '1996-04-18',
      age: 28,
      country: 'France',
      countryId: 58,
      countryName: 'France',
      state: 'Île-de-France',
      city: 'Paris',
      cityId: 320,
      cityName: 'Paris',
      pincode: '75001',
      contactNumber: '+33 6 88 41 92 01',
      postalAddress: '14 Rue de Castiglione, 75001 Paris',
      aboutMe:
        'Travel filmmaker and visual storyteller. Passionate about hidden alleys across Europe, alpine sunrises in the Swiss Alps, and sunset tones along the Mediterranean coast. Sharing AI vacation journeys with the NeverBeen community!',
      profession: 'Content Creator',
      status: 'Active',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      coverPhotoUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      createdAtUtc: '2026-08-10T14:22:00Z',
      activeStatus: 'Active',
      customStatusText: '',
      isProfileLocked: false,
      aboutMeDetails: defaultAboutMeDetails,
      settings: {
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        publicProfileEnabled: true,
        theme: 'light',
        timezone: 'Europe/Paris',
        isProfileLocked: false,
        whoCanMessage: 'everyone',
        searchVisibility: true,
        journeyVisibility: 'public',
        soundNotificationsEnabled: true,
        twoFactorEnabled: false,
        travelStyles: ['Photography', 'Solo Exploration', 'Culinary'],
        preferredSeason: 'Autumn & Spring',
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
      aboutMeDetails: defaultAboutMeDetails,
    };

    this.token.set('jwt_default_active_token');
    this.currentUser.set(defaultUser);
    this.profile.set(defaultProfile);
    this.saveJson(USER_KEY, defaultUser);
    this.saveJson(PROFILE_KEY, defaultProfile);
  }

  private loadComments(): CommunityComment[] {
    const saved = this.loadJson<CommunityComment[]>(COMMENTS_KEY);
    if (saved && saved.length > 0) return saved;

    const marcoAuthor: AuthorInfo = {
      id: 12,
      fullName: 'Marco Rossi',
      profession: 'Private Sector Professional',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    };
    const sophiaAuthor: AuthorInfo = {
      id: 1,
      fullName: 'Sophia Laurent',
      profession: 'Content Creator',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    };
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
    if (saved && saved.length > 0) return saved;

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

    const sophiaAuthor: AuthorInfo = {
      id: 1,
      fullName: 'Sophia Laurent',
      profession: 'Content Creator',
      profilePhotoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    };

    const seedReactions1: UserReaction[] = [
      { user: sophiaAuthor, type: 'Heart', reactedAtUtc: '2026-09-21T09:35:00Z' },
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
        likers: [sophiaAuthor, ...seedLikers],
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
            text: 'Lauterbrunnen in autumn is unbelievable Sophia! The valley mist creates natural depth in every portrait.',
            createdAtUtc: '2026-09-20T19:05:00Z',
            likeCount: 2,
            isLiked: true,
            myReaction: 'Smile',
            reactions: [
              { user: sophiaAuthor, type: 'Smile', reactedAtUtc: '2026-09-20T19:10:00Z' },
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

  private loadCompanions(): Companion[] {
    const saved = this.loadJson<Companion[]>(COMPANIONS_KEY);
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
    } else {
      merged = [...baseList, ...SEED_ASIAN_COMPANIONS];
    }

    const defaultCover =
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

    return merged.map((c) => {
      const rawIntro = c.aboutMeDetails?.intro;
      const intro = !rawIntro || rawIntro.length < 150 ? this.getRichIntroForCompanion(c) : rawIntro;
      return {
        ...c,
        coverPhotoUrl: c.coverPhotoUrl || defaultCover,
        uniqueId: c.uniqueId || generate20DigitUid(c.id),
        aboutMeDetails: {
          ...(c.aboutMeDetails || {}),
          intro,
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
    if (saved && saved.length > 0) return saved;

    return [
      {
        id: 1,
        name: 'Alpine Explorers',
        description: 'Passionate hikers and mountain photographers in the Alps.',
        icon: '🏔️',
        color: '#0284c7',
        memberIds: [33, 12],
        createdAtUtc: '2026-08-20T10:00:00Z',
      },
      {
        id: 2,
        name: 'Mediterranean Photographers',
        description: 'Coastal light, coastal villages, and seaside photography.',
        icon: '🌊',
        color: '#059669',
        memberIds: [33, 42, 12],
        createdAtUtc: '2026-08-25T14:30:00Z',
      },
    ];
  }

  private loadNotifications(): NotificationItem[] {
    const saved = this.loadJson<NotificationItem[]>(NOTIFS_KEY);
    if (saved && saved.length > 0) return saved;

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
        message: 'commented on your Journey post: "Lauterbrunnen in autumn is unbelievable Sophia!"',
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
      localStorage.setItem(key, JSON.stringify(val));
    }
  }
}
