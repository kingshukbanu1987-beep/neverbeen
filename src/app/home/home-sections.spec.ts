import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Faq } from './faq/faq';
import { HowItWorks } from './how-it-works/how-it-works';
import { Pricing } from './pricing/pricing';

describe('Expandable home sections', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowItWorks, Pricing, Faq],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create<T>(component: Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  }

  function expectCollapsedThenExpanded(fixture: ComponentFixture<unknown>): void {
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.disclosure-toggle')!;
    const content = element.querySelector<HTMLElement>('.disclosure-content')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain('Expand');
    expect(content.getAttribute('aria-hidden')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('Collapse');
    expect(content.getAttribute('aria-hidden')).toBe('false');
    expect(content.hasAttribute('inert')).toBe(false);

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(content.getAttribute('aria-hidden')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);
  }

  it('collapses How It Works by default and reveals its Calibri steps on demand', () => {
    const fixture = create(HowItWorks);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.step').length).toBeGreaterThan(0);
    expect(getComputedStyle(element.querySelector<HTMLElement>('.step')!).fontFamily).toContain(
      'Calibri',
    );
    expectCollapsedThenExpanded(fixture);
  });

  it('collapses Pricing by default and uses lavender for the selected plan', () => {
    const fixture = create(Pricing);
    const element = fixture.nativeElement as HTMLElement;
    expectCollapsedThenExpanded(fixture);

    element.querySelector<HTMLButtonElement>('.disclosure-toggle')!.click();
    fixture.detectChanges();
    const plans = Array.from(element.querySelectorAll<HTMLElement>('.plan'));
    const secondPlanButton = plans[1].querySelector<HTMLButtonElement>('button')!;
    secondPlanButton.click();
    fixture.detectChanges();

    expect(plans[1].classList.contains('featured')).toBe(true);
    expect(getComputedStyle(plans[1]).backgroundColor).toBe('rgb(230, 230, 250)');
    expect(getComputedStyle(plans[1]).color).toBe('rgb(50, 39, 66)');
  });

  it('collapses FAQ by default and keeps its accordion usable after expansion', () => {
    const fixture = create(Faq);
    const element = fixture.nativeElement as HTMLElement;
    expectCollapsedThenExpanded(fixture);

    element.querySelector<HTMLButtonElement>('.disclosure-toggle')!.click();
    fixture.detectChanges();
    const questions = element.querySelectorAll<HTMLButtonElement>('article h3 button');
    expect(element.querySelector('#faq-answer-0')).not.toBeNull();

    questions[1].click();
    fixture.detectChanges();
    expect(questions[1].getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('#faq-answer-0')).toBeNull();
    expect(element.querySelector('#faq-answer-1')).not.toBeNull();

    questions[1].click();
    fixture.detectChanges();
    expect(questions[1].getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('#faq-answer-1')).toBeNull();
  });
});
