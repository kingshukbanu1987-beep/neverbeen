import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-founder',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './founder.html',
  styleUrl: './founder.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Founder {}
