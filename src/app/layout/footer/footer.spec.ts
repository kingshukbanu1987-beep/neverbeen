import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Footer } from './footer';

@Component({ template: '' })
class StubPage {}

describe('Footer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([{ path: '**', component: StubPage }])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    return fixture;
  }

  it('uses rgb(59, 36, 79) for the footer background on /ai-models, model profile, and view all photos pages', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const footer = fixture.nativeElement.querySelector('footer#site-footer') as HTMLElement;
    const router = TestBed.inject(Router);

    for (const url of [
      '/ai-models',
      '/ai-models?search=fiadh',
      '/ai-models/fiadh-dara',
      '/ai-models/fiadh-dara#testimonials',
      '/ai-models/fiadh-dara/photos',
      '/ai-models/fiadh-dara/biography',
      '/ai-models/fiadh-dara/portfolio',
    ]) {
      await router.navigateByUrl(url);
      fixture.detectChanges();

      expect(component['isAiModels']()).toBe(true);
      expect(footer.classList.contains('ai-models-footer')).toBe(true);
      expect(getComputedStyle(footer).backgroundColor).toBe('rgb(59, 36, 79)');
      expect(getComputedStyle(footer).backgroundImage).toBe('none');
    }

    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect(component['isAiModels']()).toBe(false);
    expect(footer.classList.contains('ai-models-footer')).toBe(false);
    expect(getComputedStyle(footer).backgroundColor).not.toBe('rgb(59, 36, 79)');
  });
});
