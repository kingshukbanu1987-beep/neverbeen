import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CommunityRegister } from './register';
import { CommunityService } from '../../../services/community.service';

describe('CommunityRegister', () => {
  let router: Router;
  let service: CommunityService;

  beforeEach(async () => {
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

  it('renders all required form controls from RegistrationRequest DTO', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#fullName')).toBeTruthy();
    expect(element.querySelector('#email')).toBeTruthy();
    expect(element.querySelector('#gender')).toBeTruthy();
    expect(element.querySelector('#dateOfBirth')).toBeTruthy();
    expect(element.querySelector('#profession')).toBeTruthy();
    expect(element.querySelector('#country')).toBeTruthy();
    expect(element.querySelector('#city')).toBeTruthy();
    expect(element.querySelector('#pincode')).toBeTruthy();
    expect(element.querySelector('#contactNumber')).toBeTruthy();
    expect(element.querySelector('#postalAddress')).toBeTruthy();
    expect(element.querySelector('#aboutMe')).toBeTruthy();
  });

  it('validates required fields before submitting', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component['form'].patchValue({
      fullName: '',
      email: '',
      gender: '',
      profession: '',
    });

    const registerSpy = vi.spyOn(service, 'registerUser').mockResolvedValue({} as any);
    await component.submit();

    expect(component['form'].invalid).toBe(true);
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('cascades city selection on country change', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    await fixture.whenStable();

    // Change country to 88 (Japan)
    component['form'].patchValue({ countryId: 88 });
    await component.onCountryChange();
    fixture.detectChanges();

    const cities = component['citiesList']();
    expect(cities.length).toBeGreaterThan(0);
    expect(cities.some((c) => c.name === 'Tokyo' || c.name === 'Kyoto')).toBe(true);
  });
});
