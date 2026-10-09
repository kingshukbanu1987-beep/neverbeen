import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { City } from '../../../models/community';
import { getStatesForCountry, getCitiesForState } from '../../../models/location-cascade';
import { MAX_COMMUNITY_IMAGE_BYTES, readImageAsDataUrl } from '../../../shared/community-image-compression';

/** Registration profile photographs use the same 100 KB upload cap as Community. */
export const MAX_PHOTO_BYTES = MAX_COMMUNITY_IMAGE_BYTES;
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
  protected readonly photoProcessing = signal(false);
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
    this.rebuildCities();
    void this.loadApiCities(country);
  }

  /**
   * State changed: rebuild the City options for that country/state pair and clear
   * the City selection when the previously picked city is no longer offered.
   */
  onStateChange(): void {
    this.rebuildCities();
  }

  /** Rebuilds the City dropdown for the current country/state pair. */
  private rebuildCities(): void {
    const country = this.form.get('country')?.value ?? '';
    const state = this.form.get('state')?.value ?? '';
    const previous = this.form.get('city')?.value ?? '';
    const options = country && state ? this.cityOptions(country, state) : [];
    this.citiesList.set(options);
    // A pick that is not offered any more must be re-selected (the API validates the pair).
    if (previous && !options.includes(previous)) this.form.get('city')?.setValue('');
  }

  /**
   * Fetches the API city list for a country (used to validate the cascade's cities) and
   * rebuilds the City dropdown with it: while the answer is in flight — or when the API is
   * unreachable — the dropdown falls back to the curated cascade list, and the moment the API
   * answers it is narrowed to the cities the database really stores for that country.
   */
  private async loadApiCities(countryName: string): Promise<void> {
    this.apiCities.set(null);
    if (!countryName) return;
    const countryId = await this.service.resolveCountryId(countryName);
    if (!countryId) return;
    const cities = await this.service.loadCitiesForCountry(countryId);
    // Ignore stale answers when the member already picked another country.
    if (this.form.get('country')?.value === countryName) {
      this.apiCities.set(cities);
      this.rebuildCities();
    }
  }

  /** True when the API answered for the selected country but stores no city in it yet. */
  protected countryHasNoCities(): boolean {
    return !!this.form.get('country')?.value && this.apiCities()?.length === 0;
  }

  /**
   * City options for a State.
   *
   * Once the Web API has answered with the cities it stores for the country, only those are
   * offered (an empty answer means the database has no city in that country yet) — that way a
   * member always picks a city the registration endpoint can store. Until then (the request is
   * still running, or the API is unreachable and the browser-only flow is used) the curated
   * cascade list is offered.
   */
  private cityOptions(country: string, state: string): string[] {
    const apiCities = this.apiCities();
    if (apiCities) {
      const apiKeys = new Set(apiCities.map((c) => nameKey(c.name)));
      const accepted = getCitiesForState(country, state).filter((city) =>
        apiKeys.has(nameKey(city)),
      );
      return accepted.length > 0 ? accepted : apiCities.map((c) => c.name).sort();
    }
    return getCitiesForState(country, state);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const source = input.files?.[0];
    if (!source) return;
    input.value = '';
    const looksLikePhoto =
      PHOTO_MIME_TYPES.has(source.type.toLowerCase()) || PHOTO_EXTENSIONS.test(source.name);
    if (!looksLikePhoto) {
      this.selectedFile.set(null);
      this.photoPreview.set(null);
      this.photoError.set('Please select a valid image file (JPEG, PNG, or JPG).');
      return;
    }

    this.photoError.set(null);
    this.photoProcessing.set(true);
    try {
      const file = await this.service.prepareCommunityPhoto(source);
      this.selectedFile.set(file);
      this.photoPreview.set(await readImageAsDataUrl(file));
    } catch (error) {
      this.selectedFile.set(null);
      this.photoPreview.set(null);
      this.photoError.set(
        error instanceof Error ? error.message : 'This photo could not be optimized for upload.',
      );
    } finally {
      this.photoProcessing.set(false);
    }
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  async submit(): Promise<void> {
    if (this.photoProcessing()) return;
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
