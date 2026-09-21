import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { City } from '../../../models/community';
import { CommunityService } from '../../../services/community.service';

@Component({
  selector: 'app-community-register',
  imports: [ReactiveFormsModule],
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
  protected readonly selectedFileName = signal<string | null>(null);

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    gender: ['', Validators.required],
    dateOfBirth: ['1996-04-18', Validators.required],
    profession: ['', Validators.required],
    countryId: [null as number | null, Validators.required],
    cityId: [null as number | null, Validators.required],
    pincode: [''],
    contactNumber: [''],
    postalAddress: [''],
    aboutMe: [''],
  });

  async ngOnInit(): Promise<void> {
    const user = this.service.currentUser();
    if (user) {
      this.form.patchValue({
        fullName: user.fullName || '',
        email: user.email || '',
      });
      if (user.profilePhotoUrl) {
        this.photoPreview.set(user.profilePhotoUrl);
      }
    } else {
      // Default placeholder if visiting directly
      this.form.patchValue({
        fullName: 'Alex Vance',
        email: 'alex.vance@example.com',
      });
    }

    // Default to country 58 (France) or first country
    const firstCountry = this.service.countries().find((c) => c.name === 'France') ?? this.service.countries()[0];
    if (firstCountry) {
      this.form.patchValue({ countryId: firstCountry.id });
      await this.loadCities(firstCountry.id);
    }

    // Preselect gender and profession if available
    this.form.patchValue({
      gender: 'Female',
      profession: 'Content Creator',
    });
  }

  async onCountryChange(): Promise<void> {
    const countryId = this.form.get('countryId')?.value;
    if (countryId) {
      await this.loadCities(Number(countryId));
    }
  }

  private async loadCities(countryId: number): Promise<void> {
    const cities = await this.service.getCitiesForCountry(countryId);
    this.citiesList.set(cities);
    if (cities.length > 0) {
      this.form.patchValue({ cityId: cities[0].id });
    } else {
      this.form.patchValue({ cityId: null });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = () => this.photoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const v = this.form.getRawValue();
      const fd = new FormData();
      fd.append('fullName', v.fullName ?? '');
      fd.append('email', v.email ?? '');
      fd.append('gender', v.gender ?? '');
      fd.append('dateOfBirth', v.dateOfBirth ?? '');
      fd.append('profession', v.profession ?? '');
      fd.append('countryId', String(v.countryId ?? 1));
      fd.append('cityId', String(v.cityId ?? 1));
      fd.append('pincode', v.pincode ?? '');
      fd.append('contactNumber', v.contactNumber ?? '');
      fd.append('postalAddress', v.postalAddress ?? '');
      fd.append('aboutMe', v.aboutMe ?? '');

      if (this.selectedFile()) {
        fd.append('photo', this.selectedFile()!, this.selectedFile()!.name);
      }

      await this.service.registerUser(fd);
      this.router.navigate(['/community/profile']);
    } finally {
      this.submitting.set(false);
    }
  }
}
