import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-owner',
  imports: [NgOptimizedImage, SectionHeading],
  templateUrl: './owner.html',
  styleUrl: './owner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Owner {}
