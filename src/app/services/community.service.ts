import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AuthResult,
  City,
  CommunityComment,
  Country,
  CurrentUser,
  GalleryPhoto,
  Profile,
  ReactionResult,
  UpdateProfileRequest,
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

  /**
   * OAuth login with Google / Facebook / Microsoft.
   * If user is already a NeverBeen user, sets auth cookie and loads profile.
   * If not, marks pending for registration.
   */
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
        settings: {
          emailNotificationsEnabled: true,
          phoneNotificationsEnabled: false,
          publicProfileEnabled: true,
          theme: 'light',
          timezone: 'Europe/Paris',
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
        id: Date.now(),
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

  /** Quick one-click sign in for demonstration / preview mode */
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
    deleteCookie(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PROFILE_KEY);
    }
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
          id: Date.now(),
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
      id: Date.now(),
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
        list.map((post) => {
          if (post.id === parentId) {
            return {
              ...post,
              replyCount: post.replyCount + 1,
              replies: [...post.replies, newComment],
            };
          }
          return post;
        }),
      );
    } else {
      this.comments.update((list) => [newComment, ...list]);
    }

    this.saveJson(COMMENTS_KEY, this.comments());
    return newComment;
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
      settings: {
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        publicProfileEnabled: true,
        theme: 'light',
        timezone: 'Europe/Paris',
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
      {
        id: 4,
        text: 'Pro tip for new community members: upload a clean portrait with soft lighting in the registration form. It makes your profile look sharp and speeds up avatar generation.',
        createdAtUtc: '2026-09-20T20:30:00Z',
        likeCount: 14,
        dislikeCount: 0,
        author: {
          id: 33,
          fullName: 'Elena Rostova',
          profession: 'Blogger',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        },
        myReaction: null,
        replyCount: 0,
        replies: [],
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
