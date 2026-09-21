import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { City } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';

export type ProfileSection = 'about' | 'gallery' | 'messagebook' | 'settings';

@Component({
  selector: 'app-community-profile',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class CommunityProfile implements OnInit {
  protected readonly service = inject(CommunityService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Active section in the right side wide panel (default: 'about')
  protected readonly activeSection = signal<ProfileSection>('about');

  // Edit details state
  protected readonly editingDetails = signal(false);
  protected readonly editCitiesList = signal<City[]>([]);

  // Gallery state
  protected readonly showUploadCard = signal(false);
  protected readonly uploadingGallery = signal(false);
  protected readonly selectedGalleryFile = signal<File | null>(null);
  protected readonly galleryPreviewUrl = signal<string | null>(null);
  protected newCaption = '';

  // MessageBook state
  protected newPostText = '';
  protected replyText = '';
  protected readonly postingPost = signal(false);
  protected readonly postingReply = signal(false);
  protected readonly activeReplyPostId = signal<number | null>(null);

  // Settings state
  protected readonly savingSettings = signal(false);
  protected readonly settingsSaved = signal(false);

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
    emailNotificationsEnabled: [true],
    phoneNotificationsEnabled: [false],
    theme: ['light'],
    timezone: ['UTC'],
  });

  async ngOnInit(): Promise<void> {
    // If not authenticated, redirect back to the Sign in Page
    if (!this.service.isAuthenticated() || !this.service.profile()) {
      this.router.navigate(['/community']);
      return;
    }

    this.populateEditForm();
    this.populateSettingsForm();

    const p = this.service.profile();
    if (p?.countryId) {
      const cities = await this.service.getCitiesForCountry(p.countryId);
      this.editCitiesList.set(cities);
    }
  }

  setSection(section: ProfileSection): void {
    this.activeSection.set(section);
  }

  // Alias for tests
  setTab(tab: 'about' | 'details' | 'gallery' | 'settings'): void {
    if (tab === 'details') {
      this.activeSection.set('about');
      this.editingDetails.set(true);
    } else {
      this.activeSection.set(tab as ProfileSection);
    }
  }

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
    const s = this.service.profile()?.settings;
    if (!s) return;
    this.settingsForm.patchValue({
      publicProfileEnabled: s.publicProfileEnabled,
      emailNotificationsEnabled: s.emailNotificationsEnabled,
      phoneNotificationsEnabled: s.phoneNotificationsEnabled,
      theme: s.theme,
      timezone: s.timezone || 'UTC',
    });
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
    if (input.files && input.files[0]) {
      await this.service.uploadProfilePhoto(input.files[0]);
    }
  }

  // ---------------------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------------------

  onGalleryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedGalleryFile.set(file);

      const reader = new FileReader();
      reader.onload = () => this.galleryPreviewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
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
  // MessageBook
  // ---------------------------------------------------------------------------

  async submitPost(): Promise<void> {
    if (!this.newPostText.trim()) return;
    this.postingPost.set(true);
    try {
      await this.service.postComment(this.newPostText.trim());
      this.newPostText = '';
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

  canDeleteComment(authorId: number): boolean {
    const user = this.service.currentUser();
    return !!(user && user.id === authorId);
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

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async saveSettings(): Promise<void> {
    this.savingSettings.set(true);
    try {
      const v = this.settingsForm.getRawValue();
      await this.service.updateSettings({
        publicProfileEnabled: v.publicProfileEnabled ?? true,
        emailNotificationsEnabled: v.emailNotificationsEnabled ?? true,
        phoneNotificationsEnabled: v.phoneNotificationsEnabled ?? false,
        theme: (v.theme as 'light' | 'dark' | 'system') ?? 'light',
        timezone: v.timezone ?? 'UTC',
      });
      this.settingsSaved.set(true);
      setTimeout(() => this.settingsSaved.set(false), 3000);
    } finally {
      this.savingSettings.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Log Out
  // ---------------------------------------------------------------------------

  logout(): void {
    this.service.logout();
    this.router.navigate(['/community']);
  }
}
