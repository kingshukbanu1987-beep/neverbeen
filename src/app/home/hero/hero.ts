import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { heroDestinations } from '../../models/site-content';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly index = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly destination = computed(() => heroDestinations[this.index()]);

  protected showPreviousDestination(): void {
    this.index.update((value) => (value - 1 + heroDestinations.length) % heroDestinations.length);
  }

  protected showNextDestination(): void {
    this.index.update((value) => (value + 1) % heroDestinations.length);
  }

  constructor() {
    interval(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.showNextDestination();
    });
  }
}
