import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

describe('App chrome on stand-alone admin pages', () => {
  it('opens the identity document viewer as a clear page (no navbar, announcement bar or footer)', async () => {
    const { Component } = await import('@angular/core');
    const { Router } = await import('@angular/router');
    @Component({ selector: 'app-stub-page', template: '<p class="stub">page</p>' })
    class StubPage {}
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'admin/identity-document/:submissionId/:fileId', component: StubPage },
          { path: 'about', component: StubPage },
        ]),
      ],
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const el: HTMLElement = fixture.nativeElement;

    await router.navigateByUrl('/about');
    fixture.detectChanges();
    expect(el.querySelector('app-navbar')).toBeTruthy();
    expect(el.querySelector('app-footer')).toBeTruthy();

    await router.navigateByUrl('/admin/identity-document/880001/1-front');
    fixture.detectChanges();
    expect(el.querySelector('.stub')).toBeTruthy();
    expect(el.querySelector('app-navbar')).toBeNull();
    expect(el.querySelector('app-footer')).toBeNull();
    expect(el.querySelector('app-announcement-bar')).toBeNull();
  });
});
