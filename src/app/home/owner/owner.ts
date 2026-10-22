import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-owner',
  imports: [NgOptimizedImage, RouterLink, SectionHeading],
  templateUrl: './owner.html',
  styleUrl: './owner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Owner {}
