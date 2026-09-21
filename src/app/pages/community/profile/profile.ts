import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { City } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';

type ProfileTab = 'about' | 'details' | 'gallery' | 'settings';

@Component({
  selector: 'app-community-profile',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class CommunityProfile implements OnInit {
  protected readonly service = inject(CommunityService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeTab = signal<ProfileTab>('about');
  protected readonly editingDetails = signal(false);
  protected readonly showUploadCard = signal(false);
  protected readonly uploadingGallery = signal(false);
  protected readonly savingSettings = signal(false);
  protected readonly settingsSaved = signal(false);

  protected readonly selectedGalleryFile = signal<File | null>(null);
  protected readonly galleryPreviewUrl = signal<string | null>(null);
  protected newCaption = '';

  protected readonly editCitiesList = signal<City[]>([]);

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  protected readonly editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    profession: ['', Validators.required],
    countryId: [null as number | null, Validators.required],
    cityId: [null as number | null, Validators.required],
    pincode: [''],
    contactNumber: [''],
    postalAddress: [''],
    aboutMe: [''],
  });

  protected readonly settingsForm = this.fb.group({
    publicProfileEnabled: [true],
    emailNotificationsEnabled: [true],
    phoneNotificationsEnabled: [false],
    theme: ['light'],
    timezone: ['Europe/Paris'],
  });

  async ngOnInit(): Promise<void> {
    const profile = this.service.profile();
    if (profile) {
      this.populateEditForm();
      this.populateSettingsForm();
      if (profile.countryId) {
        const cities = await this.service.getCitiesForCountry(profile.countryId);
        this.editCitiesList.set(cities);
      }
    }
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
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
      fullName: p.fullName ?? '',
      profession: p.profession ?? '',
      countryId: p.countryId ?? null,
      cityId: p.cityId ?? null,
      pincode: p.pincode ?? '',
      contactNumber: p.contactNumber ?? '',
      postalAddress: p.postalAddress ?? '',
      aboutMe: p.aboutMe ?? '',
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
      timezone: s.timezone ?? 'Europe/Paris',
    });
  }

  async onEditCountryChange(): Promise<void> {
    const countryId = this.editForm.get('countryId')?.value;
    if (countryId) {
      const cities = await this.service.getCitiesForCountry(Number(countryId));
      this.editCitiesList.set(cities);
      if (cities.length > 0) {
        this.editForm.patchValue({ cityId: cities[0].id });
      }
    }
  }

  async saveDetails(): Promise<void> {
    if (this.editForm.invalid) return;
    const v = this.editForm.getRawValue();
    await this.service.updateProfile({
      fullName: v.fullName ?? undefined,
      profession: v.profession ?? undefined,
      countryId: v.countryId ? Number(v.countryId) : undefined,
      cityId: v.cityId ? Number(v.cityId) : undefined,
      pincode: v.pincode ?? undefined,
      contactNumber: v.contactNumber ?? undefined,
      postalAddress: v.postalAddress ?? undefined,
      aboutMe: v.aboutMe ?? undefined,
    });
    this.editingDetails.set(false);
  }

  async onPhotoFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      await this.service.uploadProfilePhoto(input.files[0]);
    }
  }

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

  async saveSettings(): Promise<void> {
    this.savingSettings.set(true);
    try {
      const v = this.settingsForm.getRawValue();
      await this.service.updateSettings({
        publicProfileEnabled: v.publicProfileEnabled ?? true,
        emailNotificationsEnabled: v.emailNotificationsEnabled ?? true,
        phoneNotificationsEnabled: v.phoneNotificationsEnabled ?? false,
        theme: (v.theme as 'light' | 'dark' | 'system') ?? 'light',
        timezone: v.timezone ?? 'Europe/Paris',
      });
      this.settingsSaved.set(true);
      setTimeout(() => this.settingsSaved.set(false), 3000);
    } finally {
      this.savingSettings.set(false);
    }
  }
}
