import { Component, signal } from '@angular/core';
import { faqItems } from '../../models/site-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-faq',
  imports: [SectionHeading],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq {
  protected readonly items = faqItems;
  protected readonly openIndex = signal(0);

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
