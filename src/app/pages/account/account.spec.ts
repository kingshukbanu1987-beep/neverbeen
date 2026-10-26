import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountSettingsPage } from './account';
import { CommunityService, deleteCookie, TOKEN_KEY } from '../../services/community.service';
import { openDemoAccount } from '../../services/community-demo.testing';

describe('AccountSettingsPage', () => {
  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);

    await TestBed.configureTestingModule({
      imports: [AccountSettingsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(AccountSettingsPage);
    fixture.detectChanges();
    return fixture;
  }

  it('is registered as the /account route behind "Manage your NeverBeen Account"', async () => {
    const { routes } = await import('../../app.routes');
    const route = routes.find((r) => r.path === 'account');

    expect(route).toBeDefined();
    const loaded = await (route!.loadComponent as () => Promise<unknown>)();
    expect(loaded).toBe(AccountSettingsPage);
  });

  it('shows disabled identity details and editable profile details with Update / Cancel', async () => {
    const service = TestBed.inject(CommunityService);
    openDemoAccount(service, 'active_member');
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    // Identity details — read-only on this page.
    for (const id of ['#ac-name', '#ac-surname', '#ac-uid', '#ac-email', '#ac-gender', '#ac-dob']) {
      const input = element.querySelector<HTMLInputElement>(id);
      expect(input, id).toBeTruthy();
      expect(input!.disabled, id).toBe(true);
    }
    expect(element.querySelector<HTMLInputElement>('#ac-name')!.value).toBe('Kingshuk');
    expect(element.querySelector<HTMLInputElement>('#ac-email')!.value).toBe(
      'kingshuk.founder@neverbeen.example',
    );
    expect(element.querySelector<HTMLInputElement>('#ac-uid')!.value).toBe('89201534010000000001');

    // Profile details — editable, prefilled from the member's profile.
    const country = element.querySelector<HTMLSelectElement>('#ac-country')!;
    const state = element.querySelector<HTMLSelectElement>('#ac-state')!;
    const city = element.querySelector<HTMLSelectElement>('#ac-city')!;
    const profession = element.querySelector<HTMLSelectElement>('#ac-profession')!;
    expect(country.disabled).toBe(false);
    expect(country.value).toBe('India');
    expect(state.disabled).toBe(false);
    expect(state.value).toBe('West Bengal');
    expect(city.disabled).toBe(false);
    expect(city.value).toBe('Kolkata');
    expect(profession.disabled).toBe(false);
    expect(profession.value).toBe('Senior Software Engineer and founder of NeverBeen');

    // The profile picture can be changed from the header avatar.
    expect(element.querySelector('#accountPhoto')).toBeTruthy();

    // Update saves, Cancel closes the page.
    const update = element.querySelector<HTMLButtonElement>('.btn-update')!;
    expect(update.textContent).toContain('Update');
    expect(update.disabled).toBe(false);
    expect(element.querySelector('.btn-cancel')?.textContent).toContain('Cancel');
  });

  it('returns to the home page of the website on Cancel', () => {
    const service = TestBed.inject(CommunityService);
    openDemoAccount(service, 'active_member');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = create();

    (fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement).click();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
    navigateSpy.mockRestore();
  });

  it('sends a visitor without a session back to the home page', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = create();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
    navigateSpy.mockRestore();
  });

  describe('photo upload crop & zoom', () => {
    let originalImage: typeof globalThis.Image;
    let getContextSpy: ReturnType<typeof vi.spyOn>;
    let toBlobSpy: ReturnType<typeof vi.spyOn>;
    let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      originalImage = globalThis.Image;
      class MockImage {
        width = 600;
        height = 400;
        naturalWidth = 600;
        naturalHeight = 400;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        get src() {
          return this._src;
        }
        set src(value: string) {
          this._src = value;
          if (value) {
            queueMicrotask(() => this.onload?.());
          }
        }
      }
      globalThis.Image = MockImage as unknown as typeof globalThis.Image;

      const mockCtx = {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as never);

      toBlobSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation((cb: BlobCallback) => {
          cb(new Blob(['cropped-jpeg-bytes'], { type: 'image/jpeg' }));
        });

      createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-photo');
      revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    });

    afterEach(() => {
      globalThis.Image = originalImage;
      getContextSpy.mockRestore();
      toBlobSpy.mockRestore();
      createObjectUrlSpy.mockRestore();
      revokeObjectUrlSpy.mockRestore();
    });

    async function selectMockPhoto(fixture: ReturnType<typeof create>) {
      const service = TestBed.inject(CommunityService);
      vi.spyOn(service, 'prepareCommunityPhoto').mockImplementation(async (f) => f);

      const input = fixture.nativeElement.querySelector('#accountPhoto') as HTMLInputElement;
      const file = new File(['raw-image'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));

      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 10));
      fixture.detectChanges();
    }

    it('opens the cropper with zoom controls (+, −, slider, wheel, reset) that scale the photo', async () => {
      const service = TestBed.inject(CommunityService);
      openDemoAccount(service, 'active_member');
      const fixture = create();
      await fixture.whenStable();
      fixture.detectChanges();

      await selectMockPhoto(fixture);

      const el: HTMLElement = fixture.nativeElement;
      const modal = el.querySelector('.cropper-modal');
      expect(modal).toBeTruthy();

      const zoomValue = () => el.querySelector('.cropper-zoom-value')?.textContent?.trim();
      const zoomInBtn = el.querySelector<HTMLButtonElement>('.btn-zoom-in')!;
      const zoomOutBtn = el.querySelector<HTMLButtonElement>('.btn-zoom-out')!;
      const zoomSlider = el.querySelector<HTMLInputElement>('.cropper-zoom-slider')!;
      const resetBtn = el.querySelector<HTMLButtonElement>('.btn-zoom-reset')!;

      expect(zoomValue()).toBe('100%');
      expect(zoomOutBtn.disabled).toBe(true);

      // Zoom in via + button
      zoomInBtn.click();
      fixture.detectChanges();
      expect(zoomValue()).toBe('110%');
      expect(zoomOutBtn.disabled).toBe(false);

      // Zoom via range slider
      zoomSlider.value = '2.25';
      zoomSlider.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(zoomValue()).toBe('225%');

      // Zoom out via - button
      zoomOutBtn.click();
      fixture.detectChanges();
      expect(zoomValue()).toBe('215%');

      // Zoom via mouse wheel on cropper wrapper
      const wrapper = el.querySelector<HTMLElement>('.cropper-wrapper')!;
      wrapper.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
      fixture.detectChanges();
      expect(zoomValue()).toBe('225%');

      // Reset returns zoom to 100%
      resetBtn.click();
      fixture.detectChanges();
      expect(zoomValue()).toBe('100%');
    });

    it('resizes the square crop selection from corner handles without triggering drag and keeps 1:1 ratio', async () => {
      const service = TestBed.inject(CommunityService);
      openDemoAccount(service, 'active_member');
      const fixture = create();
      await fixture.whenStable();
      fixture.detectChanges();

      await selectMockPhoto(fixture);

      const el: HTMLElement = fixture.nativeElement;
      const selection = el.querySelector<HTMLElement>('.cropper-selection')!;
      const seHandle = el.querySelector<HTMLElement>('.cropper-selection-handle.se')!;
      const nwHandle = el.querySelector<HTMLElement>('.cropper-selection-handle.nw')!;

      const initialLeft = parseFloat(selection.style.left);
      const initialTop = parseFloat(selection.style.top);
      const initialWidth = parseFloat(selection.style.width);
      const initialHeight = parseFloat(selection.style.height);
      expect(initialWidth).toBe(initialHeight);

      // Shrink from SE corner handle horizontally (dx = -40, dy = 0): top-left stays anchored, size shrinks by 40
      seHandle.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 200, clientY: 200, bubbles: true }),
      );
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 160, clientY: 200 }));
      document.dispatchEvent(new MouseEvent('mouseup'));
      fixture.detectChanges();

      expect(parseFloat(selection.style.left)).toBe(initialLeft);
      expect(parseFloat(selection.style.top)).toBe(initialTop);
      expect(parseFloat(selection.style.width)).toBe(initialWidth - 40);
      expect(parseFloat(selection.style.height)).toBe(initialHeight - 40);

      // Resize from NW corner handle inward (dx = +20, dy = +20): bottom-right stays anchored
      const beforeRight =
        parseFloat(selection.style.left) + parseFloat(selection.style.width);
      const beforeBottom =
        parseFloat(selection.style.top) + parseFloat(selection.style.height);

      nwHandle.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }),
      );
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 120 }));
      document.dispatchEvent(new MouseEvent('mouseup'));
      fixture.detectChanges();

      const afterWidth = parseFloat(selection.style.width);
      const afterHeight = parseFloat(selection.style.height);
      expect(afterWidth).toBe(afterHeight);
      expect(parseFloat(selection.style.left) + afterWidth).toBe(beforeRight);
      expect(parseFloat(selection.style.top) + afterHeight).toBe(beforeBottom);
    });

    it('preserves the cropped file after Apply crop and uploads it on Update', async () => {
      const service = TestBed.inject(CommunityService);
      openDemoAccount(service, 'active_member');
      const updateProfileSpy = vi
        .spyOn(service, 'updateProfile')
        .mockResolvedValue({} as never);
      const uploadPhotoSpy = vi
        .spyOn(service, 'uploadProfilePhoto')
        .mockResolvedValue('https://neverbeen.example/cropped-avatar.jpg');

      const fixture = create();
      await fixture.whenStable();
      fixture.detectChanges();

      await selectMockPhoto(fixture);

      const el: HTMLElement = fixture.nativeElement;
      const applyBtn = el.querySelector<HTMLButtonElement>('.btn-crop-apply')!;
      applyBtn.click();

      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 10));
      fixture.detectChanges();

      // Modal is closed and preview is updated
      expect(el.querySelector('.cropper-modal')).toBeNull();

      // Clicking Update uploads the cropped photo
      const updateBtn = el.querySelector<HTMLButtonElement>('.btn-update')!;
      updateBtn.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(updateProfileSpy).toHaveBeenCalled();
      expect(uploadPhotoSpy).toHaveBeenCalledTimes(1);
      expect(uploadPhotoSpy.mock.calls[0][0]).toBeInstanceOf(File);
    });
  });
});
