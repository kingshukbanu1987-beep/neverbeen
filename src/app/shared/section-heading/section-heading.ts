import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.css',
})
export class SectionHeading {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly copy = input('');
  readonly align = input<'left' | 'center'>('left');
  readonly tone = input<'ink' | 'paper'>('ink');
}
