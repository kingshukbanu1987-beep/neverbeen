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

  // Regression: "changing profile picture not getting saved" from this page.
  it('saves a changed profile picture when Update is chosen', async () => {
    const service = TestBed.inject(CommunityService);
    openDemoAccount(service, 'active_member');
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const before = service.profile()?.profilePhotoUrl;

    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], 'new-picture.jpg', {
      type: 'image/jpeg',
    });
    await component['onPhotoSelected']({
      target: { files: [file], value: '' },
    } as unknown as Event);
    expect(component['photoError']()).toBeNull();
    expect(component['selectedFile']()).toBeTruthy();

    await component['update']();

    // The new picture is stored on the member's profile + session user, the preview
    // shows the saved picture and the page confirms the save.
    expect(service.profile()?.profilePhotoUrl).toBeTruthy();
    expect(service.profile()?.profilePhotoUrl).not.toBe(before);
    expect(service.currentUser()?.profilePhotoUrl).toBe(service.profile()?.profilePhotoUrl);
    expect(component['photoPreview']()).toBe(service.profile()?.profilePhotoUrl);
    expect(component['selectedFile']()).toBeNull();
    expect(component['saveError']()).toBeNull();
    expect(component['savedNotice']()).toContain('updated');
  });

  it('reports a failed picture upload instead of claiming the account was updated', async () => {
    const service = TestBed.inject(CommunityService);
    openDemoAccount(service, 'active_member');
    const uploadSpy = vi
      .spyOn(service, 'uploadProfilePhoto')
      .mockRejectedValue(new Error('Your new profile picture could not be saved: offline'));
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    const file = new File([new Uint8Array([7, 7, 7])], 'new-picture.jpg', { type: 'image/jpeg' });
    await component['onPhotoSelected']({
      target: { files: [file], value: '' },
    } as unknown as Event);
    await component['update']();

    expect(uploadSpy).toHaveBeenCalled();
    expect(component['savedNotice']()).toBeNull();
    expect(component['saveError']()).toContain('could not be saved');
    // The chosen file is kept, so choosing Update again retries the same picture.
    expect(component['selectedFile']()).toBeTruthy();
    uploadSpy.mockRestore();
  });

  it('says why nothing was saved when Update is blocked by the missing country', async () => {
    const service = TestBed.inject(CommunityService);
    openDemoAccount(service, 'active_member');
    const uploadSpy = vi.spyOn(service, 'uploadProfilePhoto');
    const fixture = create();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    const file = new File([new Uint8Array([3, 3, 3])], 'new-picture.jpg', { type: 'image/jpeg' });
    await component['onPhotoSelected']({
      target: { files: [file], value: '' },
    } as unknown as Event);
    component['form'].get('country')?.setValue('');

    await component['update']();

    // No silent no-op: the member is told the picture has not been saved yet.
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(component['saveError']()).toContain('have not been saved yet');
    expect(component['selectedFile']()).toBeTruthy();
    uploadSpy.mockRestore();
  });

  it('sends a visitor without a session back to the home page', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = create();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
    navigateSpy.mockRestore();
  });
});
