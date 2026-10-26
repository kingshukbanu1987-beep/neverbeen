import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CommunityService,
  getCookie,
  isDemoSessionToken,
  TOKEN_KEY,
} from '../../services/community.service';
import { generate20DigitUid, type City } from '../../models/community';
import { getStatesForCountry, getCitiesForState } from '../../models/location-cascade';
import { readImageAsDataUrl } from '../../shared/community-image-compression';

/** Profile photographs use the same optimization pipeline as Community / Registration. */
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

/**
 * "Manage your NeverBeen Account" — the ultra-modern account page opened from the
 * website menu's account drop-down.
 *
 * Editable: profile picture, country, state, city and profession.
 * Read-only: name, surname, NeverBeen User ID, e-mail, gender and date of birth.
 * Update saves the changes; Cancel returns to the home page.
 */
@Component({
  selector: 'app-account-settings-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountSettingsPage implements OnInit {
  protected readonly service = inject(CommunityService);
  private readonly fb = inject(FormBuilder);
  protected readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly savedNotice = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photoProcessing = signal(false);
  protected readonly photoPreview = signal('');
  private readonly selectedFile = signal<File | null>(null);

  /** Cascading dropdown options — children are rebuilt and cleared when a parent changes. */
  protected readonly statesList = signal<string[]>([]);
  protected readonly citiesList = signal<string[]>([]);
  /** Cities the Web API knows for the selected country (null while loading / unavailable). */
  protected readonly apiCities = signal<City[] | null>(null);

  /**
   * Identity details — name, surname, NeverBeen User ID, e-mail, gender and date of
   * birth — are permanently disabled: they identify the member and are never edited here.
   */
  protected readonly form = this.fb.group({
    name: [{ value: '', disabled: true }],
    surname: [{ value: '', disabled: true }],
    uniqueId: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
    gender: [{ value: '', disabled: true }],
    dateOfBirth: [{ value: '', disabled: true }],
    country: ['', Validators.required],
    state: [''],
    city: [''],
    profession: [''],
  });

  /** Big header identity — kept in sync with the (signal-driven) community session. */
  protected readonly fullName = computed(() => {
    const p = this.service.profile();
    const u = this.service.currentUser();
    const name = (
      p?.fullName ||
      u?.fullName ||
      [p?.firstName || u?.firstName, p?.lastName || u?.lastName].filter(Boolean).join(' ') ||
      ''
    ).trim();
    return name || 'NeverBeen member';
  });

  protected readonly email = computed(
    () => this.service.profile()?.email || this.service.currentUser()?.email || '',
  );

  protected readonly uniqueId = computed(() => {
    const p = this.service.profile();
    const u = this.service.currentUser();
    const id = p?.uniqueId || u?.uniqueId || (p?.id ?? u?.id);
    if (!id) return '';
    return typeof id === 'number' ? generate20DigitUid(id) : id;
  });

  protected readonly initial = computed(() => this.fullName().charAt(0).toUpperCase() || 'N');

  /**
   * Signing out while the page is open (the account drop-down is reachable from the
   * website header here too) returns the visitor to the home page.
   */
  private readonly sessionGuard = effect(() => {
    if (!this.hasSession()) void this.router.navigate(['/']);
  });

  /** A usable session: the signed-in member, or a real (non-preview) auth cookie. */
  private hasSession(): boolean {
    if (this.service.isAuthenticated()) return true;
    const token = getCookie(TOKEN_KEY);
    return !!token && !isDemoSessionToken(token);
  }

  async ngOnInit(): Promise<void> {
    if (!this.hasSession()) {
      void this.router.navigate(['/']);
      return;
    }

    this.populateIdentity();

    const p = this.service.profile();
    const country = p?.countryName || p?.country || '';
    const state = p?.state || '';
    const city = p?.cityName || p?.city || '';
    this.form.patchValue({ country, state, city, profession: p?.profession || '' });
    this.initCascade(country, state, city);
    this.photoPreview.set(p?.profilePhotoUrl || this.service.currentUser()?.profilePhotoUrl || '');

    // The Web API owns the option lists a member may pick from (it validates the
    // submitted values), so refresh countries and professions from it.
    await Promise.all([this.service.loadCountries(), this.service.loadProfessions()]);
    void this.loadApiCities(country);
  }

  private populateIdentity(): void {
    const p = this.service.profile();
    const u = this.service.currentUser();
    const fullName = p?.fullName || u?.fullName || '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = p?.firstName || u?.firstName || parts[0] || '';
    const lastName = p?.lastName || u?.lastName || parts.slice(1).join(' ') || '';
    const id = p?.id ?? u?.id;
    const uniqueId = p?.uniqueId || u?.uniqueId || (id ? generate20DigitUid(id) : '');

    this.form.patchValue({
      name: firstName,
      surname: lastName,
      uniqueId,
      email: p?.email || u?.email || '',
      gender: p?.gender || '',
      dateOfBirth: p?.dateOfBirth || '',
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Location cascade (Country → State → City)
  // ---------------------------------------------------------------------------------------------

  /** Builds the dropdowns around the member's stored location, keeping its values visible. */
  private initCascade(country: string, state: string, city: string): void {
    const states = country ? [...getStatesForCountry(country)] : [];
    if (state && !states.includes(state)) states.unshift(state);
    this.statesList.set(states);

    const cities = country && state ? [...getCitiesForState(country, state)] : [];
    if (city && !cities.includes(city)) cities.unshift(city);
    this.citiesList.set(cities);
  }

  /** Country changed: rebuild the State options and clear the dependent selections. */
  protected onCountryChange(): void {
    const country = this.form.get('country')?.value ?? '';
    this.statesList.set(country ? getStatesForCountry(country) : []);
    if (!this.statesList().includes(this.form.get('state')?.value ?? '')) {
      this.form.get('state')?.setValue('');
    }
    this.rebuildCities(true);
    void this.loadApiCities(country);
  }

  /** State changed: rebuild the City options for that country/state pair. */
  protected onStateChange(): void {
    this.rebuildCities(true);
  }

  /**
   * Rebuilds the City dropdown for the current country/state pair.
   * With `keepCurrent` the member's stored city stays offered even while the parent
   * selection is unchanged; a city that disappears after a parent change is cleared.
   */
  private rebuildCities(keepCurrent: boolean): void {
    const country = this.form.get('country')?.value ?? '';
    const state = this.form.get('state')?.value ?? '';
    const previous = this.form.get('city')?.value ?? '';
    const options = country && state ? this.cityOptions(country, state) : [];
    if (keepCurrent && previous && !options.includes(previous)) options.unshift(previous);
    this.citiesList.set(options);
    if (previous && !options.includes(previous)) this.form.get('city')?.setValue('');
  }

  /**
   * City options for a State — narrowed to the cities the Web API really stores for the
   * country once it has answered (same contract as the registration page).
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

  /** Fetches the API city list for a country so the City dropdown only offers valid picks. */
  private async loadApiCities(countryName: string): Promise<void> {
    this.apiCities.set(null);
    if (!countryName) return;
    const countryId = await this.service.resolveCountryId(countryName);
    if (!countryId) return;
    const cities = await this.service.loadCitiesForCountry(countryId);
    // Ignore stale answers when the member already picked another country.
    if (this.form.get('country')?.value === countryName) {
      this.apiCities.set(cities);
      this.rebuildCities(true);
    }
  }

  /** Country options — the API list, always including the member's stored country. */
  protected countryOptions(): string[] {
    const names = this.service.countries().map((c) => c.name);
    const current = this.form.get('country')?.value ?? '';
    return current && !names.includes(current) ? [current, ...names] : names;
  }

  /** Profession options — the API list, always including the member's stored profession. */
  protected professionOptions(): string[] {
    const options = [...this.service.professions()];
    const current = this.form.get('profession')?.value ?? '';
    if (current && !options.includes(current)) options.unshift(current);
    return options;
  }

  // ---------------------------------------------------------------------------------------------
  // Profile picture
  // ---------------------------------------------------------------------------------------------

  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const source = input.files?.[0];
    if (!source) return;
    input.value = '';

    const looksLikePhoto =
      PHOTO_MIME_TYPES.has(source.type.toLowerCase()) || PHOTO_EXTENSIONS.test(source.name);
    if (!looksLikePhoto) {
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
      this.photoError.set(
        error instanceof Error ? error.message : 'This photo could not be optimized for upload.',
      );
    } finally {
      this.photoProcessing.set(false);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Update / Cancel
  // ---------------------------------------------------------------------------------------------

  protected async update(): Promise<void> {
    if (this.saving()) return;
    this.saveError.set(null);
    this.savedNotice.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.service.profile()) {
      this.saveError.set('Your profile is still loading. Please try again in a moment.');
      return;
    }
    if (this.photoProcessing()) return;

    this.saving.set(true);
    try {
      const v = this.form.getRawValue();

      // Resolve the ids the Web API validates the location against.
      const countryId = v.country ? await this.service.resolveCountryId(v.country) : null;
      const cityId =
        countryId && v.city
          ? await this.service.resolveCityId(countryId, v.city, v.country ?? undefined)
          : null;

      await this.service.updateProfile({
        countryId: countryId ?? undefined,
        cityId: cityId ?? undefined,
        state: v.state?.trim() || undefined,
        profession: v.profession?.trim() || undefined,
      });

      if (this.selectedFile()) {
        const photoUrl = await this.service.uploadProfilePhoto(this.selectedFile()!);
        if (photoUrl) this.photoPreview.set(photoUrl);
        this.selectedFile.set(null);
      }

      this.savedNotice.set('Your NeverBeen account details have been updated.');
    } catch (error) {
      this.saveError.set(
        error instanceof Error && error.message
          ? error.message
          : 'Your changes could not be saved. Please try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  /** Cancel: close this page and go back to the home page of the website. */
  protected cancel(): void {
    void this.router.navigate(['/']);
  }
}
