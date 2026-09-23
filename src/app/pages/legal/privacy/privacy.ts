import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface TocItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class PrivacyPage {
  protected readonly activeSection = signal<string>('collect');
  protected readonly updated = '23 September 2026';

  protected readonly toc: TocItem[] = [
    { id: 'collect', label: 'Information we collect' },
    { id: 'use', label: 'How we use it' },
    { id: 'photos', label: 'Photographs & memoirs' },
    { id: 'cookies', label: 'Cookies & tokens' },
    { id: 'sharing', label: 'When we share' },
    { id: 'rights', label: 'Your rights' },
    { id: 'security', label: 'Security' },
    { id: 'contact', label: 'Contact us' },
  ];

  goTo(id: string): void {
    this.activeSection.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSectionVisible(id: string): void {
    this.activeSection.set(id);
  }
}
