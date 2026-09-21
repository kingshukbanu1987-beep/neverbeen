import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Circle, City, Companion, JourneyPost, UserActiveStatus } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';

export type ProfileSection =
  | 'journey'
  | 'about'
  | 'gallery'
  | 'messagebook'
  | 'companions'
  | 'circles'
  | 'messenger'
  | 'notifications'
  | 'settings';

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

  // Active section in the right side wide panel (default: 'journey')
  protected readonly activeSection = signal<ProfileSection>('journey');

  // Search state (top-left)
  protected readonly searchQuery = signal('');
  protected readonly showSearchDropdown = signal(false);
  protected readonly viewingTraveler = signal<Companion | null>(null);

  // Enlarged Profile Photo Modal
  protected readonly showEnlargedPhoto = signal(false);

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
  protected selectedMood = '✈️ Traveling';
  protected selectedLocation = '';
  protected readonly postingJourney = signal(false);
  protected readonly activeCommentPostId = signal<number | null>(null);
  protected journeyCommentText = '';

  // Multi-level Journey Comment Replies
  protected readonly activeJourneyReplyCommentId = signal<number | null>(null);
  protected journeyReplyText = '';

  // Circles state
  protected readonly showCreateCircleModal = signal(false);
  protected newCircleName = '';
  protected newCircleDesc = '';
  protected newCircleIcon = '🌟';
  protected newCircleColor = '#2563eb';
  protected readonly selectedCircleMemberIds = signal<number[]>([]);
  protected readonly circleError = signal<string | null>(null);

  // Messenger state
  protected readonly showMessengerFlyout = signal(false);

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
    preferredSeason: ['Autumn & Spring'],
    theme: ['light'],
    timezone: ['UTC'],
  });

  // Search results computed
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return { travelers: [], circles: [] };

    const travelers = this.service
      .companions()
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.profession.toLowerCase().includes(q),
      );

    const circles = this.service
      .circles()
      .filter(
        (cr) =>
          cr.name.toLowerCase().includes(q) ||
          cr.description.toLowerCase().includes(q),
      );

    return { travelers, circles };
  });

  async ngOnInit(): Promise<void> {
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
    if (section === 'notifications') {
      this.service.markNotificationsRead();
    }
  }

  // Alias for tests
  setTab(tab: 'journey' | 'about' | 'details' | 'gallery' | 'settings'): void {
    if (tab === 'details') {
      this.activeSection.set('about');
      this.editingDetails.set(true);
    } else {
      this.activeSection.set(tab as ProfileSection);
    }
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
    this.showSearchDropdown.set(this.searchQuery().trim().length > 0);
  }

  openTravelerModal(companion: Companion): void {
    this.viewingTraveler.set(companion);
    this.showSearchDropdown.set(false);
  }

  closeTravelerModal(): void {
    this.viewingTraveler.set(null);
  }

  requestCompanionship(userId: number): void {
    this.service.sendCompanionshipRequest(userId);
    if (this.viewingTraveler() && this.viewingTraveler()!.id === userId) {
      this.viewingTraveler.update((t) => (t ? { ...t, status: 'pending_outgoing' } : null));
    }
  }

  // ---------------------------------------------------------------------------
  // JOURNEY (PUBLIC FEED WITH NESTED COMMENTS ON COMMENTS)
  // ---------------------------------------------------------------------------

  submitJourneyPost(): void {
    if (!this.newJourneyText.trim()) return;
    this.postingJourney.set(true);
    try {
      this.service.createJourneyPost(
        this.newJourneyText,
        this.selectedMood,
        this.selectedLocation,
      );
      this.newJourneyText = '';
      this.selectedLocation = '';
    } finally {
      this.postingJourney.set(false);
    }
  }

  toggleLikePost(postId: number): void {
    this.service.toggleJourneyLike(postId);
  }

  toggleCommentSection(postId: number): void {
    if (this.activeCommentPostId() === postId) {
      this.activeCommentPostId.set(null);
    } else {
      this.activeCommentPostId.set(postId);
      this.journeyCommentText = '';
    }
  }

  submitJourneyComment(postId: number): void {
    if (!this.journeyCommentText.trim()) return;
    this.service.addJourneyComment(postId, this.journeyCommentText);
    this.journeyCommentText = '';
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

  toggleJourneyCommentLike(postId: number, commentId: number): void {
    this.service.toggleJourneyCommentLike(postId, commentId);
  }

  // ---------------------------------------------------------------------------
  // CIRCLES
  // ---------------------------------------------------------------------------

  openCreateCircleModal(): void {
    this.circleError.set(null);
    if (this.service.circles().length >= 5) {
      this.circleError.set('You have reached the maximum of 5 Circles.');
      return;
    }
    this.newCircleName = '';
    this.newCircleDesc = '';
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
    );

    if (created) {
      this.showCreateCircleModal.set(false);
      this.circleError.set(null);
    } else {
      this.circleError.set('Maximum of 5 Circles allowed.');
    }
  }

  deleteCircle(circleId: number): void {
    this.service.deleteCircle(circleId);
  }

  getCircleMembers(memberIds: number[]): Companion[] {
    return this.service.companions().filter((c) => memberIds.includes(c.id));
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
    this.service.approveCompanionshipRequest(notificationId, fromUserId);
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
      preferredSeason: s.preferredSeason ?? 'Autumn & Spring',
      theme: s.theme,
      timezone: s.timezone || 'UTC',
    });
    if (s.travelStyles) {
      this.selectedTravelStyles.set(s.travelStyles);
    }
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
  // GALLERY
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
  // MESSAGEBOOK (PERSONAL TO USER AND COMPANIONS)
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

      await this.service.updateSettings({
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
        preferredSeason: v.preferredSeason ?? 'Autumn & Spring',
        theme: (v.theme as 'light' | 'dark' | 'system') ?? 'light',
        timezone: v.timezone ?? 'UTC',
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
