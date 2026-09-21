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
  SeedCountry,
} from '../models/community-seed';

const TOKEN_KEY = 'neverbeen_auth_token';
const USER_KEY = 'neverbeen_current_user';
const PROFILE_KEY = 'neverbeen_user_profile';
const COMMENTS_KEY = 'neverbeen_comments';

@Injectable({
  providedIn: 'root',
})
export class CommunityService {
  private readonly http = inject(HttpClient, { optional: true });
  readonly apiUrl = 'http://localhost:5080';

  readonly token = signal<string | null>(this.loadStorage(TOKEN_KEY));
  readonly currentUser = signal<CurrentUser | null>(this.loadJson(USER_KEY));
  readonly profile = signal<Profile | null>(this.loadJson(PROFILE_KEY));
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

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isPending = computed(() => this.currentUser()?.status === 'Pending');

  constructor() {
    // If no profile exists yet, seed a default active member so profile & message book are immediately testable
    if (!this.profile() && !this.currentUser()) {
      this.initDefaultMember();
    }
  }

  // ---------------------------------------------------------------------------
  // Session / OAuth
  // ---------------------------------------------------------------------------

  /** Simulates or executes OAuth login with Google / Facebook / Microsoft */
  async loginWithOAuth(provider: string, code: string): Promise<AuthResult> {
    if (this.http) {
      try {
        const res = await firstValueFrom(
          this.http.post<AuthResult>(`${this.apiUrl}/api/auth/oauth/login`, {
            provider,
            code,
          }),
        );
        this.applyAuthResult(res);
        return res;
      } catch (err) {
        console.warn('Backend API login unavailable, using simulated response:', err);
      }
    }

    // Fallback simulation based on provider
    const simulated: AuthResult = {
      token: 'jwt_mock_' + Math.random().toString(36).substring(2),
      tokenType: 'Bearer',
      expiresIn: 259200,
      isNewUser: false,
      profileComplete: true,
      message: `Signed in successfully via ${provider}.`,
      user: {
        id: 1,
        fullName: 'Sophia Laurent',
        email: `sophia.${provider.toLowerCase()}@neverbeen.example`,
        status: 'Active',
        profileComplete: true,
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
    };
    this.applyAuthResult(simulated);
    return simulated;
  }

  /** Quick one-click sign in for demonstration / preview mode */
  loginAsDemoUser(mode: 'new_pending' | 'active_member'): void {
    if (mode === 'new_pending') {
      const pendingUser: CurrentUser = {
        id: 99,
        fullName: 'Alex Vance',
        email: 'alex.vance@example.com',
        status: 'Pending',
        profileComplete: false,
        profilePhotoUrl:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      };
      this.token.set('jwt_demo_pending');
      this.currentUser.set(pendingUser);
      this.profile.set(null);
      this.saveStorage(TOKEN_KEY, 'jwt_demo_pending');
      this.saveJson(USER_KEY, pendingUser);
      localStorage.removeItem(PROFILE_KEY);
    } else {
      this.initDefaultMember();
    }
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.profile.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }

  private applyAuthResult(res: AuthResult): void {
    this.token.set(res.token);
    this.currentUser.set(res.user);
    this.saveStorage(TOKEN_KEY, res.token);
    this.saveJson(USER_KEY, res.user);

    if (res.profileComplete) {
      this.refreshProfile();
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
        // Fall through to seed data
      }
    }
    const seed = SEED_COUNTRIES.find((c) => c.id === countryId);
    return seed ? seed.cities : [];
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async registerUser(formData: FormData): Promise<Profile> {
    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.post<Profile>(`${this.apiUrl}/api/registration`, formData, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
        this.profile.set(res);
        this.saveJson(PROFILE_KEY, res);
        this.currentUser.update((u) =>
          u ? { ...u, status: 'Active', profileComplete: true, fullName: res.fullName } : null,
        );
        this.saveJson(USER_KEY, this.currentUser());
        return res;
      } catch (err) {
        console.warn('Backend API registration unavailable, using mock flow:', err);
      }
    }

    // Mock registration
    const countryId = Number(formData.get('countryId')) || 58;
    const cityId = Number(formData.get('cityId')) || 320;
    const country = SEED_COUNTRIES.find((c) => c.id === countryId);
    const city = country?.cities.find((ct) => ct.id === cityId);

    const newProfile: Profile = {
      id: this.currentUser()?.id ?? 1,
      fullName: (formData.get('fullName') as string) || 'New Traveler',
      email: (formData.get('email') as string) || 'traveler@neverbeen.example',
      gender: (formData.get('gender') as string) || 'Other',
      dateOfBirth: (formData.get('dateOfBirth') as string) || '1995-05-15',
      age: 29,
      countryId,
      countryName: country?.name ?? 'France',
      cityId,
      cityName: city?.name ?? 'Paris',
      pincode: (formData.get('pincode') as string) || '75001',
      contactNumber: (formData.get('contactNumber') as string) || '+33 6 12 34 56 78',
      postalAddress: (formData.get('postalAddress') as string) || 'Rue de Rivoli',
      aboutMe:
        (formData.get('aboutMe') as string) ||
        'Passionate traveler discovering new places through photography.',
      profession: (formData.get('profession') as string) || 'Content Creator',
      status: 'Active',
      profilePhotoUrl:
        this.currentUser()?.profilePhotoUrl ??
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      createdAtUtc: new Date().toISOString(),
      settings: {
        emailNotificationsEnabled: true,
        phoneNotificationsEnabled: false,
        publicProfileEnabled: true,
        theme: 'light',
        timezone: 'Europe/Paris',
      },
      gallery: [],
      commentCount: 0,
    };

    this.profile.set(newProfile);
    this.saveJson(PROFILE_KEY, newProfile);

    this.currentUser.set({
      id: newProfile.id,
      fullName: newProfile.fullName,
      email: newProfile.email,
      status: 'Active',
      profileComplete: true,
      profilePhotoUrl: newProfile.profilePhotoUrl,
    });
    this.saveJson(USER_KEY, this.currentUser());

    return newProfile;
  }

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  async refreshProfile(): Promise<Profile | null> {
    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.get<Profile>(`${this.apiUrl}/api/profile/me`, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
        this.profile.set(res);
        this.saveJson(PROFILE_KEY, res);
        return res;
      } catch {
        // Keep cached
      }
    }
    return this.profile();
  }

  async updateProfile(req: UpdateProfileRequest): Promise<Profile> {
    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.put<Profile>(`${this.apiUrl}/api/profile`, req, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
        this.profile.set(res);
        this.saveJson(PROFILE_KEY, res);
        return res;
      } catch {
        // Fall through
      }
    }

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
      cityId: req.cityId ?? current.cityId,
      cityName: city?.name ?? current.cityName,
      pincode: req.pincode ?? current.pincode,
      contactNumber: req.contactNumber ?? current.contactNumber,
      postalAddress: req.postalAddress ?? current.postalAddress,
      aboutMe: req.aboutMe ?? current.aboutMe,
      profession: req.profession ?? current.profession,
    };

    this.profile.set(updated);
    this.saveJson(PROFILE_KEY, updated);
    this.currentUser.update((u) =>
      u ? { ...u, fullName: updated.fullName } : null,
    );
    this.saveJson(USER_KEY, this.currentUser());
    return updated;
  }

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.put<UserSettings>(`${this.apiUrl}/api/profile/settings`, settings, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
        this.profile.update((p) => (p ? { ...p, settings: res } : null));
        this.saveJson(PROFILE_KEY, this.profile());
        return res;
      } catch {
        // Fall through
      }
    }

    this.profile.update((p) => (p ? { ...p, settings } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    return settings;
  }

  async uploadProfilePhoto(file: File): Promise<string> {
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const photoUrl = await dataUrlPromise;

    if (this.http && this.token()) {
      try {
        const fd = new FormData();
        fd.append('photo', file);
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/api/profile/photo`, fd, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
      } catch {
        // Use local data url
      }
    }

    this.profile.update((p) => (p ? { ...p, profilePhotoUrl: photoUrl } : null));
    this.currentUser.update((u) => (u ? { ...u, profilePhotoUrl: photoUrl } : null));
    this.saveJson(PROFILE_KEY, this.profile());
    this.saveJson(USER_KEY, this.currentUser());
    return photoUrl;
  }

  async addGalleryPhoto(file: File, caption: string): Promise<GalleryPhoto> {
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const url = await dataUrlPromise;

    const newPhoto: GalleryPhoto = {
      id: Date.now(),
      url,
      caption: caption || 'My vacation capture',
      createdAtUtc: new Date().toISOString(),
    };

    if (this.http && this.token()) {
      try {
        const fd = new FormData();
        fd.append('photo', file);
        if (caption) fd.append('caption', caption);
        const res = await firstValueFrom(
          this.http.post<GalleryPhoto>(`${this.apiUrl}/api/gallery`, fd, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
        newPhoto.id = res.id;
        newPhoto.url = `${this.apiUrl}${res.url}`;
      } catch {
        // Use local object
      }
    }

    this.profile.update((p) =>
      p ? { ...p, gallery: [newPhoto, ...p.gallery] } : null,
    );
    this.saveJson(PROFILE_KEY, this.profile());
    return newPhoto;
  }

  async deleteGalleryPhoto(photoId: number): Promise<void> {
    if (this.http && this.token()) {
      try {
        await firstValueFrom(
          this.http.delete(`${this.apiUrl}/api/gallery/${photoId}`, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
      } catch {
        // Fall through
      }
    }

    this.profile.update((p) =>
      p
        ? {
            ...p,
            gallery: p.gallery.filter((item) => item.id !== photoId),
          }
        : null,
    );
    this.saveJson(PROFILE_KEY, this.profile());
  }

  // ---------------------------------------------------------------------------
  // Message Book
  // ---------------------------------------------------------------------------

  async postComment(text: string, parentId?: number): Promise<CommunityComment> {
    const author = {
      id: this.currentUser()?.id ?? 1,
      fullName: this.currentUser()?.fullName ?? 'Sophia Laurent',
      profilePhotoUrl: this.currentUser()?.profilePhotoUrl,
      profession: this.profile()?.profession ?? 'Content Creator',
    };

    const newComment: CommunityComment = {
      id: Date.now(),
      text,
      createdAtUtc: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      author,
      myReaction: null,
      replyCount: 0,
      parentId: parentId ?? null,
      replies: [],
    };

    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.post<CommunityComment>(
            `${this.apiUrl}/api/messagebook`,
            { text, parentId },
            { headers: { Authorization: `Bearer ${this.token()}` } },
          ),
        );
        newComment.id = res.id;
      } catch {
        // Use local comment
      }
    }

    if (parentId) {
      // Add as nested reply
      this.comments.update((list) =>
        list.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replyCount: c.replyCount + 1,
              replies: [...c.replies, newComment],
            };
          }
          return c;
        }),
      );
    } else {
      // Add as top-level post
      this.comments.update((list) => [newComment, ...list]);
      this.profile.update((p) =>
        p ? { ...p, commentCount: p.commentCount + 1 } : null,
      );
      this.saveJson(PROFILE_KEY, this.profile());
    }

    this.saveJson(COMMENTS_KEY, this.comments());
    return newComment;
  }

  async toggleReaction(commentId: number, type: 'like' | 'dislike'): Promise<ReactionResult> {
    if (this.http && this.token()) {
      try {
        const res = await firstValueFrom(
          this.http.post<ReactionResult>(
            `${this.apiUrl}/api/messagebook/${commentId}/reactions`,
            { type },
            { headers: { Authorization: `Bearer ${this.token()}` } },
          ),
        );
        this.updateCommentReactionInState(commentId, res);
        return res;
      } catch {
        // Fall through
      }
    }

    // Toggle locally
    const targetReaction = type === 'like' ? 'Like' : 'Dislike';
    let result: ReactionResult = { likeCount: 0, dislikeCount: 0, myReaction: null };

    this.comments.update((list) =>
      list.map((post) => {
        if (post.id === commentId) {
          const next = this.computeReaction(post, targetReaction);
          result = {
            likeCount: next.likeCount,
            dislikeCount: next.dislikeCount,
            myReaction: next.myReaction,
          };
          return next;
        }

        // Check in replies
        const updatedReplies = post.replies.map((reply) => {
          if (reply.id === commentId) {
            const next = this.computeReaction(reply, targetReaction);
            result = {
              likeCount: next.likeCount,
              dislikeCount: next.dislikeCount,
              myReaction: next.myReaction,
            };
            return next;
          }
          return reply;
        });

        return { ...post, replies: updatedReplies };
      }),
    );

    this.saveJson(COMMENTS_KEY, this.comments());
    return result;
  }

  async deleteComment(commentId: number): Promise<void> {
    if (this.http && this.token()) {
      try {
        await firstValueFrom(
          this.http.delete(`${this.apiUrl}/api/messagebook/${commentId}`, {
            headers: { Authorization: `Bearer ${this.token()}` },
          }),
        );
      } catch {
        // Fall through
      }
    }

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
      // Toggle off
      myReaction = null;
      if (target === 'Like') likeCount = Math.max(0, likeCount - 1);
      else dislikeCount = Math.max(0, dislikeCount - 1);
    } else {
      // Remove old
      if (myReaction === 'Like') likeCount = Math.max(0, likeCount - 1);
      if (myReaction === 'Dislike') dislikeCount = Math.max(0, dislikeCount - 1);

      // Add new
      myReaction = target;
      if (target === 'Like') likeCount++;
      else dislikeCount++;
    }

    return { ...item, likeCount, dislikeCount, myReaction };
  }

  private updateCommentReactionInState(commentId: number, res: ReactionResult): void {
    this.comments.update((list) =>
      list.map((post) => {
        if (post.id === commentId) {
          return {
            ...post,
            likeCount: res.likeCount,
            dislikeCount: res.dislikeCount,
            myReaction: res.myReaction,
          };
        }
        return {
          ...post,
          replies: post.replies.map((reply) =>
            reply.id === commentId
              ? {
                  ...reply,
                  likeCount: res.likeCount,
                  dislikeCount: res.dislikeCount,
                  myReaction: res.myReaction,
                }
              : reply,
          ),
        };
      }),
    );
    this.saveJson(COMMENTS_KEY, this.comments());
  }

  // ---------------------------------------------------------------------------
  // Local Seed / Storage Helpers
  // ---------------------------------------------------------------------------

  private initDefaultMember(): void {
    const defaultProfile: Profile = {
      id: 1,
      fullName: 'Sophia Laurent',
      email: 'sophia.laurent@neverbeen.example',
      gender: 'Female',
      dateOfBirth: '1996-04-18',
      age: 28,
      countryId: 58,
      countryName: 'France',
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
        {
          id: 104,
          url: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80',
          caption: 'Lake Moraine dreamscape',
          createdAtUtc: '2026-09-14T11:45:00Z',
        },
      ],
      commentCount: 4,
    };

    const defaultUser: CurrentUser = {
      id: defaultProfile.id,
      fullName: defaultProfile.fullName,
      email: defaultProfile.email,
      status: defaultProfile.status,
      profileComplete: true,
      profilePhotoUrl: defaultProfile.profilePhotoUrl,
    };

    this.token.set('jwt_default_active_token');
    this.currentUser.set(defaultUser);
    this.profile.set(defaultProfile);
    this.saveStorage(TOKEN_KEY, 'jwt_default_active_token');
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
          {
            id: 3,
            text: 'Thanks for the tip Sophia! Going to configure my custom set for Positano this evening.',
            createdAtUtc: '2026-09-21T07:10:00Z',
            likeCount: 2,
            dislikeCount: 0,
            author: {
              id: 12,
              fullName: 'Marco Rossi',
              profession: 'Private Sector Professional',
              profilePhotoUrl:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
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
        replyCount: 1,
        replies: [
          {
            id: 5,
            text: 'Great advice Elena! Also make sure your country and city are set up accurately so nearby community members can exchange local tips.',
            createdAtUtc: '2026-09-20T21:15:00Z',
            likeCount: 3,
            dislikeCount: 0,
            author: {
              id: 45,
              fullName: 'David Miller',
              profession: 'Freelancer',
              profilePhotoUrl:
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
            },
            myReaction: null,
            replyCount: 0,
            parentId: 4,
            replies: [],
          },
        ],
      },
      {
        id: 6,
        text: 'Hello from Tokyo! Just registered today and thrilled to see so many photographers and creators here. Looking forward to connecting with fellow travel enthusiasts.',
        createdAtUtc: '2026-09-20T14:05:00Z',
        likeCount: 6,
        dislikeCount: 0,
        author: {
          id: 88,
          fullName: 'Kenji Sato',
          profession: 'Student',
          profilePhotoUrl:
            'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        },
        myReaction: 'Like',
        replyCount: 0,
        replies: [],
      },
    ];
  }

  private loadStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private saveStorage(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
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
