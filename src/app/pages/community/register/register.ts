import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { City } from '../../../models/community';
import { getStatesForCountry, getCitiesForState } from '../../../models/location-cascade';

/** Profile photos are capped at 200 KB (JPEG / PNG / JPG only). */
export const MAX_PHOTO_BYTES = 200 * 1024;
const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);
const PHOTO_EXTENSIONS = /\.(jpe?g|png)$/i;

/** Case- and diacritic-insensitive key used to match city names against the Web API list. */
function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

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
  /** Registration errors reported by the NeverBeen Web API (validation, duplicate email, …). */
  protected readonly submitError = signal<string | null>(null);
  /** Cities the Web API knows for the selected country (null while loading / unavailable). */
  protected readonly apiCities = signal<City[] | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    surname: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    country: ['', Validators.required],
    state: ['', Validators.required],
    city: ['', Validators.required],
    gender: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    profession: ['', Validators.required],
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

    // The Web API owns the option lists a member may pick from (it validates the
    // submitted values), so refresh countries, genders and professions from it.
    await Promise.all([
      this.service.loadCountries(),
      this.service.loadGenders(),
      this.service.loadProfessions(),
    ]);
  }

  /**
   * Country changed: rebuild the State options from the cascade dataset and clear
   * both children so the member must re-select a valid State and City. The cities the
   * Web API knows for this country are fetched in the background so the City dropdown
   * only offers cities the registration endpoint will accept.
   */
  onCountryChange(): void {
    const country = this.form.get('country')?.value ?? '';
    this.statesList.set(country ? getStatesForCountry(country) : []);
    this.form.get('state')?.setValue('');
    this.citiesList.set([]);
    this.form.get('city')?.setValue('');
    void this.loadApiCities(country);
  }

  /**
   * State changed: rebuild the City options for that country/state pair and clear
   * the City selection so the member picks again.
   */
  onStateChange(): void {
    const country = this.form.get('country')?.value ?? '';
    const state = this.form.get('state')?.value ?? '';
    this.citiesList.set(country && state ? this.cityOptions(country, state) : []);
    this.form.get('city')?.setValue('');
  }

  /** Fetches the API city list for a country (used to validate the cascade's cities). */
  private async loadApiCities(countryName: string): Promise<void> {
    this.apiCities.set(null);
    if (!countryName) return;
    const countries = this.service.countries();
    const countryId = countries.find((c) => c.name === countryName)?.id;
    if (!countryId) return;
    const cities = await this.service.loadCitiesForCountry(countryId);
    // Ignore stale answers when the member already picked another country.
    if (this.form.get('country')?.value === countryName) {
      this.apiCities.set(cities);
    }
  }

  /**
   * City options for a State: the curated cascade list where the Web API knows those
   * cities, otherwise every city the API accepts for that country — so a member can
   * always pick a city the database will store.
   */
  private cityOptions(country: string, state: string): string[] {
    const curated = getCitiesForState(country, state);
    const apiCities = this.apiCities();
    if (!apiCities || apiCities.length === 0) return curated;

    const apiKeys = new Set(apiCities.map((c) => nameKey(c.name)));
    const accepted = curated.filter((city) => apiKeys.has(nameKey(city)));
    return accepted.length > 0 ? accepted : apiCities.map((c) => c.name).sort();
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
    this.submitError.set(null);

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
      // The Web API stores the member (POST /api/registration) and answers with the
      // stored profile; only when it is unreachable does the app keep the account in
      // this browser and say so through service.accountSaveNotice().
      await this.service.createNeverbeenAccount({
        name: v.name!.trim(),
        surname: v.surname!.trim(),
        email: v.email!.trim(),
        country: v.country!.trim(),
        state: v.state!.trim(),
        city: v.city!.trim(),
        gender: v.gender!,
        dateOfBirth: v.dateOfBirth!,
        profession: v.profession!,
        photoUrl: this.photoPreview()!,
        photo: this.selectedFile(),
      });

      this.router.navigate(['/community/profile']);
    } catch (error) {
      this.submitError.set(
        error instanceof Error && error.message
          ? error.message
          : 'The NeverBeen Web API rejected the registration. Please check your details.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
