import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TranslatableTextDirective } from './translatable-text.directive';
import { TranslationService } from '../../services/translation.service';

@Component({
  template: `<p class="body" [nbTranslatable]="text">{{ text }}</p>`,
  imports: [TranslatableTextDirective],
})
class HostComponent {
  text = 'Hello travelers, join our NeverBeen journey across the fjords!';
}

describe('TranslatableTextDirective', () => {
  let translation: TranslationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    translation = TestBed.inject(TranslationService);
    translation.setLanguage('en');
    vi.restoreAllMocks();
  });

  async function create(text?: string) {
    const fixture = TestBed.createComponent(HostComponent);
    if (text !== undefined) fixture.componentInstance.text = text;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('preserves the original language, marks content data-no-translate, and hides Translate when languages match', async () => {
    vi.spyOn(translation, 'detectLanguage').mockResolvedValue('en');

    const fixture = await create();
    const paragraph = fixture.nativeElement.querySelector('p') as HTMLElement;

    expect(paragraph.hasAttribute('data-no-translate')).toBe(true);
    expect(paragraph.textContent).toContain('fjords');
    expect(fixture.nativeElement.querySelector('.nb-translate-btn')).toBeNull();
  });

  it('shows Translate when the content language differs, swaps the text on click, and restores on Original', async () => {
    vi.spyOn(translation, 'detectLanguage').mockResolvedValue('fr');
    vi.spyOn(translation, 'translateContent').mockResolvedValue(
      'Bonjour voyageurs, rejoignez notre voyage NeverBeen à travers les fjords !',
    );

    const fixture = await create();
    const paragraph = fixture.nativeElement.querySelector('p') as HTMLElement;
    const button = fixture.nativeElement.querySelector('.nb-translate-btn') as HTMLButtonElement;

    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('Translate');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(paragraph.textContent).toContain('Bonjour voyageurs');
    const afterToggle = fixture.nativeElement.querySelector(
      '.nb-translate-btn',
    ) as HTMLButtonElement;
    expect(afterToggle.textContent?.trim()).toBe('Original');

    afterToggle.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(paragraph.textContent).toContain('fjords');
  });

  it('re-shows Translate after the site language changes away from the content language', async () => {
    vi.spyOn(translation, 'detectLanguage').mockResolvedValue('en');

    const fixture = await create();
    expect(fixture.nativeElement.querySelector('.nb-translate-btn')).toBeNull();

    translation.setLanguage('fr');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.nb-translate-btn')).toBeTruthy();
  });
});
