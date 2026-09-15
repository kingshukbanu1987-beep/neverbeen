import { Component } from '@angular/core';
import { SectionHeading } from '../../shared/section-heading/section-heading';
import { howItWorksSteps } from '../../models/site-content';

@Component({
  selector: 'app-how-it-works',
  imports: [SectionHeading],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {
  protected readonly steps = howItWorksSteps;
}
