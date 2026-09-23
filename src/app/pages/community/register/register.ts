import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { getStatesForCountry, getCitiesForState } from '../../../models/location-cascade';

/** Profile photos are capped at 200 KB (JPEG / PNG / JPG only). */
export const MAX_PHOTO_BYTES = 200 * 1024;
const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);
const PHOTO_EXTENSIONS = /\.(jpe?g|png)$/i;

@Component({
  selector: 'app-community-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class CommunityRegister implements OnInit {
  protected readonly service = inject(CommunityService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  /** Cascading dropdown options — children are rebuilt and cleared when a parent changes. */
  protected readonly statesList = signal<string[]>([]);
  protected readonly citiesList = signal<string[]>([]);
  protected readonly photoPreview = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly photoError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    surname: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    country: ['', Validators.required],
    state: ['', Validators.required],
    city: ['', Validators.required],
    gender: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const user = this.service.currentUser();
    if (user?.email) {
      this.form.patchValue({ email: user.email });
    }
    if (user?.firstName) {
      this.form.patchValue({ name: user.firstName });
    }
    if (user?.lastName) {
      this.form.patchValue({ surname: user.lastName });
    }
  }

  /**
   * Country changed: rebuild the State options from the cascade dataset and clear
   * both children so the member must re-select a valid State and City.
   */
  onCountryChange(): void {
    const country = this.form.get('country')?.value ?? '';
    this.statesList.set(country ? getStatesForCountry(country) : []);
    this.form.get('state')?.setValue('');
    this.citiesList.set([]);
    this.form.get('city')?.setValue('');
  }

  /**
   * State changed: rebuild the City options for that country/state pair and clear
   * the City selection so the member picks again.
   */
  onStateChange(): void {
    const country = this.form.get('country')?.value ?? '';
    const state = this.form.get('state')?.value ?? '';
    this.citiesList.set(country && state ? getCitiesForState(country, state) : []);
    this.form.get('city')?.setValue('');
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const looksLikePhoto =
        PHOTO_MIME_TYPES.has(file.type.toLowerCase()) || PHOTO_EXTENSIONS.test(file.name);
      if (!looksLikePhoto) {
        this.photoError.set('Please select a valid image file (JPEG, PNG, or JPG).');
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        this.photoError.set('Photograph size must not exceed 200 KB.');
        return;
      }
      this.photoError.set(null);
      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = () => this.photoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  async submit(): Promise<void> {
    this.photoError.set(null);

    if (!this.photoPreview() && !this.selectedFile()) {
      this.photoError.set('A profile photo is mandatory. Please upload your photograph.');
    }

    if (this.form.invalid || !this.photoPreview()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const v = this.form.getRawValue();
      await this.service.createNeverbeenAccount({
        name: v.name!.trim(),
        surname: v.surname!.trim(),
        email: v.email!.trim(),
        country: v.country!.trim(),
        state: v.state!.trim(),
        city: v.city!.trim(),
        gender: v.gender!,
        dateOfBirth: v.dateOfBirth!,
        photoUrl: this.photoPreview()!,
      });

      this.router.navigate(['/community/profile']);
    } finally {
      this.submitting.set(false);
    }
  }
}
