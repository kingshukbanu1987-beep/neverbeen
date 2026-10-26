import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
 * "Manage your NeverBeen Account" — the studio-styled account page opened from the
 * website menu's account drop-down.
 *
 * Member-controlled: profile picture, country, state, city and profession.
 * Fixed identity: name, surname, NeverBeen User ID, e-mail, gender and date of birth.
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
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly saving = signal(false);
  protected readonly savedNotice = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photoProcessing = signal(false);
  protected readonly photoPreview = signal('');
  private readonly selectedFile = signal<File | null>(null);

  // Image cropping & zoom state
  protected readonly showCropper = signal(false);
  protected readonly cropping = signal(false);
  protected readonly cropX = signal(0);
  protected readonly cropY = signal(0);
  protected readonly cropWidth = signal(200);
  protected readonly cropHeight = signal(200);
  protected readonly cropZoom = signal(1);
  protected readonly zoomPercent = computed(() => Math.round(this.cropZoom() * 100));
  protected readonly minZoom = 1;
  protected readonly maxZoom = 3;
  protected readonly zoomStep = 0.1;

  private imageOffsetX = 0;
  private imageOffsetY = 0;
  private isDragging = false;
  private isResizing = false;
  private isPanningImage = false;
  private resizeDirection: 'nw' | 'ne' | 'sw' | 'se' | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private cropStartX = 0;
  private cropStartY = 0;
  private cropStartWidth = 0;
  private cropStartHeight = 0;
  private panStartOffsetX = 0;
  private panStartOffsetY = 0;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
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
   * birth — are permanently disabled: they identify the member and stay fixed here.
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
   * AI Models-style website header here too) returns the visitor to the home page.
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
    this.removeInteractionListeners();

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
  // Image Cropping & Zoom
  // ---------------------------------------------------------------------------------------------

  private async openCropper(file: File): Promise<void> {
    this.showCropper.set(true);
    this.cropZoom.set(1);
    this.imageOffsetX = 0;
    this.imageOffsetY = 0;
    this.cdr.detectChanges();

    // Load the image
    const img = new Image();
    this.imageElement = img;

    const imageUrl = URL.createObjectURL(file);
    try {
      img.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });

      this.imageWidth = img.naturalWidth || img.width || 400;
      this.imageHeight = img.naturalHeight || img.height || 400;

      // Ensure the modal canvas element is rendered
      this.cdr.detectChanges();
      const canvas = this.cropperCanvas?.nativeElement;
      if (!canvas) {
        throw new Error('Cropper canvas could not be initialized.');
      }
      this.canvasCtx = canvas.getContext('2d');

      // Fit canvas inside modal bounds while preserving aspect ratio (1:1 CSS-to-canvas pixels)
      const viewportW =
        typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024;
      const viewportH =
        typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 768;
      const maxCanvasWidth = Math.max(240, Math.min(560, viewportW - 96));
      const maxCanvasHeight = Math.max(240, Math.min(440, Math.floor(viewportH * 0.52)));
      const scale = Math.min(
        1,
        maxCanvasWidth / this.imageWidth,
        maxCanvasHeight / this.imageHeight,
      );

      canvas.width = Math.max(100, Math.round(this.imageWidth * scale));
      canvas.height = Math.max(100, Math.round(this.imageHeight * scale));
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      this.resetCropAndZoom();
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  /** Renders the source image onto the cropper canvas at the current zoom and pan offset. */
  private renderCanvas(): void {
    const canvas = this.cropperCanvas?.nativeElement;
    const ctx = this.canvasCtx ?? canvas?.getContext('2d') ?? null;
    const img = this.imageElement;
    if (!canvas || !ctx || !img) return;
    this.canvasCtx = ctx;

    const zoom = this.cropZoom();
    const drawW = canvas.width * zoom;
    const drawH = canvas.height * zoom;

    this.clampImageOffset(zoom);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0,
      0,
      this.imageWidth,
      this.imageHeight,
      this.imageOffsetX,
      this.imageOffsetY,
      drawW,
      drawH,
    );
  }

  /** Keeps the zoomed image covering the entire cropper canvas with no empty gaps. */
  private clampImageOffset(zoom = this.cropZoom()): void {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!canvas) return;
    const minOffsetX = canvas.width * (1 - zoom);
    const minOffsetY = canvas.height * (1 - zoom);
    this.imageOffsetX = Math.max(minOffsetX, Math.min(0, this.imageOffsetX));
    this.imageOffsetY = Math.max(minOffsetY, Math.min(0, this.imageOffsetY));
  }

  /** Resets zoom to 100%, image offset to origin, and centers the square crop selection. */
  protected resetCropAndZoom(): void {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!canvas) return;

    this.cropZoom.set(1);
    this.imageOffsetX = 0;
    this.imageOffsetY = 0;

    const minDim = Math.min(canvas.width, canvas.height);
    const minCrop = Math.min(50, minDim);
    const cropSize = Math.max(minCrop, Math.round(Math.min(minDim * 0.8, 300)));

    this.cropWidth.set(cropSize);
    this.cropHeight.set(cropSize);
    this.cropX.set(Math.round((canvas.width - cropSize) / 2));
    this.cropY.set(Math.round((canvas.height - cropSize) / 2));

    this.renderCanvas();
  }

  /**
   * Sets the zoom level (clamped between minZoom and maxZoom) around a focus point on the canvas
   * (defaults to the center of the current crop selection so the framed subject stays centered).
   */
  protected setZoom(nextZoom: number, focusX?: number, focusY?: number): void {
    const canvas = this.cropperCanvas?.nativeElement;
    const clampedZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, Number.isFinite(nextZoom) ? Math.round(nextZoom * 100) / 100 : 1),
    );
    const prevZoom = this.cropZoom();

    if (canvas && prevZoom > 0) {
      const cx = focusX ?? this.cropX() + this.cropWidth() / 2;
      const cy = focusY ?? this.cropY() + this.cropHeight() / 2;

      const relX = (cx - this.imageOffsetX) / prevZoom;
      const relY = (cy - this.imageOffsetY) / prevZoom;

      this.imageOffsetX = cx - relX * clampedZoom;
      this.imageOffsetY = cy - relY * clampedZoom;
    }

    this.cropZoom.set(clampedZoom);
    this.clampImageOffset(clampedZoom);
    this.renderCanvas();
  }

  protected zoomIn(): void {
    this.setZoom(this.cropZoom() + this.zoomStep);
  }

  protected zoomOut(): void {
    this.setZoom(this.cropZoom() - this.zoomStep);
  }

  protected onZoomSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    if (!Number.isNaN(value)) {
      this.setZoom(value);
    }
  }

  protected onCropperWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const canvas = this.cropperCanvas?.nativeElement;
    let focusX: number | undefined;
    let focusY: number | undefined;

    if (canvas && event.clientX && event.clientY) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        focusX = Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * scaleX));
        focusY = Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * scaleY));
      }
    }

    const direction = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
    if (direction === 0) return;

    const step = event.ctrlKey ? 0.08 : this.zoomStep;
    this.setZoom(this.cropZoom() + direction * step, focusX, focusY);
  }

  private removeInteractionListeners(): void {
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchmove', this.handleTouchDrag);
    document.removeEventListener('touchend', this.stopDrag);
    document.removeEventListener('touchcancel', this.stopDrag);

    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('touchmove', this.handleTouchResize);
    document.removeEventListener('touchend', this.stopResize);
    document.removeEventListener('touchcancel', this.stopResize);

    document.removeEventListener('mousemove', this.handleImagePan);
    document.removeEventListener('mouseup', this.stopImagePan);
    document.removeEventListener('touchmove', this.handleTouchImagePan);
    document.removeEventListener('touchend', this.stopImagePan);
    document.removeEventListener('touchcancel', this.stopImagePan);

    this.isDragging = false;
    this.isResizing = false;
    this.isPanningImage = false;
    this.resizeDirection = null;
    this.pinchStartDistance = 0;
  }

  protected closeCropper(keepSelectedFile = false): void {
    this.showCropper.set(false);
    this.removeInteractionListeners();

    // Cleanup image
    if (this.imageElement) {
      this.imageElement.src = '';
      this.imageElement.onload = null;
      this.imageElement.onerror = null;
      this.imageElement = null;
    }

    this.canvasCtx = null;
    if (!keepSelectedFile) {
      this.selectedFile.set(null);
    }
    this.cropping.set(false);
  }

  /** Converts screen CSS pixel deltas into canvas pixel deltas if CSS scales the canvas. */
  private getCanvasPointerScale(): { scaleX: number; scaleY: number } {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!canvas) return { scaleX: 1, scaleY: 1 };
    const rect = canvas.getBoundingClientRect();
    return {
      scaleX: rect.width > 0 ? canvas.width / rect.width : 1,
      scaleY: rect.height > 0 ? canvas.height / rect.height : 1,
    };
  }

  protected startDrag(event: MouseEvent): void {
    if (this.isResizing) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.cropStartX = this.cropX();
    this.cropStartY = this.cropY();

    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.stopDrag);
  }

  protected startTouchDrag(event: TouchEvent): void {
    if (this.isResizing) return;
    if (event.touches.length === 2) {
      this.startPinch(event);
      return;
    }
    if (event.touches.length !== 1) return;
    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    this.isDragging = true;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.cropStartX = this.cropX();
    this.cropStartY = this.cropY();

    document.addEventListener('touchmove', this.handleTouchDrag, { passive: false });
    document.addEventListener('touchend', this.stopDrag);
    document.addEventListener('touchcancel', this.stopDrag);
  }

  private updateDragPosition(clientX: number, clientY: number): void {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!this.isDragging || !canvas) return;

    const { scaleX, scaleY } = this.getCanvasPointerScale();
    const dx = (clientX - this.dragStartX) * scaleX;
    const dy = (clientY - this.dragStartY) * scaleY;

    const maxX = Math.max(0, canvas.width - this.cropWidth());
    const maxY = Math.max(0, canvas.height - this.cropHeight());

    const newX = Math.max(0, Math.min(this.cropStartX + dx, maxX));
    const newY = Math.max(0, Math.min(this.cropStartY + dy, maxY));

    this.cropX.set(newX);
    this.cropY.set(newY);
  }

  private handleDrag = (event: MouseEvent): void => {
    this.updateDragPosition(event.clientX, event.clientY);
  };

  private handleTouchDrag = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      this.handlePinchMove(event);
      return;
    }
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  };

  private stopDrag = (): void => {
    this.isDragging = false;
    this.pinchStartDistance = 0;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchmove', this.handleTouchDrag);
    document.removeEventListener('touchend', this.stopDrag);
    document.removeEventListener('touchcancel', this.stopDrag);
  };

  /** Dragging on the canvas outside the crop circle pans the zoomed image. */
  protected startCanvasPan(event: MouseEvent): void {
    if (this.isDragging || this.isResizing || this.cropZoom() <= 1) return;
    event.preventDefault();
    this.isPanningImage = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.panStartOffsetX = this.imageOffsetX;
    this.panStartOffsetY = this.imageOffsetY;

    document.addEventListener('mousemove', this.handleImagePan);
    document.addEventListener('mouseup', this.stopImagePan);
  }

  protected startCanvasTouch(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.startPinch(event);
      document.addEventListener('touchmove', this.handleTouchImagePan, { passive: false });
      document.addEventListener('touchend', this.stopImagePan);
      document.addEventListener('touchcancel', this.stopImagePan);
      return;
    }
    if (this.isDragging || this.isResizing || this.cropZoom() <= 1 || event.touches.length !== 1) {
      return;
    }
    event.preventDefault();
    const touch = event.touches[0];
    this.isPanningImage = true;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.panStartOffsetX = this.imageOffsetX;
    this.panStartOffsetY = this.imageOffsetY;

    document.addEventListener('touchmove', this.handleTouchImagePan, { passive: false });
    document.addEventListener('touchend', this.stopImagePan);
    document.addEventListener('touchcancel', this.stopImagePan);
  }

  private handleImagePan = (event: MouseEvent): void => {
    if (!this.isPanningImage) return;
    const { scaleX, scaleY } = this.getCanvasPointerScale();
    this.imageOffsetX = this.panStartOffsetX + (event.clientX - this.dragStartX) * scaleX;
    this.imageOffsetY = this.panStartOffsetY + (event.clientY - this.dragStartY) * scaleY;
    this.clampImageOffset();
    this.renderCanvas();
  };

  private handleTouchImagePan = (event: TouchEvent): void => {
    if (event.touches.length === 2) {
      this.handlePinchMove(event);
      return;
    }
    if (!this.isPanningImage || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const { scaleX, scaleY } = this.getCanvasPointerScale();
    this.imageOffsetX = this.panStartOffsetX + (touch.clientX - this.dragStartX) * scaleX;
    this.imageOffsetY = this.panStartOffsetY + (touch.clientY - this.dragStartY) * scaleY;
    this.clampImageOffset();
    this.renderCanvas();
  };

  private stopImagePan = (): void => {
    this.isPanningImage = false;
    this.pinchStartDistance = 0;
    document.removeEventListener('mousemove', this.handleImagePan);
    document.removeEventListener('mouseup', this.stopImagePan);
    document.removeEventListener('touchmove', this.handleTouchImagePan);
    document.removeEventListener('touchend', this.stopImagePan);
    document.removeEventListener('touchcancel', this.stopImagePan);
  };

  private startPinch(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.isPanningImage = false;
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    this.pinchStartDistance = Math.hypot(dx, dy);
    this.pinchStartZoom = this.cropZoom();
  }

  private handlePinchMove(event: TouchEvent): void {
    if (event.touches.length !== 2 || this.pinchStartDistance <= 0) return;
    event.preventDefault();
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const distance = Math.hypot(dx, dy);
    const ratio = distance / this.pinchStartDistance;
    this.setZoom(this.pinchStartZoom * ratio);
  }

  protected startResize(event: MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se'): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
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

  protected startTouchResize(event: TouchEvent, direction: 'nw' | 'ne' | 'sw' | 'se'): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    const touch = event.touches[0];
    this.isDragging = false;
    this.isResizing = true;
    this.resizeDirection = direction;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.cropStartX = this.cropX();
    this.cropStartY = this.cropY();
    this.cropStartWidth = this.cropWidth();
    this.cropStartHeight = this.cropHeight();

    document.addEventListener('touchmove', this.handleTouchResize, { passive: false });
    document.addEventListener('touchend', this.stopResize);
    document.addEventListener('touchcancel', this.stopResize);
  }

  private updateResizeSelection(clientX: number, clientY: number): void {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!this.isResizing || !this.resizeDirection || !canvas) return;

    const { scaleX, scaleY } = this.getCanvasPointerScale();
    const dx = (clientX - this.dragStartX) * scaleX;
    const dy = (clientY - this.dragStartY) * scaleY;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const minSize = Math.min(50, Math.min(canvasW, canvasH));

    let newX = this.cropStartX;
    let newY = this.cropStartY;
    let size = this.cropStartWidth;

    switch (this.resizeDirection) {
      case 'se': {
        const anchorX = this.cropStartX;
        const anchorY = this.cropStartY;
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
        const maxSize = Math.min(canvasW - anchorX, canvasH - anchorY);
        size = Math.max(minSize, Math.min(this.cropStartWidth + delta, maxSize));
        newX = anchorX;
        newY = anchorY;
        break;
      }
      case 'nw': {
        const anchorX = this.cropStartX + this.cropStartWidth;
        const anchorY = this.cropStartY + this.cropStartHeight;
        const delta = Math.abs(dx) >= Math.abs(dy) ? -dx : -dy;
        const maxSize = Math.min(anchorX, anchorY);
        size = Math.max(minSize, Math.min(this.cropStartWidth + delta, maxSize));
        newX = anchorX - size;
        newY = anchorY - size;
        break;
      }
      case 'ne': {
        const anchorX = this.cropStartX;
        const anchorY = this.cropStartY + this.cropStartHeight;
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
        const maxSize = Math.min(canvasW - anchorX, anchorY);
        size = Math.max(minSize, Math.min(this.cropStartWidth + delta, maxSize));
        newX = anchorX;
        newY = anchorY - size;
        break;
      }
      case 'sw': {
        const anchorX = this.cropStartX + this.cropStartWidth;
        const anchorY = this.cropStartY;
        const delta = Math.abs(dx) >= Math.abs(dy) ? -dx : dy;
        const maxSize = Math.min(anchorX, canvasH - anchorY);
        size = Math.max(minSize, Math.min(this.cropStartWidth + delta, maxSize));
        newX = anchorX - size;
        newY = anchorY;
        break;
      }
    }

    this.cropX.set(newX);
    this.cropY.set(newY);
    this.cropWidth.set(size);
    this.cropHeight.set(size);
  }

  private handleResize = (event: MouseEvent): void => {
    this.updateResizeSelection(event.clientX, event.clientY);
  };

  private handleTouchResize = (event: TouchEvent): void => {
    if (!this.isResizing || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    this.updateResizeSelection(touch.clientX, touch.clientY);
  };

  private stopResize = (): void => {
    this.isResizing = false;
    this.resizeDirection = null;
    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('touchmove', this.handleTouchResize);
    document.removeEventListener('touchend', this.stopResize);
    document.removeEventListener('touchcancel', this.stopResize);
  };

  protected async applyCrop(): Promise<void> {
    const canvas = this.cropperCanvas?.nativeElement;
    if (!canvas || !this.imageElement) return;

    this.cropping.set(true);

    try {
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) {
        throw new Error('Failed to create cropped image');
      }

      const zoom = this.cropZoom();
      const scaledCanvasW = canvas.width * zoom;
      const scaledCanvasH = canvas.height * zoom;

      // Map the crop selection & zoom/pan state back to the full-resolution source image
      const rawSourceX = ((this.cropX() - this.imageOffsetX) / scaledCanvasW) * this.imageWidth;
      const rawSourceY = ((this.cropY() - this.imageOffsetY) / scaledCanvasH) * this.imageHeight;
      const rawSourceW = (this.cropWidth() / scaledCanvasW) * this.imageWidth;
      const rawSourceH = (this.cropHeight() / scaledCanvasH) * this.imageHeight;

      const sourceX = Math.max(0, Math.min(this.imageWidth - 1, rawSourceX));
      const sourceY = Math.max(0, Math.min(this.imageHeight - 1, rawSourceY));
      const sourceWidth = Math.max(1, Math.min(this.imageWidth - sourceX, rawSourceW));
      const sourceHeight = Math.max(1, Math.min(this.imageHeight - sourceY, rawSourceH));

      const outputSize = Math.max(
        Math.round(this.cropWidth()),
        Math.min(800, Math.round(Math.max(sourceWidth, sourceHeight))),
      );
      croppedCanvas.width = outputSize;
      croppedCanvas.height = outputSize;

      croppedCtx.drawImage(
        this.imageElement,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize,
        outputSize,
      );

      // Convert to blob (with dataURL fallback for headless test environments)
      let blob = await new Promise<Blob | null>((resolve) => {
        if (typeof croppedCanvas.toBlob === 'function') {
          croppedCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
        } else {
          resolve(null);
        }
      });

      if (!blob && typeof croppedCanvas.toDataURL === 'function') {
        const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.92);
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx !== -1) {
          const base64 = dataUrl.slice(commaIdx + 1);
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'image/jpeg' });
        }
      }

      if (!blob) {
        throw new Error('Failed to create cropped image');
      }

      const croppedFile = new File([blob], this.selectedFile()?.name || 'profile-photo.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Process the cropped file through the community photo optimization pipeline
      const file = await this.service.prepareCommunityPhoto(croppedFile);
      this.selectedFile.set(file);
      this.photoPreview.set(await readImageAsDataUrl(file));

      // Close the cropper while preserving the cropped selectedFile for Update
      this.closeCropper(true);
    } catch (error) {
      this.photoError.set(
        error instanceof Error ? error.message : 'Failed to crop the image. Please try again.',
      );
      this.closeCropper(false);
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
