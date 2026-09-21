import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActiveChatBox,
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
  UpdateProfileRequest,
  UserActiveStatus,
  UserSettings,
} from '../models/community';
import {
  SEED_COUNTRIES,
  SEED_GENDERS,
  SEED_PROFESSIONS,
} from '../models/community-seed';

export const TOKEN_KEY = 'neverbeen_auth_token';
export const USER_KEY = 'neverbeen_current_user';
export const PROFILE_KEY = 'neverbeen_user_profile';
export const COMMENTS_KEY = 'neverbeen_comments';
export const JOURNEY_KEY = 'neverbeen_journey_posts';
export const COMPANIONS_KEY = 'neverbeen_companions';
export const CIRCLES_KEY = 'neverbeen_circles';
export const NOTIFS_KEY = 'neverbeen_notifications';

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

  readonly unreadNotificationCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length,
  );

  readonly onlineCompanions = computed(() =>
    this.companions().filter((c) => c.status === 'connected' && c.isOnline),
  );

  readonly offlineCompanions = computed(() =>
    this.companions().filter((c) => c.status === 'connected' && !c.isOnline),
  );

  constructor() {
    const existingCookieToken = getCookie(TOKEN_KEY);
    if (existingCookieToken) {
      const storedUser = this.loadJson<CurrentUser>(USER_KEY);
      const storedProfile = this.loadJson<Profile>(PROFILE_KEY);
      if (storedUser && storedProfile) {
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
    };

    this.profile.set(updated);
    this.saveJson(PROFILE_KEY, updated);
    return updated;
  }

  async uploadProfilePhoto(file: File): Promise<string> {
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

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    this.profile.update((p) => (p ? { ...p, settings } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    return settings;
  }

  // ---------------------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------------------

  async addGalleryPhoto(file: File, caption?: string): Promise<GalleryPhoto> {
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

  async postComment(text: string, parentId?: number): Promise<CommunityComment> {
    const user = this.currentUser();
    const newComment: CommunityComment = {
      id: generateUniqueId(),
      text,
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

  async toggleReaction(commentId: number, reactionType: 'like' | 'dislike'): Promise<void> {
    const target = reactionType === 'like' ? 'Like' : 'Dislike';

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
    target: 'Like' | 'Dislike',
  ): CommunityComment {
    let likeCount = item.likeCount;
    let dislikeCount = item.dislikeCount;
    let myReaction: 'Like' | 'Dislike' | null = item.myReaction ?? null;

    if (myReaction === target) {
      myReaction = null;
      if (target === 'Like') likeCount = Math.max(0, likeCount - 1);
      else dislikeCount = Math.max(0, dislikeCount - 1);
    } else {
      if (myReaction === 'Like') likeCount = Math.max(0, likeCount - 1);
      if (myReaction === 'Dislike') dislikeCount = Math.max(0, dislikeCount - 1);

      myReaction = target;
      if (target === 'Like') likeCount++;
      else dislikeCount++;
    }

    return { ...item, likeCount, dislikeCount, myReaction };
  }

  // ---------------------------------------------------------------------------
  // JOURNEY (Facebook-like Wall Feeds)
  // ---------------------------------------------------------------------------

  createJourneyPost(text: string, mood?: string, location?: string): JourneyPost {
    const user = this.currentUser();
    const profile = this.profile();
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
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      comments: [],
      mood: mood || undefined,
      location: location || (profile?.cityName ? `${profile.cityName}, ${profile.countryName || ''}` : undefined),
    };

    this.journeyPosts.update((list) => [newPost, ...list]);
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
    return newPost;
  }

  toggleJourneyLike(postId: number): void {
    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          const likeCount = isLiked ? post.likeCount + 1 : Math.max(0, post.likeCount - 1);
          return { ...post, isLiked, likeCount };
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
  }

  addJourneyComment(postId: number, text: string, parentCommentId?: number): void {
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
      createdAtUtc: new Date().toISOString(),
      parentId: parentCommentId ?? null,
      likeCount: 0,
      isLiked: false,
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
    this.journeyPosts.update((list) =>
      list.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: this.toggleNestedCommentLike(post.comments, commentId),
          };
        }
        return post;
      }),
    );
    this.saveJson(JOURNEY_KEY, this.journeyPosts());
  }

  private toggleNestedCommentLike(
    comments: JourneyComment[],
    targetId: number,
  ): JourneyComment[] {
    return comments.map((c) => {
      if (c.id === targetId) {
        const isLiked = !c.isLiked;
        const likeCount = isLiked ? (c.likeCount || 0) + 1 : Math.max(0, (c.likeCount || 0) - 1);
        return { ...c, isLiked, likeCount };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: this.toggleNestedCommentLike(c.replies, targetId),
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

  approveCompanionshipRequest(notificationId: number, fromUserId: number): void {
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

  sendChatMessage(companionId: number, text: string): void {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: generateUniqueId(),
      senderId: 1,
      receiverId: companionId,
      text: text.trim(),
      sentAtUtc: new Date().toISOString(),
    };

    this.activeChatBoxes.update((boxes) =>
      boxes.map((b) =>
        b.companionId === companionId
          ? {
              ...b,
              draftText: '',
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

  // ---------------------------------------------------------------------------
  // Local Seed / Storage Helpers
  // ---------------------------------------------------------------------------

  private initDefaultMember(): void {
    const defaultProfile: Profile = {
      id: 1,
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

    const defaultUser: CurrentUser = {
      id: defaultProfile.id,
      firstName: defaultProfile.firstName,
      lastName: defaultProfile.lastName,
      fullName: defaultProfile.fullName,
      email: defaultProfile.email,
      status: defaultProfile.status,
      profileComplete: true,
      profilePhotoUrl: defaultProfile.profilePhotoUrl,
      activeStatus: 'Active',
      customStatusText: '',
      isProfileLocked: false,
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

    return [
      {
        id: 1,
        text: 'Just received my high-resolution prints from the Kyoto Bamboo Forest set! The light rays cutting through the grove look 100% genuine. Has anyone here tested the Amalfi Coast packages yet?',
        createdAtUtc: '2026-09-21T06:12:00Z',
        likeCount: 8,
        dislikeCount: 0,
        author: {
          id: 12,
          fullName: 'Marco Rossi',
          profession: 'Private Sector Professional',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        },
        myReaction: 'Like',
        replyCount: 2,
        replies: [
          {
            id: 2,
            text: 'I ordered the Amalfi Coast prints last weekend! The cliffside colors in Positano during golden hour are breathtaking. Definitely recommend pairing it with Mediterranean casual style.',
            createdAtUtc: '2026-09-21T06:45:00Z',
            likeCount: 4,
            dislikeCount: 0,
            author: {
              id: 1,
              fullName: 'Sophia Laurent',
              profession: 'Content Creator',
              profilePhotoUrl:
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            },
            myReaction: null,
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
        location: 'Lake Como, Italy',
        mood: '🌿 Blissful',
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
        createdAtUtc: '2026-09-21T08:15:00Z',
        likeCount: 24,
        isLiked: false,
        location: 'Positano, Italy',
        mood: '✨ Inspired',
        comments: [],
      },
      {
        id: 103,
        author: {
          id: 1,
          fullName: 'Sophia Laurent',
          profession: 'Content Creator',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        },
        text: 'Preparing my autumn bucket list: Lauterbrunnen waterfalls, Zermatt alpine trails, and Kyoto maple foliage! Planning to publish a comprehensive photography journey for the NeverBeen community next week. What destination are you dreaming about right now? 🏔️🍁',
        createdAtUtc: '2026-09-20T18:20:00Z',
        likeCount: 31,
        isLiked: true,
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
        location: 'Tokyo, Japan',
        mood: '🏮 Serene',
        comments: [],
      },
    ];
  }

  private loadCompanions(): Companion[] {
    const saved = this.loadJson<Companion[]>(COMPANIONS_KEY);
    if (saved && saved.length > 0) return saved;

    return [
      {
        id: 33,
        fullName: 'Elena Rostova',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        country: 'France',
        city: 'Paris',
        profession: 'Travel Blogger',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 8,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Documenting scenic train routes and mountain lakes across Europe.',
      },
      {
        id: 12,
        fullName: 'Marco Rossi',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        country: 'Italy',
        city: 'Rome',
        profession: 'Architect',
        isOnline: true,
        activeStatus: 'Busy',
        mutualCompanionsCount: 12,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Architectural photographer with a focus on historical Italian coastlines.',
      },
      {
        id: 42,
        fullName: 'Chloe Dupont',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        country: 'France',
        city: 'Nice',
        profession: 'Landscape Photographer',
        isOnline: true,
        activeStatus: 'Away',
        mutualCompanionsCount: 5,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Chasing turquoise waves and golden light along the French Riviera.',
      },
      {
        id: 88,
        fullName: 'Kenji Sato',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        country: 'Japan',
        city: 'Tokyo',
        profession: 'Student & Street Shooter',
        isOnline: false,
        activeStatus: 'Inactive',
        mutualCompanionsCount: 3,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Exploring traditional shrines and night neon in Kanto & Kansai.',
      },
      {
        id: 55,
        fullName: 'Liam O\'Connor',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        country: 'Ireland',
        city: 'Dublin',
        profession: 'Adventure Guide',
        isOnline: false,
        activeStatus: "Don't Disturb",
        mutualCompanionsCount: 4,
        status: 'connected',
        isProfileLocked: false,
        bio: 'Hiking the Wild Atlantic Way and Scottish Highlands.',
      },
      // Non-connected travelers (searchable & can send requests)
      {
        id: 71,
        fullName: 'Maya Patel',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        country: 'India',
        city: 'Mumbai',
        profession: 'UI/UX Designer',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 2,
        status: 'pending_incoming', // Requested companionship!
        isProfileLocked: true, // Profile is locked!
        bio: 'Minimalist traveler exploring heritage forts and colorful desert fairs.',
      },
      {
        id: 72,
        fullName: 'Lucas Vance',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
        country: 'Germany',
        city: 'Berlin',
        profession: 'Documentary Filmmaker',
        isOnline: false,
        activeStatus: 'Inactive',
        mutualCompanionsCount: 1,
        status: 'none',
        isProfileLocked: false,
        bio: 'Urban exploration and historical travel across Central Europe.',
      },
      {
        id: 73,
        fullName: 'Isabella Santos',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        country: 'Portugal',
        city: 'Lisbon',
        profession: 'Food & Wine Writer',
        isOnline: true,
        activeStatus: 'Active',
        mutualCompanionsCount: 6,
        status: 'none',
        isProfileLocked: false,
        bio: 'Sharing secret viewpoints and culinary treasures across the Iberian peninsula.',
      },
      {
        id: 74,
        fullName: 'Noah Weber',
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
        country: 'Switzerland',
        city: 'Zurich',
        profession: 'Alpinist',
        isOnline: false,
        activeStatus: 'Busy',
        mutualCompanionsCount: 7,
        status: 'none',
        isProfileLocked: true, // Profile is locked!
        bio: 'High altitude mountaineer exploring glaciers and remote Swiss ridges.',
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
