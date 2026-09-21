import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { City } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';

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
  protected readonly citiesList = signal<City[]>([]);
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
    } else {
      this.form.patchValue({ email: 'alex.vance@neverbeen.example' });
    }

    if (user?.firstName) {
      this.form.patchValue({ name: user.firstName });
    }
    if (user?.lastName) {
      this.form.patchValue({ surname: user.lastName });
    }
  }

  async onCountryChange(): Promise<void> {
    const countryName = this.form.get('country')?.value;
    if (!countryName) return;
    const countryObj = this.service.countries().find((c) => c.name.toLowerCase() === countryName.toLowerCase());
    if (countryObj) {
      const cities = await this.service.getCitiesForCountry(countryObj.id);
      this.citiesList.set(cities);
      if (cities.length > 0 && !this.form.get('city')?.value) {
        this.form.patchValue({ city: cities[0].name });
      }
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.photoError.set('Please select a valid image file (JPEG, PNG, or WebP).');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        this.photoError.set('Photograph size must not exceed 8 MB.');
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
