import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, computed, effect, inject, signal } from '@angular/core';
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
export class AccountSettingsPage implements OnInit, AfterViewInit, OnDestroy {
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
  
  // Image cropping state
  protected readonly showCropper = signal(false);
  protected readonly cropping = signal(false);
  protected readonly cropX = signal(0);
  protected readonly cropY = signal(0);
  protected readonly cropWidth = signal(200);
  protected readonly cropHeight = signal(200);
  private cropAspectRatio = 1; // Profile pictures are square
  private isDragging = false;
  private isResizing = false;
  private resizeDirection: 'nw' | 'ne' | 'sw' | 'se' | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private cropStartX = 0;
  private cropStartY = 0;
  private cropStartWidth = 0;
  private cropStartHeight = 0;
  private imageWidth = 0;
  private imageHeight = 0;
  
  @ViewChild('cropperCanvas') cropperCanvas!: ElementRef<HTMLCanvasElement>;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private imageElement: HTMLImageElement | null = null;

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

  ngAfterViewInit(): void {
    // Cleanup mouse event listeners when component is destroyed
    // Handled in ngOnDestroy
  }

  ngOnDestroy(): void {
    // Cleanup any pending event listeners
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
    
    // Cleanup image object URL if any
    if (this.imageElement) {
      this.imageElement.src = '';
      this.imageElement.onload = null;
      this.imageElement.onerror = null;
      this.imageElement = null;
    }
    
    this.canvasCtx = null;
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
      // First, prepare the image for preview
      const file = await this.service.prepareCommunityPhoto(source);
      this.selectedFile.set(file);
      
      // Show the cropper with the selected image
      await this.openCropper(file);
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
  // Image Cropping
  // ---------------------------------------------------------------------------------------------

  private async openCropper(file: File): Promise<void> {
    this.showCropper.set(true);
    
    // Load the image
    const img = new Image();
    this.imageElement = img;
    
    const imageUrl = URL.createObjectURL(file);
    img.src = imageUrl;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });
    
    this.imageWidth = img.width;
    this.imageHeight = img.height;
    
    // Initialize canvas and draw image
    const canvas = this.cropperCanvas.nativeElement;
    this.canvasCtx = canvas.getContext('2d')!;
    
    // Set canvas size to match image (or scaled down if too large)
    const maxCanvasSize = 800;
    const scale = Math.min(1, maxCanvasSize / Math.max(img.width, img.height));
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    this.canvasCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Initialize crop selection (centered square, 80% of smaller dimension)
    const minDim = Math.min(canvas.width, canvas.height);
    const cropSize = Math.min(minDim * 0.8, 300);
    
    this.cropWidth.set(cropSize);
    this.cropHeight.set(cropSize);
    this.cropX.set((canvas.width - cropSize) / 2);
    this.cropY.set((canvas.height - cropSize) / 2);
    
    // Clean up object URL
    URL.revokeObjectURL(imageUrl);
  }

  protected closeCropper(): void {
    this.showCropper.set(false);
    
    // Cleanup event listeners
    if (this.isDragging) {
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.stopDrag);
      this.isDragging = false;
    }
    if (this.isResizing) {
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
      this.isResizing = false;
      this.resizeDirection = null;
    }
    
    // Cleanup image
    if (this.imageElement) {
      this.imageElement.src = '';
      this.imageElement.onload = null;
      this.imageElement.onerror = null;
      this.imageElement = null;
    }
    
    this.canvasCtx = null;
    this.selectedFile.set(null);
    this.cropping.set(false);
  }

  protected startDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.cropStartX = this.cropX();
    this.cropStartY = this.cropY();
    
    // Add event listeners for dragging
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.stopDrag);
  }

  private handleDrag = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    
    let newX = this.cropStartX + dx;
    let newY = this.cropStartY + dy;
    
    // Constrain to canvas bounds
    newX = Math.max(0, Math.min(newX, this.cropperCanvas.nativeElement.width - this.cropWidth()));
    newY = Math.max(0, Math.min(newY, this.cropperCanvas.nativeElement.height - this.cropHeight()));
    
    this.cropX.set(newX);
    this.cropY.set(newY);
  };

  private stopDrag = (event: MouseEvent): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  protected startResize(event: MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se'): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeDirection = direction;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.cropStartX = this.cropX();
    this.cropStartY = this.cropY();
    this.cropStartWidth = this.cropWidth();
    this.cropStartHeight = this.cropHeight();
    
    document.addEventListener('mousemove', this.handleResize);
    document.addEventListener('mouseup', this.stopResize);
  }

  private handleResize = (event: MouseEvent): void => {
    if (!this.isResizing || !this.resizeDirection) return;
    
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    
    let newX = this.cropStartX;
    let newY = this.cropStartY;
    let newWidth = this.cropStartWidth;
    let newHeight = this.cropStartHeight;
    
    // Maintain aspect ratio
    const aspectRatio = this.cropAspectRatio;
    
    switch (this.resizeDirection) {
      case 'nw':
        newX = this.cropStartX + dx;
        newY = this.cropStartY + dy;
        newWidth = this.cropStartWidth - dx;
        newHeight = this.cropStartHeight - dy;
        // Maintain aspect ratio from opposite corner
        if (newWidth / newHeight > aspectRatio) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        break;
      case 'ne':
        newY = this.cropStartY + dy;
        newWidth = this.cropStartWidth + dx;
        newHeight = this.cropStartHeight - dy;
        if (newWidth / newHeight > aspectRatio) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        break;
      case 'sw':
        newX = this.cropStartX + dx;
        newWidth = this.cropStartWidth - dx;
        newHeight = this.cropStartHeight + dy;
        if (newWidth / newHeight > aspectRatio) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        break;
      case 'se':
        newWidth = this.cropStartWidth + dx;
        newHeight = this.cropStartHeight + dy;
        if (newWidth / newHeight > aspectRatio) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
        break;
    }
    
    // Constrain to minimum size and canvas bounds
    const minSize = 50;
    newWidth = Math.max(minSize, Math.min(newWidth, this.cropperCanvas.nativeElement.width));
    newHeight = Math.max(minSize, Math.min(newHeight, this.cropperCanvas.nativeElement.height));
    
    // Adjust position to keep within bounds
    newX = Math.max(0, Math.min(newX, this.cropperCanvas.nativeElement.width - newWidth));
    newY = Math.max(0, Math.min(newY, this.cropperCanvas.nativeElement.height - newHeight));
    
    this.cropX.set(newX);
    this.cropY.set(newY);
    this.cropWidth.set(newWidth);
    this.cropHeight.set(newHeight);
  };

  private stopResize = (event: MouseEvent): void => {
    this.isResizing = false;
    this.resizeDirection = null;
    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
  };

  protected async applyCrop(): Promise<void> {
    if (!this.canvasCtx || !this.imageElement) return;
    
    this.cropping.set(true);
    
    try {
      const canvas = this.cropperCanvas.nativeElement;
      const ctx = this.canvasCtx;
      
      // Create a new canvas for the cropped image
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d')!;
      
      // Calculate the scale factor (canvas may be scaled from original image)
      const scaleX = canvas.width / this.imageWidth;
      const scaleY = canvas.height / this.imageHeight;
      
      // Draw the cropped portion from the original image
      const sourceX = (this.cropX() / scaleX);
      const sourceY = (this.cropY() / scaleY);
      const sourceWidth = (this.cropWidth() / scaleX);
      const sourceHeight = (this.cropHeight() / scaleY);
      
      // Set the cropped canvas to the selection size
      croppedCanvas.width = this.cropWidth();
      croppedCanvas.height = this.cropHeight();
      
      // Draw the scaled and cropped image
      croppedCtx.drawImage(
        this.imageElement,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, this.cropWidth(), this.cropHeight()
      );
      
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        croppedCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      
      if (!blob) {
        throw new Error('Failed to create cropped image');
      }
      
      // Create a file from the blob
      const croppedFile = new File(
        [blob],
        this.selectedFile()?.name || 'profile-photo.jpg',
        { type: 'image/jpeg', lastModified: Date.now() }
      );
      
      // Now process the cropped file through the existing pipeline
      const file = await this.service.prepareCommunityPhoto(croppedFile);
      this.selectedFile.set(file);
      this.photoPreview.set(await readImageAsDataUrl(file));
      
      // Close the cropper
      this.closeCropper();
      
    } catch (error) {
      this.photoError.set(
        error instanceof Error ? error.message : 'Failed to crop the image. Please try again.'
      );
      this.closeCropper();
    } finally {
      this.cropping.set(false);
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
