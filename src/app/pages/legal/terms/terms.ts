import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface TocItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-terms-page',
  imports: [RouterLink],
  templateUrl: './terms.html',
  styleUrl: './terms.css',
})
export class TermsPage {
  protected readonly activeSection = signal<string>('acceptance');
  protected readonly updated = '23 September 2026';

  protected readonly toc: TocItem[] = [
    { id: 'acceptance', label: 'Acceptance of terms' },
    { id: 'account', label: 'Your account' },
    { id: 'conduct', label: 'Acceptable use' },
    { id: 'content', label: 'Your content' },
    { id: 'billing', label: 'Plans & billing' },
    { id: 'rights', label: 'NeverBeen’s rights' },
    { id: 'termination', label: 'Termination' },
    { id: 'disclaimer', label: 'Disclaimers' },
    { id: 'law', label: 'Governing law' },
  ];

  goTo(id: string): void {
    this.activeSection.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSectionVisible(id: string): void {
    this.activeSection.set(id);
  }
}
