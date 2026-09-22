import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityRegister } from './register';
import { CommunityService, getCookie, TOKEN_KEY, deleteCookie } from '../../../services/community.service';

describe('CommunityRegister', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
    deleteCookie(TOKEN_KEY);

    await TestBed.configureTestingModule({
      imports: [CommunityRegister],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    service = TestBed.inject(CommunityService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function create() {
    const fixture = TestBed.createComponent(CommunityRegister);
    fixture.detectChanges();
    return fixture;
  }

  it('renders all mandatory basic detail fields and photo uploader', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#name')).toBeTruthy();
    expect(element.querySelector('#surname')).toBeTruthy();
    expect(element.querySelector('#email')).toBeTruthy();
    expect(element.querySelector('#country')).toBeTruthy();
    expect(element.querySelector('#state')).toBeTruthy();
    expect(element.querySelector('#city')).toBeTruthy();
    expect(element.querySelector('#gender')).toBeTruthy();
    expect(element.querySelector('#dateOfBirth')).toBeTruthy();
    expect(element.querySelector('#photoInput')).toBeTruthy();
    expect(element.querySelector('.btn-create-account')?.textContent?.trim()).toContain('Create Neverbeen Account');
  });

  it('validates mandatory fields and blocks submission if invalid', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const createAccountSpy = vi.spyOn(service, 'createNeverbeenAccount');

    component['form'].patchValue({
      name: '',
      surname: '',
      email: '',
      country: '',
      state: '',
      city: '',
      gender: '',
      dateOfBirth: '',
    });

    await component.submit();

    expect(component['form'].invalid).toBe(true);
    expect(createAccountSpy).not.toHaveBeenCalled();
    expect(component['photoError']()).toBeTruthy();
  });

  it('creates profile and redirects to user profile page on clicking Create Neverbeen Account', async () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component['form'].patchValue({
      name: 'Elena',
      surname: 'Rostova',
      email: 'elena.rostova@example.com',
      country: 'France',
      state: 'Île-de-France',
      city: 'Paris',
      gender: 'Female',
      dateOfBirth: '1995-06-12',
    });
    component['photoPreview'].set('data:image/jpeg;base64,sampleportrait');

    await component.submit();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.profile()?.fullName).toBe('Elena Rostova');
    expect(service.profile()?.cityName).toBe('Paris');
    expect(getCookie(TOKEN_KEY)).toBeTruthy();
    expect(router.navigate).toHaveBeenCalledWith(['/community/profile']);
  });
});
